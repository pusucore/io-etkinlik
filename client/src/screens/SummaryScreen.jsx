import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

export default function SummaryScreen() {
  const { prediction, campaign, refresh } = useApp();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reward, setReward] = useState(null);

  async function submit() {
    if (!accepted) {
      setError('Etkinlik kurallarını kabul etmelisin.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/prediction/submit', {
        method: 'POST',
        body: JSON.stringify({ acceptedTerms: true }),
      });
      const rs = await apiFetch('/api/reward-status');
      setReward(rs);
      await refresh();
      navigate('/success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const pred = prediction?.prediction;

  return (
    <div>
      <h2>Tahmin Özeti</h2>
      <div className="card">
        <p>
          <strong>Şampiyon:</strong> {pred?.championFlag} {pred?.championName || '—'}
        </p>
        <p>
          <strong>Üçüncü:</strong> {pred?.thirdName || '—'}
        </p>
        <p>
          <strong>Durum:</strong> {pred?.locked ? 'Onaylandı' : 'Taslak'}
        </p>
      </div>
      {reward && (
        <div className="card">
          <p>Ödül uygunluğu: <strong>{reward.rewardEligibility}</strong></p>
        </div>
      )}
      <label className="checkbox-row">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        Etkinlik kurallarını okudum ve kabul ediyorum.
      </label>
      <p className="terms-preview">{campaign?.termsText?.slice(0, 200)}...</p>
      {error && <p className="error">{error}</p>}
      {!pred?.locked && (
        <button type="button" className="btn btn-primary btn-lg" disabled={loading} onClick={submit}>
          {loading ? 'Onaylanıyor...' : 'Tahminimi Onayla'}
        </button>
      )}
    </div>
  );
}
