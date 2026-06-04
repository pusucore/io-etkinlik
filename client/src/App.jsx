import { useEffect, useState } from 'react';
import { DEFAULT_GROUPS } from './data/groups';
import { CHANNEL_URL, HAS_API } from './config';
import { initTelegramWebApp } from './telegram';
import { apiFetch } from './api';
import AdminApp from './admin/AdminApp';

const TABS = [
  { id: 'join', label: 'Katıl' },
  { id: 'groups', label: 'Gruplar' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'admin', label: 'Admin' },
];

export default function App() {
  const [tab, setTab] = useState('join');
  const [user, setUser] = useState(null);
  const [slotioUsername, setSlotioUsername] = useState('');
  const [joinStep, setJoinStep] = useState('channel');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [groups, setGroups] = useState(staticGroups());
  const [bracketEmpty, setBracketEmpty] = useState(true);
  const [bracketStages, setBracketStages] = useState({});
  const [champion, setChampion] = useState(null);
  const [bonus, setBonus] = useState(null);

  useEffect(() => {
    initTelegramWebApp();
    if (HAS_API) loadData();
  }, []);

  async function loadData() {
    try {
      const me = await apiFetch('/api/me');
      if (me.registered) {
        setUser(me.user);
        setJoinStep('done');
      }
    } catch {
      /* ignore */
    }
    try {
      const g = await apiFetch('/api/groups');
      if (g.groups?.length) setGroups(g.groups);
    } catch {
      /* keep static */
    }
    try {
      const b = await apiFetch('/api/bracket');
      const s = b.stages || {};
      setBracketStages(s);
      setChampion(b.champion);
      const has = Object.values(s).some((arr) => arr?.length > 0);
      setBracketEmpty(!has && !b.champion);
    } catch {
      setBracketEmpty(true);
    }
    try {
      const bn = await apiFetch('/api/bonus-status');
      setBonus(bn);
    } catch {
      setBonus(null);
    }
  }

  async function checkChannel() {
    if (!HAS_API) {
      setJoinError('API bağlantısı yapılandırılmamış.');
      return;
    }
    setJoinLoading(true);
    setJoinError('');
    try {
      const ch = await apiFetch('/api/check-channel-membership', { method: 'POST' });
      setJoinStep(ch.isMember ? 'register' : 'channel');
    } catch (e) {
      setJoinError(e.message);
    } finally {
      setJoinLoading(false);
    }
  }

  async function submitRegister(e) {
    e.preventDefault();
    if (!slotioUsername.trim()) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const data = await apiFetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({ slotio_username: slotioUsername.trim() }),
      });
      setUser(data.user);
      setJoinStep('done');
      loadData();
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>Slotio Dünya Kupası</h1>
        <p>Telegram kanalını takip et, Slotio kullanıcı adınla etkinliğe katıl.</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'join' && (
        <section className="card">
          <h2>Katılım</h2>
          {!HAS_API && (
            <p className="error">Backend API tanımlı değil (VITE_API_BASE_URL).</p>
          )}
          {joinStep === 'channel' && (
            <>
              <p>Katılmak için Telegram kanalını takip etmelisin.</p>
              <a href={CHANNEL_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
                Kanala Git
              </a>
              <button type="button" className="btn btn-secondary" onClick={checkChannel} disabled={joinLoading}>
                {joinLoading ? 'Kontrol...' : 'Takip Ettim, Kontrol Et'}
              </button>
            </>
          )}
          {joinStep === 'register' && (
            <form onSubmit={submitRegister}>
              <p>Slotio kullanıcı adını gir.</p>
              <input
                className="input"
                placeholder="Slotio kullanıcı adın"
                value={slotioUsername}
                onChange={(e) => setSlotioUsername(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={joinLoading}>
                Katılımı Tamamla
              </button>
            </form>
          )}
          {joinStep === 'done' && user && (
            <>
              <p className="badge badge-active">Katılımın alındı</p>
              <p>
                <strong>Slotio:</strong> {user.slotioUsername}
              </p>
              <p>
                <strong>Bonus:</strong>{' '}
                {user.bonusEligible ? 'Aktif' : 'Pasif'}
              </p>
            </>
          )}
          {joinError && <p className="error">{joinError}</p>}
        </section>
      )}

      {tab === 'groups' && (
        <section>
          <h2>Gruplar</h2>
          <div className="grid">
            {groups.map((g) => (
              <div className="card" key={g.code}>
                <h3>{g.code} Grubu</h3>
                {(g.standings || []).map((s) => (
                  <p key={`${g.code}-${s.position}`}>
                    {s.position}. {s.name}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'bracket' && (
        <section className="card">
          <h2>Bracket</h2>
          {bracketEmpty ? (
            <p>Bracket henüz oluşturulmadı.</p>
          ) : (
            <>
              {champion && (
                <p className="team winner">
                  Şampiyon: {champion.name}
                </p>
              )}
              {Object.entries(bracketStages).map(([stage, matches]) =>
                matches?.length ? (
                  <div key={stage} style={{ marginTop: 12 }}>
                    <h3>{matches[0]?.stageLabel || stage}</h3>
                    {matches.map((m) => (
                      <p key={m.matchNo} style={{ fontSize: '0.85rem' }}>
                        M{m.matchNo}: {m.home?.name || 'TBD'} vs {m.away?.name || 'TBD'}
                        {m.winner?.name ? ` → ${m.winner.name}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null
              )}
            </>
          )}
          <div className="rounds">
            <span>Son 32</span>
            <span>Son 16</span>
            <span>Çeyrek Final</span>
            <span>Yarı Final</span>
            <span>Final</span>
          </div>
        </section>
      )}

      {tab === 'bonus' && (
        <section className="card">
          <h2>Bonus Durumu</h2>
          {!bonus?.registered && !user && <p>Önce katılım sekmesinden kayıt olun.</p>}
          {bonus?.registered && (
            <>
              <p>
                Uygunluk:{' '}
                <span className={bonus.active ? 'badge badge-active' : 'badge badge-inactive'}>
                  {bonus.active ? 'Aktif' : 'Pasif'}
                </span>
              </p>
              <p>{bonus.reason}</p>
            </>
          )}
          {!HAS_API && <p>Bonus durumu backend kontrolünden sonra gösterilecek.</p>}
        </section>
      )}

      {tab === 'admin' && (
        <section className="card admin-embed">
          <AdminApp />
        </section>
      )}
    </div>
  );
}

function staticGroups() {
  return Object.entries(DEFAULT_GROUPS).map(([code, names]) => ({
    code,
    standings: names.map((name, i) => ({ position: i + 1, name })),
  }));
}
