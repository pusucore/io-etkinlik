import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function SuccessScreen() {
  const { prediction, user } = useApp();
  const navigate = useNavigate();
  const pred = prediction?.prediction;

  return (
    <div className="card success-card">
      <span className="hero-emoji">🎉</span>
      <h2>Katılım Tamamlandı!</h2>
      <p>Şampiyon tahminin:</p>
      <p className="champion-line">
        {pred?.championFlag} <strong>{pred?.championName}</strong>
      </p>
      <p>
        Slotio: <strong>{user?.slotioUsername}</strong>
      </p>
      <p className="subtitle">Tahminin kilitlendi ve artık değiştirilemez.</p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/leaderboard')}>
        Liderlik Tablosu
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => navigate('/rewards')}>
        Ödül Durumum
      </button>
    </div>
  );
}
