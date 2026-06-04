import { API_BASE_URL } from './config';
import { getInitData } from './telegram';

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

function withInitDataBody(options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return options;

  let payload = {};
  if (options.body) {
    try {
      payload = JSON.parse(options.body);
    } catch {
      payload = {};
    }
  }
  const initData = getInitData();
  if (initData) payload.initData = initData;

  return { ...options, body: JSON.stringify(payload) };
}

export function apiHeaders(extra = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const initData = getInitData();
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  return headers;
}

export async function apiFetch(path, options = {}) {
  const merged = withInitDataBody(options);
  const res = await fetch(apiUrl(path), {
    ...merged,
    headers: {
      ...apiHeaders(),
      ...(merged.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export function adminHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function adminFetch(path, token, options = {}) {
  const baseHeaders = token
    ? adminHeaders(token)
    : { 'Content-Type': 'application/json' };
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
  });
  if (path.includes('/export') && res.ok) {
    return res;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
