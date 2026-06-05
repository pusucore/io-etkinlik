import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useApp } from '../context/AppContext';

export default function ChannelScreen() {
  const { campaign, refresh } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const channelUrl = campaign?.channelUrl || 'https://t.me/slotiosocial';

  async function check() {
    setLoading(true);
    setError('');
    try {
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST' });
      if (ch.isMember) {
        const me = await apiFetch('/api/me');
        if (me.registered) {
          await refresh();
          navigate('/');
        } else {
          navigate('/register');
        }
      } else {
        setError('Henüz kanalı takip etmiyorsun.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Kanal Takibi</h2>
      <p>Etkinliğe katılmak için Telegram kanalımızı takip etmelisin.</p>
      <a href={channelUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
        Kanala Katıl
      </a>
      <button type="button" className="btn btn-secondary" onClick={check} disabled={loading}>
        {loading ? 'Kontrol ediliyor...' : 'Takip Ettim, Kontrol Et'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
