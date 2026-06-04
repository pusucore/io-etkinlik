export default function ChannelScreen({ channelUrl, onCheck, loading }) {
  return (
    <div className="app-shell">
      <h1>Kanal Takibi</h1>
      <p className="subtitle">
        Katılmak için Telegram kanalımızı takip etmelisin.
      </p>

      <a href={channelUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
        Kanala Git
      </a>
      <button type="button" className="btn btn-secondary" onClick={onCheck} disabled={loading}>
        {loading ? 'Kontrol ediliyor...' : 'Tekrar Kontrol Et'}
      </button>
    </div>
  );
}
