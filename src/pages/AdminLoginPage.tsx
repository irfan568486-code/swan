import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export function AdminLoginPage() {
  const {
    adminAuthenticated,
    checkingSession,
    sessionExpiredNotice,
    loginAdmin,
    clearExpiredNotice,
  } = useAdmin();
  const navigate = useNavigate();

  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!checkingSession && adminAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [adminAuthenticated, checkingSession, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearExpiredNotice();
    if (!adminId.trim() || !password) {
      setError('Invalid Admin Credentials');
      return;
    }

    setSubmitting(true);
    try {
      await loginAdmin(adminId.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid Admin Credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131722] border border-red-500/25 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/35 flex items-center justify-center text-red-400 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Admin Portal Access
            </h1>
            <p className="text-xs text-slate-400">
              Restricted server-authenticated control interface
            </p>
          </div>
        </div>

        {sessionExpiredNotice && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{sessionExpiredNotice}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-sm font-medium text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-id" className="block text-xs font-medium text-slate-300">
              Admin ID
            </label>
            <input
              id="admin-id"
              type="text"
              autoComplete="off"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter Admin ID"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B0D13] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin Password"
                className="w-full min-h-[44px] pl-4 pr-11 py-2.5 rounded-xl bg-[#0B0D13] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-bold text-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Verifying...' : 'Unlock Admin Dashboard'}
          </button>
        </form>

        <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs text-slate-400">
          <span>SwarnaPlay Security Gate</span>
          <Link to="/" className="text-slate-300 hover:text-white">
            ← Return to Gaming Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
