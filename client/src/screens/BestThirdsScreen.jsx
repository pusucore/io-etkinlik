import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

export default function BestThirdsScreen() {
  const { teams, prediction, refresh } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => {
    const bt = prediction?.bestThirds || [];
    return new Set(bt.map((t) => t.group_code));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const thirds = useMemo(() => {
    const g = prediction?.groups || {};
    const list = [];
    for (const code of 'ABCDEFGHIJKL') {
      const pos = g[code]?.positions?.[3] || g[code]?.[3];
      const teamId = pos?.teamId;
      const team = teams.find((t) => t.id === teamId);
      if (team) list.push({ group_code: code, ...team });
    }
    return list;
  }, [prediction, teams]);

  function toggle(code) {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else if (next.size < 8) next.add(code);
    setSelected(next);
  }

  async function save() {
    if (selected.size !== 8) {
      setError('Tam 8 üçüncü seçmelisin.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/prediction/best-thirds', {
        method: 'POST',
        body: JSON.stringify({ groupCodes: [...selected] }),
      });
      await refresh();
      navigate('/bracket');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="progress-bar">
        <span>En iyi üçüncüler</span>
        <strong>{selected.size}/8</strong>
      </div>
      <p className="subtitle">12 grup üçüncüsünden 8 takım seç. Son 32 buna göre oluşur.</p>
      <div className="grid-thirds">
        {thirds.map((t) => (
          <button
            key={t.group_code}
            type="button"
            className={`card team-pick ${selected.has(t.group_code) ? 'selected' : ''}`}
            onClick={() => toggle(t.group_code)}
          >
            <span className="group-label">{t.group_code}</span>
            <span>
              {t.flag_emoji} {t.name}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={selected.size !== 8 || saving}
        onClick={save}
      >
        {saving ? 'Kaydediliyor...' : 'Son 32\'ye Geç'}
      </button>
    </div>
  );
}
