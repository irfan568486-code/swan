import crypto from 'node:crypto';

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

export function resolveWingoDraw(
  betType: 'COLOR' | 'SIZE' | 'NUMBER',
  selection: string,
  betAmount: number
): WingoResult {
  const drawnNumber = crypto.randomInt(0, 10);
  const size: 'big' | 'small' = drawnNumber >= 5 ? 'big' : 'small';
  const colors: ('red' | 'green' | 'violet')[] = [];

  if (drawnNumber === 0) {
    colors.push('red', 'violet');
  } else if (drawnNumber === 5) {
    colors.push('green', 'violet');
  } else if (drawnNumber % 2 === 1) {
    colors.push('green');
  } else {
    colors.push('red');
  }

  let won = false;
  let multiplier = 0;
  const normalized = selection.toLowerCase();

  if (betType === 'NUMBER') {
    if (Number(normalized) === drawnNumber) {
      won = true;
      multiplier = 9;
    }
  } else if (betType === 'SIZE') {
    if (normalized === size) {
      won = true;
      multiplier = 2;
    }
  } else if (betType === 'COLOR') {
    if (normalized === 'violet' && colors.includes('violet')) {
      won = true;
      multiplier = 4.5;
    } else if ((normalized === 'red' || normalized === 'green') && colors.includes(normalized)) {
      won = true;
      multiplier = colors.includes('violet') ? 1.5 : 2;
    }
  }

  const payout = won ? Math.floor(betAmount * multiplier) : 0;
  const netProfit = payout - betAmount;
  const colorSummary = colors.map((c) => c[0].toUpperCase() + c.slice(1)).join(' + ');
  const sizeSummary = size === 'big' ? 'Big' : 'Small';

  return {
    drawnNumber,
    colors,
    size,
    won,
    multiplier,
    payout,
    netProfit,
    outcomeLabel: `#${drawnNumber} · ${colorSummary} · ${sizeSummary}`,
  };
}

export function generateAviatorCrashPoint(maxMultiplier: number): number {
  const roll = crypto.randomInt(0, 10000) / 10000;
  if (roll < 0.04) {
    return 1.0;
  }
  const raw = 0.96 / (1 - roll);
  const clamped = Math.min(maxMultiplier, Math.max(1.05, raw));
  return Math.floor(clamped * 100) / 100;
}

export interface PlayingCard {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: number; // 2..14 (14 = Ace)
  label: string;
}

const SUITS: PlayingCard['suit'][] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_LABELS: Record<number, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

function createShuffledDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      deck.push({ suit, rank, label: RANK_LABELS[rank] });
    }
  }
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export interface HandEvaluation {
  tier: number;
  name: string;
  score: number[];
}

function isSequenceRanks(sortedDesc: number[]): { isSeq: boolean; high: number } {
  const [a, b, c] = sortedDesc;
  if (a === b + 1 && b === c + 1) {
    return { isSeq: true, high: a };
  }
  // A-2-3 special sequence in Teen Patti (second highest after A-K-Q)
  if (a === 14 && b === 3 && c === 2) {
    return { isSeq: true, high: 13.5 };
  }
  return { isSeq: false, high: 0 };
}

export function evaluateTeenPattiHand(cards: PlayingCard[]): HandEvaluation {
  const ranks = cards.map((c) => c.rank).sort((x, y) => y - x);
  const allSameSuit = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  const seq = isSequenceRanks(ranks);

  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
    return { tier: 6, name: 'Trail (Three of a Kind)', score: [6, ranks[0], 0, 0] };
  }
  if (allSameSuit && seq.isSeq) {
    return { tier: 5, name: 'Pure Sequence', score: [5, seq.high, 0, 0] };
  }
  if (seq.isSeq) {
    return { tier: 4, name: 'Sequence', score: [4, seq.high, 0, 0] };
  }
  if (allSameSuit) {
    return { tier: 3, name: 'Color (Flush)', score: [3, ...ranks] };
  }
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pairRank = ranks[1];
    const kicker = ranks[0] === pairRank ? ranks[2] : ranks[0];
    return { tier: 2, name: 'Pair', score: [2, pairRank, kicker, 0] };
  }
  return { tier: 1, name: 'High Card', score: [1, ...ranks] };
}

function compareScores(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

export interface TeenPattiDealResult {
  playerCards: PlayingCard[];
  dealerCards: PlayingCard[];
  playerHand: HandEvaluation;
  dealerHand: HandEvaluation;
  winner: 'player' | 'dealer' | 'tie';
  multiplier: number;
  payout: number;
  netProfit: number;
}

export function playTeenPattiDeal(betAmount: number): TeenPattiDealResult {
  const deck = createShuffledDeck();
  const playerCards = deck.slice(0, 3);
  const dealerCards = deck.slice(3, 6);
  const playerHand = evaluateTeenPattiHand(playerCards);
  const dealerHand = evaluateTeenPattiHand(dealerCards);
  const cmp = compareScores(playerHand.score, dealerHand.score);

  let winner: 'player' | 'dealer' | 'tie' = 'dealer';
  let multiplier = 0;

  if (cmp > 0) {
    winner = 'player';
    multiplier = 2;
  } else if (cmp === 0) {
    winner = 'tie';
    multiplier = 1;
  }

  const payout = Math.floor(betAmount * multiplier);
  return {
    playerCards,
    dealerCards,
    playerHand,
    dealerHand,
    winner,
    multiplier,
    payout,
    netProfit: payout - betAmount,
  };
}
