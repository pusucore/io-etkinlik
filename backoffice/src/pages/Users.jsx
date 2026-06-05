import { useEffect, useState } from 'react';
import { adminFetch } from '../api';

export default function Users({ token }) {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);

  function load() {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    adminFetch(`/api/admin/users${qs}`, token).then((d) => setUsers(d.users || []));
  }

  useEffect(() => {
    load();
  }, [token]);

  async function recheck(id) {
    await adminFetch(`/api/admin/users/${id}/recheck-channel`, token, { method: 'POST' });
    load();
  }

  async function disqualify(id) {
    if (!window.confirm('Kullanıcı diskalifiye edilsin mi?')) return;
    const reason = window.prompt('Sebep', 'admin_disqualified');
    await adminFetch(`/api/admin/users/${id}/disqualify`, token, {
      method: 'POST',
      body: JSON.stringify({ confirm: true, reason }),
    });
    load();
  }

  return (
    <div>
      <div className="toolbar">
        <input
          className="input"
          placeholder="Ara: Slotio / Telegram / ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="btn" onClick={load}>
          Ara
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Slotio</th>
              <th>TG</th>
              <th>Tahmin</th>
              <th>Ödül</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.slotio_username}</td>
                <td>{u.telegram_username || u.telegram_id}</td>
                <td>{u.prediction_locked ? '✓' : '—'}</td>
                <td>{u.reward_eligible ? 'Uygun' : '—'}</td>
                <td>
                  <button type="button" className="btn-sm" onClick={() => recheck(u.id)}>
                    Kanal
                  </button>
                  <button type="button" className="btn-sm danger" onClick={() => disqualify(u.id)}>
                    Diskalifiye
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
