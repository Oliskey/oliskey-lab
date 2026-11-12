import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Api } from '../lib/api';
import { HttpApi } from '../lib/api';
import { DemoApi } from '../lib/demo';
import type { Session } from '../../shared/types';

declare const __DEMO_ONLY__: boolean;
/** The demo-only build (served on oliskey.com) has no server, so it always uses the demo. */
export const DEMO_ONLY = typeof __DEMO_ONLY__ !== 'undefined' && __DEMO_ONLY__;

interface Ctx { api: Api; session: Session | null; loading: boolean; refresh: () => Promise<void>; enterDemo: () => void; leaveDemo: () => void }
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('outside provider'); return c; };

let demoApi: DemoApi | null = null;
export const getDemoApi = () => (demoApi ??= new DemoApi());
const http = new HttpApi();

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemo, setDemo] = useState(() => DEMO_ONLY || sessionStorage.getItem('oliskey.lab.mode') === 'demo');
  const api: Api = useMemo(() => (isDemo ? getDemoApi() : http), [isDemo]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setSession(await api.session()); } catch { setSession(null); } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { refresh(); }, [refresh]);
  const enterDemo = useCallback(() => { try { sessionStorage.setItem('oliskey.lab.mode', 'demo'); } catch { /* ok */ } setDemo(true); }, []);
  const leaveDemo = useCallback(() => { try { sessionStorage.removeItem('oliskey.lab.mode'); } catch { /* ok */ } if (!DEMO_ONLY) setDemo(false); }, []);
  return <AppCtx.Provider value={{ api, session, loading, refresh, enterDemo, leaveDemo }}>{children}</AppCtx.Provider>;
};
