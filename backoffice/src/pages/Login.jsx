import { useState } from 'react';
import { adminFetch } from '../api';

export default function Login({ onLogin }) {
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
    <div className="shell login">
      <h1>Admin Giriş</h1>
      <p className="muted">Bu panel kullanıcılara açık değildir.</p>
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
        <button type="submit" className="btn" disabled={loading}>
          Giriş
        </button>
      </form>
    </div>
  );
}
