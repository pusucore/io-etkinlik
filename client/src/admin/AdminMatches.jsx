import { useEffect, useState } from 'react';
import { adminFetch } from '../api';
import ConfirmModal from './ConfirmModal';

const STAGE_ORDER = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

export default function AdminMatches({ token }) {
  const [matches, setMatches] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('all');

  function load() {
    adminFetch('/api/admin/bracket/matches', token).then((d) => setMatches(d.matches || []));
  }

  useEffect(() => {
    load();
  }, [token]);

  function pickWinner(match, teamId, force = false) {
    setConfirm({
      message: `M${match.match_no} kazananı kaydedilsin mi?${match.locked ? ' (Kilitli maç)' : ''}`,
      action: async () => {
        await adminFetch(`/api/admin/bracket/${match.match_no}/winner`, token, {
          method: 'POST',
          body: JSON.stringify({ winnerTeamId: teamId, force }),
        });
        setConfirm(null);
        load();
      },
    });
  }

  const filtered =
    filter === 'all' ? matches : matches.filter((m) => m.stage === filter);

  return (
    <div>
      <select
        className="input"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      >
        <option value="all">Tüm turlar</option>
        {STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {matches.find((m) => m.stage === s)?.stageLabel || s}
          </option>
        ))}
      </select>

      {filtered.map((m) => {
        if (!m.home_team_id || !m.away_team_id) {
          return (
            <div key={m.match_no} className="card" style={{ opacity: 0.6 }}>
              <strong>M{m.match_no}</strong> — {m.stageLabel}
              <p>Takımlar henüz belli değil</p>
            </div>
          );
        }

        return (
          <div key={m.match_no} className="card">
            <strong>M{m.match_no}</strong> — {m.stageLabel}
            {m.locked && <span className="badge badge-inactive" style={{ marginLeft: 8 }}>Kilitli</span>}
            <p>
              {m.home_name} vs {m.away_name}
            </p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Kazanan:</p>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name={`m${m.match_no}`}
                checked={m.winner_team_id === m.home_team_id}
                onChange={() => pickWinner(m, m.home_team_id, m.locked)}
              />
              {m.home_name}
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name={`m${m.match_no}`}
                checked={m.winner_team_id === m.away_team_id}
                onChange={() => pickWinner(m, m.away_team_id, m.locked)}
              />
              {m.away_name}
            </label>
            {m.winner_name && (
              <p style={{ color: 'var(--neon)', marginTop: 8 }}>Kayıtlı: {m.winner_name}</p>
            )}
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
