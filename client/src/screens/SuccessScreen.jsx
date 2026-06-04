export default function SuccessScreen({ user, onContinue }) {
  const date = user.createdAt
    ? new Date(user.createdAt).toLocaleString('tr-TR')
    : '-';

  return (
    <div className="app-shell">
      <h1>Katılımın alındı</h1>
      <p className="subtitle">Turnuva ekranına geçebilirsin.</p>

      <div className="card">
        <p>
          <strong>Telegram:</strong>{' '}
          {user.telegramUsername ? `@${user.telegramUsername}` : user.telegramFirstName}
        </p>
        <p>
          <strong>Slotio:</strong> {user.slotioUsername}
        </p>
        <p>
          <strong>Katılım:</strong> {date}
        </p>
        <p>
          <strong>Bonus:</strong>{' '}
          <span className={user.bonusEligible ? 'badge badge-active' : 'badge badge-inactive'}>
            {user.bonusEligible ? 'Aktif' : 'Pasif'}
          </span>
        </p>
      </div>

      <button type="button" className="btn btn-primary" onClick={onContinue}>
        Turnuvaya Git
      </button>
    </div>
  );
}
