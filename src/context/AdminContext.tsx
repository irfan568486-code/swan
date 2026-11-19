import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

interface AdminContextValue {
  adminAuthenticated: boolean;
  adminId: string | null;
  adminToken: string | null;
  mustChangePassword: boolean;
  inactivityTimeoutMs: number;
  sessionExpiredNotice: string | null;
  checkingSession: boolean;
  loginAdmin: (adminId: string, password: string) => Promise<void>;
  logoutAdmin: (reason?: string) => Promise<void>;
  changeAdminPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearExpiredNotice: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [inactivityTimeoutMs, setInactivityTimeoutMs] = useState(10 * 60 * 1000);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const lastActivityRef = useRef<number>(Date.now());

  const logoutAdmin = useCallback(
    async (reason?: string) => {
      await apiRequest('/api/admin/logout', {
        method: 'POST',
        adminToken,
      }).catch(() => {});
      setAdminToken(null);
      setAdminId(null);
      setMustChangePassword(false);
      if (reason) {
        setSessionExpiredNotice(reason);
      }
    },
    [adminToken]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<{
          authenticated: boolean;
          adminId: string;
          mustChangePassword: boolean;
          inactivityTimeoutMs: number;
        }>('/api/admin/session');
        if (active && res.authenticated) {
          setAdminId(res.adminId);
          setMustChangePassword(res.mustChangePassword);
          setInactivityTimeoutMs(res.inactivityTimeoutMs);
          lastActivityRef.current = Date.now();
        }
      } catch {
        // Not authenticated as admin
      } finally {
        if (active) setCheckingSession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Track admin activity and enforce client + server inactivity auto-expiry
  useEffect(() => {
    if (!adminId) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= inactivityTimeoutMs) {
        logoutAdmin('Admin session automatically expired after inactivity.');
      }
    }, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, markActive));
      window.clearInterval(interval);
    };
  }, [adminId, inactivityTimeoutMs, logoutAdmin]);

  const loginAdmin = useCallback(async (id: string, password: string) => {
    setSessionExpiredNotice(null);
    const res = await apiRequest<{
      token: string;
      adminId: string;
      mustChangePassword: boolean;
      inactivityTimeoutMs: number;
    }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ adminId: id, password }),
    });
    lastActivityRef.current = Date.now();
    setAdminToken(res.token);
    setAdminId(res.adminId);
    setMustChangePassword(res.mustChangePassword);
    setInactivityTimeoutMs(res.inactivityTimeoutMs);
  }, []);

  const changeAdminPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await apiRequest('/api/admin/change-password', {
        method: 'POST',
        adminToken,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMustChangePassword(false);
    },
    [adminToken]
  );

  const clearExpiredNotice = useCallback(() => setSessionExpiredNotice(null), []);

  return (
    <AdminContext.Provider
      value={{
        adminAuthenticated: Boolean(adminId),
        adminId,
        adminToken,
        mustChangePassword,
        inactivityTimeoutMs,
        sessionExpiredNotice,
        checkingSession,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
        clearExpiredNotice,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error('useAdmin must be used inside AdminProvider');
  }
  return ctx;
}
