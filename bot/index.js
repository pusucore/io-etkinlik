require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN eksik!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:5173';
const channelUrl = process.env.CHANNEL_URL || 'https://t.me/';

bot.start(async (ctx) => {
  await ctx.reply(
    'Slotio Dunya Kupasi etkinligine hos geldin!\n\nAsagidaki butona tiklayarak mini uygulamaya katilabilirsin.',
    Markup.inlineKeyboard([
      Markup.button.webApp('Dunya Kupasi Mini App', webAppUrl),
    ])
  );
});

bot.command('etkinlik', async (ctx) => {
  await ctx.reply(
    'Etkinlik mini uygulamasi:',
    Markup.inlineKeyboard([
      Markup.button.webApp('Mini App Ac', webAppUrl),
    ])
  );
});

bot.launch();
console.log('Telegram bot basladi.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
