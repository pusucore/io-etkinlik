import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { HAS_API } from '../config';
import { DEFAULT_GROUPS } from '../data/groups';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    if (!HAS_API) {
      setGroups(staticToCards(DEFAULT_GROUPS));
      setLoading(false);
      return;
    }
    apiFetch('/api/groups')
      .then((d) => {
        if (d.groups?.length) {
          setGroups(d.groups);
          setFromApi(true);
        } else {
          setGroups(staticToCards(DEFAULT_GROUPS));
        }
      })
      .catch(() => setGroups(staticToCards(DEFAULT_GROUPS)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Gruplar yükleniyor...</p>;

  return (
    <div>
      {!fromApi && HAS_API && (
        <p className="subtitle" style={{ marginBottom: 12 }}>
          Sıralama henüz güncellenmedi — varsayılan liste gösteriliyor.
        </p>
      )}
      {groups.map((g) => (
        <div key={g.code} className="card">
          <h3>{g.code} Grubu</h3>
          <ul className="standings">
            {(g.standings || []).map((s) => (
              <li key={s.position}>
                <span className="pos">{s.position}.</span>
                <span>
                  {s.flag ? `${s.flag} ` : ''}
                  {s.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function staticToCards(map) {
  return Object.entries(map).map(([code, names]) => ({
    code,
    standings: names.map((name, i) => ({ position: i + 1, name, flag: null })),
  }));
}
