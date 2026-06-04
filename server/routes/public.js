const express = require('express');
const { query } = require('../db');
const { requireTelegramUser } = require('../middleware/auth');
const { validateInitData } = require('../services/telegramAuth');
const { checkChannelMembership } = require('../services/channelService');
const { getBracketForPublic, getChampion } = require('../services/bracketService');
const { STAGE_LABELS } = require('../constants');

function createPublicRouter(telegram) {
  const router = express.Router();

  router.get('/auth/telegram', (req, res) => {
    const initData = req.headers['x-telegram-init-data'];
    const user = validateInitData(initData, process.env.BOT_TOKEN);
    if (!user) return res.status(401).json({ ok: false });
    res.json({ ok: true, user });
  });

  router.post('/check-channel-membership', requireTelegramUser, async (req, res) => {
    try {
      const channelId = process.env.CHANNEL_ID;
      const { isMember, status } = await checkChannelMembership(
        telegram,
        channelId,
        req.telegramUser.id
      );

      const existing = await query('SELECT id FROM users WHERE telegram_id = $1', [
        req.telegramUser.id,
      ]);
      if (existing.rows[0]) {
        await query(
          `UPDATE users SET is_channel_member = $1,
           bonus_eligible = CASE WHEN disqualified THEN FALSE WHEN $1 THEN TRUE ELSE FALSE END
           WHERE telegram_id = $2`,
          [isMember, req.telegramUser.id]
        );
      }

      res.json({ isMember, status });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kanal kontrolu basarisiz' });
    }
  });

  router.post('/register', requireTelegramUser, async (req, res) => {
    try {
      const slotioUsername = (req.body.slotio_username || '').trim();
      if (!slotioUsername) {
        return res.status(400).json({ error: 'Slotio kullanici adi zorunlu' });
      }
      const normalized = slotioUsername.toLowerCase();

      const channelId = process.env.CHANNEL_ID;
      const { isMember } = await checkChannelMembership(
        telegram,
        channelId,
        req.telegramUser.id
      );
      if (!isMember) {
        return res.status(403).json({ error: 'Kanal uyeligi gerekli' });
      }

      const dupTg = await query('SELECT id FROM users WHERE telegram_id = $1', [
        req.telegramUser.id,
      ]);
      if (dupTg.rows[0]) {
        return res.status(409).json({ error: 'Bu Telegram hesabi zaten kayitli' });
      }

      const dupSlot = await query(
        'SELECT id FROM users WHERE slotio_username_normalized = $1',
        [normalized]
      );
      if (dupSlot.rows[0]) {
        return res.status(409).json({ error: 'Bu Slotio kullanici adi zaten kullaniliyor' });
      }

      const u = req.telegramUser;
      const { rows } = await query(
        `INSERT INTO users (
          telegram_id, telegram_username, telegram_first_name,
          slotio_username, slotio_username_normalized,
          is_channel_member, bonus_eligible
        ) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE)
        RETURNING *`,
        [u.id, u.username || null, u.first_name || null, slotioUsername, normalized]
      );

      res.json({ user: formatUser(rows[0]) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Kayit basarisiz' });
    }
  });

  router.get('/me', requireTelegramUser, async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE telegram_id = $1', [
      req.telegramUser.id,
    ]);
    if (!rows[0]) return res.json({ registered: false });
    res.json({ registered: true, user: formatUser(rows[0]) });
  });

  router.get('/groups', async (req, res) => {
    const { rows } = await query(`
      SELECT gr.group_code, gr.locked,
        t1.name AS pos1, t1.flag_emoji AS pos1_flag,
        t2.name AS pos2, t2.flag_emoji AS pos2_flag,
        t3.name AS pos3, t3.flag_emoji AS pos3_flag,
        t4.name AS pos4, t4.flag_emoji AS pos4_flag
      FROM group_results gr
      JOIN teams t1 ON t1.id = gr.position_1_team_id
      JOIN teams t2 ON t2.id = gr.position_2_team_id
      JOIN teams t3 ON t3.id = gr.position_3_team_id
      JOIN teams t4 ON t4.id = gr.position_4_team_id
      ORDER BY gr.group_code
    `);
    res.json({
      groups: rows.map((r) => ({
        code: r.group_code,
        locked: r.locked,
        standings: [
          { position: 1, name: r.pos1, flag: r.pos1_flag },
          { position: 2, name: r.pos2, flag: r.pos2_flag },
          { position: 3, name: r.pos3, flag: r.pos3_flag },
          { position: 4, name: r.pos4, flag: r.pos4_flag },
        ],
      })),
    });
  });

  router.get('/bracket', async (req, res) => {
    const matches = await getBracketForPublic();
    const champion = await getChampion();
    const byStage = {};
    for (const m of matches) {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push({
        matchNo: m.match_no,
        stage: m.stage,
        stageLabel: STAGE_LABELS[m.stage] || m.stage,
        home: m.home_name ? { name: m.home_name, flag: m.home_flag } : null,
        away: m.away_name ? { name: m.away_name, flag: m.away_flag } : null,
        winner: m.winner_name ? { name: m.winner_name } : null,
        hasTeams: !!(m.home_team_id && m.away_team_id),
      });
    }
    res.json({ stages: byStage, champion });
  });

  router.get('/bonus-status', requireTelegramUser, async (req, res) => {
    const channelId = process.env.CHANNEL_ID;
    const { isMember } = await checkChannelMembership(
      telegram,
      channelId,
      req.telegramUser.id
    );

    const { rows } = await query('SELECT * FROM users WHERE telegram_id = $1', [
      req.telegramUser.id,
    ]);
    if (!rows[0]) {
      return res.json({ registered: false });
    }

    const user = rows[0];
    if (!isMember && user.bonus_eligible) {
      await query(
        `UPDATE users SET is_channel_member = FALSE, bonus_eligible = FALSE WHERE telegram_id = $1`,
        [req.telegramUser.id]
      );
      user.is_channel_member = false;
      user.bonus_eligible = false;
    } else if (isMember && !user.disqualified) {
      await query(
        `UPDATE users SET is_channel_member = TRUE, bonus_eligible = TRUE WHERE telegram_id = $1`,
        [req.telegramUser.id]
      );
      user.is_channel_member = true;
      user.bonus_eligible = true;
    }

    let reason = 'Kanal takibi devam ediyor';
    if (user.disqualified) reason = 'Diskalifiye';
    else if (!user.bonus_eligible) reason = 'Kanal takibi yok';

    res.json({
      registered: true,
      bonusEligible: user.bonus_eligible && !user.disqualified,
      active: user.bonus_eligible && !user.disqualified,
      reason,
      disqualified: user.disqualified,
      disqualificationReason: user.disqualification_reason,
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
    bonusEligible: row.bonus_eligible,
    disqualified: row.disqualified,
    disqualificationReason: row.disqualification_reason,
    createdAt: row.created_at,
  };
}

module.exports = { createPublicRouter };
