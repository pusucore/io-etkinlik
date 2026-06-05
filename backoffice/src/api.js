const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export function apiBase() {
  if (raw) return raw;
  return '';
}

export function adminFetch(path, token, options = {}) {
  const base = apiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers }).then(async (res) => {
    if (path.includes('/export') && res.ok) return res;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  });
}
