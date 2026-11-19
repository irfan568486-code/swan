import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  Coins,
  Gift,
  Info,
  Plane,
  Spade,
  Trophy,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from '../components/SafeImage';

type CategoryKey = 'all' | 'lottery' | 'crash' | 'cards';

const GAMES_CATALOG = [
  {
    id: 'wingo',
    category: 'lottery' as const,
    title: 'Wingo Color & Number',
    subtitle: '30s & 60s Simulated Rounds · 0–9 & RGB',
    multiplier: 'Up to 9.0x',
    image: '/src/assets/images/game_wingo_thumb_1795078971485.jpg',
    to: '/games/wingo',
  },
  {
    id: 'aviator',
    category: 'crash' as const,
    title: 'Aviator Sky Climb',
    subtitle: 'Live Multiplier Curve · Manual Cashout',
    multiplier: 'Up to 100x',
    image: '/src/assets/images/game_aviator_thumb_1795078971776.jpg',
    to: '/games/aviator',
  },
  {
    id: 'teen-patti',
    category: 'cards' as const,
    title: 'Royal Teen Patti',
    subtitle: '3-Card Showdown · Trail & Pure Sequence',
    multiplier: '2.0x Table Win',
    image: '/src/assets/images/game_teenpatti_thumb_1795078971684.jpg',
    to: '/games/teen-patti',
  },
];

export function HomePage() {
  const {
    user,
    gameHistory,
    lobbyRounds,
    notifications,
    claimDailyBonus,
    markNotificationsRead,
  } = useAuth();

  const [category, setCategory] = useState<CategoryKey>('all');
  const [demoModal, setDemoModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [bonusMessage, setBonusMessage] = useState<string | null>(null);
  const [bonusError, setBonusError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const visibleGames =
    category === 'all' ? GAMES_CATALOG : GAMES_CATALOG.filter((g) => g.category === category);
  const recentFeed = user ? gameHistory.slice(0, 6) : lobbyRounds.slice(0, 6);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleDailyBonus = async () => {
    setBonusError(null);
    setBonusMessage(null);
    setClaiming(true);
    try {
      const awarded = await claimDailyBonus();
      setBonusMessage(`Credited +${awarded} virtual demo coins to your wallet.`);
    } catch (err) {
      setBonusError(err instanceof Error ? err.message : 'Unable to claim daily bonus.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Promotional Hero Banner + User Balance Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 relative rounded-2xl overflow-hidden border border-amber-500/20 min-h-[260px] sm:min-h-[300px] flex flex-col justify-end">
          <SafeImage
            src="/src/assets/images/hero_gaming_banner_1795078971862.jpg"
            alt="SwarnaPlay Royal Gaming Lounge"
            className="absolute inset-0 w-full h-full object-cover"
            fallbackLabel="SwarnaPlay Arena"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/70 to-black/25" />

          <div className="relative z-10 p-6 sm:p-8 max-w-2xl space-y-3">
            <p className="text-xs font-medium text-amber-300 tracking-wide">
              Virtual Coin Arena · Simulated Demo Entertainment
            </p>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight text-balance leading-tight">
              Royal Gold &amp; Crimson Demo Gaming Lounge
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
              Play 30-second Wingo color draws, time your Aviator flight cashout, or challenge the dealer in 3-card Teen Patti using virtual coins.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link
                to={user ? '/games/wingo' : '/register'}
                className="min-h-[44px] px-5 py-2.5 rounded-xl gold-button-surface font-semibold text-sm inline-flex items-center gap-2 transition-transform active:scale-[0.98] whitespace-nowrap"
              >
                {user ? 'Play Wingo 30s' : 'Claim 1,000 Demo Coins'}
              </Link>
              <Link
                to="/games"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium text-white inline-flex items-center whitespace-nowrap transition-colors"
              >
                Explore All Games
              </Link>
            </div>
          </div>
        </div>

        {/* User Profile & Virtual Wallet Summary Card */}
        <div className="lg:col-span-4 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          {user ? (
            <>
              <div className="flex items-center gap-3.5">
                <SafeImage
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-base font-bold text-white truncate">{user.username}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {user.email || user.phone || 'Verified Player'} · Wins {user.totalWins}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E1119] border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Virtual Coin Balance</span>
                  <span>Demo Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="font-mono-num text-2xl font-bold text-amber-300">
                    {user.coinBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDemoModal('deposit')}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-500/12 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <ArrowDownLeft className="w-4 h-4 shrink-0" />
                    Deposit (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoModal('withdraw')}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-red-500/12 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <ArrowUpRight className="w-4 h-4 shrink-0" />
                    Withdraw (Demo)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDailyBonus}
                  disabled={claiming}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  {claiming ? 'Claiming...' : 'Claim Daily Demo Coins'}
                </button>
                {bonusMessage && <p className="text-xs text-emerald-400">{bonusMessage}</p>}
                {bonusError && <p className="text-xs text-red-400">{bonusError}</p>}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Player Account</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Sign in or register to unlock your 1,000 virtual welcome coins, daily bonus rewards, and personal history tracking.
                </p>
              </div>
              <div className="space-y-2.5">
                <Link
                  to="/login"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl gold-button-surface font-semibold text-sm flex items-center justify-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0E1119] border border-white/15 hover:border-amber-400/50 text-sm font-medium text-slate-200 flex items-center justify-center transition-colors"
                >
                  Create Free Account
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDemoModal('deposit')}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-medium cursor-pointer hover:bg-white/10"
                  >
                    Deposit Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemoModal('withdraw')}
                    className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 text-xs font-medium cursor-pointer hover:bg-white/10"
                  >
                    Withdraw Preview
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Game Categories + Popular Games Grid */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Popular Demo Games</h2>
            <p className="text-xs text-slate-400">Select a category or launch any virtual-coin table</p>
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-[#141824] border border-white/10 rounded-xl overflow-x-auto"
            role="tablist"
            aria-label="Game categories"
          >
            {(
              [
                { key: 'all', label: 'All Games' },
                { key: 'lottery', label: 'Color & Wingo' },
                { key: 'crash', label: 'Aviator Crash' },
                { key: 'cards', label: 'Teen Patti' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={category === tab.key}
                onClick={() => setCategory(tab.key)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === tab.key
                    ? 'gold-button-surface'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visibleGames.map((game) => (
            <Link
              key={game.id}
              to={game.to}
              className="group bg-[#141824] border border-white/10 hover:border-amber-500/45 rounded-2xl overflow-hidden transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden relative bg-[#0E1119]">
                <SafeImage
                  src={game.image}
                  alt={game.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  fallbackLabel={game.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141824] via-transparent to-transparent" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {game.subtitle} · {game.multiplier}
                  </p>
                </div>
                <span className="inline-flex items-center text-xs font-semibold text-amber-400">
                  Play Demo Table →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Game History + Notifications Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                {user ? 'Your Recent Demo Rounds' : 'Recent Arena Demo Activity'}
              </h2>
            </div>
            <Link to="/history" className="text-xs font-semibold text-amber-400 hover:text-amber-300">
              View All
            </Link>
          </div>

          {recentFeed.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm text-slate-400">No demo rounds recorded yet.</p>
              <Link
                to="/games/wingo"
                className="inline-flex text-xs font-semibold text-amber-400 hover:text-amber-300"
              >
                Launch Wingo 30s to log your first round →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {recentFeed.map((item) => (
                <div
                  key={item.roundId}
                  className="py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100 truncate">
                      {item.game.replace('_', ' ')} · {item.selection}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.outcome} · {new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono-num text-sm font-semibold ${
                        item.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.netProfit >= 0 ? `+${item.netProfit}` : item.netProfit}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono-num">
                      {item.multiplier > 0 ? `${item.multiplier}x` : '0x'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Panel */}
        <div className="lg:col-span-5 bg-[#141824] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Notifications {unreadCount > 0 ? `(${unreadCount} new)` : ''}
              </h2>
            </div>
            {user && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markNotificationsRead()}
                className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center space-y-2 text-xs text-slate-400">
              <p>Sign in to receive account alerts, daily reward reminders, and platform updates.</p>
              <div className="pt-2 flex items-center justify-center gap-4 text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <Plane className="w-3.5 h-3.5 text-amber-400" /> Aviator
                </span>
                <span className="inline-flex items-center gap-1">
                  <Spade className="w-3.5 h-3.5 text-red-400" /> Teen Patti
                </span>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {notifications.slice(0, 5).map((notif) => (
                <div key={notif.notifId} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        notif.read ? 'text-slate-300' : 'text-amber-300'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <span className="text-[11px] text-slate-500 capitalize shrink-0">
                      {notif.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Non-Functional Deposit / Withdrawal Demo Placeholder Modal */}
      <AnimatePresence>
        {demoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-[#141824] border border-amber-500/30 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {demoModal === 'deposit' ? 'Deposit Preview (Non-Functional)' : 'Withdraw Preview (Non-Functional)'}
                </h3>
                <button
                  type="button"
                  onClick={() => setDemoModal(null)}
                  aria-label="Close modal"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-slate-200 leading-relaxed">
                  <p className="font-semibold text-amber-300">
                    Demo Placeholder Only — No Real-Money Processing
                  </p>
                  <p>
                    SwarnaPlay operates exclusively on virtual coins. Real-money deposits, UPI/bank transfers, and cash withdrawals are intentionally disabled.
                  </p>
                </div>
              </div>

              <div className="space-y-2 opacity-60 pointer-events-none select-none" aria-hidden="true">
                <label className="block text-xs text-slate-400">Sample Amount Input (Disabled)</label>
                <input
                  type="text"
                  readOnly
                  value="1,000 Demo Units"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-slate-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <Link
                  to="/wallet"
                  onClick={() => setDemoModal(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold inline-flex items-center"
                >
                  Go to Virtual Wallet
                </Link>
                <button
                  type="button"
                  onClick={() => setDemoModal(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 text-xs font-medium text-slate-200 hover:bg-white/15 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
