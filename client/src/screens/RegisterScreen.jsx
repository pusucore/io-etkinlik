import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

export default function RegisterScreen({ onRegistered }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ slotio_username: username.trim() }),
      });
      setMessage(data.message || 'Katılımın alındı.');
      await onRegistered?.();
      setTimeout(() => navigate('/groups'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Slotio Kullanıcı Adı</h2>
      <p>Slotio hesabındaki kullanıcı adını gir. Bu bilgi ödül doğrulaması için kullanılır.</p>
      <form onSubmit={submit}>
        <input
          className="input"
          placeholder="kullaniciadi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Kaydediliyor...' : 'Katılımı Tamamla'}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
