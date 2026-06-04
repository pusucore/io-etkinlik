import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function BonusScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/bonus-status')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Yükleniyor...</p>;
  if (!data?.registered) {
    return <p className="error">Önce kayıt olmalısın.</p>;
  }

  return (
    <div className="card">
      <h3>Bonus Durumu</h3>
      <p>
        Uygunluk:{' '}
        <span className={data.active ? 'badge badge-active' : 'badge badge-inactive'}>
          {data.active ? 'Aktif' : 'Pasif'}
        </span>
      </p>
      <p>
        <strong>Sebep:</strong> {data.reason}
      </p>
      {data.disqualified && data.disqualificationReason && (
        <p className="error">{data.disqualificationReason}</p>
      )}
    </div>
  );
}
