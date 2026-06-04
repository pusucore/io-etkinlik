import { useState } from 'react';
import { adminFetch } from '../api';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch('/api/admin/login', null, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-shell" style={{ maxWidth: 400 }}>
      <h1>Admin Giriş</h1>
      <form onSubmit={submit}>
        <input
          className="input"
          type="password"
          placeholder="Admin şifresi"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          Giriş
        </button>
      </form>
    </div>
  );
}
