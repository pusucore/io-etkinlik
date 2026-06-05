const express = require('express');
const { query } = require('../db');
const { resolveBotImageSource } = require('../services/campaignService');

function createBotRouter() {
  const router = express.Router();

  router.get('/settings', async (_req, res) => {
    const { rows } = await query('SELECT * FROM campaign_settings ORDER BY id LIMIT 1');
    if (!rows[0]) {
      return res.json({ campaign: null });
    }
    const row = rows[0];
    const image = resolveBotImageSource(row);
    res.json({
      campaign: {
        title: row.start_message_title,
        body: row.start_message_body,
        image,
        buttonText: row.button_text,
        buttonUrl: row.button_url,
        miniAppButtonText: row.mini_app_button_text || 'Bracket Tahminine Katıl',
        miniAppUrl: row.mini_app_url || process.env.WEBAPP_URL,
        channelUrl: row.channel_url || process.env.CHANNEL_URL,
      },
    });
  });

  return router;
}

module.exports = { createBotRouter };
