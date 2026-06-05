import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api';
import { HAS_API, API_UNAVAILABLE_MSG } from '../config';
import { initTelegramWebApp } from '../telegram';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [user, setUser] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [teams, setTeams] = useState([]);
  const [prediction, setPrediction] = useState(null);

  const refresh = useCallback(async () => {
    if (!HAS_API) {
      setApiError(API_UNAVAILABLE_MSG);
      setLoading(false);
      return;
    }
    try {
      const [camp, me, teamsRes] = await Promise.all([
        apiFetch('/api/campaign').catch(() => ({ campaign: null })),
        apiFetch('/api/me').catch(() => ({ registered: false })),
        apiFetch('/api/teams').catch(() => ({ teams: [] })),
      ]);
      setCampaign(camp.campaign);
      if (me.registered) {
        setUser(me.user);
        const pred = await apiFetch('/api/prediction').catch(() => null);
        setPrediction(pred);
      }
      setTeams(teamsRes.teams || []);
      setApiError(null);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initTelegramWebApp();
    refresh();
  }, [refresh]);

  return (
    <AppContext.Provider
      value={{
        loading,
        apiError,
        user,
        setUser,
        campaign,
        teams,
        prediction,
        setPrediction,
        refresh,
        HAS_API,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
