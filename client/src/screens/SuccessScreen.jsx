export default function SuccessScreen({ user, onContinue }) {
  const date = user.createdAt
    ? new Date(user.createdAt).toLocaleString('tr-TR')
    : '-';

  return (
    <div className="card">
      <h3>Katılımın alındı</h3>
      <p className="subtitle">Diğer sekmelerden turnuvayı takip edebilirsin.</p>

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

      <button type="button" className="btn btn-primary" onClick={onContinue}>
        Tamam
      </button>
    </div>
  );
}
