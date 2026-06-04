const { query, getClient } = require('../db');
const {
  nextMatchMap,
  thirdPlaceMap,
  THIRD_SLOT_MATCHES,
} = require('../constants');

async function getGroupResultsMap() {
  const { rows } = await query(`
    SELECT gr.*,
      t1.name AS p1_name, t2.name AS p2_name, t3.name AS p3_name, t4.name AS p4_name
    FROM group_results gr
    LEFT JOIN teams t1 ON t1.id = gr.position_1_team_id
    LEFT JOIN teams t2 ON t2.id = gr.position_2_team_id
    LEFT JOIN teams t3 ON t3.id = gr.position_3_team_id
    LEFT JOIN teams t4 ON t4.id = gr.position_4_team_id
    ORDER BY gr.group_code
  `);
  const map = {};
  for (const r of rows) {
    map[r.group_code] = r;
  }
  return map;
}

async function resolveSource(source, groupMap, thirdSlots, winnerCache) {
  if (!source) return null;

  if (source === '3X') return null;

  const winMatch = source.match(/^W(\d+)$/);
  if (winMatch) {
    const mNo = parseInt(winMatch[1], 10);
    const cached = winnerCache[mNo];
    if (cached) return cached;
    const { rows } = await query(
      'SELECT winner_team_id FROM bracket_matches WHERE match_no = $1',
      [mNo]
    );
    return rows[0]?.winner_team_id || null;
  }

  const loseMatch = source.match(/^L(\d+)$/);
  if (loseMatch) {
    const mNo = parseInt(loseMatch[1], 10);
    const { rows } = await query(
      'SELECT loser_team_id FROM bracket_matches WHERE match_no = $1',
      [mNo]
    );
    return rows[0]?.loser_team_id || null;
  }

  const posMatch = source.match(/^(\d)([A-L])$/);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const code = posMatch[2];
    const gr = groupMap[code];
    if (!gr) return null;
    const key = `position_${pos}_team_id`;
    return gr[key] || null;
  }

  return null;
}

async function resolveMatchTeams(match, groupMap, thirdSlots) {
  let homeId = match.home_team_id;
  let awayId = match.away_team_id;

  if (!homeId && match.home_source) {
    if (match.home_source === '3X') {
      homeId = thirdSlots[match.match_no]?.home || null;
    } else {
      homeId = await resolveSource(match.home_source, groupMap, thirdSlots, {});
    }
  }
  if (!awayId && match.away_source) {
    if (match.away_source === '3X') {
      awayId = thirdSlots[match.match_no]?.away || null;
    } else {
      awayId = await resolveSource(match.away_source, groupMap, thirdSlots, {});
    }
  }

  return { homeId, awayId };
}

async function loadThirdSlots() {
  const { rows } = await query('SELECT match_no, team_id FROM bracket_third_slots');
  const slots = {};
  for (const r of rows) {
    const match = await query(
      'SELECT home_source, away_source FROM bracket_matches WHERE match_no = $1',
      [r.match_no]
    );
    const m = match.rows[0];
    if (m?.away_source === '3X') slots[r.match_no] = { away: r.team_id };
    if (m?.home_source === '3X') slots[r.match_no] = { ...(slots[r.match_no] || {}), home: r.team_id };
    if (!m?.home_source && !m?.away_source) {
      slots[r.match_no] = { away: r.team_id };
    }
  }
  for (const r of rows) {
    const { rows: mRows } = await query(
      'SELECT home_source, away_source FROM bracket_matches WHERE match_no = $1',
      [r.match_no]
    );
    const m = mRows[0];
    if (!slots[r.match_no]) slots[r.match_no] = {};
    if (m?.home_source === '3X') slots[r.match_no].home = r.team_id;
    if (m?.away_source === '3X') slots[r.match_no].away = r.team_id;
  }
  return slots;
}

async function allGroupResultsComplete() {
  const { rows } = await query(`
    SELECT group_code, position_1_team_id, position_2_team_id, position_3_team_id, position_4_team_id, locked
    FROM group_results
  `);
  if (rows.length < 12) return false;
  return rows.every(
    (r) =>
      r.locked &&
      r.position_1_team_id &&
      r.position_2_team_id &&
      r.position_3_team_id &&
      r.position_4_team_id
  );
}

async function countSelectedBestThirds() {
  const { rows } = await query('SELECT COUNT(*)::int AS c FROM best_thirds WHERE selected = TRUE');
  return rows[0].c;
}

async function buildRoundOf32() {
  const complete = await allGroupResultsComplete();
  if (!complete) throw new Error('Tum grup siralamalari tamamlanmali');

  const selectedCount = await countSelectedBestThirds();
  if (selectedCount !== 8) throw new Error('Tam olarak 8 ucuncu secilmeli');

  const { rows: thirdSlotRows } = await query('SELECT match_no, team_id FROM bracket_third_slots');
  if (thirdSlotRows.length !== 8) {
    throw new Error('8 adet 3X takim yerlesimi yapilmali');
  }

  const groupMap = await getGroupResultsMap();

  const { rows: r32 } = await query(
    `SELECT * FROM bracket_matches WHERE stage = 'round_of_32' ORDER BY match_no`
  );

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const match of r32) {
      let homeId = null;
      let awayId = null;

      if (match.home_source && match.home_source !== '3X') {
        homeId = await resolveSource(match.home_source, groupMap, {}, {});
      }
      if (match.away_source && match.away_source !== '3X') {
        awayId = await resolveSource(match.away_source, groupMap, {}, {});
      }

      if (match.home_source === '3X' || match.away_source === '3X') {
        const slot = thirdSlotRows.find((s) => s.match_no === match.match_no);
        if (match.away_source === '3X') awayId = slot?.team_id;
        if (match.home_source === '3X') homeId = slot?.team_id;
      }

      if (!homeId || !awayId) {
        throw new Error(`M${match.match_no} takimlari cozulemedi`);
      }

      await client.query(
        `UPDATE bracket_matches SET home_team_id = $1, away_team_id = $2, updated_at = NOW() WHERE match_no = $3`,
        [homeId, awayId, match.match_no]
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function advanceWinner(matchNo, winnerTeamId, force = false) {
  const { rows } = await query('SELECT * FROM bracket_matches WHERE match_no = $1', [matchNo]);
  const match = rows[0];
  if (!match) throw new Error('Mac bulunamadi');

  if (match.locked && !force) {
    throw new Error('Kilitli mac; onay gerekli');
  }

  const homeId = match.home_team_id;
  const awayId = match.away_team_id;
  if (!homeId || !awayId) throw new Error('Takimlar belli degil');
  if (winnerTeamId !== homeId && winnerTeamId !== awayId) {
    throw new Error('Kazanan mactaki takimlardan biri olmali');
  }

  const loserTeamId = winnerTeamId === homeId ? awayId : homeId;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE bracket_matches SET winner_team_id = $1, loser_team_id = $2, locked = TRUE, updated_at = NOW() WHERE match_no = $3`,
      [winnerTeamId, loserTeamId, matchNo]
    );

    const advance = nextMatchMap[matchNo];
    if (advance) {
      const col = advance.slot === 'home' ? 'home_team_id' : 'away_team_id';
      await client.query(
        `UPDATE bracket_matches SET ${col} = $1, updated_at = NOW() WHERE match_no = $2`,
        [winnerTeamId, advance.next]
      );
    }

    const third = thirdPlaceMap[matchNo];
    if (third) {
      const col = third.slot === 'home' ? 'home_team_id' : 'away_team_id';
      await client.query(
        `UPDATE bracket_matches SET ${col} = $1, updated_at = NOW() WHERE match_no = $2`,
        [loserTeamId, third.next]
      );
    }

    await client.query('COMMIT');
    return { matchNo, winnerTeamId, loserTeamId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getBracketForPublic() {
  const { rows: matches } = await query(`
    SELECT bm.*,
      ht.name AS home_name, ht.flag_emoji AS home_flag,
      at.name AS away_name, at.flag_emoji AS away_flag,
      wt.name AS winner_name
    FROM bracket_matches bm
    LEFT JOIN teams ht ON ht.id = bm.home_team_id
    LEFT JOIN teams at ON at.id = bm.away_team_id
    LEFT JOIN teams wt ON wt.id = bm.winner_team_id
    ORDER BY bm.match_no
  `);
  return matches;
}

async function getChampion() {
  const { rows } = await query(`
    SELECT wt.id, wt.name, wt.flag_emoji
    FROM bracket_matches bm
    JOIN teams wt ON wt.id = bm.winner_team_id
    WHERE bm.match_no = 104 AND bm.winner_team_id IS NOT NULL
  `);
  return rows[0] || null;
}

module.exports = {
  getGroupResultsMap,
  resolveSource,
  loadThirdSlots,
  allGroupResultsComplete,
  countSelectedBestThirds,
  buildRoundOf32,
  advanceWinner,
  getBracketForPublic,
  getChampion,
  THIRD_SLOT_MATCHES,
};
