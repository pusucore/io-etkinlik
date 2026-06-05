const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export const API_BASE_URL = raw;
export const HAS_API = Boolean(API_BASE_URL);

export const CHANNEL_URL =
  import.meta.env.VITE_CHANNEL_URL || 'https://t.me/slotiosocial';

export const API_UNAVAILABLE_MSG =
  'Etkinlik bağlantısı hazırlanıyor. Lütfen daha sonra tekrar dene.';

export const GITHUB_PAGES_URL = 'https://pusucore.github.io/io-etkinlik/';
