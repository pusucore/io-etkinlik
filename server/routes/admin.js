const express = require('express');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { checkChannelMembership } = require('../services/channelService');
const {
  buildRoundOf32,
  advanceWinner,
  getChampion,
  allGroupResultsComplete,
  countSelectedBestThirds,
  THIRD_SLOT_MATCHES,
} = require('../services/bracketService');
const { groups, STAGE_LABELS } = require('../constants');

function createAdminRouter(telegram) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { password } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Hatali sifre' });
    }
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  });

  router.use(requireAdmin);

  router.get('/users', async (req, res) => {
    const q = (req.query.q || '').trim();
    let sql = 'SELECT * FROM users ORDER BY created_at DESC LIMIT 500';
    const params = [];
    if (q) {
      if (/^\d+$/.test(q)) {
        sql = 'SELECT * FROM users WHERE telegram_id = $1 OR id = $1 ORDER BY created_at DESC';
        params.push(q);
      } else {
        sql = `SELECT * FROM users WHERE slotio_username_normalized LIKE $1 OR telegram_username ILIKE $1 ORDER BY created_at DESC LIMIT 500`;
        params.push(`%${q.toLowerCase()}%`);
      }
    }
    const { rows } = await query(sql, params);
    res.json({ users: rows });
  });

  router.get('/users/export', async (req, res) => {
    const { rows } = await query('SELECT * FROM users ORDER BY created_at DESC');
    const header = [
      'id', 'telegram_id', 'telegram_username', 'telegram_first_name',
      'slotio_username', 'is_channel_member', 'bonus_eligible',
      'disqualified', 'disqualification_reason', 'created_at',
    ];
    const lines = [header.join(',')];
    for (const u of rows) {
      lines.push(
        [
          u.id, u.telegram_id, csv(u.telegram_username), csv(u.telegram_first_name),
          csv(u.slotio_username), u.is_channel_member, u.bonus_eligible,
          u.disqualified, csv(u.disqualification_reason), u.created_at,
        ].join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=participants.csv');
    res.send('\uFEFF' + lines.join('\n'));
  });

  router.post('/users/:id/recheck-channel', async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Kullanici bulunamadi' });

    const { isMember } = await checkChannelMembership(telegram, process.env.CHANNEL_ID, user.telegram_id);
    const bonusEligible = isMember && !user.disqualified;

    await query(
      `UPDATE users SET is_channel_member = $1, bonus_eligible = $2 WHERE id = $3`,
      [isMember, bonusEligible, user.id]
    );
    await logAudit('recheck_channel', { userId: user.id, isMember, bonusEligible });

    res.json({ isMember, bonusEligible });
  });

  router.patch('/users/:id/bonus', async (req, res) => {
    const { bonus_eligible, disqualified, disqualification_reason } = req.body;
    await query(
      `UPDATE users SET
        bonus_eligible = COALESCE($1, bonus_eligible),
        disqualified = COALESCE($2, disqualified),
        disqualification_reason = COALESCE($3, disqualification_reason)
       WHERE id = $4`,
      [bonus_eligible, disqualified, disqualification_reason, req.params.id]
    );
    await logAudit('update_bonus', { userId: req.params.id, body: req.body });
    res.json({ ok: true });
  });

  router.get('/teams', async (req, res) => {
    const { rows } = await query('SELECT * FROM teams ORDER BY group_code, default_position');
    res.json({ teams: rows });
  });

  router.get('/group-results', async (req, res) => {
    const { rows } = await query(`
      SELECT gr.*,
        t1.id AS p1_id, t1.name AS p1_name,
        t2.id AS p2_id, t2.name AS p2_name,
        t3.id AS p3_id, t3.name AS p3_name,
        t4.id AS p4_id, t4.name AS p4_name
      FROM group_results gr
      LEFT JOIN teams t1 ON t1.id = gr.position_1_team_id
      LEFT JOIN teams t2 ON t2.id = gr.position_2_team_id
      LEFT JOIN teams t3 ON t3.id = gr.position_3_team_id
      LEFT JOIN teams t4 ON t4.id = gr.position_4_team_id
      ORDER BY gr.group_code
    `);
    res.json({ results: rows });
  });

  router.post('/group-results', async (req, res) => {
    const { group_code, positions, locked } = req.body;
    if (!group_code || !Array.isArray(positions) || positions.length !== 4) {
      return res.status(400).json({ error: '4 pozisyon gerekli' });
    }
    const unique = new Set(positions);
    if (unique.size !== 4) {
      return res.status(400).json({ error: 'Ayni takim iki kez secilemez' });
    }

    const { rows: validTeams } = await query(
      'SELECT id FROM teams WHERE group_code = $1',
      [group_code]
    );
    const validIds = new Set(validTeams.map((t) => t.id));
    if (!positions.every((id) => validIds.has(id))) {
      return res.status(400).json({ error: 'Grup disi takim secilemez' });
    }

    await query(
      `UPDATE group_results SET
        position_1_team_id = $1, position_2_team_id = $2,
        position_3_team_id = $3, position_4_team_id = $4,
        locked = COALESCE($5, locked), updated_at = NOW()
       WHERE group_code = $6`,
      [positions[0], positions[1], positions[2], positions[3], locked ?? true, group_code]
    );

    const thirdId = positions[2];
    await query(
      'UPDATE best_thirds SET team_id = $1 WHERE group_code = $2',
      [thirdId, group_code]
    );

    await logAudit('group_results', { group_code, positions });
    res.json({ ok: true });
  });

  router.get('/best-thirds', async (req, res) => {
    const { rows } = await query(`
      SELECT bt.*, t.name AS team_name, gr.group_code
      FROM best_thirds bt
      JOIN teams t ON t.id = bt.team_id
      ORDER BY bt.group_code
    `);
    res.json({ items: rows, selectedCount: rows.filter((r) => r.selected).length });
  });

  router.post('/best-thirds', async (req, res) => {
    const { selectedGroupCodes } = req.body;
    if (!Array.isArray(selectedGroupCodes) || selectedGroupCodes.length !== 8) {
      return res.status(400).json({ error: 'Tam olarak 8 grup secilmeli' });
    }

    await query('UPDATE best_thirds SET selected = FALSE');
    for (const code of selectedGroupCodes) {
      await query('UPDATE best_thirds SET selected = TRUE WHERE group_code = $1', [code]);
    }
    await logAudit('best_thirds', { selectedGroupCodes });
    res.json({ ok: true, selected: 8 });
  });

  router.get('/bracket/setup', async (req, res) => {
    const complete = await allGroupResultsComplete();
    const selectedCount = await countSelectedBestThirds();
    const { rows: slots } = await query(`
      SELECT bts.match_no, bts.team_id, t.name
      FROM bracket_third_slots bts
      JOIN teams t ON t.id = bts.team_id
    `);
    const { rows: selectedThirds } = await query(`
      SELECT bt.group_code, t.id, t.name
      FROM best_thirds bt JOIN teams t ON t.id = bt.team_id WHERE bt.selected = TRUE
    `);
    res.json({
      groupResultsComplete: complete,
      selectedThirdsCount: selectedCount,
      thirdSlotMatches: THIRD_SLOT_MATCHES,
      assignments: slots,
      availableThirds: selectedThirds,
    });
  });

  router.post('/bracket/setup-third-teams', async (req, res) => {
    const { assignments } = req.body;
    if (!Array.isArray(assignments) || assignments.length !== 8) {
      return res.status(400).json({ error: '8 mac icin atama gerekli' });
    }

    const selectedCount = await countSelectedBestThirds();
    if (selectedCount !== 8) {
      return res.status(400).json({ error: 'Once 8 ucuncu secilmeli' });
    }

    const { rows: allowed } = await query(`
      SELECT bt.team_id FROM best_thirds bt WHERE bt.selected = TRUE
    `);
    const allowedIds = new Set(allowed.map((r) => r.team_id));
    const teamIds = assignments.map((a) => a.teamId);
    if (new Set(teamIds).size !== 8) {
      return res.status(400).json({ error: 'Ayni ucuncu iki maca atanamaz' });
    }
    for (const id of teamIds) {
      if (!allowedIds.has(id)) {
        return res.status(400).json({ error: 'Sadece secilen 8 ucuncu atanabilir' });
      }
    }

    const matchNos = assignments.map((a) => a.matchNo);
    if (!matchNos.every((n) => THIRD_SLOT_MATCHES.includes(n))) {
      return res.status(400).json({ error: 'Gecersiz mac numarasi' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM bracket_third_slots');
      for (const a of assignments) {
        await client.query(
          'INSERT INTO bracket_third_slots (match_no, team_id) VALUES ($1, $2)',
          [a.matchNo, a.teamId]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    await logAudit('setup_third_teams', { assignments });
    res.json({ ok: true });
  });

  router.post('/bracket/build-round32', async (req, res) => {
    try {
      await buildRoundOf32();
      await logAudit('build_round32', {});
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/bracket/matches', async (req, res) => {
    const { rows } = await query(`
      SELECT bm.*,
        ht.name AS home_name, at.name AS away_name,
        wt.name AS winner_name
      FROM bracket_matches bm
      LEFT JOIN teams ht ON ht.id = bm.home_team_id
      LEFT JOIN teams at ON at.id = bm.away_team_id
      LEFT JOIN teams wt ON wt.id = bm.winner_team_id
      ORDER BY bm.match_no
    `);
    res.json({
      matches: rows.map((m) => ({
        ...m,
        stageLabel: STAGE_LABELS[m.stage],
      })),
    });
  });

  router.post('/bracket/:matchNo/winner', async (req, res) => {
    const matchNo = parseInt(req.params.matchNo, 10);
    const { winnerTeamId, force } = req.body;
    if (!winnerTeamId) {
      return res.status(400).json({ error: 'Kazanan gerekli' });
    }
    try {
      const result = await advanceWinner(matchNo, winnerTeamId, !!force);
      await logAudit('match_winner', { matchNo, winnerTeamId, force });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/champion', async (req, res) => {
    const champion = await getChampion();
    res.json({ champion });
  });

  router.get('/dashboard', async (req, res) => {
    const users = await query('SELECT COUNT(*)::int AS c FROM users');
    const complete = await allGroupResultsComplete();
    const thirds = await countSelectedBestThirds();
    const { rows: slotCount } = await query('SELECT COUNT(*)::int AS c FROM bracket_third_slots');
    const champion = await getChampion();
    res.json({
      participantCount: users.rows[0].c,
      groupResultsComplete: complete,
      bestThirdsSelected: thirds,
      thirdSlotsAssigned: slotCount.rows[0].c,
      champion,
    });
  });

  return router;
}

async function logAudit(action, details) {
  await query('INSERT INTO audit_logs (admin_action, details) VALUES ($1, $2)', [
    action,
    JSON.stringify(details),
  ]);
}

function csv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

module.exports = { createAdminRouter };
