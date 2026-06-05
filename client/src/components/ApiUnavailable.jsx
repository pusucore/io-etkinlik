export default function ApiUnavailable({ message }) {
  return (
    <div className="app-shell unavailable">
      <div className="hero-block">
        <span className="hero-emoji">⚽</span>
        <h1>Dünya Kupası Bracket</h1>
        <p className="subtitle">{message}</p>
      </div>
      <div className="card">
        <p>Etkinlik kısa süre içinde aktif olacak. Telegram botundan tekrar deneyebilirsin.</p>
      </div>
    </div>
  );
}
