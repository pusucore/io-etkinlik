require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { createPublicRouter } = require('./routes/public');
const { createAdminRouter } = require('./routes/admin');

const required = ['BOT_TOKEN', 'CHANNEL_ID', 'DATABASE_URL', 'JWT_SECRET', 'ADMIN_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Uyari: ${key} tanimli degil`);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(process.env.BOT_TOKEN || 'placeholder');
const telegram = bot.telegram;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use('/api', createPublicRouter(telegram));
app.use('/api/admin', createAdminRouter(telegram));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const index = path.join(clientDist, 'index.html');
  res.sendFile(index, (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
