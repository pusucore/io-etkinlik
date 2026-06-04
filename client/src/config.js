const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export const API_BASE_URL = raw;

export const CHANNEL_URL =
  import.meta.env.VITE_CHANNEL_URL || 'https://t.me/slotiosocial';

export const HAS_API = Boolean(API_BASE_URL);

export const GITHUB_PAGES_URL = 'https://pusucore.github.io/io-etkinlik/';
