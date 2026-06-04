import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { CHANNEL_URL, HAS_API } from '../config';
import ChannelScreen from '../screens/ChannelScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SuccessScreen from '../screens/SuccessScreen';

export default function JoinFlow({ user, setUser }) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('channel');

  useEffect(() => {
    if (!HAS_API) {
      setLoading(false);
      setStep('no-api');
      return;
    }
    if (user) {
      setStep('done');
      setLoading(false);
      return;
    }
    init();
  }, [user]);

  async function init() {
    try {
      const me = await apiFetch('/api/me');
      if (me.registered) {
        setUser(me.user);
        setStep('done');
        return;
      }
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST' });
      setStep(ch.isMember ? 'register' : 'channel');
    } catch {
      setStep('channel');
    } finally {
      setLoading(false);
    }
  }

  async function checkChannel() {
    setLoading(true);
    try {
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST' });
      if (ch.isMember) setStep('register');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="loading">Yükleniyor...</p>;

  if (step === 'no-api') {
    return (
      <div className="card">
        <p className="error">Backend API bağlantısı yapılandırılmamış.</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          GitHub Secret: VITE_API_BASE_URL
        </p>
      </div>
    );
  }

  if (step === 'channel') {
    return <ChannelScreen channelUrl={CHANNEL_URL} onCheck={checkChannel} loading={loading} />;
  }

  if (step === 'register') {
    return (
      <RegisterScreen
        onSuccess={(u) => {
          setUser(u);
          setStep('success');
        }}
      />
    );
  }

  if (step === 'success' && user) {
    return <SuccessScreen user={user} onContinue={() => setStep('done')} />;
  }

  if (step === 'done' && user) {
    return (
      <div className="card">
        <h3>Katılımın aktif</h3>
        <p>
          <strong>Slotio:</strong> {user.slotioUsername}
        </p>
        <p>
          <strong>Telegram:</strong>{' '}
          {user.telegramUsername ? `@${user.telegramUsername}` : user.telegramFirstName}
        </p>
        <p>
          <strong>Bonus:</strong>{' '}
          <span className={user.bonusEligible ? 'badge badge-active' : 'badge badge-inactive'}>
            {user.bonusEligible ? 'Aktif' : 'Pasif'}
          </span>
        </p>
      </div>
    );
  }

  return null;
}
