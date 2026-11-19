import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Coins, Info, RotateCcw, Spade, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { soundFx } from '../lib/soundFx';
import type { PlayingCard, TeenPattiDealResult } from '../types';

const SUIT_SYMBOLS: Record<PlayingCard['suit'], { symbol: string; color: string }> = {
  spades: { symbol: '♠', color: 'text-slate-900' },
  clubs: { symbol: '♣', color: 'text-slate-900' },
  hearts: { symbol: '♥', color: 'text-red-600' },
  diamonds: { symbol: '♦', color: 'text-red-600' },
};

function CardFace({ card, delay }: { card: PlayingCard; delay: number }) {
  const suitInfo = SUIT_SYMBOLS[card.suit];
  return (
    <motion.div
      initial={{ opacity: 0, y: -24, rotateY: 90, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
      transition={{ duration: 0.32, delay }}
      className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-white border-2 border-amber-300/70 shadow-lg p-2 flex flex-col justify-between select-none"
    >
      <div className={`text-left leading-none font-bold ${suitInfo.color}`}>
        <span className="block text-sm sm:text-base font-mono-num">{card.label}</span>
        <span className="text-xs">{suitInfo.symbol}</span>
      </div>
      <div className={`text-center text-2xl sm:text-3xl ${suitInfo.color}`}>{suitInfo.symbol}</div>
      <div className={`text-right leading-none font-bold rotate-180 ${suitInfo.color}`}>
        <span className="block text-sm sm:text-base font-mono-num">{card.label}</span>
        <span className="text-xs">{suitInfo.symbol}</span>
      </div>
    </motion.div>
  );
}

function CardBack() {
  return (
    <div className="w-20 h-28 sm:w-24 sm:h-34 rounded-xl bg-gradient-to-br from-[#7F1D1D] to-[#450A0A] border-2 border-amber-400/50 flex items-center justify-center">
      <div className="w-12 h-20 sm:w-14 sm:h-24 rounded-lg border border-amber-400/35 flex items-center justify-center">
        <Spade className="w-6 h-6 text-amber-300/75" />
      </div>
    </div>
  );
}

export function TeenPattiGamePage() {
  const { user, gameConfig, gameHistory, playTeenPatti } = useAuth();
  const minAnte = gameConfig?.teenPattiAnte ?? 50;
  const chipPresets = [minAnte, minAnte * 2, minAnte * 5, minAnte * 10];

  const [betAmount, setBetAmount] = useState<number>(minAnte);
  const [deal, setDeal] = useState<TeenPattiDealResult | null>(null);
  const [dealing, setDealing] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState('');

  const teenPattiHistory = useMemo(
    () => gameHistory.filter((g) => g.game === 'TEEN_PATTI'),
    [gameHistory]
  );

  const handleDeal = async () => {
    setError('');
    if (!user) {
      setError('Please sign in first to deal virtual-coin Teen Patti hands.');
      return;
    }
    if (betAmount < minAnte || betAmount > user.coinBalance) {
      setError(`Ante must be between ${minAnte} and your available balance.`);
      return;
    }

    setDealing(true);
    setDeal(null);
    soundFx.playCardSnap();
    try {
      const { deal: nextDeal } = await playTeenPatti(betAmount);
      setDeal(nextDeal);
      window.setTimeout(() => {
        if (nextDeal.winner === 'player') {
          soundFx.playWin();
        } else if (nextDeal.winner === 'dealer') {
          soundFx.playLoss();
        }
      }, 450);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deal hand.');
    } finally {
      setDealing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Royal Teen Patti Demo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-1">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>3-Card Showdown · Virtual demo chips only · Standard Teen Patti rankings.</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRules((v) => !v)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#141824] border border-white/15 hover:border-amber-400/40 text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            {showRules ? 'Hide Rules' : 'Hand Rules'}
          </button>

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
              className="min-h-[42px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold inline-flex items-center"
            >
              Sign In to Play
            </Link>
          )}
        </div>
      </div>

      {showRules && (
        <div className="bg-[#141824] border border-amber-500/25 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-300">
          <div>
            <p className="font-bold text-amber-300">1. Trail (Three of a Kind)</p>
            <p className="text-slate-400">Three cards of the exact same rank (e.g. A-A-A highest).</p>
          </div>
          <div>
            <p className="font-bold text-amber-300">2. Pure Sequence</p>
            <p className="text-slate-400">Three consecutive cards of the same suit (Straight Flush).</p>
          </div>
          <div>
            <p className="font-bold text-amber-300">3. Sequence (Run)</p>
            <p className="text-slate-400">Three consecutive cards of mixed suits (A-K-Q highest).</p>
          </div>
          <div>
            <p className="font-bold text-amber-300">4. Color (Flush)</p>
            <p className="text-slate-400">Any three cards sharing the same suit.</p>
          </div>
          <div>
            <p className="font-bold text-amber-300">5. Pair</p>
            <p className="text-slate-400">Two cards of matching rank plus one kicker card.</p>
          </div>
          <div>
            <p className="font-bold text-amber-300">6. High Card</p>
            <p className="text-slate-400">Highest individual card comparison when no combo hits.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Felt Card Table */}
        <div className="lg:col-span-8 space-y-5">
          <div className="rounded-3xl border-4 border-[#3E2723] bg-gradient-to-b from-[#0F5132] to-[#083320] p-6 sm:p-8 space-y-8 shadow-2xl">
            {/* Dealer Zone */}
            <div className="space-y-3 text-center">
              <p className="text-xs font-semibold text-emerald-200/80 uppercase tracking-wider">
                Dealer Hand {deal ? `· ${deal.dealerHand.name}` : ''}
              </p>
              <div className="flex items-center justify-center gap-3 sm:gap-4 min-h-[116px] sm:min-h-[136px]">
                {deal ? (
                  deal.dealerCards.map((c, idx) => (
                    <CardFace key={`d-${idx}`} card={c} delay={0.1 + idx * 0.12} />
                  ))
                ) : (
                  <>
                    <CardBack />
                    <CardBack />
                    <CardBack />
                  </>
                )}
              </div>
            </div>

            {/* Result Banner in Center */}
            <AnimatePresence>
              {deal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={`mx-auto max-w-md rounded-2xl p-4 border text-center space-y-1 ${
                    deal.winner === 'player'
                      ? 'bg-emerald-950/90 border-amber-400/60 text-emerald-200'
                      : deal.winner === 'tie'
                        ? 'bg-slate-900/90 border-slate-400/40 text-slate-200'
                        : 'bg-red-950/90 border-red-400/50 text-red-200'
                  }`}
                >
                  <p className="text-lg font-extrabold">
                    {deal.winner === 'player'
                      ? `You Won +${deal.netProfit} Demo Coins`
                      : deal.winner === 'tie'
                        ? 'Exact Tie — Ante Returned'
                        : `Dealer Wins (${deal.netProfit} coins)`}
                  </p>
                  <p className="text-xs opacity-90">
                    Your {deal.playerHand.name} vs Dealer {deal.dealerHand.name}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Player Zone */}
            <div className="space-y-3 text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 min-h-[116px] sm:min-h-[136px]">
                {deal ? (
                  deal.playerCards.map((c, idx) => (
                    <CardFace key={`p-${idx}`} card={c} delay={idx * 0.1} />
                  ))
                ) : (
                  <>
                    <CardBack />
                    <CardBack />
                    <CardBack />
                  </>
                )}
              </div>
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Your Hand {deal ? `· ${deal.playerHand.name}` : ''}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Demo Chips & Deal Controls */}
          <div className="bg-[#141824] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">Select Demo Chip Ante</span>
              <span className="text-xs text-slate-400 font-mono-num">Min {minAnte} coins</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {chipPresets.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setBetAmount(chip)}
                  className={`min-h-[42px] px-4 py-2 rounded-full font-mono-num text-xs font-bold border-2 cursor-pointer transition-transform active:scale-95 ${
                    betAmount === chip
                      ? 'gold-button-surface border-amber-200'
                      : 'bg-[#0E1119] border-amber-500/35 text-amber-300 hover:border-amber-400'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={dealing}
              onClick={handleDeal}
              className="w-full min-h-[50px] py-3 px-6 rounded-xl gold-button-surface font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {deal ? <RotateCcw className="w-4 h-4" /> : <Spade className="w-4 h-4" />}
              {dealing ? 'Dealing Cards...' : deal ? `Deal New Hand (${betAmount} coins)` : `Deal Demo Hand (${betAmount} coins)`}
            </button>
          </div>
        </div>

        {/* Teen Patti Hand History */}
        <div className="lg:col-span-4 bg-[#141824] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Table History
            </h2>
            <span className="text-xs text-slate-400">Newest first</span>
          </div>

          {teenPattiHistory.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-slate-400">No Teen Patti hands dealt yet.</p>
              <p className="text-xs text-slate-500">Pick your demo chip ante and press Deal Demo Hand.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/8 max-h-[450px] overflow-y-auto pr-1">
              {teenPattiHistory.map((row) => (
                <div key={row.roundId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{row.selection}</p>
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
                    <p className="text-[11px] text-slate-500 font-mono-num">Ante {row.betAmount}</p>
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
