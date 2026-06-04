export default function ChannelScreen({ channelUrl, onCheck, loading }) {
  return (
    <div className="card">
      <h3>Kanal takibi</h3>
      <p className="subtitle" style={{ marginBottom: 16 }}>
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
