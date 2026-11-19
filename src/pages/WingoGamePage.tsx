import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Coins, Info, Sparkles, Trophy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { soundFx } from '../lib/soundFx';
import type { WingoResult } from '../types';

const COIN_PRESETS = [10, 50, 100, 500, 1000];

const NUMBER_STYLES: Record<number, { bg: string; label: string }> = {
  0: { bg: 'bg-gradient-to-br from-red-600 to-violet-600 border-violet-300/40', label: 'Red + Violet' },
  1: { bg: 'bg-emerald-600 border-emerald-300/40', label: 'Green' },
  2: { bg: 'bg-red-600 border-red-300/40', label: 'Red' },
  3: { bg: 'bg-emerald-600 border-emerald-300/40', label: 'Green' },
  4: { bg: 'bg-red-600 border-red-300/40', label: 'Red' },
  5: { bg: 'bg-gradient-to-br from-emerald-600 to-violet-600 border-violet-300/40', label: 'Green + Violet' },
  6: { bg: 'bg-red-600 border-red-300/40', label: 'Red' },
  7: { bg: 'bg-emerald-600 border-emerald-300/40', label: 'Green' },
  8: { bg: 'bg-red-600 border-red-300/40', label: 'Red' },
  9: { bg: 'bg-emerald-600 border-emerald-300/40', label: 'Green' },
};

export function WingoGamePage() {
  const { user, gameHistory, gameConfig, playWingo } = useAuth();
  const [mode, setMode] = useState<'WINGO_30' | 'WINGO_60'>('WINGO_30');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [betType, setBetType] = useState<'COLOR' | 'SIZE' | 'NUMBER'>('COLOR');
  const [selection, setSelection] = useState<string>('green');
  const [betAmount, setBetAmount] = useState<number>(50);
  const [queuedBet, setQueuedBet] = useState<{
    mode: 'WINGO_30' | 'WINGO_60';
    betType: 'COLOR' | 'SIZE' | 'NUMBER';
    selection: string;
    betAmount: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [popupResult, setPopupResult] = useState<WingoResult | null>(null);

  const duration = mode === 'WINGO_30' ? 30 : 60;
  const modeDisabled =
    (mode === 'WINGO_30' && gameConfig?.wingo30Enabled === false) ||
    (mode === 'WINGO_60' && gameConfig?.wingo60Enabled === false);

  const wingoHistory = useMemo(
    () => gameHistory.filter((g) => g.game === 'WINGO_30' || g.game === 'WINGO_60'),
    [gameHistory]
  );

  const queuedRef = useRef(queuedBet);
  queuedRef.current = queuedBet;

  const executeDraw = useCallback(
    async (payload: {
      mode: 'WINGO_30' | 'WINGO_60';
      betType: 'COLOR' | 'SIZE' | 'NUMBER';
      selection: string;
      betAmount: number;
    }) => {
      setBusy(true);
      setError('');
      try {
        const { result } = await playWingo(payload);
        setPopupResult(result);
        setQueuedBet(null);
        if (result.won) {
          soundFx.playWin();
        } else {
          soundFx.playLoss();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to run demo round.');
      } finally {
        setBusy(false);
      }
    },
    [playWingo]
  );

  useEffect(() => {
    setSecondsLeft(duration);
  }, [duration]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          const pending = queuedRef.current;
          if (pending) {
            executeDraw(pending);
          }
          return duration;
        }
        if (prev <= 6 && queuedRef.current) {
          soundFx.playTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [duration, executeDraw]);

  const handleQueueOrDraw = (instant: boolean) => {
    setError('');
    if (!user) {
      setError('Please sign in first to play with your virtual coin balance.');
      return;
    }
    if (modeDisabled) {
      setError('This Wingo timer mode is currently paused by the administrator.');
      return;
    }
    if (betAmount < 10 || betAmount > user.coinBalance) {
      setError('Check your bet amount against your available virtual coin balance (min 10).');
      return;
    }
    const payload = { mode, betType, selection, betAmount };
    if (instant) {
      executeDraw(payload);
    } else {
      setQueuedBet(payload);
    }
  };

  const formattedClock = `00:${String(secondsLeft).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Header & Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Wingo Demo Arena
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-1">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Transparent locally simulated demo draws · Outcomes do not predict real-world results.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="px-4 py-2 rounded-xl bg-[#141824] border border-amber-500/30 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num text-sm font-bold text-amber-300">
                {user.coinBalance.toLocaleString()}
              </span>
            </div>
          ) : (
            <Link
              to="/login"
              className="min-h-[42px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold flex items-center"
            >
              Sign In to Play
            </Link>
          )}
        </div>
      </div>

      {/* Timer & Mode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/8">
            <div className="flex items-center gap-2 p-1 bg-[#0E1119] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMode('WINGO_30')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  mode === 'WINGO_30' ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
                }`}
              >
                Wingo 30s
              </button>
              <button
                type="button"
                onClick={() => setMode('WINGO_60')}
                className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  mode === 'WINGO_60' ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
                }`}
              >
                Wingo 60s
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[11px] text-slate-400">Next Simulated Draw</p>
                <p className="font-mono-num text-2xl font-bold text-amber-300 flex items-center justify-end gap-1.5">
                  <Clock className="w-4 h-4 text-red-400" />
                  {formattedClock}
                </p>
              </div>
            </div>
          </div>

          {modeDisabled && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              This Wingo round timer is currently disabled in platform configuration.
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* 1. Color Selection */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-300">
              Pick Color (Green / Red 2x · Violet 4.5x)
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'green', label: 'Green', style: 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300', active: 'bg-emerald-600 text-white border-emerald-300' },
                { key: 'violet', label: 'Violet', style: 'bg-violet-600/20 border-violet-500/50 text-violet-300', active: 'bg-violet-600 text-white border-violet-300' },
                { key: 'red', label: 'Red', style: 'bg-red-600/20 border-red-500/50 text-red-300', active: 'bg-red-600 text-white border-red-300' },
              ].map((c) => {
                const isSelected = betType === 'COLOR' && selection === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setBetType('COLOR');
                      setSelection(c.key);
                    }}
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      isSelected ? `${c.active} ring-2 ring-amber-400/70` : c.style
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Number 0-9 Selection */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-300">
              Or Pick Exact Number 0–9 (9.0x Payout)
            </p>
            <div className="grid grid-cols-5 gap-2.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isSelected = betType === 'NUMBER' && selection === String(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setBetType('NUMBER');
                      setSelection(String(num));
                    }}
                    className={`min-h-[48px] rounded-xl border font-mono-num text-lg font-bold text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${
                      NUMBER_STYLES[num].bg
                    } ${isSelected ? 'ring-2 ring-amber-300 scale-[1.03]' : 'opacity-85 hover:opacity-100'}`}
                    title={`Number ${num} (${NUMBER_STYLES[num].label})`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Big / Small Selection */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-300">
              Or Pick Size (Big 5–9 / Small 0–4 · 2.0x Payout)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'big', label: 'Big (5 – 9)', cls: 'from-amber-500/20 to-amber-700/20 border-amber-500/40' },
                { key: 'small', label: 'Small (0 – 4)', cls: 'from-sky-500/20 to-indigo-700/20 border-sky-500/40' },
              ].map((sz) => {
                const isSelected = betType === 'SIZE' && selection === sz.key;
                return (
                  <button
                    key={sz.key}
                    type="button"
                    onClick={() => {
                      setBetType('SIZE');
                      setSelection(sz.key);
                    }}
                    className={`min-h-[46px] px-4 py-2 rounded-xl border bg-gradient-to-r ${sz.cls} text-sm font-bold text-white cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-amber-400' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {sz.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Virtual Coin Amount & Actions */}
          <div className="pt-2 border-t border-white/8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-300">
                Selection:{' '}
                <strong className="text-amber-300">
                  {betType} · {selection.toUpperCase()}
                </strong>
              </span>
              <span className="text-xs text-slate-400">Stake (Virtual Coins)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {COIN_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBetAmount(amt)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg font-mono-num text-xs font-semibold border cursor-pointer transition-colors ${
                    betAmount === amt
                      ? 'gold-button-surface border-amber-300'
                      : 'bg-[#0E1119] border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {amt}
                </button>
              ))}
              <input
                type="number"
                min={10}
                max={100000}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
                aria-label="Custom virtual coin bet amount"
                className="w-28 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0E1119] border border-white/15 font-mono-num text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {queuedBet && (
              <div className="p-3 rounded-xl bg-amber-500/12 border border-amber-500/35 flex items-center justify-between gap-3 text-xs text-amber-200">
                <span>
                  Locked {queuedBet.betAmount} coins on {queuedBet.selection.toUpperCase()} for countdown draw ({formattedClock}).
                </span>
                <button
                  type="button"
                  onClick={() => setQueuedBet(null)}
                  className="text-amber-300 underline cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={busy || modeDisabled}
                onClick={() => handleQueueOrDraw(false)}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#1E2436] hover:bg-[#252D42] border border-white/15 text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                Lock for Countdown ({formattedClock})
              </button>
              <button
                type="button"
                disabled={busy || modeDisabled}
                onClick={() => handleQueueOrDraw(true)}
                className="min-h-[46px] px-4 py-2.5 rounded-xl gold-button-surface text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {busy ? 'Drawing...' : 'Draw Demo Result Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Previous Rounds & All-Time Wingo History (Newest First) */}
        <div className="lg:col-span-5 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Wingo Demo History
            </h2>
            <span className="text-xs text-slate-400">Newest first</span>
          </div>

          {wingoHistory.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#0E1119] border border-white/8 space-y-2">
              <p className="text-[11px] text-slate-400">Latest Drawn Numbers</p>
              <div className="flex flex-wrap items-center gap-2">
                {wingoHistory.slice(0, 10).map((item) => {
                  const match = item.outcome.match(/#(\d)/);
                  const num = match ? Number(match[1]) : 0;
                  return (
                    <span
                      key={item.roundId}
                      className={`w-8 h-8 rounded-full font-mono-num text-xs font-bold text-white flex items-center justify-center border ${NUMBER_STYLES[num].bg}`}
                      title={item.outcome}
                    >
                      {num}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {wingoHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center space-y-2">
              <p className="text-sm text-slate-400">No Wingo rounds played yet.</p>
              <p className="text-xs text-slate-500">
                Choose a color, size, or number and press Draw Demo Result Now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/8 max-h-[430px] overflow-y-auto pr-1">
              {wingoHistory.map((row) => (
                <div key={row.roundId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {row.game === 'WINGO_30' ? '30s' : '60s'} · {row.selection}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {row.outcome} · {new Date(row.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono-num text-xs font-bold ${
                        row.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {row.netProfit >= 0 ? `+${row.netProfit}` : row.netProfit}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono-num">
                      Stake {row.betAmount}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result Announcement Popup */}
      <AnimatePresence>
        {popupResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className={`w-full max-w-sm rounded-2xl p-6 border text-center space-y-4 ${
                popupResult.won
                  ? 'bg-[#131D1A] border-emerald-500/45'
                  : 'bg-[#1D1318] border-red-500/45'
              }`}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setPopupResult(null)}
                  aria-label="Close result popup"
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div
                className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center font-mono-num text-3xl font-extrabold text-white ${
                  NUMBER_STYLES[popupResult.drawnNumber].bg
                }`}
              >
                {popupResult.drawnNumber}
              </div>

              <div className="space-y-1">
                <h3
                  className={`text-2xl font-extrabold ${
                    popupResult.won ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {popupResult.won ? 'Demo Round Won!' : 'Demo Round Missed'}
                </h3>
                <p className="text-xs text-slate-300">{popupResult.outcomeLabel}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-1">
                <p className="text-xs text-slate-400">Net Virtual Coin Change</p>
                <p
                  className={`font-mono-num text-2xl font-bold ${
                    popupResult.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {popupResult.netProfit >= 0 ? `+${popupResult.netProfit}` : popupResult.netProfit}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPopupResult(null)}
                className="w-full min-h-[44px] py-2.5 rounded-xl gold-button-surface text-sm font-bold cursor-pointer"
              >
                Continue Playing
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
