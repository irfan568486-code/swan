import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export type UserStatus = 'active' | 'suspended';
export type TransactionType = 'WELCOME_BONUS' | 'DAILY_BONUS' | 'GAME_BET' | 'GAME_WIN' | 'ADMIN_ADJUST';
export type GameKind = 'WINGO_30' | 'WINGO_60' | 'AVIATOR' | 'TEEN_PATTI';

export interface ServerUserRecord {
  uid: string;
  username: string;
  email: string;
  phone: string;
  passwordHash?: string;
  passwordSalt?: string;
  authProvider: 'firebase' | 'local';
  avatarUrl: string;
  role: 'player';
  status: UserStatus;
  coinBalance: number;
  lastDailyBonusAt: string | null;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  lastActiveAt: string;
  createdAt: string;
  resetCode?: string;
  resetExpiresAt?: number;
}

export interface ServerTransaction {
  txId: string;
  userId: string;
  username: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  game?: string;
  description: string;
  createdAt: string;
}

export interface ServerGameRound {
  roundId: string;
  userId: string;
  username: string;
  game: GameKind;
  betAmount: number;
  selection: string;
  outcome: string;
  multiplier: number;
  payout: number;
  netProfit: number;
  isDemo: boolean;
  createdAt: string;
}

export interface ServerNotification {
  notifId: string;
  userId: string;
  title: string;
  message: string;
  category: 'reward' | 'game' | 'system';
  readBy: string[];
  createdAt: string;
}

export interface GameConfigRecord {
  configId: string;
  wingo30Enabled: boolean;
  wingo60Enabled: boolean;
  aviatorMaxMultiplier: number;
  teenPattiAnte: number;
  dailyBonusCoins: number;
  welcomeBonusCoins: number;
  updatedAt: string;
}

export interface AdminAccountRecord {
  adminId: string;
  passwordHash: string;
  passwordSalt: string;
  mustChangePassword: boolean;
  updatedAt: string;
}

export interface ActiveFlight {
  flightId: string;
  userId: string;
  betAmount: number;
  crashMultiplier: number;
  startedAt: number;
  settled: boolean;
}

interface PersistedStore {
  adminAccount: AdminAccountRecord;
  users: Record<string, ServerUserRecord>;
  transactions: ServerTransaction[];
  gameHistory: ServerGameRound[];
  notifications: ServerNotification[];
  gameConfig: GameConfigRecord;
}

export interface PersistentStoreSnapshot {
  store: PersistedStore;
  userSessions: Array<[string, { uid: string; expiresAt: number }]>;
  adminSessions: Array<[string, { adminId: string; createdAt: number; lastActivityAt: number }]>;
  activeFlights: Array<[string, ActiveFlight]>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'swarnaplay-store.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, 'hex');
  if (derived.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, storedBuf);
}

function createInitialStore(): PersistedStore {
  const initialAdminId = process.env.INITIAL_ADMIN_ID || 'cat';
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || '1111';
  const { hash, salt } = hashPassword(initialAdminPassword);
  const now = new Date().toISOString();

  return {
    adminAccount: {
      adminId: initialAdminId,
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePassword: initialAdminPassword === '1111',
      updatedAt: now,
    },
    users: {},
    transactions: [],
    gameHistory: [],
    notifications: [
      {
        notifId: 'notif_welcome_arena',
        userId: 'ALL',
        title: 'Welcome to SwarnaPlay Demo Arena',
        message: 'All games run on virtual demo coins for entertainment. Claim your daily virtual coin reward in the Wallet tab.',
        category: 'system',
        readBy: [],
        createdAt: now,
      },
      {
        notifId: 'notif_wingo_live',
        userId: 'ALL',
        title: 'Wingo 30s & 60s Simulated Rounds Open',
        message: 'Choose Red, Green, Violet, Big/Small, or exact digits 0–9 using virtual coins. Outcomes are locally simulated demo draws.',
        category: 'game',
        readBy: [],
        createdAt: now,
      },
    ],
    gameConfig: {
      configId: 'default',
      wingo30Enabled: true,
      wingo60Enabled: true,
      aviatorMaxMultiplier: 100,
      teenPattiAnte: 50,
      dailyBonusCoins: 500,
      welcomeBonusCoins: 1000,
      updatedAt: now,
    },
  };
}

let storeCache: PersistedStore | null = null;

export const userSessions = new Map<string, { uid: string; expiresAt: number }>();
export const adminSessions = new Map<string, { adminId: string; createdAt: number; lastActivityAt: number }>();
export const activeFlights = new Map<string, ActiveFlight>();

export function serializeStoreSnapshot(): PersistentStoreSnapshot {
  return {
    store: getStore(),
    userSessions: Array.from(userSessions.entries()),
    adminSessions: Array.from(adminSessions.entries()),
    activeFlights: Array.from(activeFlights.entries()),
  };
}

export function restoreStoreSnapshot(snapshot: PersistentStoreSnapshot): void {
  storeCache = snapshot.store;
  userSessions.clear();
  adminSessions.clear();
  activeFlights.clear();
  for (const [token, session] of snapshot.userSessions || []) userSessions.set(token, session);
  for (const [token, session] of snapshot.adminSessions || []) adminSessions.set(token, session);
  for (const [flightId, flight] of snapshot.activeFlights || []) activeFlights.set(flightId, flight);
}

export function getStore(): PersistedStore {
  if (storeCache) {
    return storeCache;
  }
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as PersistedStore;
      if (parsed && parsed.adminAccount && parsed.gameConfig) {
        storeCache = parsed;
        return storeCache;
      }
    }
  } catch (err) {
    console.error('Failed to read store file, initializing fresh store:', err);
  }
  storeCache = createInitialStore();
  saveStore();
  return storeCache;
}

export function saveStore(): void {
  // The request middleware commits store mutations to Neon after the response is ready.
}

export function sanitizeUser(user: ServerUserRecord) {
  return {
    uid: user.uid,
    username: user.username,
    email: user.email,
    phone: user.phone,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    coinBalance: user.coinBalance,
    lastDailyBonusAt: user.lastDailyBonusAt,
    totalWins: user.totalWins,
    totalLosses: user.totalLosses,
    totalWagered: user.totalWagered,
    lastActiveAt: user.lastActiveAt,
    createdAt: user.createdAt,
  };
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
