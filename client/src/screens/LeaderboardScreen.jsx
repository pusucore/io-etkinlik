import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function LeaderboardScreen() {
  const [tab, setTab] = useState('participation');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/leaderboard?type=${tab === 'scores' ? 'scores' : 'participation'}`)
      .then((d) => setEntries(d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <h2>Liderlik Tablosu</h2>
      <div className="stage-tabs">
        <button type="button" className={tab === 'participation' ? 'active' : ''} onClick={() => setTab('participation')}>
          Katılım
        </button>
        <button type="button" className={tab === 'scores' ? 'active' : ''} onClick={() => setTab('scores')}>
          Puan
        </button>
      </div>
      {loading && <p className="loading">Yükleniyor...</p>}
      {!loading && entries.length === 0 && <p className="subtitle">Henüz kayıt yok.</p>}
      {entries.map((e) => (
        <div key={e.rank} className="card lb-row">
          <span className="rank">#{e.rank}</span>
          <div>
            <p>{e.slotioUsername || '—'}</p>
            <p className="muted">{e.telegramUsername}</p>
          </div>
          {tab === 'scores' && <strong className="score">{e.score} puan</strong>}
          {e.rewardEligible && <span className="badge badge-active">Uygun</span>}
        </div>
      ))}
    </div>
  );
}
