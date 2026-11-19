import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  googleAuthProvider,
  ensureFirestorePlayerDocs,
  mirrorGameToFirestore,
} from '../lib/firebase';
import { apiRequest } from '../lib/api';
import { soundFx } from '../lib/soundFx';
import type {
  GameConfig,
  GameRoundRecord,
  PlayerNotification,
  PlayerTransaction,
  PlayerUser,
  PublicLobbyRound,
  TeenPattiDealResult,
  WingoResult,
} from '../types';

interface PlayerBundleResponse {
  token?: string;
  user: PlayerUser;
  transactions: PlayerTransaction[];
  gameHistory: GameRoundRecord[];
  notifications: PlayerNotification[];
  gameConfig: GameConfig;
}

interface AuthContextValue {
  user: PlayerUser | null;
  transactions: PlayerTransaction[];
  gameHistory: GameRoundRecord[];
  notifications: PlayerNotification[];
  gameConfig: GameConfig | null;
  lobbyRounds: PublicLobbyRound[];
  loading: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  refreshPlayer: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginWithCredentials: (phone: string, password: string) => Promise<void>;
  registerAccount: (params: {
    username: string;
    phone: string;
    password: string;
  }) => Promise<{ usedFirebase: boolean }>;
  requestPasswordReset: (phone: string) => Promise<{
    mode: 'local';
    demoCode?: string;
    message: string;
  }>;
  completeLocalPasswordReset: (phone: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  claimDailyBonus: () => Promise<number>;
  playWingo: (params: {
    mode: 'WINGO_30' | 'WINGO_60';
    betType: 'COLOR' | 'SIZE' | 'NUMBER';
    selection: string;
    betAmount: number;
  }) => Promise<{ result: WingoResult; round: GameRoundRecord }>;
  startAviator: (betAmount: number) => Promise<{ flightId: string; crashMultiplier: number }>;
  cashoutAviator: (
    flightId: string,
    multiplier: number
  ) => Promise<{ cashedOutAt: number; payout: number; netProfit: number; crashMultiplier: number }>;
  crashAviator: (flightId: string) => Promise<void>;
  playTeenPatti: (betAmount: number) => Promise<{ deal: TeenPattiDealResult; round: GameRoundRecord }>;
  updateProfile: (params: { username?: string; phone?: string; avatarUrl?: string }) => Promise<void>;
  markNotificationsRead: (notifId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LOCAL_TOKEN_KEY = 'sp_player_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [localToken, setLocalToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(LOCAL_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<PlayerUser | null>(null);
  const [transactions, setTransactions] = useState<PlayerTransaction[]>([]);
  const [gameHistory, setGameHistory] = useState<GameRoundRecord[]>([]);
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [lobbyRounds, setLobbyRounds] = useState<PublicLobbyRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFx.enabled = next;
      return next;
    });
  }, []);

  const applyBundle = useCallback((bundle: PlayerBundleResponse) => {
    setUser(bundle.user);
    setTransactions(bundle.transactions);
    setGameHistory(bundle.gameHistory);
    setNotifications(bundle.notifications);
    setGameConfig(bundle.gameConfig);
  }, []);

  const getActiveToken = useCallback(async (): Promise<string | null> => {
    if (auth.currentUser) {
      return auth.currentUser.getIdToken();
    }
    return localToken;
  }, [localToken]);

  const fetchLobby = useCallback(async () => {
    try {
      const data = await apiRequest<{ config: GameConfig; recentRounds: PublicLobbyRound[] }>(
        '/api/games/config'
      );
      setGameConfig(data.config);
      setLobbyRounds(data.recentRounds);
    } catch {
      // Ignore transient lobby load failure
    }
  }, []);

  const refreshPlayer = useCallback(async () => {
    const token = await getActiveToken();
    await fetchLobby();
    if (!token) {
      setUser(null);
      setTransactions([]);
      setGameHistory([]);
      setNotifications([]);
      return;
    }
    try {
      const bundle = await apiRequest<PlayerBundleResponse>('/api/player/me', { token });
      applyBundle(bundle);
    } catch {
      if (token.startsWith('sp_')) {
        sessionStorage.removeItem(LOCAL_TOKEN_KEY);
        setLocalToken(null);
      }
      setUser(null);
    }
  }, [applyBundle, fetchLobby, getActiveToken]);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (nextFbUser) => {
      if (!mounted) return;
      setFbUser(nextFbUser);
      await fetchLobby();

      if (nextFbUser) {
        try {
          sessionStorage.removeItem(LOCAL_TOKEN_KEY);
          setLocalToken(null);
          const idToken = await nextFbUser.getIdToken();
          const bundle = await apiRequest<PlayerBundleResponse>('/api/auth/firebase-sync', {
            method: 'POST',
            token: idToken,
            body: JSON.stringify({
              username: nextFbUser.displayName || nextFbUser.email?.split('@')[0] || 'Player',
            }),
          });
          if (mounted) {
            applyBundle(bundle);
          }
          ensureFirestorePlayerDocs({
            uid: nextFbUser.uid,
            username: bundle.user.username,
            email: nextFbUser.email || '',
            phone: bundle.user.phone || '',
            avatarUrl: bundle.user.avatarUrl,
          }).catch(() => {});
        } catch (err) {
          console.error('Failed to sync Firebase user:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        const storedLocal = (() => {
          try {
            return sessionStorage.getItem(LOCAL_TOKEN_KEY);
          } catch {
            return null;
          }
        })();
        if (storedLocal) {
          try {
            const bundle = await apiRequest<PlayerBundleResponse>('/api/player/me', {
              token: storedLocal,
            });
            if (mounted) applyBundle(bundle);
          } catch {
            sessionStorage.removeItem(LOCAL_TOKEN_KEY);
            if (mounted) {
              setLocalToken(null);
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [applyBundle, fetchLobby]);

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    const bundle = await apiRequest<PlayerBundleResponse>('/api/auth/firebase-sync', {
      method: 'POST',
      token: idToken,
      body: JSON.stringify({
        username: cred.user.displayName || cred.user.email?.split('@')[0] || 'Player',
      }),
    });
    applyBundle(bundle);
    ensureFirestorePlayerDocs({
      uid: cred.user.uid,
      username: bundle.user.username,
      email: cred.user.email || '',
      phone: bundle.user.phone || '',
      avatarUrl: bundle.user.avatarUrl,
    }).catch(() => {});
  }, [applyBundle]);

  const loginWithCredentials = useCallback(
    async (phone: string, password: string) => {
      const normalized = phone.replace(/[\s\-()]+/g, '').trim();
      const bundle = await apiRequest<PlayerBundleResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, password }),
      });
      if (bundle.token) {
        sessionStorage.setItem(LOCAL_TOKEN_KEY, bundle.token);
        setLocalToken(bundle.token);
      }
      applyBundle(bundle);
    },
    [applyBundle]
  );

  const registerAccount = useCallback(
    async (params: { username: string; phone: string; password: string }) => {
      const bundle = await apiRequest<PlayerBundleResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: params.username.trim(),
          phone: params.phone.replace(/[\s\-()]+/g, '').trim(),
          password: params.password,
        }),
      });
      if (bundle.token) {
        sessionStorage.setItem(LOCAL_TOKEN_KEY, bundle.token);
        setLocalToken(bundle.token);
      }
      applyBundle(bundle);
      return { usedFirebase: false };
    },
    [applyBundle]
  );

  const requestPasswordReset = useCallback(async (phone: string) => {
    const normalized = phone.replace(/[\s\-()]+/g, '').trim();
    const res = await apiRequest<{ message: string; demoVerificationCode?: string }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ phone: normalized }),
      }
    );
    return {
      mode: 'local' as const,
      demoCode: res.demoVerificationCode,
      message: res.message,
    };
  }, []);

  const completeLocalPasswordReset = useCallback(
    async (phone: string, code: string, newPassword: string) => {
      const normalized = phone.replace(/[\s\-()]+/g, '').trim();
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, code, newPassword }),
      });
    },
    []
  );

  const logout = useCallback(async () => {
    if (localToken) {
      await apiRequest('/api/auth/logout', { method: 'POST', token: localToken }).catch(() => {});
      sessionStorage.removeItem(LOCAL_TOKEN_KEY);
      setLocalToken(null);
    }
    if (fbUser) {
      await signOut(auth);
    }
    setUser(null);
    setTransactions([]);
    setGameHistory([]);
    setNotifications([]);
  }, [fbUser, localToken]);

  const syncAfterGame = useCallback(
    async (bundle: PlayerBundleResponse, round?: GameRoundRecord) => {
      applyBundle(bundle);
      fetchLobby();
      const latestTx = bundle.transactions[0];
      if (auth.currentUser && latestTx) {
        mirrorGameToFirestore({
          uid: bundle.user.uid,
          coinBalance: bundle.user.coinBalance,
          totalWins: bundle.user.totalWins,
          totalLosses: bundle.user.totalLosses,
          totalWagered: bundle.user.totalWagered,
          round,
          tx: {
            txId: latestTx.txId,
            type: latestTx.type === 'ADMIN_ADJUST' ? 'GAME_WIN' : latestTx.type,
            amount: latestTx.amount,
            balanceAfter: latestTx.balanceAfter,
            game: latestTx.game,
            description: latestTx.description,
          },
        }).catch(() => {});
      }
    },
    [applyBundle, fetchLobby]
  );

  const claimDailyBonus = useCallback(async () => {
    const token = await getActiveToken();
    const res = await apiRequest<PlayerBundleResponse & { awarded: number }>('/api/wallet/daily-bonus', {
      method: 'POST',
      token,
    });
    await syncAfterGame(res);
    return res.awarded;
  }, [getActiveToken, syncAfterGame]);

  const playWingo = useCallback(
    async (params: {
      mode: 'WINGO_30' | 'WINGO_60';
      betType: 'COLOR' | 'SIZE' | 'NUMBER';
      selection: string;
      betAmount: number;
    }) => {
      const token = await getActiveToken();
      const res = await apiRequest<
        PlayerBundleResponse & { result: WingoResult; round: GameRoundRecord }
      >('/api/games/wingo/play', {
        method: 'POST',
        token,
        body: JSON.stringify(params),
      });
      await syncAfterGame(res, res.round);
      return { result: res.result, round: res.round };
    },
    [getActiveToken, syncAfterGame]
  );

  const startAviator = useCallback(
    async (betAmount: number) => {
      const token = await getActiveToken();
      const res = await apiRequest<
        PlayerBundleResponse & { flightId: string; crashMultiplier: number }
      >('/api/games/aviator/start', {
        method: 'POST',
        token,
        body: JSON.stringify({ betAmount }),
      });
      applyBundle(res);
      return { flightId: res.flightId, crashMultiplier: res.crashMultiplier };
    },
    [applyBundle, getActiveToken]
  );

  const cashoutAviator = useCallback(
    async (flightId: string, multiplier: number) => {
      const token = await getActiveToken();
      const res = await apiRequest<
        PlayerBundleResponse & {
          cashedOutAt: number;
          payout: number;
          netProfit: number;
          crashMultiplier: number;
          round: GameRoundRecord;
        }
      >('/api/games/aviator/cashout', {
        method: 'POST',
        token,
        body: JSON.stringify({ flightId, multiplier }),
      });
      await syncAfterGame(res, res.round);
      return {
        cashedOutAt: res.cashedOutAt,
        payout: res.payout,
        netProfit: res.netProfit,
        crashMultiplier: res.crashMultiplier,
      };
    },
    [getActiveToken, syncAfterGame]
  );

  const crashAviator = useCallback(
    async (flightId: string) => {
      const token = await getActiveToken();
      const res = await apiRequest<PlayerBundleResponse & { round?: GameRoundRecord }>(
        '/api/games/aviator/crash',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ flightId }),
        }
      );
      await syncAfterGame(res, res.round);
    },
    [getActiveToken, syncAfterGame]
  );

  const playTeenPatti = useCallback(
    async (betAmount: number) => {
      const token = await getActiveToken();
      const res = await apiRequest<
        PlayerBundleResponse & { deal: TeenPattiDealResult; round: GameRoundRecord }
      >('/api/games/teen-patti/play', {
        method: 'POST',
        token,
        body: JSON.stringify({ betAmount }),
      });
      await syncAfterGame(res, res.round);
      return { deal: res.deal, round: res.round };
    },
    [getActiveToken, syncAfterGame]
  );

  const updateProfile = useCallback(
    async (params: { username?: string; phone?: string; avatarUrl?: string }) => {
      const token = await getActiveToken();
      const res = await apiRequest<PlayerBundleResponse>('/api/player/profile', {
        method: 'PATCH',
        token,
        body: JSON.stringify(params),
      });
      applyBundle(res);
    },
    [applyBundle, getActiveToken]
  );

  const markNotificationsRead = useCallback(
    async (notifId?: string) => {
      const token = await getActiveToken();
      if (!token) return;
      const res = await apiRequest<PlayerBundleResponse>('/api/player/notifications/read', {
        method: 'POST',
        token,
        body: JSON.stringify({ notifId }),
      });
      applyBundle(res);
    },
    [applyBundle, getActiveToken]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        transactions,
        gameHistory,
        notifications,
        gameConfig,
        lobbyRounds,
        loading,
        soundEnabled,
        toggleSound,
        refreshPlayer,
        signInWithGoogle,
        loginWithCredentials,
        registerAccount,
        requestPasswordReset,
        completeLocalPasswordReset,
        logout,
        claimDailyBonus,
        playWingo,
        startAviator,
        cashoutAviator,
        crashAviator,
        playTeenPatti,
        updateProfile,
        markNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
