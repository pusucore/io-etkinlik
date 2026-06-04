import { useEffect, useState } from 'react';
import { adminFetch } from '../api';

export default function AdminDashboard({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminFetch('/api/admin/dashboard', token).then(setData).catch(console.error);
  }, [token]);

  if (!data) return <p className="loading">Yükleniyor...</p>;

  return (
    <div className="admin-grid admin-grid-2">
      <div className="card">
        <h3>Katılımcı</h3>
        <p style={{ fontSize: '2rem', color: 'var(--neon)' }}>{data.participantCount}</p>
      </div>
      <div className="card">
        <h3>Grup sıralamaları</h3>
        <p>{data.groupResultsComplete ? 'Tamam' : 'Eksik'}</p>
      </div>
      <div className="card">
        <h3>En iyi 8 üçüncü</h3>
        <p>{data.bestThirdsSelected} / 8</p>
      </div>
      <div className="card">
        <h3>3X yerleşim</h3>
        <p>{data.thirdSlotsAssigned} / 8</p>
      </div>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3>Şampiyon</h3>
        {data.champion ? (
          <p className="team winner">{data.champion.name}</p>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Henüz belli değil</p>
        )}
      </div>
    </div>
  );
}
