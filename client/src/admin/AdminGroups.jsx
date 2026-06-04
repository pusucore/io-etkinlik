import { useEffect, useState } from 'react';
import { adminFetch } from '../api';
import ConfirmModal from './ConfirmModal';

export default function AdminGroups({ token }) {
  const [results, setResults] = useState([]);
  const [teams, setTeams] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/group-results', token),
      adminFetch('/api/admin/teams', token),
    ]).then(([gr, t]) => {
      setResults(gr.results || []);
      setTeams(t.teams || []);
      const d = {};
      for (const r of gr.results || []) {
        d[r.group_code] = [
          r.position_1_team_id,
          r.position_2_team_id,
          r.position_3_team_id,
          r.position_4_team_id,
        ];
      }
      setDrafts(d);
    });
  }, [token]);

  function groupTeams(code) {
    return teams.filter((t) => t.group_code === code);
  }

  function setPos(code, idx, teamId) {
    setDrafts((prev) => {
      const arr = [...(prev[code] || [])];
      arr[idx] = parseInt(teamId, 10);
      return { ...prev, [code]: arr };
    });
  }

  function save(code) {
    setConfirm({
      message: `${code} grubu sıralaması kaydedilsin mi?`,
      action: async () => {
        await adminFetch('/api/admin/group-results', token, {
          method: 'POST',
          body: JSON.stringify({
            group_code: code,
            positions: drafts[code],
            locked: true,
          }),
        });
        setConfirm(null);
        const gr = await adminFetch('/api/admin/group-results', token);
        setResults(gr.results || []);
      },
    });
  }

  return (
    <div>
      {results.map((r) => {
        const code = r.group_code;
        const gt = groupTeams(code);
        const positions = drafts[code] || [];
        return (
          <div key={code} className="card">
            <h3>{code} Grubu Sonuç Sıralaması</h3>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="select-row">
                <span style={{ color: 'var(--neon)' }}>{i + 1}.</span>
                <select
                  value={positions[i] || ''}
                  onChange={(e) => setPos(code, i, e.target.value)}
                >
                  <option value="">Takım seç</option>
                  {gt.map((t) => (
                    <option key={t.id} value={t.id} disabled={positions.includes(t.id) && positions[i] !== t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button type="button" className="btn btn-primary" onClick={() => save(code)}>
              Kaydet
            </button>
          </div>
        );
      })}
      <ConfirmModal
        message={confirm?.message}
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
