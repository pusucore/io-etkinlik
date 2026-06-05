import { apiBase } from '../api';

const EXPORTS = [
  { key: 'users', label: 'Tüm katılımcılar' },
  { key: 'completed', label: 'Tahmin tamamlayanlar' },
  { key: 'eligible', label: 'Ödül uygun' },
  { key: 'disqualified', label: 'Diskalifiye' },
  { key: 'channel-lost', label: 'Kanal takibini kaybedenler' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'winners', label: 'Kazananlar' },
];

export default function Exports({ token }) {
  function download(key, limit) {
    const base = apiBase();
    let url = `${base}/api/admin/export/${key}?token=${token}`;
    if (key === 'winners' && limit) url += `&limit=${limit}`;
    window.open(url.replace(`?token=${token}`, ''), '_blank');
    fetch(`${base}/api/admin/export/${key}${key === 'winners' ? `?limit=${limit || 10}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${key}.csv`;
        a.click();
      });
  }

  return (
    <div>
      <h2>CSV Export</h2>
      {EXPORTS.map((e) => (
        <button key={e.key} type="button" className="btn" style={{ marginBottom: 8 }} onClick={() => download(e.key, 10)}>
          {e.label}
        </button>
      ))}
      <h3>Kazananlar</h3>
      {[10, 25, 50].map((n) => (
        <button key={n} type="button" className="btn-sm" onClick={() => download('winners', n)}>
          İlk {n}
        </button>
      ))}
    </div>
  );
}
