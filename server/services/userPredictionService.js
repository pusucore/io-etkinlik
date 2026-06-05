const { query, getClient } = require('../db');
const {
  roundOf32Template,
  knockoutTemplate,
  nextMatchMap,
  thirdPlaceMap,
  THIRD_SLOT_MATCHES,
  STAGE_LABELS,
} = require('../constants');

async function getUserByTelegramId(telegramId) {
  const { rows } = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  return rows[0] || null;
}

async function getOrCreatePrediction(userId) {
  const existing = await query('SELECT * FROM predictions WHERE user_id = $1', [userId]);
  if (existing.rows[0]) return existing.rows[0];

  const { rows } = await query(
    `INSERT INTO predictions (user_id, status) VALUES ($1, 'draft') RETURNING *`,
    [userId]
  );
  return rows[0];
}

async function getPredictionGroupMap(predictionId) {
  const { rows } = await query(
    `SELECT pgr.group_code, pgr.position, pgr.team_id, t.name, t.flag_emoji
     FROM prediction_group_rankings pgr
     JOIN teams t ON t.id = pgr.team_id
     WHERE pgr.prediction_id = $1
     ORDER BY pgr.group_code, pgr.position`,
    [predictionId]
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.group_code]) map[r.group_code] = { positions: {} };
    map[r.group_code].positions[r.position] = {
      teamId: r.team_id,
      name: r.name,
      flag: r.flag_emoji,
    };
  }
  return map;
}

function groupMapToLegacy(groupMap) {
  const legacy = {};
  for (const [code, g] of Object.entries(groupMap)) {
    legacy[code] = {
      position_1_team_id: g.positions[1]?.teamId,
      position_2_team_id: g.positions[2]?.teamId,
      position_3_team_id: g.positions[3]?.teamId,
      position_4_team_id: g.positions[4]?.teamId,
    };
  }
  return legacy;
}

async function countCompletedGroups(predictionId) {
  const { rows } = await query(
    `SELECT group_code, COUNT(*)::int AS c
     FROM prediction_group_rankings WHERE prediction_id = $1
     GROUP BY group_code`,
    [predictionId]
  );
  return rows.filter((r) => r.c === 4).length;
}

async function saveGroupRankings(predictionId, groupCode, teamIdsByPosition) {
  const pred = await query('SELECT locked FROM predictions WHERE id = $1', [predictionId]);
  if (pred.rows[0]?.locked) throw new Error('Tahmin kilitli');

  if (!Array.isArray(teamIdsByPosition) || teamIdsByPosition.length !== 4) {
    throw new Error('4 takım sıralaması gerekli');
  }
  const unique = new Set(teamIdsByPosition);
  if (unique.size !== 4) throw new Error('Aynı takım iki kez olamaz');

  const { rows: valid } = await query('SELECT id FROM teams WHERE group_code = $1', [groupCode]);
  const validIds = new Set(valid.map((t) => t.id));
  if (!teamIdsByPosition.every((id) => validIds.has(id))) {
    throw new Error('Grup dışı takım');
  }

  await query(
    'DELETE FROM prediction_group_rankings WHERE prediction_id = $1 AND group_code = $2',
    [predictionId, groupCode]
  );

  for (let pos = 0; pos < 4; pos++) {
    await query(
      `INSERT INTO prediction_group_rankings (prediction_id, group_code, position, team_id)
       VALUES ($1, $2, $3, $4)`,
      [predictionId, groupCode, pos + 1, teamIdsByPosition[pos]]
    );
  }

  const thirdId = teamIdsByPosition[2];
  await query(
    `DELETE FROM prediction_best_thirds WHERE prediction_id = $1 AND group_code = $2`,
    [predictionId, groupCode]
  );
  await query(
    `INSERT INTO prediction_best_thirds (prediction_id, group_code, team_id) VALUES ($1, $2, $3)`,
    [predictionId, groupCode, thirdId]
  );

  return { completedGroups: await countCompletedGroups(predictionId) };
}

async function saveBestThirds(predictionId, groupCodes) {
  const pred = await query('SELECT locked FROM predictions WHERE id = $1', [predictionId]);
  if (pred.rows[0]?.locked) throw new Error('Tahmin kilitli');

  if (!Array.isArray(groupCodes) || groupCodes.length !== 8) {
    throw new Error('Tam 8 üçüncü seçilmeli');
  }

  const completed = await countCompletedGroups(predictionId);
  if (completed < 12) throw new Error('Önce 12 grup sıralamasını tamamlayın');

  const unique = new Set(groupCodes);
  if (unique.size !== 8) throw new Error('Aynı grup iki kez seçilemez');

  await query('DELETE FROM prediction_best_thirds WHERE prediction_id = $1', [predictionId]);

  for (const code of groupCodes) {
    const { rows } = await query(
      `SELECT team_id FROM prediction_group_rankings
       WHERE prediction_id = $1 AND group_code = $2 AND position = 3`,
      [predictionId, code]
    );
    if (!rows[0]) throw new Error(`Grup ${code} üçüncüsü bulunamadı`);
    await query(
      `INSERT INTO prediction_best_thirds (prediction_id, group_code, team_id) VALUES ($1, $2, $3)`,
      [predictionId, code, rows[0].team_id]
    );
  }

  await autoAssignThirdSlots(predictionId);
  await ensurePredictionMatches(predictionId);

  return { selected: 8 };
}

async function autoAssignThirdSlots(predictionId) {
  const { rows: thirds } = await query(
    `SELECT pbt.group_code, pbt.team_id FROM prediction_best_thirds pbt
     WHERE pbt.prediction_id = $1 ORDER BY pbt.group_code`,
    [predictionId]
  );
  if (thirds.length !== 8) throw new Error('8 üçüncü seçilmeli');

  await query('DELETE FROM prediction_third_slots WHERE prediction_id = $1', [predictionId]);
  const teamIds = thirds.map((t) => t.team_id);
  for (let i = 0; i < THIRD_SLOT_MATCHES.length; i++) {
    await query(
      `INSERT INTO prediction_third_slots (prediction_id, match_no, team_id) VALUES ($1, $2, $3)`,
      [predictionId, THIRD_SLOT_MATCHES[i], teamIds[i]]
    );
  }
}

async function loadThirdSlots(predictionId) {
  const { rows } = await query(
    'SELECT match_no, team_id FROM prediction_third_slots WHERE prediction_id = $1',
    [predictionId]
  );
  const slots = {};
  for (const r of rows) {
    const { rows: mRows } = await query(
      'SELECT home_source, away_source FROM bracket_matches WHERE match_no = $1',
      [r.match_no]
    );
    const m = mRows[0];
    if (!slots[r.match_no]) slots[r.match_no] = {};
    if (m?.home_source === '3X') slots[r.match_no].home = r.team_id;
    if (m?.away_source === '3X') slots[r.match_no].away = r.team_id;
    if (!m?.home_source && m?.away_source === '3X') slots[r.match_no].away = r.team_id;
  }
  return slots;
}

async function resolveSource(source, groupMap, thirdSlots, winnerCache) {
  if (!source) return null;
  if (source === '3X') return null;

  const winMatch = source.match(/^W(\d+)$/);
  if (winMatch) {
    const mNo = parseInt(winMatch[1], 10);
    return winnerCache[mNo] || null;
  }

  const loseMatch = source.match(/^L(\d+)$/);
  if (loseMatch) {
    const mNo = parseInt(loseMatch[1], 10);
    return winnerCache[`L${mNo}`] || null;
  }

  const posMatch = source.match(/^(\d)([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const code = posMatch[2];
    const gr = groupMap[code];
    if (!gr) return null;
    return gr[`position_${pos}_team_id`] || null;
  }
  return null;
}

async function ensurePredictionMatches(predictionId) {
  const count = await query(
    'SELECT COUNT(*)::int AS c FROM prediction_matches WHERE prediction_id = $1',
    [predictionId]
  );
  if (count.rows[0].c > 0) return;

  const all = [...roundOf32Template.map((t) => ({ ...t, stage: 'round_of_32' })), ...knockoutTemplate];
  for (const t of all) {
    await query(
      `INSERT INTO prediction_matches (prediction_id, match_no, stage, home_team_id, away_team_id)
       VALUES ($1, $2, $3, NULL, NULL)`,
      [predictionId, t.matchNo, t.stage]
    );
  }
}

async function buildMatchTeams(predictionId) {
  const groupMapRaw = await getPredictionGroupMap(predictionId);
  const groupMap = groupMapToLegacy(groupMapRaw);
  const thirdSlots = await loadThirdSlots(predictionId);

  const { rows: winners } = await query(
    `SELECT match_no, winner_team_id, loser_team_id FROM prediction_matches WHERE prediction_id = $1`,
    [predictionId]
  );
  const winnerCache = {};
  for (const w of winners) {
    if (w.winner_team_id) winnerCache[w.match_no] = w.winner_team_id;
    if (w.loser_team_id) winnerCache[`L${w.match_no}`] = w.loser_team_id;
  }

  const { rows: templates } = await query(
    'SELECT match_no, stage, home_source, away_source FROM bracket_matches ORDER BY match_no'
  );

  const result = [];
  for (const tmpl of templates) {
    let homeId = null;
    let awayId = null;

    if (tmpl.home_source === '3X') homeId = thirdSlots[tmpl.match_no]?.home || thirdSlots[tmpl.match_no]?.away;
    else homeId = await resolveSource(tmpl.home_source, groupMap, thirdSlots, winnerCache);

    if (tmpl.away_source === '3X') awayId = thirdSlots[tmpl.match_no]?.away || thirdSlots[tmpl.match_no]?.home;
    else awayId = await resolveSource(tmpl.away_source, groupMap, thirdSlots, winnerCache);

    const saved = winners.find((w) => w.match_no === tmpl.match_no);
    const wId = saved?.winner_team_id;

    result.push({
      matchNo: tmpl.match_no,
      stage: tmpl.stage,
      stageLabel: STAGE_LABELS[tmpl.stage] || tmpl.stage,
      homeTeamId: homeId,
      awayTeamId: awayId,
      winnerTeamId: wId,
      ready: !!(homeId && awayId),
    });
  }
  return result;
}

async function saveMatchWinner(predictionId, matchNo, winnerTeamId) {
  const pred = await query('SELECT locked FROM predictions WHERE id = $1', [predictionId]);
  if (pred.rows[0]?.locked) throw new Error('Tahmin kilitli');

  const matches = await buildMatchTeams(predictionId);
  const match = matches.find((m) => m.matchNo === matchNo);
  if (!match) throw new Error('Maç bulunamadı');
  if (!match.ready) throw new Error('Maç henüz hazır değil');
  if (winnerTeamId !== match.homeTeamId && winnerTeamId !== match.awayTeamId) {
    throw new Error('Kazanan maçtaki takımlardan biri olmalı');
  }

  const loserId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

  const { rows: tmplRows } = await query('SELECT stage FROM bracket_matches WHERE match_no = $1', [
    matchNo,
  ]);
  const stage = tmplRows[0]?.stage || match.stage;

  await query(
    `INSERT INTO prediction_matches (prediction_id, match_no, stage, home_team_id, away_team_id, winner_team_id, loser_team_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (prediction_id, match_no) DO UPDATE SET
       home_team_id = EXCLUDED.home_team_id,
       away_team_id = EXCLUDED.away_team_id,
       winner_team_id = EXCLUDED.winner_team_id,
       loser_team_id = EXCLUDED.loser_team_id`,
    [predictionId, matchNo, stage, match.homeTeamId, match.awayTeamId, winnerTeamId, loserId]
  );

  const advance = nextMatchMap[matchNo] || thirdPlaceMap[matchNo];
  if (advance) {
    const next = await query(
      'SELECT * FROM prediction_matches WHERE prediction_id = $1 AND match_no = $2',
      [predictionId, advance.next]
    );
    if (next.rows[0]) {
      const field = advance.slot === 'home' ? 'home_team_id' : 'away_team_id';
      await query(
        `UPDATE prediction_matches SET ${field} = $1 WHERE prediction_id = $2 AND match_no = $3`,
        [winnerTeamId, predictionId, advance.next]
      );
    }
  }

  if (matchNo === 104) {
    await query(
      'UPDATE predictions SET champion_team_id = $1 WHERE id = $2',
      [winnerTeamId, predictionId]
    );
  }
  if (matchNo === 103) {
    await query(
      'UPDATE predictions SET third_place_team_id = $1 WHERE id = $2',
      [winnerTeamId, predictionId]
    );
  }

  return { ok: true };
}

async function getPredictionState(predictionId) {
  const { rows } = await query('SELECT * FROM predictions WHERE id = $1', [predictionId]);
  const pred = rows[0];
  const completedGroups = await countCompletedGroups(predictionId);
  const { rows: bt } = await query(
    'SELECT COUNT(*)::int AS c FROM prediction_best_thirds WHERE prediction_id = $1',
    [predictionId]
  );
  const matches = await buildMatchTeams(predictionId);
  const r32 = matches.filter((m) => m.stage === 'round_of_32');
  const r32Done = r32.filter((m) => m.winnerTeamId).length;

  return {
    prediction: pred,
    completedGroups,
    bestThirdsCount: bt[0].c,
    round32Winners: r32Done,
    championTeamId: pred.champion_team_id,
    locked: pred.locked,
    status: pred.status,
  };
}

async function submitPrediction(predictionId, acceptedTerms) {
  if (!acceptedTerms) throw new Error('Kuralları kabul etmelisiniz');

  const state = await getPredictionState(predictionId);
  if (state.completedGroups < 12) throw new Error('12 grup tamamlanmalı');
  if (state.bestThirdsCount < 8) throw new Error('8 üçüncü seçilmeli');
  if (!state.championTeamId) throw new Error('Şampiyon seçilmeli');

  const { rows: camp } = await query(
    'SELECT prediction_deadline FROM campaign_settings LIMIT 1'
  );
  if (camp[0]?.prediction_deadline && new Date() > new Date(camp[0].prediction_deadline)) {
    throw new Error('Tahmin süresi doldu');
  }

  await query(
    `UPDATE predictions SET locked = TRUE, status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [predictionId]
  );

  await query(
    `UPDATE users SET reward_eligible = (
      is_channel_member AND deposit_eligible AND NOT disqualified
    ) WHERE id = (SELECT user_id FROM predictions WHERE id = $1)`,
    [predictionId]
  );

  return { ok: true };
}

async function getFullPredictionView(predictionId) {
  const groupMap = await getPredictionGroupMap(predictionId);
  const { rows: thirds } = await query(
    `SELECT pbt.group_code, t.name, t.flag_emoji, t.id AS team_id
     FROM prediction_best_thirds pbt JOIN teams t ON t.id = pbt.team_id
     WHERE pbt.prediction_id = $1`,
    [predictionId]
  );
  const matches = await buildMatchTeams(predictionId);
  const { rows: pred } = await query(
    `SELECT p.*, ct.name AS champion_name, ct.flag_emoji AS champion_flag,
            tt.name AS third_name
     FROM predictions p
     LEFT JOIN teams ct ON ct.id = p.champion_team_id
     LEFT JOIN teams tt ON tt.id = p.third_place_team_id
     WHERE p.id = $1`,
    [predictionId]
  );

  return {
    ...pred[0],
    groups: groupMap,
    bestThirds: thirds,
    matches,
  };
}

function maskUsername(name) {
  if (!name || name.length < 4) return '****';
  const visible = Math.min(2, Math.floor(name.length / 4));
  return name.slice(0, visible) + '*'.repeat(Math.max(2, name.length - visible * 2)) + name.slice(-visible);
}

module.exports = {
  getUserByTelegramId,
  getOrCreatePrediction,
  saveGroupRankings,
  saveBestThirds,
  saveMatchWinner,
  getPredictionState,
  submitPrediction,
  getFullPredictionView,
  buildMatchTeams,
  countCompletedGroups,
  maskUsername,
};
