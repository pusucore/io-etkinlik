const express = require('express');
const { query } = require('../db');
const { requireTelegramUser } = require('../middleware/auth');
const { validateInitData } = require('../services/telegramAuth');
const { checkChannelMembership } = require('../services/channelService');
const { getCampaignSettings } = require('../services/campaignService');
const {
  getUserByTelegramId,
  getOrCreatePrediction,
  saveGroupRankings,
  saveBestThirds,
  saveMatchWinner,
  getPredictionState,
  submitPrediction,
  getFullPredictionView,
  buildMatchTeams,
  maskUsername,
} = require('../services/userPredictionService');
const { refreshUserRewardStatus, formatRewardStatus, getPredictionFlags } = require('../services/rewardService');

function createPublicRouter(telegram) {
  const router = express.Router();

  function telegramAuth(req, res) {
    const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
    const user = validateInitData(initData, process.env.BOT_TOKEN);
    if (!user) return res.status(401).json({ ok: false, error: 'Doğrulama başarısız' });
    res.json({ ok: true, user });
  }

  router.post('/auth/telegram', telegramAuth);
  router.get('/auth/telegram', telegramAuth);

  router.get('/campaign', async (_req, res) => {
    try {
      const campaign = await getCampaignSettings();
      res.json({ campaign });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kampanya yüklenemedi' });
    }
  });

  router.get('/teams', async (_req, res) => {
    const { rows } = await query(
      'SELECT id, group_code, default_position, name, flag_emoji, country_code FROM teams ORDER BY group_code, default_position'
    );
    const byGroup = {};
    for (const t of rows) {
      if (!byGroup[t.group_code]) byGroup[t.group_code] = [];
      byGroup[t.group_code].push({
        id: t.id,
        position: t.default_position,
        name: t.name,
        flag: t.flag_emoji,
        countryCode: t.country_code,
      });
    }
    res.json({ teams: rows, groups: byGroup });
  });

  router.post('/check-channel-membership', requireTelegramUser, async (req, res) => {
    try {
      const channelId = process.env.CHANNEL_ID;
      const { isMember, status } = await checkChannelMembership(
        telegram,
        channelId,
        req.telegramUser.id
      );

      const user = await getUserByTelegramId(req.telegramUser.id);
      if (user) {
        await query(
          `UPDATE users SET is_channel_member = $1, channel_checked_at = NOW(), updated_at = NOW()
           WHERE telegram_id = $2`,
          [isMember, req.telegramUser.id]
        );
        await refreshUserRewardStatus(user.id, telegram, channelId);
      }

      res.json({ isMember, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kanal kontrolü başarısız' });
    }
  });

  router.post('/register', requireTelegramUser, async (req, res) => {
    try {
      const slotioUsername = (req.body.slotio_username || '').trim();
      if (!slotioUsername) {
        return res.status(400).json({ error: 'Slotio kullanıcı adı zorunlu' });
      }
      const normalized = slotioUsername.toLowerCase();

      const channelId = process.env.CHANNEL_ID;
      const { isMember } = await checkChannelMembership(
        telegram,
        channelId,
        req.telegramUser.id
      );
      if (!isMember) {
        return res.status(403).json({ error: 'Kanal üyeliği gerekli' });
      }

      const dupTg = await query('SELECT id FROM users WHERE telegram_id = $1', [
        req.telegramUser.id,
      ]);
      if (dupTg.rows[0]) {
        return res.status(409).json({ error: 'Bu Telegram hesabı zaten kayıtlı' });
      }

      const dupSlot = await query(
        'SELECT id FROM users WHERE slotio_username_normalized = $1',
        [normalized]
      );
      if (dupSlot.rows[0]) {
        return res.status(409).json({ error: 'Bu Slotio kullanıcı adı zaten kullanılıyor' });
      }

      const u = req.telegramUser;
      const { rows } = await query(
        `INSERT INTO users (
          telegram_id, telegram_username, telegram_first_name, telegram_last_name, language_code,
          slotio_username, slotio_username_normalized,
          is_channel_member, deposit_eligible, reward_eligible
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE, FALSE)
        RETURNING *`,
        [
          u.id,
          u.username || null,
          u.first_name || null,
          u.last_name || null,
          u.language_code || null,
          slotioUsername,
          normalized,
        ]
      );

      await getOrCreatePrediction(rows[0].id);

      res.json({
        user: formatUser(rows[0]),
        message: 'Katılımın alındı. Şimdi Dünya Kupası bracket tahminini tamamla.',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kayıt başarısız' });
    }
  });

  router.get('/me', requireTelegramUser, async (req, res) => {
    const user = await getUserByTelegramId(req.telegramUser.id);
    if (!user) return res.json({ registered: false });
    const pred = await query('SELECT * FROM predictions WHERE user_id = $1', [user.id]);
    const state = pred.rows[0] ? await getPredictionState(pred.rows[0].id) : null;
    res.json({
      registered: true,
      user: formatUser(user),
      prediction: state,
    });
  });

  router.get('/prediction', requireTelegramUser, async (req, res) => {
    const user = await getUserByTelegramId(req.telegramUser.id);
    if (!user) return res.status(404).json({ error: 'Kayıt gerekli' });

    const pred = await getOrCreatePrediction(user.id);
    const view = await getFullPredictionView(pred.id);
    const state = await getPredictionState(pred.id);
    const matches = await buildMatchTeams(pred.id);

    const teamIds = new Set();
    const { rows: teams } = await query('SELECT id, name, flag_emoji FROM teams');
    const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

    const enriched = matches.map((m) => ({
      ...m,
      home: m.homeTeamId ? teamMap[m.homeTeamId] : null,
      away: m.awayTeamId ? teamMap[m.awayTeamId] : null,
      winner: m.winnerTeamId ? teamMap[m.winnerTeamId] : null,
    }));

    res.json({
      prediction: formatPrediction(view),
      state,
      matches: enriched,
      groups: view.groups,
      bestThirds: view.bestThirds,
    });
  });

  router.post('/prediction/group-rankings', requireTelegramUser, async (req, res) => {
    try {
      const user = await getUserByTelegramId(req.telegramUser.id);
      if (!user) return res.status(403).json({ error: 'Önce kayıt olun' });

      const pred = await getOrCreatePrediction(user.id);
      const { group_code, positions } = req.body;
      if (!group_code || !positions) {
        return res.status(400).json({ error: 'Grup ve sıralama gerekli' });
      }

      const result = await saveGroupRankings(pred.id, group_code, positions);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/prediction/best-thirds', requireTelegramUser, async (req, res) => {
    try {
      const user = await getUserByTelegramId(req.telegramUser.id);
      if (!user) return res.status(403).json({ error: 'Önce kayıt olun' });

      const pred = await getOrCreatePrediction(user.id);
      const { groupCodes } = req.body;
      const result = await saveBestThirds(pred.id, groupCodes);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/prediction/match-winner', requireTelegramUser, async (req, res) => {
    try {
      const user = await getUserByTelegramId(req.telegramUser.id);
      if (!user) return res.status(403).json({ error: 'Önce kayıt olun' });

      const pred = await getOrCreatePrediction(user.id);
      const { matchNo, winnerTeamId } = req.body;
      const result = await saveMatchWinner(pred.id, matchNo, winnerTeamId);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/prediction/submit', requireTelegramUser, async (req, res) => {
    try {
      const user = await getUserByTelegramId(req.telegramUser.id);
      if (!user) return res.status(403).json({ error: 'Önce kayıt olun' });

      const pred = await getOrCreatePrediction(user.id);
      await submitPrediction(pred.id, !!req.body.acceptedTerms);
      await refreshUserRewardStatus(user.id, telegram, process.env.CHANNEL_ID);

      res.json({ ok: true, message: 'Tahminin onaylandı!' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/leaderboard', async (req, res) => {
    const type = req.query.type || 'participation';
    if (type === 'scores') {
      const { rows } = await query(`
        SELECT u.telegram_username, u.slotio_username, p.total_score, u.reward_eligible
        FROM predictions p
        JOIN users u ON u.id = p.user_id
        WHERE p.locked = TRUE
        ORDER BY p.total_score DESC, p.submitted_at ASC
        LIMIT 100
      `);
      return res.json({
        type: 'scores',
        entries: rows.map((r, i) => ({
          rank: i + 1,
          telegramUsername: maskUsername(r.telegram_username || ''),
          slotioUsername: maskUsername(r.slotio_username || ''),
          score: r.total_score,
          rewardEligible: r.reward_eligible,
        })),
      });
    }

    const { rows } = await query(`
      SELECT u.telegram_username, u.slotio_username, u.reward_eligible, u.deposit_eligible, p.locked
      FROM users u
      LEFT JOIN predictions p ON p.user_id = u.id
      WHERE p.locked = TRUE
      ORDER BY p.submitted_at ASC
      LIMIT 100
    `);
    res.json({
      type: 'participation',
      entries: rows.map((r, i) => ({
        rank: i + 1,
        telegramUsername: maskUsername(r.telegram_username || ''),
        slotioUsername: maskUsername(r.slotio_username || ''),
        rewardEligible: r.reward_eligible,
        depositEligible: r.deposit_eligible,
      })),
    });
  });

  router.get('/reward-status', requireTelegramUser, async (req, res) => {
    const user = await getUserByTelegramId(req.telegramUser.id);
    if (!user) return res.json({ registered: false });

    await refreshUserRewardStatus(user.id, telegram, process.env.CHANNEL_ID);
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [user.id]);
    const flags = await getPredictionFlags(user.id);
    res.json({
      registered: true,
      ...formatRewardStatus(rows[0], flags),
    });
  });

  return router;
}

function formatUser(row) {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    telegramFirstName: row.telegram_first_name,
    slotioUsername: row.slotio_username,
    isChannelMember: row.is_channel_member,
    depositEligible: row.deposit_eligible,
    rewardEligible: row.reward_eligible,
    disqualified: row.disqualified,
    disqualificationReason: row.disqualification_reason,
    createdAt: row.created_at,
  };
}

function formatPrediction(view) {
  return {
    id: view.id,
    status: view.status,
    locked: view.locked,
    submittedAt: view.submitted_at,
    championName: view.champion_name,
    championFlag: view.champion_flag,
    thirdName: view.third_name,
    totalScore: view.total_score,
  };
}

module.exports = { createPublicRouter };
