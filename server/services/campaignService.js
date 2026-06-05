const path = require('path');
const fs = require('fs');
const { query } = require('../db');

const DEFAULT_BODY = `DÜNYA KUPASINDA SLOTIO'DA KAZANMAYA HAZIR MISIN?

SİZE ÖZEL HAZIRLADIĞIMIZ BRACKET TAHMİN ETKİNLİĞİNİ TAMAMLA, ÇEŞİTLİ ÖDÜLLER KAZANMA ŞANSI YAKALA!`;

async function ensureCampaignRow() {
  const { rows } = await query('SELECT id FROM campaign_settings LIMIT 1');
  if (rows[0]) return rows[0].id;

  const miniUrl =
    process.env.MINI_APP_URL ||
    process.env.WEBAPP_URL ||
    'https://pusucore.github.io/io-etkinlik/';
  const channelUrl = process.env.CHANNEL_URL || 'https://t.me/slotiosocial';

  const { rows: inserted } = await query(
    `INSERT INTO campaign_settings (
      start_message_title, start_message_body,
      mini_app_button_text, mini_app_url, channel_url,
      button_text, button_url, terms_text, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
    RETURNING id`,
    [
      'Slotio Dünya Kupası',
      DEFAULT_BODY,
      'Bracket Tahminine Katıl',
      miniUrl,
      channelUrl,
      'Slotio\'ya Git',
      'https://slotio.com',
      defaultTerms(),
    ]
  );
  return inserted[0].id;
}

function defaultTerms() {
  return `• 18 yaş altı katılamaz.
• Kampanya şartları geçerlidir; ödül için kanal takibi ve yatırım şartı gerekir.
• Çoklu hesap ve kötüye kullanım diskalifiye sebebidir.
• Slotio kullanıcı adı doğru girilmelidir.
• Tahmin onaylandıktan sonra değiştirilemez.
• Organizasyon şüpheli katılımları iptal edebilir.`;
}

function formatCampaign(row) {
  if (!row) return null;
  let imageUrl = row.image_url;
  if (row.uploaded_image_path) {
    const base = process.env.API_PUBLIC_URL || '';
    imageUrl = `${base}/uploads/${path.basename(row.uploaded_image_path)}`;
  }
  return {
    title: row.start_message_title,
    body: row.start_message_body,
    imageUrl,
    buttonText: row.button_text,
    buttonUrl: row.button_url,
    miniAppButtonText: row.mini_app_button_text,
    miniAppUrl: row.mini_app_url,
    channelUrl: row.channel_url,
    termsText: row.terms_text,
    predictionDeadline: row.prediction_deadline,
    tournamentStartDate: row.tournament_start_date,
    minDepositAmount: Number(row.min_deposit_amount) || 1000,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

async function getCampaignSettings() {
  await ensureCampaignRow();
  const { rows } = await query('SELECT * FROM campaign_settings ORDER BY id LIMIT 1');
  return formatCampaign(rows[0]);
}

async function updateCampaignSettings(patch) {
  await ensureCampaignRow();
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    start_message_title: patch.start_message_title ?? patch.title,
    start_message_body: patch.start_message_body ?? patch.body,
    image_url: patch.image_url,
    button_text: patch.button_text,
    button_url: patch.button_url,
    mini_app_button_text: patch.mini_app_button_text,
    mini_app_url: patch.mini_app_url,
    channel_url: patch.channel_url,
    terms_text: patch.terms_text,
    prediction_deadline: patch.prediction_deadline,
    tournament_start_date: patch.tournament_start_date,
    min_deposit_amount: patch.min_deposit_amount,
    is_active: patch.is_active,
  };

  for (const [col, val] of Object.entries(map)) {
    if (val !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(val);
    }
  }

  if (!fields.length) return getCampaignSettings();

  fields.push('updated_at = NOW()');
  await query(`UPDATE campaign_settings SET ${fields.join(', ')} WHERE id = (SELECT id FROM campaign_settings LIMIT 1)`, values);
  return getCampaignSettings();
}

async function setCampaignImage(relativePath) {
  await ensureCampaignRow();
  await query(
    `UPDATE campaign_settings SET uploaded_image_path = $1, updated_at = NOW()
     WHERE id = (SELECT id FROM campaign_settings LIMIT 1)`,
    [relativePath]
  );
}

function getImageAbsolutePath(relativePath) {
  return path.join(__dirname, '../../uploads', relativePath);
}

function resolveBotImageSource(row) {
  if (row.uploaded_image_path) {
    const abs = getImageAbsolutePath(path.basename(row.uploaded_image_path));
    if (fs.existsSync(abs)) return { type: 'file', path: abs };
  }
  if (row.image_url) return { type: 'url', url: row.image_url };
  return null;
}

module.exports = {
  ensureCampaignRow,
  getCampaignSettings,
  updateCampaignSettings,
  setCampaignImage,
  resolveBotImageSource,
  formatCampaign,
  DEFAULT_BODY,
};
