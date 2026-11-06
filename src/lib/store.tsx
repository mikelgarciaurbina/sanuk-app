import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { GameId } from '@/content/types';
import type { Gender } from '@/lib/thai';
import { daysBetween, todayKey } from '@/lib/random';

export type WordStat = { s: number; due: number; seen: number; ok: number; bad: number };

export type Profile = {
  name: string;
  gender: Gender;
  motive: 'pareja' | 'amigos' | 'viajar' | 'vivir' | 'curiosidad';
  startStop: number;
  goal: number;
};

export type Settings = { sound: boolean; haptics: boolean; voiceRate: number; romanization: boolean };

export type Progress = {
  v: 1;
  onboarded: boolean;
  profile: Profile;
  bananas: number;
  curves: number;
  completed: Record<string, { stars: number; best: number; at: string }>;
  words: Record<string, WordStat>;
  streak: { count: number; last: string; umbrellas: number; days: string[] };
  today: { date: string; bananas: number };
  games: Partial<Record<GameId, { best: number; plays: number }>>;
  stamps: string[];
  /** misiones de la vida real que quien aprende ha marcado como hechas (id de la parada) */
  missions: string[];
  settings: Settings;
};

const KEY = 'sanuk:progress:v1';

export const INITIAL: Progress = {
  v: 1,
  onboarded: false,
  profile: { name: '', gender: 'm', motive: 'pareja', startStop: 1, goal: 60 },
  bananas: 0,
  curves: 0,
  completed: {},
  words: {},
  streak: { count: 0, last: '', umbrellas: 2, days: [] },
  today: { date: todayKey(), bananas: 0 },
  games: {},
  stamps: [],
  missions: [],
  settings: { sound: true, haptics: true, voiceRate: 0.85, romanization: true },
};

/** Intervalos del repaso espaciado por nivel de fuerza (0–5). */
const SRS_MS = [0, 10 * 60e3, 24 * 3600e3, 3 * 24 * 3600e3, 7 * 24 * 3600e3, 16 * 24 * 3600e3];

/** Suma plátanos y mantiene la racha de farolillos (los paraguas cubren un día perdido). */
function withBananas(p: Progress, n: number): Progress {
  const today = todayKey();
  const t = p.today.date === today ? p.today : { date: today, bananas: 0 };
  let streak = p.streak;
  if (n > 0 && streak.last !== today) {
    const gap = streak.last ? daysBetween(streak.last, today) : 99;
    let count = 1;
    let umbrellas = streak.umbrellas;
    const days = [...streak.days];
    if (gap === 1) count = streak.count + 1;
    else if (gap > 1 && gap <= umbrellas + 1 && streak.count > 0) {
      umbrellas -= gap - 1;
      count = streak.count + 1;
    }
    days.push(today);
    streak = { count, last: today, umbrellas, days: days.slice(-60) };
  }
  return { ...p, bananas: p.bananas + n, today: { date: today, bananas: t.bananas + n }, streak };
}

type Actions = {
  finishOnboarding: (profile: Profile) => void;
  answer: (wordId: string, ok: boolean) => void;
  seeWords: (ids: string[]) => void;
  addBananas: (n: number) => void;
  completeLesson: (lessonId: string, r: { correct: number; total: number; bananas: number }, curves: number, stopDone?: string) => void;
  recordGame: (id: GameId, score: number, bananas: number) => void;
  /** marca como hecha la misión de un mes (+30 plátanos la primera vez) */
  completeMission: (stopId: string) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  setProfile: (p: Partial<Profile>) => void;
  reset: () => void;
};

type Ctx = { p: Progress; ready: boolean } & Actions;
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Progress>(INITIAL);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw) as Progress;
          setP({ ...INITIAL, ...saved, settings: { ...INITIAL.settings, ...saved.settings } });
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
    }, 250);
  }, [p, ready]);

  const actions: Actions = {
    finishOnboarding: (profile) => setP((s) => ({ ...s, onboarded: true, profile })),
    setProfile: (patch) => setP((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    answer: (wordId, ok) =>
      setP((s) => {
        const w = s.words[wordId] ?? { s: 0, due: 0, seen: 0, ok: 0, bad: 0 };
        const strength = ok ? Math.min(5, w.s + 1) : Math.max(0, w.s - 1);
        const next: WordStat = {
          s: strength,
          due: Date.now() + (ok ? SRS_MS[strength] : SRS_MS[1]),
          seen: w.seen + 1,
          ok: w.ok + (ok ? 1 : 0),
          bad: w.bad + (ok ? 0 : 1),
        };
        return { ...s, words: { ...s.words, [wordId]: next } };
      }),
    seeWords: (ids) =>
      setP((s) => {
        const words = { ...s.words };
        for (const id of ids) if (!words[id]) words[id] = { s: 1, due: Date.now() + SRS_MS[1], seen: 1, ok: 0, bad: 0 };
        return { ...s, words };
      }),
    addBananas: (n) => setP((s) => withBananas(s, n)),
    completeLesson: (lessonId, r, curves, stopDone) =>
      setP((s) => {
        const stars = r.total === 0 ? 3 : r.correct / r.total >= 0.95 ? 3 : r.correct / r.total >= 0.75 ? 2 : 1;
        const prev = s.completed[lessonId];
        const first = !prev;
        const next = withBananas(s, r.bananas);
        return {
          ...next,
          curves: first ? Math.min(1864, s.curves + curves) : s.curves,
          completed: {
            ...s.completed,
            [lessonId]: { stars: Math.max(stars, prev?.stars ?? 0), best: Math.max(r.correct, prev?.best ?? 0), at: todayKey() },
          },
          stamps: stopDone && !s.stamps.includes(stopDone) ? [...s.stamps, stopDone] : s.stamps,
        };
      }),
    recordGame: (id, score, bananas) =>
      setP((s) => {
        const g = s.games[id] ?? { best: 0, plays: 0 };
        const next = withBananas(s, bananas);
        return { ...next, games: { ...s.games, [id]: { best: Math.max(g.best, score), plays: g.plays + 1 } } };
      }),
    completeMission: (stopId) =>
      setP((s) => (s.missions.includes(stopId) ? s : { ...withBananas(s, 30), missions: [...s.missions, stopId] })),
    setSetting: (k, v) => setP((s) => ({ ...s, settings: { ...s.settings, [k]: v } })),
    reset: () => setP({ ...INITIAL, today: { date: todayKey(), bananas: 0 } }),
  };

  return <StoreCtx.Provider value={{ p, ready, ...actions }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore fuera de StoreProvider');
  return ctx;
}

/** Racha visible hoy: si ayer no se jugó y no quedan paraguas, la racha está en peligro (no se pierde hasta mañana). */
export function streakStatus(p: Progress): { count: number; litToday: boolean; atRisk: boolean } {
  const today = todayKey();
  const litToday = p.streak.last === today;
  const gap = p.streak.last ? daysBetween(p.streak.last, today) : 99;
  const alive = gap <= 1 + p.streak.umbrellas;
  return { count: alive ? p.streak.count : 0, litToday, atRisk: !litToday && alive && p.streak.count > 0 };
}
