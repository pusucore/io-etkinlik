const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('./db');

async function migrate() {
  const file = path.join(__dirname, '..', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(file, 'utf8');
  await pool.query(sql);
  console.log('Migration tamamlandi.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration hatasi:', err);
  process.exit(1);
});
