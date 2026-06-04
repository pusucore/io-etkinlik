import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { HAS_API } from '../config';

const STAGE_ORDER = [
  { key: 'round_of_32', label: 'Son 32' },
  { key: 'round_of_16', label: 'Son 16' },
  { key: 'quarter_final', label: 'Çeyrek Final' },
  { key: 'semi_final', label: 'Yarı Final' },
  { key: 'third_place', label: 'Üçüncülük' },
  { key: 'final', label: 'Final' },
];

export default function BracketScreen() {
  const [stages, setStages] = useState({});
  const [champion, setChampion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!HAS_API) {
      setEmpty(true);
      setLoading(false);
      return;
    }
    apiFetch('/api/bracket')
      .then((d) => {
        const s = d.stages || {};
        setStages(s);
        setChampion(d.champion);
        const hasMatch = Object.values(s).some((arr) => arr?.length > 0);
        setEmpty(!hasMatch && !d.champion);
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Bracket yükleniyor...</p>;

  if (empty) {
    return (
      <div className="card">
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
          Bracket henüz oluşturulmadı.
        </p>
      </div>
    );
  }

  return (
    <div>
      {champion && (
        <div className="card" style={{ borderColor: 'var(--neon)' }}>
          <h3>Şampiyon</h3>
          <p className="team winner" style={{ fontSize: '1.2rem' }}>
            {champion.flag_emoji ? `${champion.flag_emoji} ` : ''}
            {champion.name}
          </p>
        </div>
      )}

      {STAGE_ORDER.map(({ key, label }) => {
        const matches = stages[key];
        if (!matches?.length) return null;
        return (
          <div key={key} className="card">
            <h3>{label}</h3>
            {matches.map((m) => (
              <MatchRow key={m.matchNo} match={m} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MatchRow({ match }) {
  if (!match.hasTeams && !match.home && !match.away) {
    return (
      <div className="match-row">
        <span className="match-no">M{match.matchNo}</span>
        <span className="team" style={{ color: 'var(--muted)' }}>
          Bekleniyor
        </span>
      </div>
    );
  }

  const homeWin = match.winner?.name === match.home?.name;
  const awayWin = match.winner?.name === match.away?.name;

  return (
    <div className="match-row">
      <span className="match-no">M{match.matchNo}</span>
      <div className={`team ${homeWin ? 'winner' : match.winner ? 'loser' : ''}`}>
        {match.home?.flag ? `${match.home.flag} ` : ''}
        {match.home?.name || 'TBD'}
      </div>
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>vs</div>
      <div className={`team ${awayWin ? 'winner' : match.winner ? 'loser' : ''}`}>
        {match.away?.flag ? `${match.away.flag} ` : ''}
        {match.away?.name || 'TBD'}
      </div>
    </div>
  );
}
