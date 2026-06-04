import { useEffect, useState } from 'react';
import { adminFetch } from '../api';
import ConfirmModal from './ConfirmModal';

export default function AdminUsers({ token }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);

  function load(search = q) {
    const query = search ? `?q=${encodeURIComponent(search)}` : '';
    adminFetch(`/api/admin/users${query}`, token).then((d) => setUsers(d.users || []));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function exportCsv() {
    const res = await fetch('/api/admin/users/export', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function recheck(id) {
    setConfirm({
      message: 'Kanal üyeliği yeniden kontrol edilsin mi?',
      action: async () => {
        await adminFetch(`/api/admin/users/${id}/recheck-channel`, token, { method: 'POST' });
        load();
        setConfirm(null);
      },
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ flex: 1, margin: 0, minWidth: 200 }}
          placeholder="Telegram ID veya Slotio ara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => load()}>
          Ara
        </button>
        <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={exportCsv}>
          CSV
        </button>
      </div>

      {users.map((u) => (
        <div key={u.id} className="card" style={{ fontSize: '0.85rem' }}>
          <strong>#{u.id}</strong> TG:{u.telegram_id} @{u.telegram_username || '-'}
          <br />
          Slotio: {u.slotio_username}
          <br />
          Bonus: {u.bonus_eligible ? 'Aktif' : 'Pasif'} | Kanal: {u.is_channel_member ? 'Evet' : 'Hayır'}
          {u.disqualified && <span className="error"> | Diskalifiye</span>}
          <br />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 8, padding: '8px' }}
            onClick={() => recheck(u.id)}
          >
            Kanalı yeniden kontrol
          </button>
        </div>
      ))}

      <ConfirmModal
        message={confirm?.message}
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
