const { query, getClient } = require('../db');

async function importDepositsFromRows(rows, filename, importedBy) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const imp = await client.query(
      `INSERT INTO deposit_imports (filename, imported_by, rows_count) VALUES ($1, $2, $3) RETURNING id`,
      [filename || 'import.csv', importedBy || 'admin', rows.length]
    );
    const importId = imp.rows[0].id;

    const { rows: camp } = await client.query(
      'SELECT min_deposit_amount FROM campaign_settings LIMIT 1'
    );
    const minAmount = Number(camp[0]?.min_deposit_amount) || 1000;

    let matched = 0;
    for (const row of rows) {
      const username = (row.slotio_username || row.username || '').trim();
      if (!username) continue;
      const normalized = username.toLowerCase();
      const amount = parseFloat(row.amount) || 0;

      const rec = await client.query(
        `INSERT INTO deposit_records (
          import_id, slotio_username, slotio_username_normalized,
          amount, currency, deposit_date
        ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          importId,
          username,
          normalized,
          amount,
          row.currency || 'TRY',
          row.deposit_date || null,
        ]
      );

      const { rows: users } = await client.query(
        'SELECT id FROM users WHERE slotio_username_normalized = $1',
        [normalized]
      );
      if (users[0]) {
        const eligible = amount >= minAmount;
        await client.query(
          `UPDATE deposit_records SET matched_user_id = $1 WHERE id = $2`,
          [users[0].id, rec.rows[0].id]
        );
        await client.query(
          `UPDATE users SET deposit_amount = GREATEST(COALESCE(deposit_amount,0), $1),
           deposit_eligible = $2, updated_at = NOW() WHERE id = $3`,
          [amount, eligible, users[0].id]
        );
        if (eligible) matched += 1;
      }
    }

    await client.query('COMMIT');
    return { importId, total: rows.length, matchedEligible: matched };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const header = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/).map((c) => c.trim());
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx];
    });
    rows.push({
      slotio_username: row.slotio_username || row.username || row.kullanici,
      amount: row.amount || row.tutar || row.deposit,
      currency: row.currency || row.para_birimi,
      deposit_date: row.deposit_date || row.tarih,
    });
  }
  return rows;
}

module.exports = { importDepositsFromRows, parseCsv };
