import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Coins, Gamepad2, History, Home, User, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/games', label: 'Games', icon: Gamepad2, end: false },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/wallet', label: 'Wallet', icon: Wallet, end: false },
  { to: '/profile', label: 'Profile', icon: User, end: false },
];

export function Layout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col">
      {/* Desktop & Mobile Top Header (Single-row 3-zone contract) */}
      <header className="sticky top-0 z-40 h-14 md:h-16 bg-[#0B0D13]/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <Link
            to="/"
            className="text-lg md:text-xl font-extrabold tracking-tight gold-gradient-text whitespace-nowrap shrink-0"
          >
            SwarnaPlay
          </Link>

          {/* Zone 2: Desktop Single-Line Navigation */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-amber-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-400 after:rounded-full'
                      : 'text-slate-300 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Single Primary Action / Coin Balance */}
          <div className="flex items-center shrink-0">
            {user ? (
              <Link
                to="/wallet"
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#171C2A] border border-amber-500/30 hover:border-amber-400/60 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                title="Open Virtual Wallet"
              >
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-mono-num text-sm font-semibold text-amber-300">
                  {user.coinBalance.toLocaleString()}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="min-h-[40px] px-4 py-2 rounded-xl gold-button-surface text-xs sm:text-sm font-semibold transition-transform active:scale-[0.98] flex items-center whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* Quiet Platform Footer */}
      <footer className="hidden md:block border-t border-white/8 bg-[#0E1119] py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            SwarnaPlay Demo Gaming Platform · Virtual coins only · Simulated outcomes · No real-money wagering
          </p>
          <div className="flex items-center gap-5 shrink-0">
            <Link to="/games" className="hover:text-slate-200 transition-colors whitespace-nowrap">
              Demo Arena
            </Link>
            <Link to="/wallet" className="hover:text-slate-200 transition-colors whitespace-nowrap">
              Virtual Wallet
            </Link>
            <Link to="/admin/login" className="hover:text-amber-400 transition-colors whitespace-nowrap">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Fixed Bottom Navigation (5 Tabs, >=44px touch targets) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0E1119]/95 backdrop-blur-md border-t border-white/10 grid grid-cols-5 items-center px-1"
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
