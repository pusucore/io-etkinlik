export function getTelegramWebApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

export function initTelegramWebApp() {
  const tg = getTelegramWebApp();
  tg?.ready();
  tg?.expand();
  return tg;
}

export function getInitData() {
  return getTelegramWebApp()?.initData || '';
}

export function getTelegramUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user || null;
}
