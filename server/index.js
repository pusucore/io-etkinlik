const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const { createPublicRouter } = require('./routes/public');
const { createAdminRouter } = require('./routes/admin');
const { createBotRouter } = require('./routes/bot');
const { rateLimit } = require('./middleware/rateLimit');
const { ensureCampaignRow } = require('./services/campaignService');
const { ensureScoringRules } = require('./services/scoringService');

const required = ['BOT_TOKEN', 'CHANNEL_ID', 'DATABASE_URL', 'JWT_SECRET', 'ADMIN_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Uyari: ${key} tanimli degil`);
  }
}

const DEFAULT_CORS = [
  'https://pusucore.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

function getCorsOrigins() {
  const list = [...DEFAULT_CORS];
  if (process.env.CORS_ORIGIN) list.push(process.env.CORS_ORIGIN.trim());
  if (process.env.CORS_ORIGINS) {
    list.push(
      ...process.env.CORS_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }
  return [...new Set(list)];
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const bot = new Telegraf(process.env.BOT_TOKEN || 'placeholder');
const telegram = bot.telegram;

const corsOrigins = getCorsOrigins();
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60000, max: 120 }));

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.use('/api', createPublicRouter(telegram));
app.use('/api/admin', createAdminRouter(telegram));
app.use('/api/bot', createBotRouter());

ensureCampaignRow().catch(console.error);
ensureScoringRules().catch(console.error);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('CORS:', corsOrigins.join(', '));
});
