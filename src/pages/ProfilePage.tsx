import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Save, Shield, User as UserIcon, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from '../components/SafeImage';

export function ProfilePage() {
  const { user, soundEnabled, toggleSound, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4 bg-[#141824] border border-white/10 rounded-2xl p-8">
        <UserIcon className="w-10 h-10 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Player Profile</h1>
        <p className="text-sm text-slate-400">
          Sign in to customize your profile, review your win/loss statistics, and manage preferences.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="min-h-[44px] px-5 py-2.5 rounded-xl gold-button-surface text-sm font-semibold inline-flex items-center"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white/10 text-sm font-medium text-white inline-flex items-center"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const totalGames = user.totalWins + user.totalLosses;
  const winRate = totalGames > 0 ? Math.round((user.totalWins / totalGames) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);
    try {
      await updateProfile({
        username: username.trim() || user.username,
        phone: phone.trim(),
      });
      setStatusMsg({ ok: true, text: 'Profile settings saved.' });
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to save profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Player Profile &amp; Stats
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Account details, lifetime demo performance, and sound preferences.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/35 hover:bg-red-500/25 text-red-300 text-sm font-semibold inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Demo Wins', value: user.totalWins.toLocaleString(), tone: 'text-emerald-400' },
          { label: 'Total Demo Losses', value: user.totalLosses.toLocaleString(), tone: 'text-red-400' },
          { label: 'Win Rate', value: `${winRate}%`, tone: 'text-amber-300' },
          { label: 'Total Coins Wagered', value: user.totalWagered.toLocaleString(), tone: 'text-white' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#141824] border border-white/10 rounded-2xl p-5 space-y-1"
          >
            <p className="text-xs text-slate-400">{stat.label}</p>
            <p className={`font-mono-num text-2xl font-bold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Account Details & Edit Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-[#141824] border border-white/10 rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-4 pb-4 border-b border-white/8">
            <SafeImage
              src={user.avatarUrl}
              alt={user.username}
              className="w-16 h-16 rounded-2xl object-cover border border-amber-500/40 shrink-0"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{user.username}</h2>
              <p className="text-xs text-slate-400 truncate">
                {user.email || user.phone || user.uid} · Joined{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                statusMsg.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prof-username" className="block text-xs font-medium text-slate-300">
                Display Username
              </label>
              <input
                id="prof-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="prof-phone" className="block text-xs font-medium text-slate-300">
                Mobile Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/8 space-y-1">
              <span className="text-slate-400">Account ID</span>
              <p className="font-mono-num text-slate-200 truncate">{user.uid}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/8 space-y-1">
              <span className="text-slate-400">Auth Provider &amp; Status</span>
              <p className="text-slate-200 capitalize">
                {user.authProvider} · {user.status}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="min-h-[44px] px-5 py-2.5 rounded-xl gold-button-surface text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Account Details'}
          </button>
        </form>

        {/* Settings & Links */}
        <div className="lg:col-span-5 bg-[#141824] border border-white/10 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white">Platform Settings</h2>

          <div className="p-4 rounded-xl bg-[#0E1119] border border-white/8 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-white">Game Sound Effects</p>
              <p className="text-xs text-slate-400">
                Synthesized audio chimes for countdowns, cards, and wins
              </p>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`min-h-[42px] px-3.5 py-2 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${
                soundEnabled
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#0E1119] border border-white/8 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin Access</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Administrative controls are strictly isolated behind a separate password-protected portal.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex text-xs font-semibold text-amber-400 hover:text-amber-300"
            >
              Open Admin Portal Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
