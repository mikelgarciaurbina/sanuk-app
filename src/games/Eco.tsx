// Juego 9 · Eco: de noche, en un valle entre dos montañas, Noi grita la palabra y el eco rebota de una
// montaña a otra mientras se dibuja la melodía de sus tonos. Luego grabas tu voz: su melodía se dibuja ENCIMA
// de la de Noi, las dos suenan seguidas (primero Noi, enseguida tú) y cada sílaba se lleva su estrella según
// si tu voz subió, cayó o se quedó plana donde tocaba. Las frases largas se gritan por trozos.
//
// Aquí no se suspende. Lo que puntúa es lo MEDIDO en tu voz (src/games/eco/tono.ts); lo que uno mismo se valora
// no da puntos ni cambia el repaso; «Otra vez» nunca cuenta como fallo; y «Ahora no puedo hablar» deja pasar sin
// grabar nada. Donde no se puede medir el tono se ve el volumen (con su nombre) y se compara de oído; sin
// micrófono, se dice en voz alta.
import { RecordingPresets, createAudioPlayer, useAudioRecorder, type AudioPlayer } from 'expo-audio';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import type { NoiPose } from '@/brand/noi-art';
import { color, font, tones as TONES, type ToneId } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Rom, Th } from '@/components/ui';
import { fx, stopSpeech } from '@/lib/audio';
import { toneOfSyllable } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { canMeasurePitch, knownVoice, openMic, releaseTakes, rememberVoice, type Mic as OpenMic, type Take } from './eco/captura';
import { makeItems, spoken } from './eco/partes';
import { IDEAL, Staff, Star } from './eco/pentagrama';
import { BigBtn, Echo, EcoBar, InhaleNoi, Mic, QuietLink, Ridge, RoundBtn, Valley, type EchoVoice, type EcoMark } from './eco/piezas';
import { analyse, fitStaff, isVoiced, toSemitones, type Analysis, type Frame, type Slip } from './eco/tono';
import { tapPoint, useJuice, type Point } from './fx';
import { useScore } from './kit';
import { Contour, TONE_HOW } from './tonos/curva';
import { speechMs, useTimers, useVoice } from './tonos/voz';
import type { GameProps, GameResult } from './types';

const REC = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const MAX_MS = 8000;
/** Tras oír una voz, este silencio (s) da la grabación por terminada sin tener que tocar nada. */
const HUSH_S = 1.1;
/** Marca de «aquí se levanta el lápiz» en el trazo en directo. */
const GAP = -999;

/** shout: Noi grita · ready: te toca · rec: grabando · compare: suenan Noi y tú, seguidos · result: cómo ha salido · next: pasando al siguiente */
type Phase = 'shout' | 'ready' | 'rec' | 'compare' | 'result' | 'next';
type Rating = 'otra' | 'casi' | 'igual';
/** Lo que salió de un trozo: su nota y estrellas MEDIDAS (null = sin medir) y si de verdad se oyó una voz. */
type Outcome = { score: number | null; stars: number; spoke: boolean };
/** Una grabación medida: la nota de cada sílaba y tu melodía ya colocada sobre el pentagrama de Noi. */
type Shot = { a: Analysis; mine: (number[] | null)[] | null };
/** Lo que se va oyendo mientras se graba (para dibujarlo en directo y saber cuándo has acabado). */
type Live = { pts: number[]; sum: number; n: number; peak: number; now: number; first: number; lastVoiced: number; drawn: number; est: number };

/** Coloca lo medido sobre el pentagrama: una sola regla (centro y anchura de tu voz) para todas las sílabas. */
function place(a: Analysis, list: ToneId[]): (number[] | null)[] {
  const pts = a.syll.map((s) => s.pts);
  const { mid, range } = fitStaff(
    pts,
    list.map((t) => IDEAL[t]),
    a.range,
  );
  return pts.map((p) => (p ? p.map((v) => 0.5 + (v - mid) / range) : null));
}

/** La pista: qué hizo tu voz en esa sílaba y qué tocaba, en palabras de andar por casa. */
const HINTS: Record<ToneId, Partial<Record<Slip, string>>> = {
  M: { subio: 'tu voz subió, y aquí va plana, sin moverse', cayo: 'tu voz cayó, y aquí va plana, sin moverse', aguda: 'te quedó aguda: va en medio, ni arriba ni abajo', grave: 'te quedó grave: va en medio, ni arriba ni abajo' },
  L: { subio: 'tu voz subió, y aquí se queda abajo, grave', aguda: 'te quedó aguda: aquí va grave desde el principio' },
  F: { subio: 'tu voz subió donde debía caer', plana: 'te quedó plana: empieza arriba y déjala caer', grave: 'empiézala más arriba, para que tenga de dónde caer' },
  H: { cayo: 'tu voz cayó, y aquí se queda arriba, aguda', grave: 'te quedó grave: aquí va aguda, arriba del todo' },
  R: { cayo: 'tu voz cayó donde debía subir', plana: 'te quedó plana: baja primero y súbela al final', aguda: 'baja más antes de subir' },
};
const SLIPS: Record<Slip, string> = { subio: 'tu voz subió', cayo: 'tu voz cayó', plana: 'te quedó plana', aguda: 'te quedó aguda', grave: 'te quedó grave' };
const hintOf = (tone: ToneId, slip: Slip) => HINTS[tone][slip] ?? `${SLIPS[slip]}, y aquí va así: ${TONE_HOW[tone]}`;

/** Juego 9 · Eco: escucha, repite y mira tu tono sobre el de Noi. */
export default function Eco({ mode, words, focus, sentences, rounds, gender, oral, reads, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const voice = useVoice();
  const timers = useTimers();
  const recorder = useAudioRecorder(REC);
  const { height: winH } = useWindowDimensions();
  const compact = winH < 760;

  const [list] = useState(() => makeItems(mode, sentences, words, focus, gender, rounds ?? (feria ? 6 : 2)));
  const [i, setI] = useState(0);
  const [c, setC] = useState(0);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>('shout');
  const [noMic, setNoMic] = useState(false);
  /** ¿se mide el tono aquí? Se supone que sí donde se puede; la primera grabación lo confirma. */
  const [pitch, setPitch] = useState(canMeasurePitch);
  const [take, setTake] = useState<Take | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);
  const [shown, setShown] = useState(false);
  const [playing, setPlaying] = useState<'noi' | 'yo' | null>(null);
  const [marks, setMarks] = useState<EcoMark[]>([]);
  const [points, setPoints] = useState(0);
  const [pose, setPose] = useState<NoiPose>('feliz');
  const [jump, setJump] = useState(0);
  const [echo, setEcho] = useState<{ run: number; voice: EchoVoice; bounces: number; text?: string }>({ run: 0, voice: 'noi', bounces: 3 });
  const [peek, setPeek] = useState(false);
  const [canyon, setCanyon] = useState({ w: 0, h: 0 });
  const [vizW, setVizW] = useState(0);

  const pointsRef = useRef(0);
  /** plátanos por haber hablado de verdad en algo que no se pudo medir */
  const extra = useRef(0);
  const outcomes = useRef<Outcome[]>([]);
  const tally = useRef<EcoMark[]>([]);
  /** el mejor intento medido de este trozo: repetir nunca baja la nota */
  const best = useRef<{ score: number; stars: number } | null>(null);
  const finished = useRef(false);
  const gone = useRef(false);
  const busy = useRef(false);
  const locked = useRef(false);
  /** turno de sonido: lo que quedara pendiente de uno anterior (voz, temporizadores, estrellas) ya no cuenta */
  const seq = useRef(0);
  const recSeq = useRef(0);
  const player = useRef<AudioPlayer | null>(null);
  const mic = useRef<OpenMic | null>(null);
  const buf = useRef<number[]>([]);
  const liveRef = useRef<Live | null>(null);

  const melo = useSharedValue(0);
  const levels = useSharedValue<number[]>([]);
  const trace = useSharedValue<number[]>([]);
  const live = useSharedValue(0);
  const head = useSharedValue(0);
  const inhale = useSharedValue(1);

  const it = list[i];
  const part = it?.parts[c];

  const dropPlayer = () => {
    try {
      player.current?.remove();
    } catch {}
    player.current = null;
  };
  const claim = () => {
    seq.current += 1;
    const id = seq.current;
    return () => seq.current === id && !gone.current && !finished.current;
  };
  /** «¿Sigue siendo este momento?», sin cortar nada (para lo que se programa a continuación). */
  const still = () => {
    const id = seq.current;
    return () => seq.current === id && !gone.current && !finished.current;
  };
  /** Calla a Noi y a la grabación; devuelve «¿sigo siendo yo quien suena?» para lo que venga después. */
  const hush = () => {
    const alive = claim();
    voice.stop();
    dropPlayer();
    setPlaying(null);
    return alive;
  };

  // al salir (también a media grabación): se suelta el micro y el audio vuelve a quedar para escuchar
  const shutdown = useEffectEvent(() => {
    gone.current = true;
    seq.current += 1;
    recSeq.current += 1;
    mic.current?.cancel();
    mic.current = null;
    dropPlayer();
    stopSpeech();
    releaseTakes();
  });
  useEffect(() => {
    gone.current = false;
    return () => shutdown();
  }, []);

  const toReady = () => setPhase((p) => (p === 'shout' ? 'ready' : p));

  /** Noi coge aire y grita el trozo: suena, rebota el eco y se dibuja la melodía de sus tonos. */
  const noiSays = (slow: boolean, after?: () => void) => {
    if (!part) return;
    const alive = hush();
    setPlaying('noi');
    setPose('celebra');
    inhale.set(withSequence(withTiming(1.12, { duration: 260, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 7, stiffness: 160 })));
    timers.later(() => {
      if (!alive()) return;
      voice.speak(part.th, {
        rom: part.rom,
        slow,
        onStart: (ms) => {
          if (!alive()) return;
          setEcho((e) => ({ run: e.run + 1, voice: 'noi', bounces: 3 }));
          melo.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: Math.max(600, ms * 0.95), easing: Easing.linear })));
        },
        onEnd: () => {
          if (!alive()) return;
          setPose('feliz');
          setPlaying(null);
          after?.();
        },
      });
    }, 240);
  };

  const begin = useEffectEvent(() => {
    const alive = claim();
    timers.later(() => {
      if (alive()) noiSays(false, toReady);
    }, 550);
  });
  useEffect(() => {
    begin();
  }, [turn]);

  const result = (pts?: number): GameResult => {
    const r = score.result(pts);
    return { ...r, bananas: r.bananas + extra.current };
  };
  const bail = useEffectEvent(() => {
    if (finished.current) return;
    finished.current = true;
    onDone(result(0));
  });
  useEffect(() => {
    if (!list.length) bail();
  }, [list.length]);

  if (!it || !part) return null;

  const sylls = spoken(part.rom);
  const toneList = sylls.map(toneOfSyllable);

  // ——— Escuchar y grabar ———

  /** Suena tu grabación mientras una línea recorre tu voz. */
  const playMine = (t: Take, after?: () => void) => {
    const alive = hush();
    if (!t.uri) {
      after?.();
      return;
    }
    let done = false;
    const end = () => {
      if (done || !alive()) return;
      done = true;
      setPlaying(null);
      setPose('feliz');
      after?.();
    };
    try {
      const p = createAudioPlayer(t.uri);
      player.current = p;
      setPlaying('yo');
      setPose('escucha');
      const ms = Math.max(600, t.ms);
      head.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: ms, easing: Easing.linear })));
      p.addListener('playbackStatusUpdate', (st) => {
        if (st.didJustFinish) end();
      });
      p.play();
      // por si el reproductor no avisa del final
      timers.later(end, ms + 1500);
    } catch {
      end();
    }
  };

  /** Se enseña la nota: una estrella por sílaba, de izquierda a derecha, y Noi reacciona. */
  const reveal = (s: Shot | null) => {
    setPhase('result');
    if (!s || !s.a.heard) return;
    const now = still();
    setShown(true);
    s.a.syll.forEach((y, k) => {
      if (y.grade !== 'bien' && y.grade !== 'casi') return;
      timers.later(() => {
        if (!now()) return;
        if (y.grade === 'bien') fx.ok(Math.min(4, k + 1));
        else fx.plip();
      }, 140 + k * 150);
    });
    timers.later(() => {
      if (!now()) return;
      if (s.a.stars === 3) {
        // igualito: tu eco también cruza el valle
        fx.sparkle();
        setPose('celebra');
        setJump((j) => j + 1);
        setEcho((e) => ({ run: e.run + 1, voice: 'tuyo', bounces: 4 }));
        juice.burst(undefined, 'estrellas', 16, 130);
      } else if (s.a.stars === 2) {
        setPose('feliz');
        setJump((j) => j + 1);
      } else setPose('piensa');
    }, 220 + s.a.syll.length * 150);
  };

  const stopRec = async () => {
    const m = mic.current;
    if (!m) return;
    mic.current = null;
    recSeq.current += 1;
    live.set(0);
    setPhase('compare');
    const t = await m.stop();
    if (gone.current || finished.current) return;
    setTake(t);
    trace.set([]);
    fx.pop();
    let s: Shot | null = null;
    if (t.frames) {
      const a = analyse(t.frames, toneList, knownVoice());
      if (a.heard) {
        rememberVoice(a.profile);
        if (!best.current || a.score > best.current.score) best.current = { score: a.score, stars: a.stars };
      }
      s = { a, mine: a.heard ? place(a, toneList) : null };
    }
    setShot(s);
    setShown(false);
    if (s && !s.a.heard) {
      // no se oyó una voz: no hay nada que comparar
      setPose('piensa');
      setPhase('result');
      return;
    }
    // primero Noi y enseguida tú, seguidos: así el oído compara de verdad; la nota llega después
    noiSays(false, () => playMine(t, () => reveal(s)));
  };

  /** Lo que llega del micro mientras grabas: se dibuja tu melodía y, cuando callas, se para solo. */
  const onFrames = (fresh: Frame[]) => {
    const L = liveRef.current;
    if (!L || !mic.current) return;
    for (const f of fresh) {
      if (f.rms > L.peak) L.peak = f.rms;
      L.now = f.t;
      if (isVoiced(f, L.peak)) {
        const st = toSemitones(f.f0);
        L.pts.push(f.t, st);
        L.sum += st;
        L.n++;
        if (L.first < 0) L.first = f.t;
        L.lastVoiced = f.t;
      } else if (L.pts.length && L.pts[L.pts.length - 1] !== GAP) L.pts.push(f.t, GAP);
    }
    if (L.n >= 12 && L.now > 0.8 && L.now - L.lastVoiced >= HUSH_S) {
      void stopRec();
      return;
    }
    const at = Date.now();
    if (at - L.drawn < 55) return;
    L.drawn = at;
    const known = knownVoice();
    const mid = known?.mid ?? L.sum / Math.max(1, L.n);
    const range = (known?.range ?? 8) * 1.3;
    // el trazo arranca a la izquierda cuando empiezas a hablar (no cuando se abre el micro), como la curva de Noi
    const span = Math.max(L.est, L.now - L.first);
    const out: number[] = [];
    for (let q = 0; q < L.pts.length; q += 2) out.push(Math.max(0, (L.pts[q] - L.first) / span), L.pts[q + 1] === GAP ? -1 : Math.max(0.03, Math.min(0.97, 0.5 + (L.pts[q + 1] - mid) / range)));
    trace.set(out);
  };

  const startRec = async () => {
    if (busy.current || finished.current || locked.current) return;
    busy.current = true;
    fx.tap();
    // si Noi aún estaba gritando, se calla: te toca
    hush();
    setPose('escucha');
    try {
      buf.current = [];
      liveRef.current = { pts: [], sum: 0, n: 0, peak: 0, now: 0, first: -1, lastVoiced: 0, drawn: 0, est: (speechMs(part.rom) / 1000) * 0.9 };
      const m = await openMic({
        recorder,
        onFrames,
        onLevel: (v) => {
          buf.current.push(v);
          levels.set(buf.current.slice());
        },
      });
      if (gone.current || finished.current) {
        if (typeof m !== 'string') m.cancel();
        return;
      }
      if (typeof m === 'string') {
        // sin permiso o sin micro: se juega de oído, y Noi lo repite para que no se quede todo en silencio
        setNoMic(true);
        setTake(null);
        setShot(null);
        setShown(false);
        setPhase('ready');
        noiSays(false, toReady);
        return;
      }
      mic.current = m;
      setPitch(m.kind === 'tono');
      setTake(null);
      setShot(null);
      setShown(false);
      levels.set([]);
      trace.set([]);
      live.set(1);
      head.set(0);
      setPhase('rec');
      recSeq.current += 1;
      const id = recSeq.current;
      timers.later(() => {
        if (recSeq.current === id) void stopRec();
      }, MAX_MS);
    } finally {
      busy.current = false;
    }
  };

  /** Comparar otra vez: Noi y, seguida, tu grabación. */
  const replay = () => {
    if (!take) return;
    noiSays(false, () => playMine(take));
  };

  // ——— Lo que viene después ———
  const clearTake = () => {
    setTake(null);
    setShot(null);
    setShown(false);
    buf.current = [];
    levels.set([]);
    trace.set([]);
  };

  /** «Otra vez»: el mismo trozo desde el principio. No cuenta como nada: repetir es practicar. */
  const again = () => {
    hush();
    clearTake();
    setPhase('shout');
    setTurn((n) => n + 1);
  };

  /** Cierra una palabra o frase: su bolita, sus puntos y, solo si se MIDIÓ que salió bien, el repaso. */
  const commit = (at?: Point) => {
    const outs = outcomes.current;
    const measured = outs.filter((o) => o.score !== null);
    let mark: EcoMark = 'libre';
    let pts = 0;
    if (measured.length && measured.length * 2 >= outs.length) {
      const stars = Math.max(1, Math.min(3, Math.round(measured.reduce((a, o) => a + o.stars, 0) / measured.length - 0.01)));
      mark = stars === 3 ? 'tres' : stars === 2 ? 'dos' : 'una';
      if (stars >= 2) {
        const combo = score.hit(true);
        onAnswer(true, it.id);
        pts = stars * 10 + (combo >= 3 ? 5 : 0);
        if (feria && combo >= 3 && combo % 3 === 0) timers.later(() => juice.banner('¡Qué racha!', `${combo} ecos seguidos`, color.farol), 400);
      } else {
        // en la feria cuenta para la puntería de la partida (sin sonido de fallo); en una lección no resta nada
        if (feria) score.hit(false, false);
        pts = 10;
      }
    } else if (outs.some((o) => o.spoke)) {
      // sin medir no hay nota: solo lo que vale haber hablado
      extra.current += 1;
      pts = 5;
    }
    if (feria && pts) {
      pointsRef.current += pts;
      setPoints(pointsRef.current);
      juice.float(at, `+${pts}`, color.buatong);
    }
    tally.current.push(mark);
    setMarks((m) => [...m, mark]);
  };

  const finish = () => {
    if (finished.current) return;
    hush();
    finished.current = true;
    if (!feria) {
      onDone(result());
      return;
    }
    fx.fanfare();
    if (tally.current.length > 0 && tally.current.every((m) => m === 'tres')) {
      // todos los tonos en su sitio: el valle entero contesta
      setPose('celebra');
      setJump((j) => j + 1);
      setEcho((e) => ({ run: e.run + 1, voice: 'tuyo', bounces: 5, text: 'สุดยอด' }));
      juice.flash('#FFF3C4');
      juice.banner('¡Eco perfecto!', `El valle entero te contesta · ${pointsRef.current} puntos`, color.arrozal);
      juice.burst(undefined, 'estrellas', 34, 190);
      timers.later(() => juice.burst(undefined, 'confeti', 28, 170), 520);
      timers.later(() => {
        fx.sparkle();
        juice.burst(undefined, 'chispas', 26, 150);
      }, 1000);
      timers.later(() => onDone(result(pointsRef.current)), 2400);
      return;
    }
    juice.banner('¡Qué eco!', `${pointsRef.current} puntos`, color.farol);
    juice.burst(undefined, 'estrellas', 30, 170);
    timers.later(() => onDone(result(pointsRef.current)), 1500);
  };

  /** «Ahora no puedo hablar»: se deja el paso sin grabar nada. No puntúa ni toca el repaso; lo ya hecho se conserva. */
  const leave = () => {
    if (finished.current) return;
    hush();
    finished.current = true;
    recSeq.current += 1;
    mic.current?.cancel();
    mic.current = null;
    if (!feria) {
      onDone(result());
      return;
    }
    juice.banner('ไม่เป็นไร', 'Otro rato será', color.cielo);
    timers.later(() => onDone(result(pointsRef.current)), 1200);
  };

  const next = (o: Outcome, at?: Point) => {
    if (locked.current) return;
    locked.current = true;
    hush();
    outcomes.current.push(o);
    const last = c + 1 >= it.parts.length;
    if (last) commit(at);
    setPhase('next');
    timers.later(() => {
      locked.current = false;
      best.current = null;
      clearTake();
      melo.set(0);
      setPeek(false);
      if (!last) {
        setC(c + 1);
      } else {
        outcomes.current = [];
        if (i + 1 >= list.length) {
          finish();
          return;
        }
        setI(i + 1);
        setC(0);
      }
      setPhase('shout');
      setTurn((n) => n + 1);
    }, 650);
  };

  /** «Siguiente» tras una grabación medida: cuenta el mejor intento de este trozo. */
  const onward = (e: GestureResponderEvent) => {
    if (finished.current || locked.current) return;
    const b = best.current;
    next({ score: b ? b.score : null, stars: b ? b.stars : 0, spoke: !!take?.spoke }, tapPoint(e));
  };

  /** Valorarse de oído (donde no se mide el tono): sirve para pensar en cómo ha sonado, no para puntuar. */
  const rate = (r: Rating, e: GestureResponderEvent) => {
    if (finished.current || locked.current || !take) return;
    const at = tapPoint(e);
    if (r === 'otra') {
      juice.float(at, '¡Otra vez!', '#BFD6FF');
      again();
      return;
    }
    if (r === 'igual') {
      juice.burst(at, 'corazones', 14, 110);
      juice.float(at, '¡Bien dicho!', color.arrozalVivo);
      fx.sparkle();
      setPose('celebra');
      setJump((j) => j + 1);
    } else {
      juice.float(at, '¡Casi!', color.buatong);
      fx.plip();
    }
    next({ score: null, stars: 0, spoke: take.spoke }, at);
  };

  /** Sin micro: se dijo en voz alta (nadie lo ha oído, así que ni puntos ni repaso). */
  const said = (e: GestureResponderEvent) => {
    if (finished.current || locked.current) return;
    const at = tapPoint(e);
    juice.float(at, '¡Dicho!', color.arrozalVivo);
    fx.plip();
    next({ score: null, stars: 0, spoke: false }, at);
  };

  const labels = sylls.map((s) => s.replace(/[^\p{L}\p{M}]/gu, ''));
  const multi = it.parts.length > 1;
  const waiting = phase === 'shout' || phase === 'ready';
  const lockedUi = phase === 'rec' || phase === 'compare' || phase === 'next';
  // quien ya lee thai ve la transcripción al tocar la tarjeta o al comparar; quien no, siempre
  const showRom = !reads || peek || phase === 'compare' || phase === 'result';
  const measuring = pitch && !noMic;
  const a = shot?.a ?? null;
  const judged = phase === 'result' && !!a && a.heard && shown;
  const unheard = phase === 'result' && !!a && !a.heard;
  const canyonH = compact ? 108 : 190;
  const noiSize = compact ? 78 : 116;
  const thSize = (it.th.length > 18 ? 22 : it.th.length > 10 ? 27 : 34) - (compact ? 4 : 0);
  const tip = noMic
    ? 'Sin micro: dilo en voz alta, como Noi'
    : phase === 'rec'
      ? measuring
        ? 'Te escucho… mira cómo se dibuja tu voz'
        : 'Te escucho… toca el cuadrado cuando acabes'
      : phase === 'compare'
        ? playing === 'yo'
          ? '…y ahora tú'
          : 'Primero Noi…'
        : unheard
          ? 'No te he oído bien. Acércate al micro y prueba otra vez'
          : phase === 'result'
            ? 'Aquí no puedo medir tu tono: fíate de tu oído. ¿Cómo te ha salido?'
            : phase === 'ready'
              ? multi
                ? '¡Tu turno! Toca el micro y repite este trozo'
                : '¡Tu turno! Toca el micro y repite'
              : phase === 'next'
                ? ' '
                : oral && i === 0 && c === 0
                  ? 'Noi grita y tú repites. Sin prisa: aquí no se suspende'
                  : 'Escucha a Noi…';
  const worst = judged && a && a.worst >= 0 ? a.syll[a.worst] : null;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="noche" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }, juice.shakeStyle]}>
        <EcoBar marks={marks} total={list.length} points={feria ? points : undefined} combo={score.combo} />

        {/* la palabra o frase; en las largas, el trozo que toca va encendido y el resto, apagado */}
        <Animated.View key={`c${i}`} entering={ZoomIn.springify().damping(14)}>
          <Pressable disabled={!reads} onPress={() => setPeek((v) => !v)} accessibilityLabel={reads ? 'Ver u ocultar la transcripción' : undefined} style={[styles.card, compact && { paddingVertical: 5 }]}>
            <Th size={thSize} bold style={{ textAlign: 'center' }} numberOfLines={2}>
              {multi
                ? it.parts.map((p, k) => (
                    <Text key={k} style={k === c ? null : styles.dim}>
                      {p.th}
                    </Text>
                  ))
                : it.th}
            </Th>
            {showRom ? (
              <View style={styles.romRow}>
                {it.parts.map((p, k) => (
                  <Rom key={k} rom={p.rom} size={compact ? 15 : 17} mono={k === c ? undefined : 'rgba(29,35,71,0.3)'} />
                ))}
              </View>
            ) : null}
            <Text style={styles.es} numberOfLines={2}>
              {it.es}
            </Text>
            {multi ? (
              <View style={styles.piece}>
                <Text style={styles.pieceText}>
                  Trozo {c + 1} de {it.parts.length}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </Animated.View>

        {/* el valle: dos montañas, Noi en su roca y el eco que rebota (el de Noi, ámbar; el tuyo, menta) */}
        {/* (es lo único que encoge si la pantalla es muy baja: los botones de abajo no se quedan fuera) */}
        <View style={{ height: canyonH, flexShrink: 1, minHeight: 84 }} onLayout={(e) => setCanyon({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {canyon.w > 0 ? (
            <>
              <Valley w={canyon.w} h={canyon.h} />
              <Echo run={echo.run} text={echo.text ?? part.th} voice={echo.voice} bounces={echo.bounces} w={canyon.w} h={canyon.h} from={{ x: canyon.w / 2, y: canyon.h - noiSize * 0.75 }} />
              <View style={{ position: 'absolute', left: canyon.w / 2 - noiSize / 2, top: canyon.h - noiSize - 4 }}>
                <InhaleNoi scale={inhale} pose={pose} size={noiSize} jump={jump} />
              </View>
            </>
          ) : null}
        </View>

        {/* el pentagrama: Noi en colores y, encima y a la misma escala, tu voz en blanco */}
        <View style={styles.viz} onLayout={(e) => setVizW(e.nativeEvent.layout.width - 27)}>
          <View style={styles.legend}>
            <View style={[styles.swatch, { backgroundColor: color.buatong }]} />
            <Text style={styles.vizTag}>Noi</Text>
            {measuring ? (
              <>
                <View style={[styles.swatch, { backgroundColor: '#FFFFFF', marginLeft: 8 }]} />
                <Text style={[styles.vizTag, { color: '#FFFFFF' }]}>Tú</Text>
              </>
            ) : null}
            <View style={{ flex: 1 }} />
            <Text style={styles.axis}>↑ agudo · grave ↓</Text>
          </View>
          {vizW > 0 ? (
            <Staff
              key={`m${i}-${c}`}
              tones={toneList}
              labels={showRom ? labels : undefined}
              width={vizW}
              height={measuring ? (compact ? 98 : 134) : compact ? 70 : 98}
              progress={melo}
              trace={trace}
              mine={measuring ? shot?.mine : null}
              grades={judged && a ? a.syll.map((s) => s.grade) : null}
              scored={measuring}
              focus={judged && a && a.worst >= 0 ? a.worst : undefined}
              head={head}
              playing={measuring && playing === 'yo'}
            />
          ) : null}
          {!measuring && !noMic ? (
            <>
              <Text style={[styles.vizTag, { color: '#FFB98A' }]}>El volumen de tu voz (aquí no se puede medir el tono)</Text>
              {vizW > 0 ? <Ridge levels={levels} live={live} head={head} playing={playing === 'yo'} width={vizW} height={compact ? 24 : 36} hint={waiting ? 'Aquí se verá cuánto suena tu voz' : undefined} /> : null}
            </>
          ) : null}
        </View>

        {/* la pista: o lo que toca hacer ahora, o cómo ha salido lo medido */}
        {judged && a ? (
          <Animated.View key={`v${turn}`} entering={FadeIn.duration(220)} style={[styles.verdict, compact && { marginTop: 4 }]}>
            <View style={styles.stars}>
              {[1, 2, 3].map((k) => (
                <Animated.View key={k} entering={ZoomIn.delay(k * 130).springify().damping(8)}>
                  <Star on={k <= a.stars} size={compact ? 22 : 26} />
                </Animated.View>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verdictTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {a.stars === 3 ? '¡Igualito! Tu eco cruza el valle' : a.stars === 2 ? '¡Casi! Ya suena a thai' : oral ? 'ไม่เป็นไร, ya va sonando' : 'ไม่เป็นไร, a por ese eco'}
              </Text>
              {worst?.slip ? (
                <View style={styles.hintRow}>
                  <Contour tone={worst.tone} size={20} />
                  <Text style={styles.hint} numberOfLines={2}>
                    «<Text style={{ color: TONES[worst.tone].fill }}>{labels[a.worst] ?? ''}</Text>»: {hintOf(worst.tone, worst.slip)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.hint} numberOfLines={1}>
                  {a.stars === 3 ? 'Cada sílaba, con su tono' : 'Escucha a Noi y prueba otra vez si quieres'}
                </Text>
              )}
            </View>
          </Animated.View>
        ) : (
          <Text style={[styles.tip, compact && { marginTop: 4 }]} numberOfLines={2}>
            {tip}
          </Text>
        )}

        {/* escuchar a Noi · más lento · grabar · comparar (Noi y tú, seguidos) */}
        <View style={styles.controls}>
          <RoundBtn icon="speaker" label="Noi" hint="Escuchar a Noi" tint={color.cielo} deep={color.cieloHondo} onPress={() => noiSays(false, toReady)} disabled={lockedUi} small={compact} active={playing === 'noi'} />
          <RoundBtn icon="turtle" label="Lento" hint="Escuchar a Noi más lento" tint="#7C6CF2" deep="#5546C4" onPress={() => noiSays(true, toReady)} disabled={lockedUi} small={compact} />
          {!noMic ? (
            <Mic
              recording={phase === 'rec'}
              ready={phase === 'ready'}
              label={phase === 'rec' ? 'Parar' : take ? 'Repetir' : 'Grabar'}
              onPress={() => (phase === 'rec' ? void stopRec() : void startRec())}
              disabled={phase === 'compare' || phase === 'next'}
              small={compact}
            />
          ) : (
            <View style={styles.noMic}>
              <Icon name="mic" size={26} color="#C9D0EE" />
              <Text style={styles.noMicText}>Sin micro: en voz alta</Text>
            </View>
          )}
          {!noMic ? (
            <RoundBtn icon="play" label="Comparar" hint="Escuchar a Noi y luego tu grabación" tint={color.farol} deep="#C2410C" onPress={replay} disabled={!take?.uri || phase !== 'result'} small={compact} active={playing === 'yo'} />
          ) : null}
        </View>

        <View style={styles.bottom}>
          {judged && a ? (
            // medido: repetir (que nunca resta) o seguir; con una estrella, lo que se ofrece primero es repetir
            <View style={styles.row}>
              <BigBtn label="Otra vez" emoji="🔁" skin={a.stars === 1 ? 'ambar' : 'azul'} flex={a.stars === 1 ? 1.5 : 1} onPress={again} small={compact} />
              <BigBtn label="Siguiente" skin={a.stars === 1 ? 'azul' : 'verde'} flex={a.stars === 1 ? 1 : 1.5} onPress={onward} small={compact} icon={<Icon name="arrow" size={20} color="#FFFFFF" stroke={3} />} />
            </View>
          ) : unheard ? (
            <View style={styles.row}>
              <BigBtn label="Otra vez" emoji="🔁" skin="ambar" flex={1.5} onPress={again} small={compact} />
              <BigBtn label="Siguiente" skin="azul" onPress={onward} small={compact} icon={<Icon name="arrow" size={20} color="#FFFFFF" stroke={3} />} />
            </View>
          ) : phase === 'result' && take && !a ? (
            // sin medir: valorarse de oído (no puntúa)
            <View style={styles.row}>
              <BigBtn label="Otra vez" emoji="🔁" skin="azul" onPress={(e) => rate('otra', e)} small={compact} />
              <BigBtn label="Casi" emoji="🙂" skin="ambar" onPress={(e) => rate('casi', e)} small={compact} />
              <BigBtn label="¡Igualito!" emoji="🤩" skin="verde" flex={1.25} onPress={(e) => rate('igual', e)} small={compact} />
            </View>
          ) : waiting && noMic ? (
            <>
              <View style={styles.row}>
                <BigBtn label="Otra vez" emoji="🔁" skin="azul" onPress={() => noiSays(false, toReady)} small={compact} />
                <BigBtn label="Ya lo he dicho" emoji="🗣️" skin="verde" flex={1.4} onPress={said} small={compact} />
              </View>
              <QuietLink onPress={leave} small />
            </>
          ) : waiting ? (
            <QuietLink onPress={leave} small={compact} />
          ) : null}
        </View>
      </Animated.View>
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  dim: { color: 'rgba(29,35,71,0.3)' },
  romRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 7 },
  es: { fontFamily: font.uiHeavy, fontSize: 15.5, color: color.tinta2, textAlign: 'center', marginTop: 1 },
  piece: { position: 'absolute', right: 10, top: -11, height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: color.buatong, justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  pieceText: { fontFamily: font.uiHeavy, fontSize: 11.5, color: color.tinta },
  viz: { marginTop: 6, borderRadius: 20, backgroundColor: 'rgba(14,17,40,0.62)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 7, gap: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 14, height: 5, borderRadius: 3 },
  vizTag: { fontFamily: font.uiHeavy, fontSize: 11.5, letterSpacing: 0.3, color: '#BFD6FF' },
  axis: { fontFamily: font.uiBold, fontSize: 10.5, color: 'rgba(255,255,255,0.5)' },
  tip: { textAlign: 'center', fontFamily: font.uiBold, fontSize: 14, lineHeight: 18, color: '#E9ECFA', marginTop: 8, minHeight: 38 },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, minHeight: 40, paddingHorizontal: 4 },
  stars: { flexDirection: 'row', gap: 1 },
  verdictTitle: { fontFamily: font.displayBold, fontSize: 16, color: '#FFFFFF' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { flex: 1, fontFamily: font.uiBold, fontSize: 13, lineHeight: 16, color: '#DCE2FA' },
  controls: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', marginTop: 4 },
  noMic: { width: 120, height: 86, alignItems: 'center', justifyContent: 'center', gap: 6 },
  noMicText: { fontFamily: font.uiBold, fontSize: 12.5, color: '#C9D0EE', textAlign: 'center' },
  bottom: { marginTop: 'auto', paddingTop: 8, paddingBottom: 12, gap: 8, minHeight: 60, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', gap: 8 },
});
