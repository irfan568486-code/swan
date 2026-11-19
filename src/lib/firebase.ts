import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export async function ensureFirestorePlayerDocs(params: {
  uid: string;
  username: string;
  email: string;
  phone: string;
  avatarUrl: string;
}) {
  const { uid, username, email, phone, avatarUrl } = params;
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;
  const walletPath = `wallets/${uid}`;

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      const batch = writeBatch(db);
      const welcomeTxId = `tx_welcome_${uid.slice(0, 12)}_${Date.now()}`;

      batch.set(userRef, {
        uid,
        username: username.slice(0, 40) || 'Player',
        avatarUrl: avatarUrl.slice(0, 500),
        role: 'player',
        status: 'active',
        totalWins: 0,
        totalLosses: 0,
        totalWagered: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'users', uid, 'private', 'info'), {
        uid,
        email: email.slice(0, 160),
        phone: phone.slice(0, 30),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'transactions', welcomeTxId), {
        txId: welcomeTxId,
        userId: uid,
        type: 'WELCOME_BONUS',
        amount: 1000,
        balanceAfter: 1000,
        description: 'Welcome virtual coin bonus',
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'wallets', uid), {
        userId: uid,
        coinBalance: 1000,
        lastTxId: welcomeTxId,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } else {
      await setDoc(
        doc(db, 'users', uid, 'private', 'info'),
        {
          uid,
          email: email.slice(0, 160),
          phone: phone.slice(0, 30),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} / ${privatePath} / ${walletPath}`);
  }
}

export async function mirrorGameToFirestore(params: {
  uid: string;
  coinBalance: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  round?: {
    roundId: string;
    game: 'WINGO_30' | 'WINGO_60' | 'AVIATOR' | 'TEEN_PATTI';
    betAmount: number;
    selection: string;
    outcome: string;
    multiplier: number;
    payout: number;
    netProfit: number;
  };
  tx: {
    txId: string;
    type: 'WELCOME_BONUS' | 'DAILY_BONUS' | 'GAME_BET' | 'GAME_WIN';
    amount: number;
    balanceAfter: number;
    game?: string;
    description: string;
  };
}) {
  if (!auth.currentUser || auth.currentUser.uid !== params.uid) {
    return;
  }

  try {
    const batch = writeBatch(db);
    const txRef = doc(db, 'transactions', params.tx.txId);
    batch.set(txRef, {
      txId: params.tx.txId,
      userId: params.uid,
      type: params.tx.type,
      amount: params.tx.amount,
      balanceAfter: params.tx.balanceAfter,
      ...(params.tx.game ? { game: params.tx.game } : {}),
      description: params.tx.description.slice(0, 240),
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'wallets', params.uid), {
      coinBalance: params.coinBalance,
      lastTxId: params.tx.txId,
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'users', params.uid), {
      totalWins: params.totalWins,
      totalLosses: params.totalLosses,
      totalWagered: params.totalWagered,
      updatedAt: serverTimestamp(),
    });

    if (params.round) {
      batch.set(doc(db, 'gameHistory', params.round.roundId), {
        roundId: params.round.roundId,
        userId: params.uid,
        game: params.round.game,
        betAmount: params.round.betAmount,
        selection: params.round.selection.slice(0, 160),
        outcome: params.round.outcome.slice(0, 200),
        multiplier: params.round.multiplier,
        payout: params.round.payout,
        netProfit: params.round.netProfit,
        isDemo: true,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    console.warn('Firestore mirror skipped or failed:', error);
  }
}
