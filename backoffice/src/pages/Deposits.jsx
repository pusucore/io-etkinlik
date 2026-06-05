import { useState } from 'react';
import { adminFetch, apiBase } from '../api';

export default function Deposits({ token }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setError('');
    try {
      const base = apiBase();
      const res = await fetch(`${base}/api/admin/deposits/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Yatırım CSV Import</h2>
      <p className="muted">Kolonlar: slotio_username, amount, currency, deposit_date</p>
      <input type="file" accept=".csv,.txt" onChange={upload} />
      {result && (
        <p className="ok">
          {result.total} satır, {result.matchedEligible} kullanıcı uygun işaretlendi.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
