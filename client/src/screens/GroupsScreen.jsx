import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function GroupsScreen() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/groups')
      .then((d) => setGroups(d.groups || []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">Gruplar yükleniyor...</p>;

  return (
    <div>
      {groups.map((g) => (
        <div key={g.code} className="card">
          <h3>{g.code} Grubu</h3>
          <ul className="standings">
            {g.standings.map((s) => (
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
