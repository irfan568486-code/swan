export type UserStatus = 'active' | 'suspended';
export type TransactionType = 'WELCOME_BONUS' | 'DAILY_BONUS' | 'GAME_BET' | 'GAME_WIN' | 'ADMIN_ADJUST';
export type GameKind = 'WINGO_30' | 'WINGO_60' | 'AVIATOR' | 'TEEN_PATTI';

export interface PlayerUser {
  uid: string;
  username: string;
  email: string;
  phone: string;
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
}

export interface PlayerTransaction {
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

export interface GameRoundRecord {
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

export interface PlayerNotification {
  notifId: string;
  title: string;
  message: string;
  category: 'reward' | 'game' | 'system';
  read: boolean;
  createdAt: string;
}

export interface GameConfig {
  configId: string;
  wingo30Enabled: boolean;
  wingo60Enabled: boolean;
  aviatorMaxMultiplier: number;
  teenPattiAnte: number;
  dailyBonusCoins: number;
  welcomeBonusCoins: number;
  updatedAt: string;
}

export interface PlayingCard {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: number;
  label: string;
}

export interface TeenPattiDealResult {
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: { tier: number; name: string; score: number[] };
  dealerHand: { tier: number; name: string; score: number[] };
  winner: 'player' | 'dealer' | 'tie';
  multiplier: number;
  payout: number;
  netProfit: number;
}

export interface WingoResult {
  drawnNumber: number;
  colors: ('red' | 'green' | 'violet')[];
  size: 'big' | 'small';
  won: boolean;
  multiplier: number;
  payout: number;
  netProfit: number;
  outcomeLabel: string;
}

export interface PublicLobbyRound {
  roundId: string;
  username: string;
  game: GameKind;
  selection: string;
  outcome: string;
  multiplier: number;
  netProfit: number;
  createdAt: string;
}
