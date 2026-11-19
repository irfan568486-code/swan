import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { GameKind } from '../types';

export function HistoryPage() {
  const { user, gameHistory, lobbyRounds } = useAuth();
  const [gameFilter, setGameFilter] = useState<'ALL' | GameKind>('ALL');
  const [search, setSearch] = useState('');

  const sourceRows = user ? gameHistory : lobbyRounds;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceRows.filter((row) => {
      if (gameFilter !== 'ALL' && row.game !== gameFilter) return false;
      if (
        q &&
        !row.selection.toLowerCase().includes(q) &&
        !row.outcome.toLowerCase().includes(q) &&
        !row.game.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [gameFilter, search, sourceRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-amber-400" />
            Demo Game History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {user
              ? 'Complete record of your simulated Wingo, Aviator, and Teen Patti rounds (newest first).'
              : 'Recent public arena demo rounds. Sign in to track your personal history.'}
          </p>
        </div>

        {!user && (
          <Link
            to="/login"
            className="min-h-[42px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold inline-flex items-center self-start"
          >
            Sign In for Personal History
          </Link>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#141824] border border-white/10 rounded-xl overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'All Games' },
              { key: 'WINGO_30', label: 'Wingo 30s' },
              { key: 'WINGO_60', label: 'Wingo 60s' },
              { key: 'AVIATOR', label: 'Aviator' },
              { key: 'TEEN_PATTI', label: 'Teen Patti' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setGameFilter(tab.key)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                gameFilter === tab.key ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by selection or outcome..."
            className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl bg-[#141824] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141824] border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <p className="text-sm text-slate-300 font-medium">No matching demo rounds found.</p>
            <Link
              to="/games"
              className="inline-flex min-h-[40px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold items-center"
            >
              Play a Demo Game
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400 bg-[#0E1119]">
                  <th className="py-3.5 px-4 font-semibold">Game</th>
                  <th className="py-3.5 px-4 font-semibold">Selection</th>
                  <th className="py-3.5 px-4 font-semibold">Demo Outcome</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Multiplier</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Net Coins</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {filtered.map((row) => (
                  <tr key={row.roundId} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                      {row.game.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.selection}</td>
                    <td className="py-3 px-4 text-slate-300">{row.outcome}</td>
                    <td className="py-3 px-4 text-right font-mono-num text-amber-300">
                      {row.multiplier > 0 ? `${row.multiplier}x` : '0x'}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono-num font-bold ${
                        row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {row.netProfit >= 0 ? `+${row.netProfit}` : row.netProfit}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-400 font-mono-num whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
