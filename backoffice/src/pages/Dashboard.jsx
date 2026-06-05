import { useEffect, useState } from 'react';
import { adminFetch } from '../api';

export default function Dashboard({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminFetch('/api/admin/dashboard', token).then(setData).catch(console.error);
  }, [token]);

  return (
    <div className="card-grid">
      <div className="stat">
        <span>Katılımcı</span>
        <strong>{data?.participantCount ?? '—'}</strong>
      </div>
      <div className="stat">
        <span>Tahmin tamamlayan</span>
        <strong>{data?.predictionsCompleted ?? '—'}</strong>
      </div>
      <div className="stat">
        <span>Ödül uygun</span>
        <strong>{data?.rewardEligibleCount ?? '—'}</strong>
      </div>
    </div>
  );
}
