const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, query } = require('./db');
const {
  groups,
  roundOf32Template,
  knockoutTemplate,
} = require('./constants');

const TEAM_FLAGS = {
  Meksika: '🇲🇽',
  'Güney Afrika': '🇿🇦',
  'Güney Kore': '🇰🇷',
  Çekya: '🇨🇿',
  Kanada: '🇨🇦',
  'Bosna-Hersek': '🇧🇦',
  Katar: '🇶🇦',
  İsviçre: '🇨🇭',
  Brezilya: '🇧🇷',
  Fas: '🇲🇦',
  Haiti: '🇭🇹',
  İskoçya: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  ABD: '🇺🇸',
  Paraguay: '🇵🇾',
  Avustralya: '🇦🇺',
  Türkiye: '🇹🇷',
  Almanya: '🇩🇪',
  'Curaçao': '🇨🇼',
  'Fildişi Sahili': '🇨🇮',
  Ekvador: '🇪🇨',
  Hollanda: '🇳🇱',
  Japonya: '🇯🇵',
  İsveç: '🇸🇪',
  Tunus: '🇹🇳',
  Belçika: '🇧🇪',
  Mısır: '🇪🇬',
  İran: '🇮🇷',
  'Yeni Zelanda': '🇳🇿',
  İspanya: '🇪🇸',
  'Yeşil Burun Adaları': '🇨🇻',
  'Suudi Arabistan': '🇸🇦',
  Uruguay: '🇺🇾',
  Fransa: '🇫🇷',
  Senegal: '🇸🇳',
  Irak: '🇮🇶',
  Norveç: '🇳🇴',
  Arjantin: '🇦🇷',
  Cezayir: '🇩🇿',
  Avusturya: '🇦🇹',
  Ürdün: '🇯🇴',
  Portekiz: '🇵🇹',
  'Demokratik Kongo': '🇨🇩',
  Özbekistan: '🇺🇿',
  Kolombiya: '🇨🇴',
  İngiltere: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Hırvatistan: '🇭🇷',
  Gana: '🇬🇭',
  Panama: '🇵🇦',
};

async function seed() {
  const teamCount = await query('SELECT COUNT(*)::int AS c FROM teams');
  if (teamCount.rows[0].c === 0) {
    for (const [code, names] of Object.entries(groups)) {
      for (let i = 0; i < names.length; i++) {
        await query(
          `INSERT INTO teams (group_code, default_position, name, flag_emoji)
           VALUES ($1, $2, $3, $4)`,
          [code, i + 1, names[i], TEAM_FLAGS[names[i]] || null]
        );
      }
    }
    console.log('48 takim eklendi.');
  }

  for (const code of Object.keys(groups)) {
    const { rows: teams } = await query(
      'SELECT id, default_position FROM teams WHERE group_code = $1 ORDER BY default_position',
      [code]
    );
    const existing = await query('SELECT id FROM group_results WHERE group_code = $1', [code]);
    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO group_results (group_code, position_1_team_id, position_2_team_id, position_3_team_id, position_4_team_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [code, teams[0].id, teams[1].id, teams[2].id, teams[3].id]
      );
    }

    const third = teams[2];
    const bt = await query('SELECT id FROM best_thirds WHERE group_code = $1', [code]);
    if (bt.rows.length === 0) {
      await query(
        'INSERT INTO best_thirds (group_code, team_id, selected) VALUES ($1, $2, FALSE)',
        [code, third.id]
      );
    }
  }
  console.log('Grup sonuclari ve best_thirds hazir.');

  const matchCount = await query('SELECT COUNT(*)::int AS c FROM bracket_matches');
  if (matchCount.rows[0].c === 0) {
    for (const t of roundOf32Template) {
      await query(
        `INSERT INTO bracket_matches (match_no, stage, home_source, away_source)
         VALUES ($1, 'round_of_32', $2, $3)`,
        [t.matchNo, t.home, t.away]
      );
    }
    for (const t of knockoutTemplate) {
      await query(
        `INSERT INTO bracket_matches (match_no, stage, home_source, away_source)
         VALUES ($1, $2, $3, $4)`,
        [t.matchNo, t.stage, t.home, t.away]
      );
    }
    console.log('Bracket maclari (73-104) eklendi.');
  }

  console.log('Seed tamamlandi.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed hatasi:', err);
  process.exit(1);
});
