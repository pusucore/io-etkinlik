import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

const STAGE_ORDER = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

const STAGE_LABELS = {
  round_of_32: 'Son 32',
  round_of_16: 'Son 16',
  quarter_final: 'Çeyrek Final',
  semi_final: 'Yarı Final',
  third_place: 'Üçüncülük',
  final: 'Final',
};

export default function BracketPredictScreen() {
  const { prediction, refresh } = useApp();
  const navigate = useNavigate();
  const [stage, setStage] = useState('round_of_32');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const matches = prediction?.matches || [];

  const byStage = useMemo(() => {
    const map = {};
    for (const m of matches) {
      if (!map[m.stage]) map[m.stage] = [];
      map[m.stage].push(m);
    }
    return map;
  }, [matches]);

  const current = (byStage[stage] || []).filter((m) => m.ready);

  async function pickWinner(matchNo, winnerTeamId) {
    setSaving(true);
    setError('');
    try {
      await apiFetch('/api/prediction/match-winner', {
        method: 'POST',
        body: JSON.stringify({ matchNo, winnerTeamId }),
      });
      await refresh();
      const updated = await apiFetch('/api/prediction');
      const champ = updated?.prediction?.championName;
      if (champ && stage === 'final') {
        navigate('/summary');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const allR32 = (byStage.round_of_32 || []).every((m) => m.winner || m.winnerTeamId);
  const hasChampion = prediction?.prediction?.championName;

  return (
    <div>
      <div className="stage-tabs">
        {STAGE_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={stage === s ? 'active' : ''}
            onClick={() => setStage(s)}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>
      <h3>{STAGE_LABELS[stage]}</h3>
      {current.length === 0 && <p className="subtitle">Bu tur henüz hazır değil. Önceki maçları tamamla.</p>}
      {current.map((m) => (
        <div key={m.matchNo} className="card match-card">
          <span className="match-no">M{m.matchNo}</span>
          <div className="match-teams">
            <button
              type="button"
              className={`team-btn ${m.winnerTeamId === m.homeTeamId ? 'winner' : ''}`}
              disabled={saving || !!m.winnerTeamId}
              onClick={() => pickWinner(m.matchNo, m.homeTeamId)}
            >
              {m.home?.flag_emoji} {m.home?.name || 'TBD'}
            </button>
            <span className="vs">vs</span>
            <button
              type="button"
              className={`team-btn ${m.winnerTeamId === m.awayTeamId ? 'winner' : ''}`}
              disabled={saving || !!m.winnerTeamId}
              onClick={() => pickWinner(m.matchNo, m.awayTeamId)}
            >
              {m.away?.flag_emoji} {m.away?.name || 'TBD'}
            </button>
          </div>
          {m.winner && (
            <p className="picked">
              Seçim: {m.winner.flag_emoji} {m.winner.name}
            </p>
          )}
        </div>
      ))}
      {error && <p className="error">{error}</p>}
      {allR32 && !hasChampion && (
        <button type="button" className="btn btn-secondary" onClick={() => setStage('round_of_16')}>
          Son 16'ya geç
        </button>
      )}
      {hasChampion && (
        <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/summary')}>
          Özet ve Onay →
        </button>
      )}
    </div>
  );
}
