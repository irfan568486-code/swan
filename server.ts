import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  activeFlights,
  adminSessions,
  createId,
  getStore,
  hashPassword,
  sanitizeUser,
  saveStore,
  userSessions,
  verifyPassword,
  type ServerUserRecord,
} from './server/store.ts';
import { adminAuth } from './server/firebaseAuth.ts';
import {
  generateAviatorCrashPoint,
  playTeenPattiDeal,
  resolveWingoDraw,
} from './server/gamesEngine.ts';

dotenv.config();

const PORT = 3000;
const ADMIN_INACTIVITY_TIMEOUT_MS = Number(process.env.ADMIN_SESSION_TIMEOUT_MS) || 10 * 60 * 1000;
const USER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_AVATAR = '/src/assets/images/avatar_royal_player_1795078972218.jpg';

interface AuthenticatedRequest extends Request {
  player?: ServerUserRecord;
}

interface AdminAuthenticatedRequest extends Request {
  adminToken?: string;
  adminId?: string;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

async function resolvePlayerFromRequest(req: Request): Promise<ServerUserRecord | null> {
  const token = extractBearer(req);
  if (!token) return null;

  const store = getStore();
  if (token.startsWith('sp_')) {
    const session = userSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) userSessions.delete(token);
      return null;
    }
    const user = store.users[session.uid];
    if (!user) return null;
    user.lastActiveAt = new Date().toISOString();
    return user;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    let user = store.users[uid];
    const now = new Date().toISOString();

    if (!user) {
      const welcomeCoins = store.gameConfig.welcomeBonusCoins ?? 1000;
      const username =
        decoded.name?.trim() ||
        (decoded.email ? decoded.email.split('@')[0] : `Player_${uid.slice(0, 6)}`);
      user = {
        uid,
        username: username.slice(0, 40),
        email: decoded.email || '',
        phone: decoded.phone_number || '',
        authProvider: 'firebase',
        avatarUrl: decoded.picture || DEFAULT_AVATAR,
        role: 'player',
        status: 'active',
        coinBalance: welcomeCoins,
        lastDailyBonusAt: null,
        totalWins: 0,
        totalLosses: 0,
        totalWagered: 0,
        lastActiveAt: now,
        createdAt: now,
      };
      store.users[uid] = user;
      store.transactions.unshift({
        txId: createId('tx'),
        userId: uid,
        username: user.username,
        type: 'WELCOME_BONUS',
        amount: welcomeCoins,
        balanceAfter: welcomeCoins,
        description: 'Welcome virtual coin bonus credited on account setup',
        createdAt: now,
      });
      saveStore();
    } else {
      user.lastActiveAt = now;
      if (decoded.email && !user.email) user.email = decoded.email;
    }
    return user;
  } catch {
    return null;
  }
}

async function requirePlayerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await resolvePlayerFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    return;
  }
  req.player = user;
  next();
}

function requireAdminAuth(req: AdminAuthenticatedRequest, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const headerToken = req.headers['x-admin-session'];
  const token =
    (typeof headerToken === 'string' && headerToken.trim()) || cookies['sp_admin_session'] || '';

  if (!token) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }

  const session = adminSessions.get(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired admin session.' });
    return;
  }

  const now = Date.now();
  if (now - session.lastActivityAt > ADMIN_INACTIVITY_TIMEOUT_MS) {
    adminSessions.delete(token);
    res.clearCookie('sp_admin_session');
    res.status(401).json({ error: 'Admin session expired due to inactivity.' });
    return;
  }

  session.lastActivityAt = now;
  req.adminToken = token;
  req.adminId = session.adminId;
  next();
}

function buildPlayerBundle(user: ServerUserRecord) {
  const store = getStore();
  const transactions = store.transactions
    .filter((t) => t.userId === user.uid)
    .slice(0, 60);
  const gameHistory = store.gameHistory
    .filter((g) => g.userId === user.uid)
    .slice(0, 60);
  const notifications = store.notifications
    .filter((n) => n.userId === 'ALL' || n.userId === user.uid)
    .slice(0, 30)
    .map((n) => ({
      notifId: n.notifId,
      title: n.title,
      message: n.message,
      category: n.category,
      read: n.readBy.includes(user.uid),
      createdAt: n.createdAt,
    }));

  return {
    user: sanitizeUser(user),
    transactions,
    gameHistory,
    notifications,
    gameConfig: store.gameConfig,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Initialize persistent store on boot
  getStore();

  // --- Public Config & Live Lobby Feed ---
  app.get('/api/games/config', (_req, res) => {
    const store = getStore();
    res.json({
      config: store.gameConfig,
      recentRounds: store.gameHistory.slice(0, 20).map((r) => ({
        roundId: r.roundId,
        username: r.username,
        game: r.game,
        selection: r.selection,
        outcome: r.outcome,
        multiplier: r.multiplier,
        netProfit: r.netProfit,
        createdAt: r.createdAt,
      })),
    });
  });

  // --- Mobile Number + Password Authentication ---
  const normalizePhone = (raw: unknown): string =>
    typeof raw === 'string' ? raw.replace(/[\s\-()]+/g, '').trim() : '';

  app.post('/api/auth/register', (req, res) => {
    const { username, phone, password } = req.body ?? {};
    const cleanName = typeof username === 'string' ? username.trim() : '';
    const cleanPhone = normalizePhone(phone);
    const rawPassword = typeof password === 'string' ? password : '';

    if (cleanName.length < 2 || cleanName.length > 40) {
      res.status(400).json({ error: 'Username must be between 2 and 40 characters.' });
      return;
    }
    if (!cleanPhone || !/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      res.status(400).json({ error: 'Please enter a valid mobile number (7–15 digits).' });
      return;
    }
    if (rawPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const store = getStore();
    const existing = Object.values(store.users).find((u) => u.phone === cleanPhone);
    if (existing) {
      res.status(409).json({ error: 'An account with that mobile number already exists.' });
      return;
    }

    const uid = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const { hash, salt } = hashPassword(rawPassword);
    const now = new Date().toISOString();
    const welcomeCoins = store.gameConfig.welcomeBonusCoins ?? 1000;

    const newUser: ServerUserRecord = {
      uid,
      username: cleanName,
      email: '',
      phone: cleanPhone,
      passwordHash: hash,
      passwordSalt: salt,
      authProvider: 'local',
      avatarUrl: DEFAULT_AVATAR,
      role: 'player',
      status: 'active',
      coinBalance: welcomeCoins,
      lastDailyBonusAt: null,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: 0,
      lastActiveAt: now,
      createdAt: now,
    };

    store.users[uid] = newUser;
    store.transactions.unshift({
      txId: createId('tx'),
      userId: uid,
      username: cleanName,
      type: 'WELCOME_BONUS',
      amount: welcomeCoins,
      balanceAfter: welcomeCoins,
      description: 'Welcome virtual coin bonus credited on registration',
      createdAt: now,
    });
    saveStore();

    const token = `sp_${crypto.randomBytes(32).toString('hex')}`;
    userSessions.set(token, { uid, expiresAt: Date.now() + USER_SESSION_TTL_MS });

    res.status(201).json({
      token,
      ...buildPlayerBundle(newUser),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, identifier, password } = req.body ?? {};
    const phoneNorm = normalizePhone(phone ?? identifier);
    const rawPassword = typeof password === 'string' ? password : '';

    if (!phoneNorm || !/^\+?[0-9]{7,15}$/.test(phoneNorm) || !rawPassword) {
      res.status(400).json({ error: 'Valid mobile number and password are required.' });
      return;
    }

    const store = getStore();
    const user = Object.values(store.users).find(
      (u) => u.authProvider === 'local' && u.phone === phoneNorm
    );

    if (!user || !user.passwordHash || !user.passwordSalt) {
      res.status(401).json({ error: 'Invalid credentials. Check your mobile number and password.' });
      return;
    }

    if (!verifyPassword(rawPassword, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid credentials. Check your mobile number and password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    user.lastActiveAt = new Date().toISOString();
    saveStore();

    const token = `sp_${crypto.randomBytes(32).toString('hex')}`;
    userSessions.set(token, { uid: user.uid, expiresAt: Date.now() + USER_SESSION_TTL_MS });

    res.json({
      token,
      ...buildPlayerBundle(user),
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { phone, identifier } = req.body ?? {};
    const phoneNorm = normalizePhone(phone ?? identifier);
    if (!phoneNorm || !/^\+?[0-9]{7,15}$/.test(phoneNorm)) {
      res.status(400).json({ error: 'Enter your registered mobile number (7–15 digits).' });
      return;
    }

    const store = getStore();
    const user = Object.values(store.users).find(
      (u) => u.authProvider === 'local' && u.phone === phoneNorm
    );

    if (!user) {
      res.status(404).json({ error: 'No account found with that mobile number.' });
      return;
    }

    const resetCode = String(crypto.randomInt(100000, 999999));
    user.resetCode = resetCode;
    user.resetExpiresAt = Date.now() + 15 * 60 * 1000;
    saveStore();

    res.json({
      message: 'Verification code generated (valid for 15 minutes).',
      demoVerificationCode: resetCode,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { phone, identifier, code, newPassword } = req.body ?? {};
    const phoneNorm = normalizePhone(phone ?? identifier);
    const codeClean = typeof code === 'string' ? code.trim() : '';
    const nextPwd = typeof newPassword === 'string' ? newPassword : '';

    if (!phoneNorm || !codeClean || nextPwd.length < 6) {
      res.status(400).json({ error: 'Valid mobile number, 6-digit code, and password (6+ chars) are required.' });
      return;
    }

    const store = getStore();
    const user = Object.values(store.users).find(
      (u) => u.authProvider === 'local' && u.phone === phoneNorm
    );

    if (
      !user ||
      !user.resetCode ||
      user.resetCode !== codeClean ||
      !user.resetExpiresAt ||
      user.resetExpiresAt < Date.now()
    ) {
      res.status(400).json({ error: 'Invalid or expired reset verification code.' });
      return;
    }

    const { hash, salt } = hashPassword(nextPwd);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    delete user.resetCode;
    delete user.resetExpiresAt;
    saveStore();

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearer(req);
    if (token && token.startsWith('sp_')) {
      userSessions.delete(token);
    }
    res.json({ ok: true });
  });

  // --- Authenticated Player Sync & Profile ---
  app.post('/api/auth/firebase-sync', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const { username, phone } = req.body ?? {};
    if (typeof username === 'string' && username.trim().length >= 2) {
      player.username = username.trim().slice(0, 40);
    }
    if (typeof phone === 'string' && phone.trim().length >= 7) {
      player.phone = phone.trim().slice(0, 20);
    }
    saveStore();
    res.json(buildPlayerBundle(player));
  });

  app.get('/api/player/me', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    res.json(buildPlayerBundle(req.player!));
  });

  app.patch('/api/player/profile', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const { username, phone, avatarUrl } = req.body ?? {};
    if (typeof username === 'string') {
      const trimmed = username.trim();
      if (trimmed.length < 2 || trimmed.length > 40) {
        res.status(400).json({ error: 'Username must be 2–40 characters.' });
        return;
      }
      player.username = trimmed;
    }
    if (typeof phone === 'string') {
      player.phone = phone.trim().slice(0, 20);
    }
    if (typeof avatarUrl === 'string' && avatarUrl.startsWith('/src/assets/')) {
      player.avatarUrl = avatarUrl;
    }
    saveStore();
    res.json(buildPlayerBundle(player));
  });

  app.post('/api/player/notifications/read', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const { notifId } = req.body ?? {};

    for (const notif of store.notifications) {
      if (notifId && notif.notifId !== notifId) continue;
      if ((notif.userId === 'ALL' || notif.userId === player.uid) && !notif.readBy.includes(player.uid)) {
        notif.readBy.push(player.uid);
      }
    }
    saveStore();
    res.json(buildPlayerBundle(player));
  });

  // --- Virtual Wallet & Daily Bonus ---
  app.post('/api/wallet/daily-bonus', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const nowMs = Date.now();

    if (player.lastDailyBonusAt) {
      const lastMs = Date.parse(player.lastDailyBonusAt);
      const cooldownMs = 24 * 60 * 60 * 1000;
      if (!Number.isNaN(lastMs) && nowMs - lastMs < cooldownMs) {
        const remainingHrs = Math.ceil((cooldownMs - (nowMs - lastMs)) / (60 * 60 * 1000));
        res.status(429).json({ error: `Daily demo bonus already claimed. Next reward in ~${remainingHrs}h.` });
        return;
      }
    }

    const bonus = store.gameConfig.dailyBonusCoins || 500;
    const nowIso = new Date(nowMs).toISOString();
    player.coinBalance += bonus;
    player.lastDailyBonusAt = nowIso;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: player.uid,
      username: player.username,
      type: 'DAILY_BONUS',
      amount: bonus,
      balanceAfter: player.coinBalance,
      description: `Daily demo coin reward (+${bonus} virtual coins)`,
      createdAt: nowIso,
    });
    saveStore();

    res.json({
      awarded: bonus,
      ...buildPlayerBundle(player),
    });
  });

  // --- Game APIs (Server-Authoritative Demo Rounds) ---
  app.post('/api/games/wingo/play', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const { mode, betType, selection, betAmount } = req.body ?? {};

    if (mode !== 'WINGO_30' && mode !== 'WINGO_60') {
      res.status(400).json({ error: 'Invalid Wingo mode.' });
      return;
    }
    if (mode === 'WINGO_30' && !store.gameConfig.wingo30Enabled) {
      res.status(403).json({ error: 'Wingo 30s demo mode is currently paused by admin.' });
      return;
    }
    if (mode === 'WINGO_60' && !store.gameConfig.wingo60Enabled) {
      res.status(403).json({ error: 'Wingo 60s demo mode is currently paused by admin.' });
      return;
    }
    if (betType !== 'COLOR' && betType !== 'SIZE' && betType !== 'NUMBER') {
      res.status(400).json({ error: 'Invalid bet type.' });
      return;
    }

    const wager = Number(betAmount);
    if (!Number.isFinite(wager) || wager < 10 || wager > 100000) {
      res.status(400).json({ error: 'Bet amount must be between 10 and 100,000 virtual coins.' });
      return;
    }
    if (player.coinBalance < wager) {
      res.status(400).json({ error: 'Insufficient virtual coin balance.' });
      return;
    }

    const selStr = String(selection || '').trim().toLowerCase();
    if (betType === 'COLOR' && !['red', 'green', 'violet'].includes(selStr)) {
      res.status(400).json({ error: 'Select Red, Green, or Violet.' });
      return;
    }
    if (betType === 'SIZE' && !['big', 'small'].includes(selStr)) {
      res.status(400).json({ error: 'Select Big or Small.' });
      return;
    }
    if (betType === 'NUMBER' && (!/^[0-9]$/.test(selStr))) {
      res.status(400).json({ error: 'Select a number from 0 to 9.' });
      return;
    }

    const now = new Date().toISOString();
    player.coinBalance -= wager;
    player.totalWagered += wager;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: player.uid,
      username: player.username,
      type: 'GAME_BET',
      amount: -wager,
      balanceAfter: player.coinBalance,
      game: mode,
      description: `${mode === 'WINGO_30' ? 'Wingo 30s' : 'Wingo 60s'} demo stake on ${selStr.toUpperCase()}`,
      createdAt: now,
    });

    const result = resolveWingoDraw(betType, selStr, wager);
    if (result.won && result.payout > 0) {
      player.coinBalance += result.payout;
      player.totalWins += 1;
      store.transactions.unshift({
        txId: createId('tx'),
        userId: player.uid,
        username: player.username,
        type: 'GAME_WIN',
        amount: result.payout,
        balanceAfter: player.coinBalance,
        game: mode,
        description: `${mode === 'WINGO_30' ? 'Wingo 30s' : 'Wingo 60s'} demo win (${result.multiplier}x)`,
        createdAt: now,
      });
    } else {
      player.totalLosses += 1;
    }

    const round = {
      roundId: createId('wg'),
      userId: player.uid,
      username: player.username,
      game: mode as 'WINGO_30' | 'WINGO_60',
      betAmount: wager,
      selection: `${betType}:${selStr.toUpperCase()}`,
      outcome: result.outcomeLabel,
      multiplier: result.multiplier,
      payout: result.payout,
      netProfit: result.netProfit,
      isDemo: true,
      createdAt: now,
    };
    store.gameHistory.unshift(round);
    saveStore();

    res.json({
      result,
      round,
      ...buildPlayerBundle(player),
    });
  });

  app.post('/api/games/aviator/start', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const wager = Number(req.body?.betAmount);

    if (!Number.isFinite(wager) || wager < 10 || wager > 100000) {
      res.status(400).json({ error: 'Bet amount must be between 10 and 100,000 virtual coins.' });
      return;
    }
    if (player.coinBalance < wager) {
      res.status(400).json({ error: 'Insufficient virtual coin balance.' });
      return;
    }

    const now = new Date().toISOString();
    player.coinBalance -= wager;
    player.totalWagered += wager;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: player.uid,
      username: player.username,
      type: 'GAME_BET',
      amount: -wager,
      balanceAfter: player.coinBalance,
      game: 'AVIATOR',
      description: `Aviator demo flight stake (${wager} coins)`,
      createdAt: now,
    });
    saveStore();

    const crashMultiplier = generateAviatorCrashPoint(store.gameConfig.aviatorMaxMultiplier || 100);
    const flightId = createId('flt');
    activeFlights.set(flightId, {
      flightId,
      userId: player.uid,
      betAmount: wager,
      crashMultiplier,
      startedAt: Date.now(),
      settled: false,
    });

    res.json({
      flightId,
      crashMultiplier,
      ...buildPlayerBundle(player),
    });
  });

  app.post('/api/games/aviator/cashout', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const { flightId, multiplier } = req.body ?? {};
    const flight = activeFlights.get(String(flightId || ''));

    if (!flight || flight.userId !== player.uid || flight.settled) {
      res.status(400).json({ error: 'Flight session is inactive or already settled.' });
      return;
    }

    const claimed = Number(multiplier);
    if (!Number.isFinite(claimed) || claimed < 1.01) {
      res.status(400).json({ error: 'Invalid cashout multiplier.' });
      return;
    }
    if (claimed > flight.crashMultiplier) {
      flight.settled = true;
      player.totalLosses += 1;
      const now = new Date().toISOString();
      const round = {
        roundId: createId('av'),
        userId: player.uid,
        username: player.username,
        game: 'AVIATOR' as const,
        betAmount: flight.betAmount,
        selection: `Auto/Manual`,
        outcome: `Crashed @ ${flight.crashMultiplier.toFixed(2)}x`,
        multiplier: 0,
        payout: 0,
        netProfit: -flight.betAmount,
        isDemo: true,
        createdAt: now,
      };
      store.gameHistory.unshift(round);
      saveStore();
      res.status(409).json({ error: `Plane crashed at ${flight.crashMultiplier.toFixed(2)}x before cashout.`, round, ...buildPlayerBundle(player) });
      return;
    }

    flight.settled = true;
    const safeMultiplier = Math.floor(claimed * 100) / 100;
    const payout = Math.floor(flight.betAmount * safeMultiplier);
    const netProfit = payout - flight.betAmount;
    const now = new Date().toISOString();

    player.coinBalance += payout;
    player.totalWins += 1;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: player.uid,
      username: player.username,
      type: 'GAME_WIN',
      amount: payout,
      balanceAfter: player.coinBalance,
      game: 'AVIATOR',
      description: `Aviator demo cashout at ${safeMultiplier.toFixed(2)}x`,
      createdAt: now,
    });

    const round = {
      roundId: createId('av'),
      userId: player.uid,
      username: player.username,
      game: 'AVIATOR' as const,
      betAmount: flight.betAmount,
      selection: `Cashout @ ${safeMultiplier.toFixed(2)}x`,
      outcome: `Crashed @ ${flight.crashMultiplier.toFixed(2)}x`,
      multiplier: safeMultiplier,
      payout,
      netProfit,
      isDemo: true,
      createdAt: now,
    };
    store.gameHistory.unshift(round);
    saveStore();

    res.json({
      cashedOutAt: safeMultiplier,
      payout,
      netProfit,
      crashMultiplier: flight.crashMultiplier,
      round,
      ...buildPlayerBundle(player),
    });
  });

  app.post('/api/games/aviator/crash', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const { flightId } = req.body ?? {};
    const flight = activeFlights.get(String(flightId || ''));

    if (!flight || flight.userId !== player.uid) {
      res.status(400).json({ error: 'Flight not found.' });
      return;
    }
    if (flight.settled) {
      res.json(buildPlayerBundle(player));
      return;
    }

    flight.settled = true;
    player.totalLosses += 1;
    const now = new Date().toISOString();
    const round = {
      roundId: createId('av'),
      userId: player.uid,
      username: player.username,
      game: 'AVIATOR' as const,
      betAmount: flight.betAmount,
      selection: 'Held Flight',
      outcome: `Crashed @ ${flight.crashMultiplier.toFixed(2)}x`,
      multiplier: 0,
      payout: 0,
      netProfit: -flight.betAmount,
      isDemo: true,
      createdAt: now,
    };
    store.gameHistory.unshift(round);
    saveStore();

    res.json({
      round,
      ...buildPlayerBundle(player),
    });
  });

  app.post('/api/games/teen-patti/play', requirePlayerAuth, (req: AuthenticatedRequest, res) => {
    const player = req.player!;
    const store = getStore();
    const minAnte = store.gameConfig.teenPattiAnte || 50;
    const wager = Number(req.body?.betAmount);

    if (!Number.isFinite(wager) || wager < minAnte || wager > 100000) {
      res.status(400).json({ error: `Ante must be between ${minAnte} and 100,000 virtual coins.` });
      return;
    }
    if (player.coinBalance < wager) {
      res.status(400).json({ error: 'Insufficient virtual coin balance.' });
      return;
    }

    const now = new Date().toISOString();
    player.coinBalance -= wager;
    player.totalWagered += wager;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: player.uid,
      username: player.username,
      type: 'GAME_BET',
      amount: -wager,
      balanceAfter: player.coinBalance,
      game: 'TEEN_PATTI',
      description: `Teen Patti demo table ante (${wager} coins)`,
      createdAt: now,
    });

    const deal = playTeenPattiDeal(wager);
    if (deal.payout > 0) {
      player.coinBalance += deal.payout;
      if (deal.winner === 'player') {
        player.totalWins += 1;
      }
      store.transactions.unshift({
        txId: createId('tx'),
        userId: player.uid,
        username: player.username,
        type: 'GAME_WIN',
        amount: deal.payout,
        balanceAfter: player.coinBalance,
        game: 'TEEN_PATTI',
        description:
          deal.winner === 'tie'
            ? 'Teen Patti push — stake returned'
            : `Teen Patti win (${deal.playerHand.name})`,
        createdAt: now,
      });
    } else {
      player.totalLosses += 1;
    }

    const round = {
      roundId: createId('tp'),
      userId: player.uid,
      username: player.username,
      game: 'TEEN_PATTI' as const,
      betAmount: wager,
      selection: deal.playerHand.name,
      outcome: `${deal.winner.toUpperCase()} (${deal.dealerHand.name})`,
      multiplier: deal.multiplier,
      payout: deal.payout,
      netProfit: deal.netProfit,
      isDemo: true,
      createdAt: now,
    };
    store.gameHistory.unshift(round);
    saveStore();

    res.json({
      deal,
      round,
      ...buildPlayerBundle(player),
    });
  });

  // =========================================================================
  // LOCKED ADMIN AUTHENTICATION & PROTECTED ADMIN APIs
  // =========================================================================
  app.post('/api/admin/login', (req, res) => {
    const { adminId, password } = req.body ?? {};
    const idClean = typeof adminId === 'string' ? adminId.trim() : '';
    const pwdClean = typeof password === 'string' ? password : '';

    const store = getStore();
    const adminAcc = store.adminAccount;

    if (
      !idClean ||
      !pwdClean ||
      idClean !== adminAcc.adminId ||
      !verifyPassword(pwdClean, adminAcc.passwordHash, adminAcc.passwordSalt)
    ) {
      res.status(401).json({ error: 'Invalid Admin Credentials' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    adminSessions.set(token, {
      adminId: adminAcc.adminId,
      createdAt: now,
      lastActivityAt: now,
    });

    res.cookie('sp_admin_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: ADMIN_INACTIVITY_TIMEOUT_MS,
      path: '/',
    });

    res.json({
      token,
      adminId: adminAcc.adminId,
      mustChangePassword: adminAcc.mustChangePassword,
      inactivityTimeoutMs: ADMIN_INACTIVITY_TIMEOUT_MS,
    });
  });

  app.get('/api/admin/session', requireAdminAuth, (req: AdminAuthenticatedRequest, res) => {
    const store = getStore();
    res.json({
      authenticated: true,
      adminId: req.adminId,
      mustChangePassword: store.adminAccount.mustChangePassword,
      inactivityTimeoutMs: ADMIN_INACTIVITY_TIMEOUT_MS,
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const cookies = parseCookies(req);
    const headerToken = req.headers['x-admin-session'];
    const token =
      (typeof headerToken === 'string' && headerToken.trim()) || cookies['sp_admin_session'] || '';
    if (token) {
      adminSessions.delete(token);
    }
    res.clearCookie('sp_admin_session', { path: '/' });
    res.json({ ok: true });
  });

  app.post('/api/admin/change-password', requireAdminAuth, (req: AdminAuthenticatedRequest, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    const store = getStore();
    const adminAcc = store.adminAccount;

    if (
      typeof currentPassword !== 'string' ||
      !verifyPassword(currentPassword, adminAcc.passwordHash, adminAcc.passwordSalt)
    ) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'New admin password must be at least 6 characters.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    adminAcc.passwordHash = hash;
    adminAcc.passwordSalt = salt;
    adminAcc.mustChangePassword = false;
    adminAcc.updatedAt = new Date().toISOString();
    saveStore();

    res.json({ ok: true, mustChangePassword: false });
  });

  app.get('/api/admin/dashboard', requireAdminAuth, (_req, res) => {
    const store = getStore();
    const allUsers = Object.values(store.users).map(sanitizeUser);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeUsers = allUsers.filter((u) => {
      const ms = Date.parse(u.lastActiveAt);
      return !Number.isNaN(ms) && ms >= dayAgo && u.status === 'active';
    }).length;

    const totalCoinsInCirculation = allUsers.reduce((acc, u) => acc + u.coinBalance, 0);
    const totalWagered = store.gameHistory.reduce((acc, g) => acc + g.betAmount, 0);
    const totalPayout = store.gameHistory.reduce((acc, g) => acc + g.payout, 0);

    res.json({
      stats: {
        totalRegisteredUsers: allUsers.length,
        activeUsers,
        suspendedUsers: allUsers.filter((u) => u.status === 'suspended').length,
        totalCoinsInCirculation,
        totalDemoRounds: store.gameHistory.length,
        totalWagered,
        totalPayout,
      },
      users: allUsers.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      gameHistory: store.gameHistory.slice(0, 150),
      transactions: store.transactions.slice(0, 150),
      gameConfig: store.gameConfig,
      mustChangePassword: store.adminAccount.mustChangePassword,
    });
  });

  app.post('/api/admin/users/:uid/coins', requireAdminAuth, (req, res) => {
    const { uid } = req.params;
    const { delta, reason } = req.body ?? {};
    const store = getStore();
    const user = store.users[uid];

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const amount = Number(delta);
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000000) {
      res.status(400).json({ error: 'Coin adjustment must be a non-zero value up to 1,000,000.' });
      return;
    }

    const nextBalance = Math.max(0, user.coinBalance + amount);
    const actualDelta = nextBalance - user.coinBalance;
    const now = new Date().toISOString();
    user.coinBalance = nextBalance;

    store.transactions.unshift({
      txId: createId('tx'),
      userId: user.uid,
      username: user.username,
      type: 'ADMIN_ADJUST',
      amount: actualDelta,
      balanceAfter: nextBalance,
      description:
        typeof reason === 'string' && reason.trim()
          ? reason.trim().slice(0, 200)
          : `Admin demo coin adjustment (${actualDelta >= 0 ? '+' : ''}${actualDelta})`,
      createdAt: now,
    });

    store.notifications.unshift({
      notifId: createId('notif'),
      userId: user.uid,
      title: actualDelta >= 0 ? 'Demo Coins Credited' : 'Demo Balance Adjusted',
      message: `Administrator adjusted your virtual coin balance by ${actualDelta >= 0 ? '+' : ''}${actualDelta} coins.`,
      category: 'system',
      readBy: [],
      createdAt: now,
    });

    saveStore();
    res.json({ user: sanitizeUser(user) });
  });

  app.patch('/api/admin/users/:uid/status', requireAdminAuth, (req, res) => {
    const { uid } = req.params;
    const { status } = req.body ?? {};
    const store = getStore();
    const user = store.users[uid];

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ error: 'Status must be active or suspended.' });
      return;
    }

    user.status = status;
    saveStore();
    res.json({ user: sanitizeUser(user) });
  });

  app.put('/api/admin/config', requireAdminAuth, (req, res) => {
    const store = getStore();
    const body = req.body ?? {};
    const cfg = store.gameConfig;

    if (typeof body.wingo30Enabled === 'boolean') cfg.wingo30Enabled = body.wingo30Enabled;
    if (typeof body.wingo60Enabled === 'boolean') cfg.wingo60Enabled = body.wingo60Enabled;

    if (body.aviatorMaxMultiplier !== undefined) {
      const val = Number(body.aviatorMaxMultiplier);
      if (Number.isFinite(val) && val >= 2 && val <= 500) cfg.aviatorMaxMultiplier = val;
    }
    if (body.teenPattiAnte !== undefined) {
      const val = Number(body.teenPattiAnte);
      if (Number.isFinite(val) && val >= 10 && val <= 10000) cfg.teenPattiAnte = val;
    }
    if (body.dailyBonusCoins !== undefined) {
      const val = Number(body.dailyBonusCoins);
      if (Number.isFinite(val) && val >= 0 && val <= 50000) cfg.dailyBonusCoins = val;
    }
    if (body.welcomeBonusCoins !== undefined) {
      const val = Number(body.welcomeBonusCoins);
      if (Number.isFinite(val) && val >= 0 && val <= 50000) cfg.welcomeBonusCoins = val;
    }

    cfg.updatedAt = new Date().toISOString();
    saveStore();
    res.json({ gameConfig: cfg });
  });

  app.post('/api/admin/notifications', requireAdminAuth, (req, res) => {
    const { title, message, category } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Title and message are required.' });
      return;
    }

    const store = getStore();
    const notif = {
      notifId: createId('notif'),
      userId: 'ALL',
      title: title.trim().slice(0, 120),
      message: message.trim().slice(0, 400),
      category: (category === 'reward' || category === 'game' ? category : 'system') as
        | 'reward'
        | 'game'
        | 'system',
      readBy: [],
      createdAt: new Date().toISOString(),
    };
    store.notifications.unshift(notif);
    saveStore();
    res.status(201).json({ notification: notif });
  });

  // --- Vite / Static Frontend Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SwarnaPlay server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
