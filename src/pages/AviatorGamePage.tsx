import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Info, Plane, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { soundFx } from '../lib/soundFx';

type FlightPhase = 'IDLE' | 'FLYING' | 'CASHED_OUT' | 'CRASHED';

const STAKE_PRESETS = [10, 50, 100, 500, 1000];

export function AviatorGamePage() {
  const { user, gameHistory, startAviator, cashoutAviator, crashAviator } = useAuth();

  const [betAmount, setBetAmount] = useState(50);
  const [phase, setPhase] = useState<FlightPhase>('IDLE');
  const [multiplier, setMultiplier] = useState(1.0);
  const [flightId, setFlightId] = useState<string | null>(null);
  const [crashTarget, setCrashTarget] = useState<number>(2.0);
  const [resultBanner, setResultBanner] = useState<{
    won: boolean;
    multiplier: number;
    netProfit: number;
  } | null>(null);
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const phaseRef = useRef<FlightPhase>('IDLE');
  phaseRef.current = phase;
  const multiplierRef = useRef<number>(1.0);
  multiplierRef.current = multiplier;

  const aviatorHistory = useMemo(
    () => gameHistory.filter((g) => g.game === 'AVIATOR'),
    [gameHistory]
  );

  // Draw flight canvas
  const renderCanvas = (currentMult: number, currentPhase: FlightPhase, elapsedSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0D1321');
    bgGrad.addColorStop(1, '#170E16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let x = 60; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 50; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const progress = Math.min(1, elapsedSec / 12);
    const padX = 36;
    const padY = 34;
    const endX = padX + (w - padX * 2.2) * progress;
    const endY = h - padY - Math.pow(progress, 1.35) * (h - padY * 2.4);

    if (currentPhase !== 'IDLE') {
      // Filled gradient under flight path
      const areaGrad = ctx.createLinearGradient(0, endY, 0, h - padY);
      if (currentPhase === 'CRASHED') {
        areaGrad.addColorStop(0, 'rgba(220, 38, 38, 0.32)');
        areaGrad.addColorStop(1, 'rgba(220, 38, 38, 0.0)');
      } else {
        areaGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        areaGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
      }

      ctx.beginPath();
      ctx.moveTo(padX, h - padY);
      ctx.quadraticCurveTo(padX + (endX - padX) * 0.55, h - padY, endX, endY);
      ctx.lineTo(endX, h - padY);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Flight arc stroke
      ctx.beginPath();
      ctx.moveTo(padX, h - padY);
      ctx.quadraticCurveTo(padX + (endX - padX) * 0.55, h - padY, endX, endY);
      ctx.strokeStyle = currentPhase === 'CRASHED' ? '#EF4444' : '#F59E0B';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Stylized airplane at tip
      if (currentPhase !== 'CRASHED') {
        ctx.save();
        ctx.translate(endX, endY);
        ctx.rotate(-0.35 * progress - 0.15);
        // Fuselage
        ctx.fillStyle = '#DC2626';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, -7);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-14, 7);
        ctx.closePath();
        ctx.fill();
        // Gold wing accent
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(-6, -13);
        ctx.lineTo(-9, -2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Multiplier readout in center-top
    ctx.fillStyle = currentPhase === 'CRASHED' ? '#F87171' : currentPhase === 'CASHED_OUT' ? '#34D399' : '#FDE047';
    ctx.font = '700 44px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentMult.toFixed(2)}x`, w / 2, h / 2 - 4);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    const statusLabel =
      currentPhase === 'IDLE'
        ? 'READY FOR DEMO TAKEOFF'
        : currentPhase === 'FLYING'
          ? 'IN FLIGHT — CASH OUT BEFORE CRASH'
          : currentPhase === 'CASHED_OUT'
            ? 'CASHED OUT SAFELY'
            : 'FLEW AWAY';
    ctx.fillText(statusLabel, w / 2, h / 2 + 24);
  };

  useEffect(() => {
    renderCanvas(1.0, 'IDLE', 0);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleStartFlight = async () => {
    setError('');
    setResultBanner(null);
    if (!user) {
      setError('Please sign in first to play with virtual demo coins.');
      return;
    }
    if (betAmount < 10 || betAmount > user.coinBalance) {
      setError('Bet must be at least 10 coins and within your balance.');
      return;
    }

    try {
      const { flightId: fId, crashMultiplier } = await startAviator(betAmount);
      setFlightId(fId);
      setCrashTarget(crashMultiplier);
      setMultiplier(1.0);
      setPhase('FLYING');
      startTimeRef.current = performance.now();

      const step = (now: number) => {
        if (phaseRef.current !== 'FLYING') return;
        const elapsedSec = (now - startTimeRef.current) / 1000;
        const nextMult = Math.floor(Math.exp(0.14 * elapsedSec) * 100) / 100;

        if (nextMult >= crashMultiplier) {
          setMultiplier(crashMultiplier);
          setPhase('CRASHED');
          renderCanvas(crashMultiplier, 'CRASHED', elapsedSec);
          soundFx.playLoss();
          setResultBanner({ won: false, multiplier: crashMultiplier, netProfit: -betAmount });
          crashAviator(fId).catch(() => {});
          return;
        }

        setMultiplier(nextMult);
        renderCanvas(nextMult, 'FLYING', elapsedSec);
        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start flight.');
    }
  };

  const handleCashout = async () => {
    if (phase !== 'FLYING' || !flightId) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const lockedMult = multiplierRef.current;
    try {
      const res = await cashoutAviator(flightId, lockedMult);
      setPhase('CASHED_OUT');
      setMultiplier(res.cashedOutAt);
      renderCanvas(res.cashedOutAt, 'CASHED_OUT', (performance.now() - startTimeRef.current) / 1000);
      soundFx.playWin();
      setResultBanner({
        won: true,
        multiplier: res.cashedOutAt,
        netProfit: res.netProfit,
      });
    } catch (err) {
      setPhase('CRASHED');
      soundFx.playLoss();
      setError(err instanceof Error ? err.message : 'Plane crashed before cashout.');
    }
  };

  const potentialPayout = Math.floor(betAmount * multiplier);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Aviator Sky Climb
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-1.5 mt-1">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Simulated multiplier flight · Virtual demo coins only · No real-money betting.</span>
          </p>
        </div>

        {user ? (
          <div className="px-4 py-2 rounded-xl bg-[#141824] border border-amber-500/30 flex items-center gap-2 self-start md:self-auto">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-num text-sm font-bold text-amber-300">
              {user.coinBalance.toLocaleString()}
            </span>
          </div>
        ) : (
          <Link
            to="/login"
            className="min-h-[42px] px-4 py-2 rounded-xl gold-button-surface text-xs font-semibold inline-flex items-center self-start"
          >
            Sign In to Play
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Flight Screen & Controls */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0D1321]">
            <canvas
              ref={canvasRef}
              width={760}
              height={340}
              className="w-full h-[260px] sm:h-[340px] block"
            />

            <AnimatePresence>
              {resultBanner && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute top-4 right-4 px-4 py-2.5 rounded-xl border text-xs font-bold backdrop-blur-md ${
                    resultBanner.won
                      ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-300'
                      : 'bg-red-950/85 border-red-400/50 text-red-300'
                  }`}
                >
                  {resultBanner.won
                    ? `Cashed Out @ ${resultBanner.multiplier.toFixed(2)}x · +${resultBanner.netProfit} coins`
                    : `Crashed @ ${resultBanner.multiplier.toFixed(2)}x · ${resultBanner.netProfit} coins`}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="bg-[#141824] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">Virtual Coin Bet</span>
              {phase === 'FLYING' && (
                <span className="font-mono-num text-xs text-emerald-400">
                  Live Cashout Value: {potentialPayout.toLocaleString()} coins (Target cap hidden)
                </span>
              )}
              {phase !== 'FLYING' && resultBanner && (
                <span className="font-mono-num text-xs text-slate-400">
                  Last crash point: {crashTarget.toFixed(2)}x
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {STAKE_PRESETS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={phase === 'FLYING'}
                  onClick={() => setBetAmount(amt)}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-lg font-mono-num text-xs font-semibold border cursor-pointer disabled:opacity-50 ${
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
                disabled={phase === 'FLYING'}
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(10, Number(e.target.value) || 10))}
                aria-label="Aviator virtual coin stake"
                className="w-28 min-h-[40px] px-3 py-1.5 rounded-lg bg-[#0E1119] border border-white/15 font-mono-num text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {phase === 'FLYING' ? (
                <button
                  type="button"
                  onClick={handleCashout}
                  className="sm:col-span-2 min-h-[52px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                >
                  Cash Out Now ({potentialPayout.toLocaleString()} coins @ {multiplier.toFixed(2)}x)
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleStartFlight}
                    className="sm:col-span-2 min-h-[52px] px-6 py-3 rounded-xl gold-button-surface font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                  >
                    {phase === 'IDLE' ? (
                      <>
                        <Plane className="w-5 h-5" />
                        Start Demo Flight ({betAmount} coins)
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-5 h-5" />
                        Fly Again ({betAmount} coins)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Aviator Round History */}
        <div className="lg:col-span-4 bg-[#141824] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Flight History
            </h2>
            <span className="text-xs text-slate-400">Newest first</span>
          </div>

          {aviatorHistory.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm text-slate-400">No simulated flights logged yet.</p>
              <p className="text-xs text-slate-500">Launch a flight and cash out before the plane flies away.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/8 max-h-[420px] overflow-y-auto pr-1">
              {aviatorHistory.map((row) => (
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
                    <p className="text-[11px] text-slate-500 font-mono-num">Stake {row.betAmount}</p>
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
