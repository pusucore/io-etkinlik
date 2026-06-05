import { useEffect, useState } from 'react';
import { adminFetch, apiBase } from '../api';

export default function Campaign({ token }) {
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/campaign', token).then((d) => setForm(d.campaign || {}));
  }, [token]);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await adminFetch('/api/admin/campaign', token, {
        method: 'PUT',
        body: JSON.stringify({
          start_message_title: form.title,
          start_message_body: form.body,
          button_text: form.buttonText,
          button_url: form.buttonUrl,
          mini_app_button_text: form.miniAppButtonText,
          mini_app_url: form.miniAppUrl,
          channel_url: form.channelUrl,
          terms_text: form.termsText,
          prediction_deadline: form.predictionDeadline || null,
          min_deposit_amount: form.minDepositAmount,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    const base = apiBase();
    const res = await fetch(`${base}/api/admin/campaign/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error('Yükleme başarısız');
    alert('Görsel yüklendi');
  }

  return (
    <form className="form" onSubmit={save}>
      <h2>Kampanya /start Mesajı</h2>
      <label>Başlık</label>
      <input className="input" value={form.title || ''} onChange={(e) => setField('title', e.target.value)} />
      <label>Mesaj metni</label>
      <textarea
        className="input"
        rows={6}
        value={form.body || ''}
        onChange={(e) => setField('body', e.target.value)}
      />
      <label>Mini App buton metni</label>
      <input
        className="input"
        value={form.miniAppButtonText || ''}
        onChange={(e) => setField('miniAppButtonText', e.target.value)}
      />
      <label>Mini App URL</label>
      <input
        className="input"
        value={form.miniAppUrl || ''}
        onChange={(e) => setField('miniAppUrl', e.target.value)}
      />
      <label>Kanal URL</label>
      <input className="input" value={form.channelUrl || ''} onChange={(e) => setField('channelUrl', e.target.value)} />
      <label>Dış link buton metni</label>
      <input className="input" value={form.buttonText || ''} onChange={(e) => setField('buttonText', e.target.value)} />
      <label>Dış link URL</label>
      <input className="input" value={form.buttonUrl || ''} onChange={(e) => setField('buttonUrl', e.target.value)} />
      <label>Kurallar metni</label>
      <textarea
        className="input"
        rows={8}
        value={form.termsText || ''}
        onChange={(e) => setField('termsText', e.target.value)}
      />
      <label>Kampanya görseli</label>
      <input type="file" accept="image/*" onChange={uploadImage} />
      {saved && <p className="ok">Kaydedildi</p>}
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn">
        Yayınla
      </button>
    </form>
  );
}
