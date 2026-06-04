/**
 * Kanal ID bulmak icin: node server/scripts/resolve-channel-id.js
 * Bot, @slotiosocial kanalinda yonetici olmali.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const username = process.argv[2] || 'slotiosocial';
const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('BOT_TOKEN .env icinde tanimli olmali');
  process.exit(1);
}

fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=@${username.replace('@', '')}`)
  .then((r) => r.json())
  .then((data) => {
    if (!data.ok) {
      console.error('Hata:', data.description);
      process.exit(1);
    }
    console.log('Kanal:', data.result.title);
    console.log('CHANNEL_ID=' + data.result.id);
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
