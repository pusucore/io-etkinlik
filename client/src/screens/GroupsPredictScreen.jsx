import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

export default function GroupsPredictScreen() {
  const { teams, prediction, refresh } = useApp();
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState('A');
  const [rankings, setRankings] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    const map = {};
    for (const t of teams) {
      if (!map[t.group_code]) map[t.group_code] = [];
      map[t.group_code].push(t);
    }
    for (const code of Object.keys(map)) {
      map[code].sort((a, b) => a.default_position - b.default_position);
    }
    return map;
  }, [teams]);

  useEffect(() => {
    const g = prediction?.groups || {};
    const init = {};
    for (const [code, data] of Object.entries(g)) {
      const positions = data.positions || data;
      init[code] = [1, 2, 3, 4].map((p) => positions[p]?.teamId).filter(Boolean);
    }
    setRankings(init);
  }, [prediction]);

  const completed = Object.keys(rankings).filter((c) => rankings[c]?.length === 4).length;

  function move(code, index, dir) {
    const list = [...(rankings[code] || groups[code]?.map((t) => t.id) || [])];
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    [list[index], list[next]] = [list[next], list[index]];
    setRankings({ ...rankings, [code]: list });
  }

  async function saveGroup(code) {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/api/prediction/group-rankings', {
        method: 'POST',
        body: JSON.stringify({ group_code: code, positions: rankings[code] }),
      });
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const list = rankings[activeGroup] || groups[activeGroup]?.map((t) => t.id) || [];
  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));

  return (
    <div>
      <div className="progress-bar">
        <span>Grup ilerlemesi</span>
        <strong>{completed}/12</strong>
      </div>
      <div className="group-tabs">
        {'ABCDEFGHIJKL'.split('').map((c) => (
          <button
            key={c}
            type="button"
            className={`${activeGroup === c ? 'active' : ''} ${rankings[c]?.length === 4 ? 'done' : ''}`}
            onClick={() => setActiveGroup(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="card">
        <h3>{activeGroup} Grubu — Sıralama (1-4)</h3>
        {list.map((id, idx) => {
          const t = teamById[id];
          return (
            <div key={id} className="team-row">
              <span className="pos-badge">{idx + 1}</span>
              <span className="team-name">
                {t?.flag_emoji} {t?.name}
              </span>
              <div className="row-actions">
                <button type="button" onClick={() => move(activeGroup, idx, -1)} disabled={idx === 0}>
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(activeGroup, idx, 1)}
                  disabled={idx === list.length - 1}
                >
                  ▼
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving || list.length !== 4}
          onClick={() => saveGroup(activeGroup)}
        >
          {saving ? 'Kaydediliyor...' : `${activeGroup} Grubunu Kaydet`}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {completed >= 12 && (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/best-thirds')}>
          En İyi 8 Üçüncüye Geç →
        </button>
      )}
    </div>
  );
}
