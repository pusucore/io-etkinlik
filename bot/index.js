require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Telegraf, Markup } = require('telegraf');
const path = require('path');
const fs = require('fs');

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN eksik!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const apiBase = (process.env.API_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3001}`).replace(
  /\/$/,
  ''
);

async function fetchCampaign() {
  try {
    const res = await fetch(`${apiBase}/api/bot/settings`);
    const data = await res.json();
    return data.campaign;
  } catch (err) {
    console.warn('Kampanya ayarlari alinamadi:', err.message);
    return null;
  }
}

function buildKeyboard(campaign) {
  const miniUrl =
    campaign?.miniAppUrl || process.env.MINI_APP_URL || process.env.WEBAPP_URL || 'https://pusucore.github.io/io-etkinlik/';
  const channelUrl = campaign?.channelUrl || process.env.CHANNEL_URL || 'https://t.me/slotiosocial';
  const rows = [];

  rows.push([
    Markup.button.webApp(
      campaign?.miniAppButtonText || 'Bracket Tahminine Katıl',
      miniUrl
    ),
  ]);

  if (campaign?.channelUrl || channelUrl) {
    rows.push([Markup.button.url('Telegram Kanalına Katıl', channelUrl)]);
  }

  if (campaign?.buttonText && campaign?.buttonUrl) {
    rows.push([Markup.button.url(campaign.buttonText, campaign.buttonUrl)]);
  }

  return Markup.inlineKeyboard(rows);
}

async function sendStartMessage(ctx) {
  const campaign = await fetchCampaign();
  const text = campaign?.body ||
    `DÜNYA KUPASINDA SLOTIO'DA KAZANMAYA HAZIR MISIN?\n\nSİZE ÖZEL HAZIRLADIĞIMIZ BRACKET TAHMİN ETKİNLİĞİNİ TAMAMLA, ÇEŞİTLİ ÖDÜLLER KAZANMA ŞANSI YAKALA!`;
  const title = campaign?.title ? `${campaign.title}\n\n` : '';
  const keyboard = buildKeyboard(campaign);

  if (campaign?.image?.type === 'file' && fs.existsSync(campaign.image.path)) {
    await ctx.replyWithPhoto({ source: campaign.image.path }, {
      caption: title + text,
      reply_markup: keyboard.reply_markup,
    });
    return;
  }

  if (campaign?.image?.type === 'url' && campaign.image.url) {
    try {
      await ctx.replyWithPhoto(campaign.image.url, {
        caption: title + text,
        reply_markup: keyboard.reply_markup,
      });
      return;
    } catch {
      /* fallback text */
    }
  }

  await ctx.reply(title + text, keyboard);
}

bot.start(async (ctx) => {
  try {
    await sendStartMessage(ctx);
  } catch (err) {
    console.error('/start hata:', err);
    await ctx.reply('Etkinlik mesajı gönderilemedi. Lütfen daha sonra tekrar deneyin.');
  }
});

bot.command('etkinlik', async (ctx) => {
  await sendStartMessage(ctx);
});

bot.launch();
console.log('Telegram bot basladi.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
