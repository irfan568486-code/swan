import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Coins,
  Gamepad2,
  KeyRound,
  LogOut,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { apiRequest } from '../lib/api';
import type { GameConfig, GameRoundRecord, PlayerTransaction, PlayerUser } from '../types';

interface AdminDashboardData {
  stats: {
    totalRegisteredUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalCoinsInCirculation: number;
    totalDemoRounds: number;
    totalWagered: number;
    totalPayout: number;
  };
  users: PlayerUser[];
  gameHistory: GameRoundRecord[];
  transactions: PlayerTransaction[];
  gameConfig: GameConfig;
  mustChangePassword: boolean;
}

type AdminTab = 'overview' | 'users' | 'history' | 'config';

export function AdminDashboardPage() {
  const {
    adminAuthenticated,
    adminId,
    adminToken,
    mustChangePassword,
    checkingSession,
    logoutAdmin,
    changeAdminPassword,
  } = useAdmin();

  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Coin adjustment modal state
  const [coinTarget, setCoinTarget] = useState<PlayerUser | null>(null);
  const [coinDelta, setCoinDelta] = useState('500');
  const [coinReason, setCoinReason] = useState('Admin demo coin adjustment');
  const [actionBusy, setActionBusy] = useState(false);

  // Config editor state
  const [configDraft, setConfigDraft] = useState<GameConfig | null>(null);
  const [configNotice, setConfigNotice] = useState('');

  // Broadcast notification state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifCategory, setNotifCategory] = useState<'system' | 'game' | 'reward'>('system');

  // Password change state
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const loadDashboard = useCallback(async () => {
    setError('');
    try {
      const res = await apiRequest<AdminDashboardData>('/api/admin/dashboard', {
        adminToken,
      });
      setData(res);
      setConfigDraft(res.gameConfig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load admin data.';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('authentication')) {
        await logoutAdmin(msg);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [adminToken, logoutAdmin]);

  useEffect(() => {
    if (adminAuthenticated) {
      loadDashboard();
    }
  }, [adminAuthenticated, loadDashboard]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [data, userSearch]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#090B10] text-slate-300 flex items-center justify-center text-sm">
        Verifying admin session...
      </div>
    );
  }

  if (!adminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleToggleUserStatus = async (user: PlayerUser) => {
    setActionBusy(true);
    setError('');
    try {
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      await apiRequest(`/api/admin/users/${user.uid}/status`, {
        method: 'PATCH',
        adminToken,
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinTarget) return;
    setActionBusy(true);
    setError('');
    try {
      await apiRequest(`/api/admin/users/${coinTarget.uid}/coins`, {
        method: 'POST',
        adminToken,
        body: JSON.stringify({
          delta: Number(coinDelta),
          reason: coinReason,
        }),
      });
      setCoinTarget(null);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust virtual coins.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configDraft) return;
    setConfigNotice('');
    setActionBusy(true);
    try {
      await apiRequest('/api/admin/config', {
        method: 'PUT',
        adminToken,
        body: JSON.stringify(configDraft),
      });
      setConfigNotice('Platform game configuration updated.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigNotice('');
    setActionBusy(true);
    try {
      await apiRequest('/api/admin/notifications', {
        method: 'POST',
        adminToken,
        body: JSON.stringify({
          title: notifTitle,
          message: notifMsg,
          category: notifCategory,
        }),
      });
      setNotifTitle('');
      setNotifMsg('');
      setConfigNotice('Broadcast notification published to all users.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification.');
    } finally {
      setActionBusy(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setError('');
    try {
      await changeAdminPassword(curPwd, newPwd);
      setCurPwd('');
      setNewPwd('');
      setPwdMsg('Admin password rotated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change admin password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 h-16 bg-[#0E1119]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-display text-lg font-extrabold text-white">
              SwarnaPlay Admin Console
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap">
              Operator: <strong className="text-slate-200">{adminId}</strong>
            </span>
            <button
              type="button"
              onClick={() => logoutAdmin()}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/35 hover:bg-red-500/25 text-red-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {mustChangePassword && (
          <div className="p-4 rounded-2xl bg-amber-500/12 border border-amber-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100 space-y-0.5">
                <p className="font-bold text-amber-300">
                  Initial Demo Password Active — Rotation Required Before Production
                </p>
                <p>
                  You are currently using the initial demo credential. Rotate the admin password under Game Config &amp; Security.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTab('config')}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg gold-button-surface text-xs font-bold whitespace-nowrap cursor-pointer shrink-0"
            >
              Change Password
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/35 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#131722] border border-white/10 rounded-xl w-fit overflow-x-auto max-w-full">
          {(
            [
              { key: 'overview', label: 'Platform Stats', icon: Gamepad2 },
              { key: 'users', label: 'Users & Coins', icon: Users },
              { key: 'history', label: 'Demo History', icon: Coins },
              { key: 'config', label: 'Config & Security', icon: Settings },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === item.key ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {loading || !data ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Loading protected admin telemetry...
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Registered Users', value: data.stats.totalRegisteredUsers.toLocaleString() },
                    { label: 'Active Users (24h)', value: data.stats.activeUsers.toLocaleString() },
                    { label: 'Coins in Circulation', value: data.stats.totalCoinsInCirculation.toLocaleString() },
                    { label: 'Total Demo Rounds', value: data.stats.totalDemoRounds.toLocaleString() },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-[#131722] border border-white/10 rounded-2xl p-5 space-y-1"
                    >
                      <p className="text-xs text-slate-400">{kpi.label}</p>
                      <p className="font-mono-num text-2xl font-bold text-amber-300">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 space-y-3">
                    <h2 className="text-base font-bold text-white">Latest Registered Players</h2>
                    {data.users.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6">No players registered yet.</p>
                    ) : (
                      <div className="divide-y divide-white/8">
                        {data.users.slice(0, 6).map((u) => (
                          <div key={u.uid} className="py-2.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-white">{u.username}</p>
                              <p className="text-slate-400">{u.email || u.phone || u.uid}</p>
                            </div>
                            <div className="text-right font-mono-num">
                              <p className="text-amber-300 font-bold">{u.coinBalance.toLocaleString()} coins</p>
                              <p className={u.status === 'active' ? 'text-emerald-400' : 'text-red-400'}>
                                {u.status}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 space-y-3">
                    <h2 className="text-base font-bold text-white">Platform Demo Volume</h2>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-[#0B0D13] border border-white/8">
                        <p className="text-xs text-slate-400">Total Wagered</p>
                        <p className="font-mono-num text-xl font-bold text-white mt-1">
                          {data.stats.totalWagered.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#0B0D13] border border-white/8">
                        <p className="text-xs text-slate-400">Total Payouts</p>
                        <p className="font-mono-num text-xl font-bold text-emerald-400 mt-1">
                          {data.stats.totalPayout.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#0B0D13] border border-white/8">
                        <p className="text-xs text-slate-400">Suspended Accounts</p>
                        <p className="font-mono-num text-xl font-bold text-red-400 mt-1">
                          {data.stats.suspendedUsers}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-[#0B0D13] border border-white/8">
                        <p className="text-xs text-slate-400">Daily Bonus Setting</p>
                        <p className="font-mono-num text-xl font-bold text-amber-300 mt-1">
                          {data.gameConfig.dailyBonusCoins}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-white">User &amp; Virtual Coin Management</h2>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search username, email, phone..."
                      className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl bg-[#131722] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-400">No users found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#0B0D13] border-b border-white/10 text-slate-400">
                            <th className="py-3 px-4">Player</th>
                            <th className="py-3 px-4">Contact</th>
                            <th className="py-3 px-4 text-right">Coin Balance</th>
                            <th className="py-3 px-4 text-right">Wins / Losses</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8">
                          {filteredUsers.map((u) => (
                            <tr key={u.uid} className="hover:bg-white/[0.02]">
                              <td className="py-3 px-4">
                                <p className="font-semibold text-white">{u.username}</p>
                                <p className="text-[11px] text-slate-500 font-mono-num">{u.uid}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                {u.email || u.phone || '—'}
                              </td>
                              <td className="py-3 px-4 text-right font-mono-num font-bold text-amber-300">
                                {u.coinBalance.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right font-mono-num text-slate-300">
                                {u.totalWins} / {u.totalLosses}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`font-semibold ${
                                    u.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCoinTarget(u);
                                    setCoinDelta('500');
                                  }}
                                  className="min-h-[34px] px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-semibold cursor-pointer hover:bg-amber-500/25"
                                >
                                  Adjust Coins
                                </button>
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                                    u.status === 'active'
                                      ? 'bg-red-500/15 border-red-500/35 text-red-300 hover:bg-red-500/25'
                                      : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25'
                                  }`}
                                >
                                  {u.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'history' && (
              <div className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">All Demo Game History</h2>
                  <span className="text-xs text-slate-400">Newest first</span>
                </div>
                {data.gameHistory.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No demo rounds recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#0B0D13] border-b border-white/10 text-slate-400">
                          <th className="py-3 px-4">Player</th>
                          <th className="py-3 px-4">Game</th>
                          <th className="py-3 px-4">Selection</th>
                          <th className="py-3 px-4">Outcome</th>
                          <th className="py-3 px-4 text-right">Stake</th>
                          <th className="py-3 px-4 text-right">Net</th>
                          <th className="py-3 px-4 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {data.gameHistory.map((row) => (
                          <tr key={row.roundId}>
                            <td className="py-3 px-4 font-medium text-white">{row.username}</td>
                            <td className="py-3 px-4 text-slate-300">{row.game}</td>
                            <td className="py-3 px-4 text-slate-300">{row.selection}</td>
                            <td className="py-3 px-4 text-slate-300">{row.outcome}</td>
                            <td className="py-3 px-4 text-right font-mono-num text-slate-300">
                              {row.betAmount}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono-num font-bold ${
                                row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {row.netProfit >= 0 ? `+${row.netProfit}` : row.netProfit}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-num text-xs text-slate-400 whitespace-nowrap">
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'config' && configDraft && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Game Configuration */}
                <form
                  onSubmit={handleSaveConfig}
                  className="lg:col-span-6 bg-[#131722] border border-white/10 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="text-base font-bold text-white">Game Configuration</h2>
                  {configNotice && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                      {configNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0B0D13] border border-white/10 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configDraft.wingo30Enabled}
                        onChange={(e) =>
                          setConfigDraft({ ...configDraft, wingo30Enabled: e.target.checked })
                        }
                      />
                      <span>Wingo 30s Active</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0B0D13] border border-white/10 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configDraft.wingo60Enabled}
                        onChange={(e) =>
                          setConfigDraft({ ...configDraft, wingo60Enabled: e.target.checked })
                        }
                      />
                      <span>Wingo 60s Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-300">Aviator Max Multiplier</label>
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={configDraft.aviatorMaxMultiplier}
                        onChange={(e) =>
                          setConfigDraft({
                            ...configDraft,
                            aviatorMaxMultiplier: Number(e.target.value) || 100,
                          })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0D13] border border-white/10 font-mono-num text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300">Teen Patti Min Ante</label>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        value={configDraft.teenPattiAnte}
                        onChange={(e) =>
                          setConfigDraft({
                            ...configDraft,
                            teenPattiAnte: Number(e.target.value) || 50,
                          })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0D13] border border-white/10 font-mono-num text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300">Daily Bonus Coins</label>
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        value={configDraft.dailyBonusCoins}
                        onChange={(e) =>
                          setConfigDraft({
                            ...configDraft,
                            dailyBonusCoins: Number(e.target.value) || 500,
                          })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0D13] border border-white/10 font-mono-num text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-300">Welcome Bonus Coins</label>
                      <input
                        type="number"
                        min={0}
                        max={50000}
                        value={configDraft.welcomeBonusCoins}
                        onChange={(e) =>
                          setConfigDraft({
                            ...configDraft,
                            welcomeBonusCoins: Number(e.target.value) || 1000,
                          })
                        }
                        className="w-full min-h-[42px] px-3 rounded-xl bg-[#0B0D13] border border-white/10 font-mono-num text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionBusy}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl gold-button-surface text-xs font-bold cursor-pointer"
                  >
                    Save Game Configuration
                  </button>
                </form>

                {/* Broadcast & Security */}
                <div className="lg:col-span-6 space-y-6">
                  <form
                    onSubmit={handleSendNotification}
                    className="bg-[#131722] border border-white/10 rounded-2xl p-6 space-y-3"
                  >
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      Broadcast Platform Notification
                    </h2>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="Announcement title"
                      className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0B0D13] border border-white/10 text-xs text-white"
                    />
                    <textarea
                      rows={2}
                      value={notifMsg}
                      onChange={(e) => setNotifMsg(e.target.value)}
                      placeholder="Message visible to all players..."
                      className="w-full p-3.5 rounded-xl bg-[#0B0D13] border border-white/10 text-xs text-white"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <select
                        value={notifCategory}
                        onChange={(e) =>
                          setNotifCategory(e.target.value as 'system' | 'game' | 'reward')
                        }
                        className="min-h-[40px] px-3 rounded-xl bg-[#0B0D13] border border-white/10 text-xs text-white"
                      >
                        <option value="system">System</option>
                        <option value="game">Game</option>
                        <option value="reward">Reward</option>
                      </select>
                      <button
                        type="submit"
                        disabled={actionBusy || !notifTitle.trim() || !notifMsg.trim()}
                        className="min-h-[40px] px-4 py-2 rounded-xl gold-button-surface text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Send Announcement
                      </button>
                    </div>
                  </form>

                  <form
                    onSubmit={handlePasswordChange}
                    className="bg-[#131722] border border-white/10 rounded-2xl p-6 space-y-3"
                  >
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      Rotate Admin Password
                    </h2>
                    {pwdMsg && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                        {pwdMsg}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="password"
                        value={curPwd}
                        onChange={(e) => setCurPwd(e.target.value)}
                        placeholder="Current password"
                        className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0B0D13] border border-white/10 text-xs text-white"
                      />
                      <input
                        type="password"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        placeholder="New password (6+ chars)"
                        className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#0B0D13] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                    >
                      Update Admin Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adjust Virtual Coins Modal */}
      {coinTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustCoins}
            className="w-full max-w-md bg-[#131722] border border-amber-500/35 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Adjust Virtual Coins · {coinTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setCoinTarget(null)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Current balance:{' '}
              <span className="font-mono-num text-amber-300 font-bold">
                {coinTarget.coinBalance.toLocaleString()}
              </span>
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-300">
                Coin Delta (positive to grant, negative to deduct)
              </label>
              <input
                type="number"
                value={coinDelta}
                onChange={(e) => setCoinDelta(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0D13] border border-white/10 font-mono-num text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-300">Audit Reason</label>
              <input
                type="text"
                value={coinReason}
                onChange={(e) => setCoinReason(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#0B0D13] border border-white/10 text-sm text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCoinTarget(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-white/10 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="min-h-[42px] px-4 py-2 rounded-xl gold-button-surface text-xs font-bold cursor-pointer"
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
