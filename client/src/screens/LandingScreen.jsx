import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function LandingScreen() {
  const { user, campaign, prediction } = useApp();
  const navigate = useNavigate();
  const locked = prediction?.prediction?.locked;

  function start() {
    if (!user) {
      navigate('/channel');
      return;
    }
    if (locked) {
      navigate('/success');
      return;
    }
    const completed = prediction?.state?.completedGroups || 0;
    if (completed < 12) {
      navigate('/groups');
    } else if ((prediction?.state?.bestThirdsCount || 0) < 8) {
      navigate('/best-thirds');
    } else {
      navigate('/bracket');
    }
  }

  return (
    <div>
      <div className="hero-block">
        <span className="hero-emoji">🏆</span>
        <h1>{campaign?.title || 'Dünya Kupası Bracket'}</h1>
        <p className="subtitle">
          {campaign?.body?.split('\n')[0] ||
            "DÜNYA KUPASINDA SLOTIO'DA KAZANMAYA HAZIR MISIN?"}
        </p>
      </div>
      <div className="card promo-card">
        <p>
          {campaign?.body ||
            `SİZE ÖZEL HAZIRLADIĞIMIZ BRACKET TAHMİN ETKİNLİĞİNİ TAMAMLA, ÇEŞİTLİ ÖDÜLLER KAZANMA ŞANSI YAKALA!`}
        </p>
        <ul className="feature-list">
          <li>12 grup sıralaması tahmini</li>
          <li>Son 32 → Final bracket</li>
          <li>Ödül ve liderlik tablosu</li>
        </ul>
      </div>
      <button type="button" className="btn btn-primary btn-lg" onClick={start}>
        {locked ? 'Tahminimi Gör' : user ? 'Tahmine Devam Et' : 'Bracket Tahminine Katıl'}
      </button>
    </div>
  );
}
