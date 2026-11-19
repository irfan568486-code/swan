import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Plane, Spade, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SafeImage } from '../components/SafeImage';

const GAME_ENTRIES = [
  {
    id: 'wingo',
    category: 'lottery',
    title: 'Wingo 30s & 60s',
    description:
      'Pick Red, Green, Violet, Big/Small, or exact digits 0–9 before the countdown closes. Locally simulated transparent demo draws.',
    image: '/src/assets/images/game_wingo_thumb_1795078971485.jpg',
    to: '/games/wingo',
    meta: 'Min 10 coins · Up to 9.0x payout',
    icon: Clock,
  },
  {
    id: 'aviator',
    category: 'crash',
    title: 'Aviator Sky Climb',
    description:
      'Watch the stunt jet ascend as the multiplier climbs from 1.00x upward. Cash out your virtual stake before flight termination.',
    image: '/src/assets/images/game_aviator_thumb_1795078971776.jpg',
    to: '/games/aviator',
    meta: 'Min 10 coins · Simulated flight curve',
    icon: Plane,
  },
  {
    id: 'teen-patti',
    category: 'cards',
    title: 'Royal Teen Patti',
    description:
      'Classic 3-card showdown against the house dealer. Hand rankings from High Card up to Pure Sequence and Trail.',
    image: '/src/assets/images/game_teenpatti_thumb_1795078971684.jpg',
    to: '/games/teen-patti',
    meta: 'Min 50 coins · 2.0x winner payout',
    icon: Spade,
  },
];

export function GamesPage() {
  const { gameConfig } = useAuth();
  const [filter, setFilter] = useState<'all' | 'lottery' | 'crash' | 'cards'>('all');

  const items = filter === 'all' ? GAME_ENTRIES : GAME_ENTRIES.filter((g) => g.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Demo Game Arena
          </h1>
          <p className="text-sm text-slate-400">
            All games operate purely on virtual demo coins with transparent simulated outcomes.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#141824] border border-white/10 rounded-xl overflow-x-auto">
          {(
            [
              { key: 'all', label: 'All Games' },
              { key: 'lottery', label: 'Wingo' },
              { key: 'crash', label: 'Aviator' },
              { key: 'cards', label: 'Teen Patti' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === t.key ? 'gold-button-surface' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {items.map((game) => {
          const Icon = game.icon;
          const teenAnte = gameConfig?.teenPattiAnte ?? 50;
          const metaLine =
            game.id === 'teen-patti'
              ? `Min ${teenAnte} coins · 2.0x winner payout`
              : game.id === 'aviator'
                ? `Min 10 coins · Up to ${gameConfig?.aviatorMaxMultiplier ?? 100}x max`
                : game.meta;

          return (
            <div
              key={game.id}
              className="bg-[#141824] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#0E1119] relative overflow-hidden">
                <SafeImage
                  src={game.image}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  fallbackLabel={game.title}
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{metaLine}</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{game.title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{game.description}</p>
                </div>

                <Link
                  to={game.to}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  Enter Demo Table
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
