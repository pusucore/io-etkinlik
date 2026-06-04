import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { HAS_API } from '../config';

export default function BonusScreen({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!HAS_API) {
      setLoading(false);
      return;
    }
    apiFetch('/api/bonus-status')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (!HAS_API) {
    return (
      <div className="card">
        <p className="error">API bağlantısı yok.</p>
      </div>
    );
  }

  if (loading) return <p className="loading">Yükleniyor...</p>;

  if (!data?.registered && !user) {
    return (
      <div className="card">
        <p>Önce <strong>Katıl</strong> sekmesinden kayıt olun.</p>
      </div>
    );
  }

  if (!data?.registered) {
    return (
      <div className="card">
        <p>Bonus durumu için kayıt gerekli.</p>
      </div>
    );
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
