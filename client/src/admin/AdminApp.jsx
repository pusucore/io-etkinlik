import { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminGroups from './AdminGroups';
import AdminBestThirds from './AdminBestThirds';
import AdminBracketSetup from './AdminBracketSetup';
import AdminMatches from './AdminMatches';

function getToken() {
  return localStorage.getItem('slotio_admin_token');
}

export default function AdminApp() {
  const [token, setToken] = useState(getToken());
  const navigate = useNavigate();

  function onLogin(t) {
    localStorage.setItem('slotio_admin_token', t);
    setToken(t);
    navigate('/admin');
  }

  function logout() {
    localStorage.removeItem('slotio_admin_token');
    setToken(null);
  }

  if (!token) {
    return <AdminLogin onLogin={onLogin} />;
  }

  return (
    <div className="admin-shell">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ color: 'var(--neon)' }}>Slotio Admin</h1>
        <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={logout}>
          Çıkış
        </button>
      </header>

      <nav className="nav-tabs" style={{ flexWrap: 'wrap' }}>
        <Link to="/admin"><TabBtn>Özet</TabBtn></Link>
        <Link to="/admin/users"><TabBtn>Katılımcılar</TabBtn></Link>
        <Link to="/admin/groups"><TabBtn>Gruplar</TabBtn></Link>
        <Link to="/admin/best-thirds"><TabBtn>8 Üçüncü</TabBtn></Link>
        <Link to="/admin/bracket-setup"><TabBtn>Son 32 Kur</TabBtn></Link>
        <Link to="/admin/matches"><TabBtn>Maçlar</TabBtn></Link>
      </nav>

      <Routes>
        <Route path="/" element={<AdminDashboard token={token} />} />
        <Route path="/users" element={<AdminUsers token={token} />} />
        <Route path="/groups" element={<AdminGroups token={token} />} />
        <Route path="/best-thirds" element={<AdminBestThirds token={token} />} />
        <Route path="/bracket-setup" element={<AdminBracketSetup token={token} />} />
        <Route path="/matches" element={<AdminMatches token={token} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
}

function TabBtn({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        color: 'var(--muted)',
        textDecoration: 'none',
      }}
    >
      {children}
    </span>
  );
}
