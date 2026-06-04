const API_BASE = import.meta.env.VITE_API_URL || '';

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export function apiHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': getInitData(),
    ...extra,
  };
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...apiHeaders(),
      ...(options.headers || {}),
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
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
