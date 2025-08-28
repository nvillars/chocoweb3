"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Role = 'user' | 'admin';

type AuthState = {
  // undefined = not initialized yet, null = no user, object = logged in
  user: { id: number; name: string; email: string; role: Role } | null | undefined;
  // login returns true on success, false on failure
  login: (email: string, role?: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // start as undefined so consumers can distinguish "not initialized yet"
  const [user, setUser] = useState<AuthState['user']>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Attempt to verify server session. If successful, use server truth; otherwise clear local cache.
      try {
        const raw = (() => { try { return localStorage.getItem('ladulcerina:auth'); } catch { return null; } })();
        const local = raw ? JSON.parse(raw) : null;
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!mounted) return;
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          const r = body?.user?.role === 'admin' ? 'admin' : 'user';
          const userObj = {
            id: body?.user?.id ?? local?.id ?? (r === 'admin' ? 1 : 2),
            name: body?.user?.name ?? local?.name ?? (r === 'admin' ? 'Admin Demo' : 'Usuario Demo'),
            email: body?.user?.email ?? local?.email ?? '',
            role: r as Role,
          };
          setUser(userObj);
          try { localStorage.setItem('ladulcerina:auth', JSON.stringify(userObj)); } catch {}
          return;
        }
        // not authenticated on server
        setUser(null);
        try { localStorage.removeItem('ladulcerina:auth'); } catch {}
      } catch {
        // network or other failure: fall back to local value if any, otherwise unauthenticated
        try {
          const raw = localStorage.getItem('ladulcerina:auth');
          if (raw) setUser(JSON.parse(raw));
          else setUser(null);
        } catch {
          setUser(null);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, role: string = 'user') => {
    try {
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }), credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUser(null);
        try { localStorage.removeItem('ladulcerina:auth'); } catch {}
        const msg = body?.error || body?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = await res.json();
      const normalized: Role = (data?.role === 'admin') ? 'admin' : 'user';
      const userObj = { id: data?.id ?? (normalized === 'admin' ? 1 : 2), name: data?.name ?? (normalized === 'admin' ? 'Admin Demo' : 'Usuario Demo'), email: data?.email ?? email, role: normalized };
      setUser(userObj);
      try { localStorage.setItem('ladulcerina:auth', JSON.stringify(userObj)); } catch {}
      return true;
    } catch (e) {
      setUser(null);
      try { localStorage.removeItem('ladulcerina:auth'); } catch {}
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(msg);
    }
  };

  const logout = () => {
    (async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      } catch {
        // ignore
      }
    })();
    setUser(null);
    try { localStorage.removeItem('ladulcerina:auth'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
