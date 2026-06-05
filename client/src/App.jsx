import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import LandingScreen from './screens/LandingScreen';
import ChannelScreen from './screens/ChannelScreen';
import RegisterScreen from './screens/RegisterScreen';
import GroupsPredictScreen from './screens/GroupsPredictScreen';
import BestThirdsScreen from './screens/BestThirdsScreen';
import BracketPredictScreen from './screens/BracketPredictScreen';
import SummaryScreen from './screens/SummaryScreen';
import SuccessScreen from './screens/SuccessScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import RewardScreen from './screens/RewardScreen';
import RulesScreen from './screens/RulesScreen';
import ApiUnavailable from './components/ApiUnavailable';

function Shell() {
  const { loading, apiError, user, prediction, refresh } = useApp();
  const { toggle, theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-shell">
        <p className="loading">Yükleniyor...</p>
      </div>
    );
  }

  if (apiError) {
    return <ApiUnavailable message={apiError} />;
  }

  const locked = prediction?.prediction?.locked;
  const navItems = [
    { path: '/', label: 'Ana' },
    ...(user && !locked
      ? [
          { path: '/groups', label: 'Gruplar' },
          { path: '/bracket', label: 'Bracket' },
        ]
      : []),
    { path: '/leaderboard', label: 'Sıralama' },
    { path: '/rewards', label: 'Ödül' },
    { path: '/rules', label: 'Kurallar' },
  ];

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-icon">⚽</span>
          <span>Slotio DK 2026</span>
        </div>
        <button type="button" className="theme-toggle" onClick={toggle} aria-label="Tema">
          {theme === 'night' ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/channel" element={<ChannelScreen />} />
          <Route path="/register" element={<RegisterScreen onRegistered={refresh} />} />
          <Route
            path="/groups"
            element={user ? <GroupsPredictScreen /> : <Navigate to="/channel" replace />}
          />
          <Route
            path="/best-thirds"
            element={user ? <BestThirdsScreen /> : <Navigate to="/channel" replace />}
          />
          <Route
            path="/bracket"
            element={user ? <BracketPredictScreen /> : <Navigate to="/channel" replace />}
          />
          <Route
            path="/summary"
            element={user ? <SummaryScreen /> : <Navigate to="/channel" replace />}
          />
          <Route path="/success" element={<SuccessScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/rewards" element={<RewardScreen />} />
          <Route path="/rules" element={<RulesScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!location.pathname.startsWith('/channel') && !location.pathname.startsWith('/register') && (
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={location.pathname === item.path ? 'active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ThemeProvider>
  );
}
