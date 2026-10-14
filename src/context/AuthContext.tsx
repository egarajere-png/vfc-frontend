import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services';
import type { User } from '../lib/types';

interface Ctx {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (d: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
}
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  useEffect(() => { api.me().then(setUser).finally(() => setLoading(false)); }, []);
  const value: Ctx = {
    user, loading,
    login: async (e, p) => { const u = await api.login(e, p); qc.clear(); setUser(u); return u; },
    signup: async (d) => { const u = await api.signup(d); qc.clear(); setUser(u); return u; },
    logout: async () => { await api.logout(); qc.clear(); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
