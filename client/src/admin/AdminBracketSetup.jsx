import { useEffect, useState } from 'react';
import { adminFetch } from '../api';
import ConfirmModal from './ConfirmModal';

const SLOT_LABELS = {
  74: 'M74: 1E vs 3X',
  77: 'M77: 1I vs 3X',
  79: 'M79: 1A vs 3X',
  80: 'M80: 1L vs 3X',
  81: 'M81: 1D vs 3X',
  82: 'M82: 1G vs 3X',
  85: 'M85: 1B vs 3X',
  87: 'M87: 1K vs 3X',
};

export default function AdminBracketSetup({ token }) {
  const [setup, setSetup] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [confirm, setConfirm] = useState(null);

  function load() {
    adminFetch('/api/admin/bracket/setup', token).then(setSetup);
  }

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (setup?.assignments) {
      const a = {};
      for (const s of setup.assignments) {
        a[s.match_no] = s.team_id;
      }
      setAssignments(a);
    }
  }, [setup]);

  function setSlot(matchNo, teamId) {
    setAssignments((prev) => ({ ...prev, [matchNo]: parseInt(teamId, 10) }));
  }

  function save() {
    const matchNos = setup?.thirdSlotMatches || [];
    const used = new Set();
    for (const m of matchNos) {
      const tid = assignments[m];
      if (!tid) {
        alert('Tüm 3X alanları doldurulmalı');
        return;
      }
      if (used.has(tid)) {
        alert('Aynı üçüncü iki maça atanamaz');
        return;
      }
      used.add(tid);
    }

    setConfirm({
      message: 'Son 32 bracket yerleşimi kaydedilsin mi?',
      action: async () => {
        await adminFetch('/api/admin/bracket/setup-third-teams', token, {
          method: 'POST',
          body: JSON.stringify({
            assignments: matchNos.map((matchNo) => ({
              matchNo,
              teamId: assignments[matchNo],
            })),
          }),
        });
        setConfirm(null);
        load();
      },
    });
  }

  if (!setup) return <p className="loading">Yükleniyor...</p>;

  const thirds = setup.availableThirds || [];

  return (
    <div className="card">
      <h3>Son 32 Bracket Kurulumu</h3>
      <p className="subtitle">
        Grup tamam: {setup.groupResultsComplete ? 'Evet' : 'Hayır'} | 8 üçüncü:{' '}
        {setup.selectedThirdsCount}/8
      </p>

      {(setup.thirdSlotMatches || []).map((matchNo) => (
        <div key={matchNo} className="select-row" style={{ gridTemplateColumns: '1fr' }}>
          <label style={{ marginBottom: 4, color: 'var(--neon)' }}>
            {SLOT_LABELS[matchNo] || `M${matchNo}`}
          </label>
          <select
            value={assignments[matchNo] || ''}
            onChange={(e) => setSlot(matchNo, e.target.value)}
          >
            <option value="">Seçilen üçüncülerden takım seç</option>
            {thirds.map((t) => (
              <option
                key={`${t.group_code}-${t.id}`}
                value={t.id}
                disabled={
                  Object.entries(assignments).some(
                    ([m, id]) => Number(m) !== matchNo && id === t.id
                  )
                }
              >
                {t.group_code} — {t.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button type="button" className="btn btn-primary" onClick={save}>
        Bracket&apos;i Kaydet
      </button>

      <ConfirmModal
        message={confirm?.message}
        onConfirm={confirm?.action}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
