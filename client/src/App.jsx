import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { initTelegramWebApp } from './telegram';
import JoinFlow from './components/JoinFlow';
import GroupsScreen from './screens/GroupsScreen';
import BracketScreen from './screens/BracketScreen';
import BonusScreen from './screens/BonusScreen';

const TABS = [
  { id: 'katil', label: 'Katıl' },
  { id: 'groups', label: 'Gruplar' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'bonus', label: 'Bonus Durumu' },
];

export default function App() {
  const [tab, setTab] = useState('katil');
  const [user, setUser] = useState(null);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  return (
    <div className="app-shell">
      <h1>Slotio Dünya Kupası</h1>
      <p className="subtitle">Dünya Kupası tahmin etkinliği</p>

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

      {tab === 'katil' && <JoinFlow user={user} setUser={setUser} />}
      {tab === 'groups' && <GroupsScreen />}
      {tab === 'bracket' && <BracketScreen />}
      {tab === 'bonus' && <BonusScreen user={user} />}

      <Link to="/admin" className="btn btn-secondary" style={{ marginTop: 16 }}>
        Admin Panel
      </Link>
    </div>
  );
}
