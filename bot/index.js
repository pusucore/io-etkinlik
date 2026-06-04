require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Telegraf, Markup } = require('telegraf');
const { isAdminTelegram, getAdminTelegramIds } = require('../server/config/adminIds');

if (!process.env.BOT_TOKEN) {
  console.error('BOT_TOKEN eksik!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const webAppUrl = process.env.WEBAPP_URL || 'https://pusucore.github.io/io-etkinlik/';
const adminUrl = `${webAppUrl.replace(/\/$/, '')}/admin`;

function adminOnly(ctx, next) {
  if (!isAdminTelegram(ctx.from?.id)) {
    return ctx.reply('Bu komut sadece yetkili adminler icindir.');
  }
  return next();
}

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

bot.command('admin', adminOnly, async (ctx) => {
  await ctx.reply(
    `Backoffice (local):\n${adminUrl}\n\nGiris icin .env dosyasindaki ADMIN_PASSWORD kullanilir.`,
    { disable_web_page_preview: true }
  );
});

bot.launch();
console.log('Telegram bot basladi. Admin TG:', getAdminTelegramIds().join(', ') || '(yok)');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
