function getAdminTelegramIds() {
  return (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
}

function isAdminTelegram(telegramId) {
  const ids = getAdminTelegramIds();
  if (!ids.length) return false;
  return ids.includes(Number(telegramId));
}

module.exports = { getAdminTelegramIds, isAdminTelegram };
