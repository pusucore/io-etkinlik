import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import ChannelScreen from './screens/ChannelScreen';
import RegisterScreen from './screens/RegisterScreen';
import SuccessScreen from './screens/SuccessScreen';
import GroupsScreen from './screens/GroupsScreen';
import BracketScreen from './screens/BracketScreen';
import BonusScreen from './screens/BonusScreen';

const TABS = [
  { id: 'groups', label: 'Gruplar' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'bonus', label: 'Bonus' },
];

export default function App() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('channel');
  const [isMember, setIsMember] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('groups');
  const channelUrl = import.meta.env.VITE_CHANNEL_URL || 'https://t.me/';

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    init();
  }, []);

  async function init() {
    try {
      const me = await apiFetch('/api/me');
      if (me.registered) {
        setUser(me.user);
        setScreen('app');
        setIsMember(me.user.isChannelMember);
        return;
      }
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST', body: '{}' });
      setIsMember(ch.isMember);
      setScreen(ch.isMember ? 'register' : 'channel');
    } catch {
      setScreen('channel');
    } finally {
      setLoading(false);
    }
  }

  async function checkChannel() {
    setLoading(true);
    try {
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST', body: '{}' });
      setIsMember(ch.isMember);
      if (ch.isMember) setScreen('register');
    } finally {
      setLoading(false);
    }
  }

  async function onRegistered(newUser) {
    setUser(newUser);
    setScreen('success');
  }

  function goToApp() {
    setScreen('app');
  }

  if (loading && screen === 'channel') {
    return <div className="app-shell loading">Yükleniyor...</div>;
  }

  if (screen === 'channel') {
    return (
      <ChannelScreen
        channelUrl={channelUrl}
        onCheck={checkChannel}
        loading={loading}
      />
    );
  }

  if (screen === 'register') {
    return <RegisterScreen onSuccess={onRegistered} />;
  }

  if (screen === 'success' && user) {
    return <SuccessScreen user={user} onContinue={goToApp} />;
  }

  return (
    <div className="app-shell">
      <h1>Slotio Dünya Kupası</h1>
      <p className="subtitle">
        @{user?.telegramUsername || user?.telegramFirstName || 'katılımcı'}
      </p>

      <nav className="nav-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'groups' && <GroupsScreen />}
      {tab === 'bracket' && <BracketScreen />}
      {tab === 'bonus' && <BonusScreen />}
    </div>
  );
}
