const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { pool } = require('./db');

async function migrate() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Calistiriliyor: ${file}`);
    await pool.query(sql);
  }

  console.log('Tum migrationlar tamamlandi.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration hatasi:', err);
  process.exit(1);
});
