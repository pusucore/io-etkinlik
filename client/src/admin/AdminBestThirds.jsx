import { useEffect, useState } from 'react';
import { adminFetch } from '../api';
import ConfirmModal from './ConfirmModal';

const GROUP_CODES = 'ABCDEFGHIJKL'.split('');

export default function AdminBestThirds({ token }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    adminFetch('/api/admin/best-thirds', token).then((d) => {
      setItems(d.items || []);
      setSelected(new Set((d.items || []).filter((i) => i.selected).map((i) => i.group_code)));
    });
  }, [token]);

  function toggle(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else if (next.size < 8) next.add(code);
      return next;
    });
  }

  function save() {
    if (selected.size !== 8) return;
    setConfirm({
      message: 'En iyi 8 üçüncü seçimi kaydedilsin mi?',
      action: async () => {
        await adminFetch('/api/admin/best-thirds', token, {
          method: 'POST',
          body: JSON.stringify({ selectedGroupCodes: [...selected] }),
        });
        setConfirm(null);
      },
    });
  }

  function buildR32() {
    setConfirm({
      message: "Son 32 bracket'i oluşturulsun mu? (Grup + 8 üçüncü + 3X yerleşim tamamlanmış olmalı)",
      action: async () => {
        await adminFetch('/api/admin/bracket/build-round32', token, { method: 'POST' });
        setConfirm(null);
        alert('Son 32 oluşturuldu');
      },
    });
  }

  const itemMap = Object.fromEntries(items.map((i) => [i.group_code, i]));

  return (
    <div>
      <div className="card">
        <h3>En iyi 8 üçüncüyü seç</h3>
        <p className="subtitle">Seçilen: {selected.size} / 8</p>
        <div className="checkbox-grid">
          {GROUP_CODES.map((code) => {
            const item = itemMap[code];
            return (
              <label key={code}>
                <input
                  type="checkbox"
                  checked={selected.has(code)}
                  onChange={() => toggle(code)}
                  disabled={!selected.has(code) && selected.size >= 8}
                />
                {code} Grubu 3.sü — {item?.team_name || '-'}
              </label>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected.size !== 8}
          onClick={save}
        >
          Kaydet
        </button>
        <button type="button" className="btn btn-secondary" onClick={buildR32} style={{ marginTop: 8 }}>
          Son 32&apos;yi Oluştur
        </button>
      </div>

      <ConfirmModal
        message={confirm?.message}
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
