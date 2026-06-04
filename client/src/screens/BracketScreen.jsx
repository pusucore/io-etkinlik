import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

const STAGE_ORDER = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

export default function BracketScreen() {
  const [stages, setStages] = useState({});
  const [champion, setChampion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bracket')
      .then((d) => {
        setStages(d.stages || {});
        setChampion(d.champion);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Bracket yükleniyor...</p>;

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

      {STAGE_ORDER.map((stage) => {
        const matches = stages[stage];
        if (!matches?.length) return null;
        const label = matches[0].stageLabel || stage;
        return (
          <div key={stage} className="card">
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
