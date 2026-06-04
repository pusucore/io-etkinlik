import { useState } from 'react';
import { apiFetch } from '../api';

export default function RegisterScreen({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ slotio_username: username }),
      });
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <h1>Kayıt</h1>
      <p className="subtitle">Slotio kullanıcı adını gir.</p>

      <form onSubmit={submit}>
        <input
          className="input"
          type="text"
          placeholder="Slotio kullanıcı adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Katılımı Tamamla'}
        </button>
      </form>
    </div>
  );
}
