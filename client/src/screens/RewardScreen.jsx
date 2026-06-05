import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

export default function RewardScreen() {
  const { user } = useApp();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/reward-status').then(setStatus).catch(() => setStatus(null));
  }, [user]);

  if (!user) {
    return (
      <div className="card">
        <p>Ödül durumunu görmek için önce etkinliğe katıl.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Ödül Durumum</h2>
      <div className="card status-grid">
        <StatusRow label="Kanal takibi" value={status?.channelFollow || '—'} />
        <StatusRow label="Bracket tamamlandı" value={status?.bracketCompleted || '—'} />
        <StatusRow label="Yatırım şartı" value={status?.depositRequirement || '—'} />
        <StatusRow label="Ödül uygunluğu" value={status?.rewardEligibility || '—'} highlight />
      </div>
      {status?.disqualified && (
        <p className="error">Diskalifiye: {status.disqualificationReason}</p>
      )}
    </div>
  );
}

function StatusRow({ label, value, highlight }) {
  return (
    <div className={`status-row ${highlight ? 'highlight' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
