export default function ConfirmModal({ message, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <p>{message}</p>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Bu işlemi onaylıyor musun?</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onConfirm}>
            Onayla
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
