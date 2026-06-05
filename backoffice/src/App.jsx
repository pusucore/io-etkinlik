import { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Campaign from './pages/Campaign';
import Users from './pages/Users';
import Deposits from './pages/Deposits';
import Exports from './pages/Exports';

function getToken() {
  return localStorage.getItem('slotio_admin_token');
}

export default function App() {
  const [token, setToken] = useState(getToken());
  const navigate = useNavigate();

  if (!token) {
    return (
      <Login
        onLogin={(t) => {
          localStorage.setItem('slotio_admin_token', t);
          setToken(t);
          navigate('/');
        }}
      />
    );
  }

  function logout() {
    localStorage.removeItem('slotio_admin_token');
    setToken(null);
  }

  return (
    <div className="shell">
      <header className="header">
        <h1>Slotio Backoffice</h1>
        <button type="button" className="btn-sm" onClick={logout}>
          Çıkış
        </button>
      </header>
      <nav className="nav">
        <Link to="/">Özet</Link>
        <Link to="/campaign">Kampanya</Link>
        <Link to="/users">Katılımcılar</Link>
        <Link to="/deposits">Yatırım Import</Link>
        <Link to="/exports">Export</Link>
      </nav>
      <Routes>
        <Route index element={<Dashboard token={token} />} />
        <Route path="campaign" element={<Campaign token={token} />} />
        <Route path="users" element={<Users token={token} />} />
        <Route path="deposits" element={<Deposits token={token} />} />
        <Route path="exports" element={<Exports token={token} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
