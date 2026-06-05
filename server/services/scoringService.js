const { query } = require('../db');

const DEFAULT_RULES = [
  { key: 'group_first', label: 'Doğru grup birincisi', points: 5 },
  { key: 'group_second', label: 'Doğru grup ikincisi', points: 3 },
  { key: 'group_advancing', label: 'Gruptan çıkan takım', points: 2 },
  { key: 'round_of_32', label: 'Son 32 kazananı', points: 3 },
  { key: 'round_of_16', label: 'Son 16 kazananı', points: 5 },
  { key: 'quarter_final', label: 'Çeyrek finalist', points: 7 },
  { key: 'semi_final', label: 'Yarı finalist', points: 10 },
  { key: 'finalist', label: 'Finalist', points: 15 },
  { key: 'champion', label: 'Şampiyon', points: 25 },
  { key: 'third_place', label: 'Üçüncü', points: 10 },
];

async function ensureScoringRules() {
  for (const r of DEFAULT_RULES) {
    await query(
      `INSERT INTO scoring_rules (key, label, points, active)
       VALUES ($1, $2, $3, TRUE) ON CONFLICT (key) DO NOTHING`,
      [r.key, r.label, r.points]
    );
  }
}

async function getRulesMap() {
  await ensureScoringRules();
  const { rows } = await query('SELECT key, points FROM scoring_rules WHERE active = TRUE');
  const map = {};
  for (const r of rows) map[r.key] = r.points;
  return map;
}

async function recalculateAllScores() {
  const rules = await getRulesMap();
  const { rows: predictions } = await query(
    `SELECT p.id, p.user_id FROM predictions p WHERE p.locked = TRUE`
  );

  for (const pred of predictions) {
    const score = await scorePrediction(pred.id, rules);
    await query('UPDATE predictions SET total_score = $1 WHERE id = $2', [score, pred.id]);
    await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [pred.user_id]);
  }

  return { recalculated: predictions.length };
}

async function scorePrediction(predictionId, rules) {
  let total = 0;

  const realGroups = await query(
    `SELECT * FROM real_results WHERE result_type = 'group_rank'`
  );
  const { rows: userRanks } = await query(
    `SELECT group_code, position, team_id FROM prediction_group_rankings WHERE prediction_id = $1`,
    [predictionId]
  );

  for (const ur of userRanks) {
    const real = realGroups.rows.find(
      (r) => r.group_code === ur.group_code && r.position === ur.position
    );
    if (real && real.team_id === ur.team_id) {
      if (ur.position === 1) total += rules.group_first || 0;
      if (ur.position === 2) total += rules.group_second || 0;
    }
  }

  const { rows: realMatches } = await query(
    `SELECT match_no, winner_team_id, result_type FROM real_results WHERE result_type = 'match_winner'`
  );
  const { rows: userMatches } = await query(
    `SELECT match_no, stage, winner_team_id FROM prediction_matches
     WHERE prediction_id = $1 AND winner_team_id IS NOT NULL`,
    [predictionId]
  );

  for (const um of userMatches) {
    const real = realMatches.find((r) => r.match_no === um.match_no);
    if (real && real.winner_team_id === um.winner_team_id) {
      const stageKey = um.stage === 'round_of_32' ? 'round_of_32' : um.stage;
      if (um.stage === 'round_of_16') total += rules.round_of_16 || 0;
      else if (um.stage === 'quarter_final') total += rules.quarter_final || 0;
      else if (um.stage === 'semi_final') total += rules.semi_final || 0;
      else if (um.stage === 'final') total += rules.champion || 0;
      else if (um.stage === 'round_of_32') total += rules.round_of_32 || 0;
      else total += rules[stageKey] || 0;
    }
  }

  const { rows: pred } = await query(
    'SELECT champion_team_id, third_place_team_id FROM predictions WHERE id = $1',
    [predictionId]
  );
  const champReal = await query(
    `SELECT team_id FROM real_results WHERE result_type = 'champion' LIMIT 1`
  );
  if (champReal.rows[0] && pred[0]?.champion_team_id === champReal.rows[0].team_id) {
    total += rules.champion || 0;
  }

  const thirdReal = await query(
    `SELECT team_id FROM real_results WHERE result_type = 'third_place' LIMIT 1`
  );
  if (thirdReal.rows[0] && pred[0]?.third_place_team_id === thirdReal.rows[0].team_id) {
    total += rules.third_place || 0;
  }

  return total;
}

module.exports = {
  ensureScoringRules,
  getRulesMap,
  recalculateAllScores,
  DEFAULT_RULES,
};
