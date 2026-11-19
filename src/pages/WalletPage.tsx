import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Coins, Gift, Info, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { TransactionType } from '../types';

export function WalletPage() {
  const { user, transactions, gameConfig, claimDailyBonus } = useAuth();
  const [txFilter, setTxFilter] = useState<'ALL' | TransactionType>('ALL');
  const [claiming, setClaiming] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredTx = useMemo(() => {
    if (txFilter === 'ALL') return transactions;
    return transactions.filter((t) => t.type === txFilter);
  }, [transactions, txFilter]);

  const handleBonus = async () => {
    setFeedback(null);
    setClaiming(true);
    try {
      const awarded = await claimDailyBonus();
      setFeedback({ ok: true, text: `Claimed +${awarded} daily virtual demo coins!` });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to claim daily bonus right now.',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4 bg-[#141824] border border-white/10 rounded-2xl p-8">
        <Wallet className="w-10 h-10 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Virtual Coin Wallet</h1>
        <p className="text-sm text-slate-400">
          Sign in or register to view your virtual coin balance, claim daily demo bonuses, and review your transaction ledger.
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Virtual Coin Wallet
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Non-monetary virtual coins for demo entertainment · No real-money processing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Balance & Daily Bonus */}
        <div className="lg:col-span-5 bg-[#141824] border border-amber-500/25 rounded-2xl p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Available Virtual Coins</p>
            <div className="flex items-center gap-3">
              <Coins className="w-7 h-7 text-amber-400 shrink-0" />
              <span className="font-mono-num text-4xl font-extrabold text-amber-300">
                {user.coinBalance.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBonus}
            disabled={claiming}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl gold-button-surface font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Gift className="w-4 h-4" />
            {claiming
              ? 'Crediting Bonus...'
              : `Claim Daily Demo Bonus (+${gameConfig?.dailyBonusCoins ?? 500} coins)`}
          </button>

          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs ${
                feedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Clearly Labelled Non-Functional Deposit & Withdrawal Placeholders */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Deposit and Withdrawal panels below are non-functional UI placeholders. No real payments are processed.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Deposit (Demo Disabled)
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
              >
                <ArrowUpRight className="w-4 h-4" />
                Withdraw (Demo Disabled)
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Ledger */}
        <div className="lg:col-span-7 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-white">Transaction Ledger</h2>
            <div className="flex items-center gap-1 p-1 bg-[#0E1119] border border-white/10 rounded-xl overflow-x-auto">
              {(
                [
                  { key: 'ALL', label: 'All' },
                  { key: 'DAILY_BONUS', label: 'Bonuses' },
                  { key: 'GAME_WIN', label: 'Wins' },
                  { key: 'GAME_BET', label: 'Stakes' },
                  { key: 'ADMIN_ADJUST', label: 'Admin' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTxFilter(tab.key)}
                  className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    txFilter === tab.key ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No transactions match this filter yet.
            </div>
          ) : (
            <div className="divide-y divide-white/8 max-h-[460px] overflow-y-auto pr-1">
              {filteredTx.map((tx) => (
                <div key={tx.txId} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {tx.type.replace('_', ' ')} · {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono-num text-sm font-bold ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono-num">
                      Bal {tx.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
