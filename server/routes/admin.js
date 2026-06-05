const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { query } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { checkChannelMembership } = require('../services/channelService');
const {
  getCampaignSettings,
  updateCampaignSettings,
  setCampaignImage,
} = require('../services/campaignService');
const { importDepositsFromRows, parseCsv } = require('../services/depositService');
const { recalculateAllScores, ensureScoringRules, DEFAULT_RULES } = require('../services/scoringService');
const { getFullPredictionView } = require('../services/userPredictionService');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
});

function createAdminRouter(telegram) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { password, username } = req.body;
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Hatalı şifre' });
    }
    const token = jwt.sign({ role: 'admin', username: username || 'admin' }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });
    res.json({ token });
  });

  router.use(requireAdmin);

  router.get('/campaign', async (_req, res) => {
    res.json({ campaign: await getCampaignSettings() });
  });

  router.put('/campaign', async (req, res) => {
    const campaign = await updateCampaignSettings(req.body);
    await logAudit('update_campaign', req.body);
    res.json({ campaign });
  });

  router.post('/campaign/image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Görsel gerekli' });
    const rel = req.file.filename;
    await setCampaignImage(rel);
    await logAudit('campaign_image', { file: rel });
    res.json({ ok: true, path: rel });
  });

  router.get('/users', async (req, res) => {
    const q = (req.query.q || '').trim();
    let sql = `SELECT u.*, p.locked AS prediction_locked, p.total_score, p.submitted_at
      FROM users u LEFT JOIN predictions p ON p.user_id = u.id
      ORDER BY u.created_at DESC LIMIT 500`;
    const params = [];
    if (q) {
      if (/^\d+$/.test(q)) {
        sql = `SELECT u.*, p.locked AS prediction_locked, p.total_score
          FROM users u LEFT JOIN predictions p ON p.user_id = u.id
          WHERE u.telegram_id = $1 OR u.id = $1 ORDER BY u.created_at DESC`;
        params.push(q);
      } else {
        sql = `SELECT u.*, p.locked AS prediction_locked, p.total_score
          FROM users u LEFT JOIN predictions p ON p.user_id = u.id
          WHERE u.slotio_username_normalized LIKE $1 OR u.telegram_username ILIKE $1
          ORDER BY u.created_at DESC LIMIT 500`;
        params.push(`%${q.toLowerCase()}%`);
      }
    }
    const { rows } = await query(sql, params);
    res.json({ users: rows });
  });

  router.get('/users/:id', async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const { rows: pred } = await query('SELECT id FROM predictions WHERE user_id = $1', [rows[0].id]);
    let prediction = null;
    if (pred[0]) prediction = await getFullPredictionView(pred[0].id);
    res.json({ user: rows[0], prediction });
  });

  router.post('/users/:id/recheck-channel', async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const { isMember } = await checkChannelMembership(telegram, process.env.CHANNEL_ID, user.telegram_id);
    const rewardEligible = isMember && user.deposit_eligible && !user.disqualified;

    await query(
      `UPDATE users SET is_channel_member = $1, channel_checked_at = NOW(),
       reward_eligible = CASE WHEN disqualified THEN FALSE ELSE $2 END, updated_at = NOW()
       WHERE id = $3`,
      [isMember, rewardEligible, user.id]
    );
    if (!isMember) {
      await query(
        `UPDATE users SET disqualification_reason = COALESCE(disqualification_reason, 'channel_unfollowed')
         WHERE id = $1 AND disqualified = FALSE`,
        [user.id]
      );
    }
    await logAudit('recheck_channel', { userId: user.id, isMember });
    res.json({ isMember, rewardEligible });
  });

  router.post('/users/:id/disqualify', async (req, res) => {
    const { reason, confirm } = req.body;
    if (!confirm) return res.status(400).json({ error: 'Onay gerekli (confirm: true)' });
    await query(
      `UPDATE users SET disqualified = TRUE, reward_eligible = FALSE,
       disqualification_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason || 'admin_disqualified', req.params.id]
    );
    await logAudit('disqualify', { userId: req.params.id, reason });
    res.json({ ok: true });
  });

  router.post('/users/:id/restore', async (req, res) => {
    if (!req.body.confirm) return res.status(400).json({ error: 'Onay gerekli' });
    await query(
      `UPDATE users SET disqualified = FALSE, disqualification_reason = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );
    await logAudit('restore_user', { userId: req.params.id });
    res.json({ ok: true });
  });

  router.post('/deposits/import', upload.single('file'), async (req, res) => {
    try {
      let rows = [];
      if (req.file) {
        const text = fs.readFileSync(req.file.path, 'utf8');
        rows = parseCsv(text);
      } else if (req.body.rows) {
        rows = req.body.rows;
      } else {
        return res.status(400).json({ error: 'CSV dosyası gerekli' });
      }
      const result = await importDepositsFromRows(
        rows,
        req.file?.originalname,
        req.admin?.username
      );
      await logAudit('deposit_import', result);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/deposits', async (_req, res) => {
    const imports = await query('SELECT * FROM deposit_imports ORDER BY imported_at DESC LIMIT 20');
    const records = await query(
      'SELECT * FROM deposit_records ORDER BY created_at DESC LIMIT 200'
    );
    res.json({ imports: imports.rows, records: records.rows });
  });

  router.get('/scoring-rules', async (_req, res) => {
    await ensureScoringRules();
    const { rows } = await query('SELECT * FROM scoring_rules ORDER BY id');
    res.json({ rules: rows.length ? rows : DEFAULT_RULES });
  });

  router.put('/scoring-rules', async (req, res) => {
    const { rules } = req.body;
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules array gerekli' });
    for (const r of rules) {
      await query(
        `INSERT INTO scoring_rules (key, label, points, active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET label = $2, points = $3, active = $4`,
        [r.key, r.label, r.points, r.active !== false]
      );
    }
    await logAudit('scoring_rules', { count: rules.length });
    res.json({ ok: true });
  });

  router.post('/score/recalculate', async (req, res) => {
    if (!req.body.confirm) return res.status(400).json({ error: 'Onay gerekli (confirm: true)' });
    const result = await recalculateAllScores();
    await logAudit('recalculate_scores', result);
    res.json(result);
  });

  router.get('/leaderboard', async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const { rows } = await query(
      `SELECT u.*, p.total_score, p.locked, p.submitted_at
       FROM users u
       JOIN predictions p ON p.user_id = u.id
       WHERE p.locked = TRUE
       ORDER BY p.total_score DESC NULLS LAST, p.submitted_at ASC
       LIMIT $1`,
      [limit]
    );
    res.json({ entries: rows });
  });

  router.get('/export/:name', async (req, res) => {
    const name = req.params.name.replace(/\.(csv|xlsx)$/, '');
    const winnerLimit = parseInt(req.query.limit, 10) || 10;

    let sql = 'SELECT u.*, p.locked AS prediction_locked, p.total_score, p.submitted_at FROM users u LEFT JOIN predictions p ON p.user_id = u.id';
    if (name === 'completed') {
      sql += ' WHERE p.locked = TRUE';
    } else if (name === 'eligible') {
      sql += ' WHERE u.reward_eligible = TRUE';
    } else if (name === 'disqualified') {
      sql += ' WHERE u.disqualified = TRUE';
    } else if (name === 'channel-lost') {
      sql += ` WHERE u.is_channel_member = FALSE`;
    } else if (name === 'winners') {
      sql = `SELECT u.*, p.total_score FROM users u JOIN predictions p ON p.user_id = u.id
        WHERE p.locked = TRUE ORDER BY p.total_score DESC LIMIT ${winnerLimit}`;
    } else if (name === 'leaderboard') {
      sql = `SELECT u.*, p.total_score FROM users u JOIN predictions p ON p.user_id = u.id
        WHERE p.locked = TRUE ORDER BY p.total_score DESC`;
    }

    const { rows } = await query(sql + ' ORDER BY u.created_at DESC');
    const header = exportColumns();
    const lines = [header.join(',')];
    for (const u of rows) {
      lines.push(exportRow(u).map(csv).join(','));
    }
    const filename = `${name}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send('\uFEFF' + lines.join('\n'));
  });

  router.get('/audit-logs', async (_req, res) => {
    const { rows } = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
    res.json({ logs: rows });
  });

  router.get('/dashboard', async (_req, res) => {
    const users = await query('SELECT COUNT(*)::int AS c FROM users');
    const completed = await query('SELECT COUNT(*)::int AS c FROM predictions WHERE locked = TRUE');
    const eligible = await query('SELECT COUNT(*)::int AS c FROM users WHERE reward_eligible = TRUE');
    res.json({
      participantCount: users.rows[0].c,
      predictionsCompleted: completed.rows[0].c,
      rewardEligibleCount: eligible.rows[0].c,
    });
  });

  return router;
}

function exportColumns() {
  return [
    'telegram_id', 'telegram_username', 'first_name', 'slotio_username',
    'created_at', 'prediction_completed', 'prediction_locked',
    'total_score', 'is_channel_member', 'deposit_eligible', 'deposit_amount',
    'reward_eligible', 'disqualified', 'disqualification_reason',
  ];
}

function exportRow(u) {
  return [
    u.telegram_id,
    u.telegram_username,
    u.telegram_first_name,
    u.slotio_username,
    u.created_at,
    u.prediction_locked ? 'true' : 'false',
    u.prediction_locked ? 'true' : 'false',
    u.total_score || 0,
    u.is_channel_member,
    u.deposit_eligible,
    u.deposit_amount,
    u.reward_eligible,
    u.disqualified,
    u.disqualification_reason,
  ];
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
