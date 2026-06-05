import { API_BASE_URL, HAS_API, API_UNAVAILABLE_MSG } from './config';
import { getInitData } from './telegram';

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!HAS_API) throw new Error(API_UNAVAILABLE_MSG);
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
  let res;
  try {
    res = await fetch(apiUrl(path), {
      ...merged,
      headers: { ...apiHeaders(), ...(merged.headers || {}) },
    });
  } catch {
    throw new Error(API_UNAVAILABLE_MSG);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || API_UNAVAILABLE_MSG);
  return data;
}
