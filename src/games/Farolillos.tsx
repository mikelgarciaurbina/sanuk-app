// Juego 5 · Noche de farolillos (Yi Peng): flotan farolillos de papel encendidos, cada uno con una palabra
// thai. Toca los de la categoría pedida: suben al cielo con su estela y su traducción; los demás se balancean
// y se apagan. El cielo se va llenando de los que sueltas y la noche acaba con una gran suelta.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Farol, LH, LW, Lucero, Suelta, type LanternState } from './farolillos/Farol';
import { Countdown, Pop, tapPoint, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { MultChip, ScoreChip, distinct, multFor, useLater } from './palabras/common';
import type { GameProps } from './types';

/** Segundos por ronda en la feria (cada ronda, un poco menos). */
const ROUND_S = [24, 21, 19, 17];
const clock = () => Date.now();
const jitter = (k: number) => (Math.random() - 0.5) * 2 * k;

/** Farolillo pequeño para el cielo, en un sitio al azar de la franja alta. */
const newStar = (id: number): Star => ({ id, fx: 0.06 + Math.random() * 0.88, fy: 0.03 + Math.random() * 0.2, s: 0.22 + Math.random() * 0.16, d: Math.random() * 1400 });

const groupOf = (w: Word): string => (w.cat === 'fruta' || w.cat === 'bebida' ? 'comida' : (w.cat ?? ''));

/** Categorías que se piden (las abstractas, como partículas o conectores, solo sirven de distractor). */
const LABEL: Record<string, [string, string]> = {
  comida: ['comida y bebida', '🍲'],
  animal: ['animales', '🐘'],
  color: ['colores', '🎨'],
  cuerpo: ['el cuerpo', '🖐️'],
  numero: ['números', '🔢'],
  lugar: ['lugares', '🏯'],
  transporte: ['transporte', '🛺'],
  familia: ['la familia', '👪'],
  naturaleza: ['la naturaleza', '🌿'],
  clima: ['el clima', '🌦️'],
  casa: ['la casa', '🏠'],
  verbo: ['acciones (verbos)', '🏃'],
  adjetivo: ['cómo es algo (adjetivos)', '✨'],
  tiempo: ['el tiempo y el reloj', '⏰'],
  saludo: ['saludos', '👋'],
  cortesia: ['cortesía', '🙏'],
  pronombre: ['personas (pronombres)', '🙋'],
  sentimiento: ['sentimientos', '💗'],
  cocina: ['la cocina', '🍳'],
  dinero: ['el dinero', '💰'],
};

/** Categorías vecinas: no se usan como distractor de la pedida para que nunca haya dudas. */
const NEAR: Record<string, string[]> = {
  comida: ['cocina'],
  cocina: ['comida', 'verbo'],
  naturaleza: ['clima', 'animal', 'lugar', 'norte'],
  clima: ['naturaleza', 'tiempo', 'adjetivo'],
  animal: ['naturaleza', 'norte'],
  lugar: ['casa', 'naturaleza', 'transporte', 'norte', 'cultura'],
  casa: ['lugar', 'familia'],
  saludo: ['cortesia', 'particula', 'pregunta'],
  cortesia: ['saludo', 'particula'],
  pronombre: ['familia', 'pregunta', 'particula'],
  familia: ['pronombre', 'casa'],
  adjetivo: ['sentimiento', 'color', 'clima', 'cuerpo'],
  sentimiento: ['adjetivo', 'verbo'],
  color: ['adjetivo'],
  tiempo: ['numero', 'clima', 'conector'],
  numero: ['dinero', 'tiempo'],
  dinero: ['numero'],
  verbo: ['cocina', 'sentimiento'],
  cuerpo: ['adjetivo'],
  transporte: ['lugar'],
};

type Item = { word: Word; good: boolean; fx: number; fy: number };
type Round = { n: number; group: string; label: string; emoji: string; items: Item[] };
type Star = { id: number; fx: number; fy: number; s: number; d: number };
type Feedback = { n: number; kind: 'ok' | 'bad' | 'lost'; word?: Word; lost?: Word[]; label: string };

function groups(pool: Word[], min: number) {
  const m = new Map<string, Word[]>();
  for (const w of pool) {
    const k = groupOf(w);
    if (!LABEL[k]) continue;
    m.set(k, [...(m.get(k) ?? []), w]);
  }
  return [...m.entries()].filter(([, l]) => l.length >= min);
}

function makeRound(n: number, pool: Word[], focus: Word[], avoid: string[], goodN: number, badN: number): Round | null {
  let cands = groups(pool, 3);
  if (!cands.length) cands = groups(pool, 2);
  if (!cands.length) return null;
  const fresh = cands.filter(([k]) => !avoid.includes(k));
  const list = shuffle(fresh.length ? fresh : cands);
  // en la lección, primero las categorías con palabras nuevas
  list.sort((a, b) => Number(b[1].some((w) => focus.some((f) => f.id === w.id))) - Number(a[1].some((w) => focus.some((f) => f.id === w.id))));
  const [group, words] = list[0];
  const good = [...shuffle(words.filter((w) => focus.some((f) => f.id === w.id))), ...shuffle(words.filter((w) => !focus.some((f) => f.id === w.id)))].slice(0, goodN);
  const near = NEAR[group] ?? [];
  const others = shuffle(pool.filter((w) => w.cat && groupOf(w) !== group && !near.includes(groupOf(w)) && !good.some((g) => g.es === w.es || g.th === w.th)));
  // distractores de categorías distintas entre sí (y si faltan, repetidas)
  const bad: Word[] = [];
  const seen = new Set<string>();
  for (const w of others) {
    if (bad.length >= badN || seen.has(groupOf(w)) || bad.some((b) => b.es === w.es)) continue;
    seen.add(groupOf(w));
    bad.push(w);
  }
  for (const w of others) if (bad.length < badN && !bad.includes(w) && !bad.some((b) => b.es === w.es)) bad.push(w);
  const all = shuffle([...good.map((word) => ({ word, good: true })), ...bad.map((word) => ({ word, good: false }))]);
  const cols = 3;
  const rows = Math.ceil(all.length / cols);
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, all.length);
  const items = all.map((it, i) => ({
    ...it,
    fx: (cells[i] % cols + 0.5) / cols + jitter(0.045),
    fy: (Math.floor(cells[i] / cols) + 0.5) / rows + jitter(0.035),
  }));
  const [label, emoji] = LABEL[group];
  return { n, group, label, emoji, items };
}

const sizesFor = (feria: boolean, r: number): [number, number] => (feria ? ([[4, 3], [4, 4], [4, 5], [5, 4]][r] as [number, number]) : [4, 3]);

/** Juego 5 · Noche de farolillos: suelta solo los de la categoría pedida. */
export default function Farolillos({ mode, words, focus, rounds = 4, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const total = feria ? Math.min(rounds, ROUND_S.length) : 1;
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const rootRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  const [round, setRound] = useState<Round | null>(() => makeRound(0, pool, feria ? [] : focus, [], ...sizesFor(feria, 0)));
  const [states, setStates] = useState<Record<string, LanternState>>({});
  const [sky, setSky] = useState<Star[]>([]);
  const [phase, setPhase] = useState<'count' | 'play' | 'between' | 'end'>(feria ? 'count' : 'play');
  const [secs, setSecs] = useState(ROUND_S[0]);
  const [points, setPoints] = useState(0);
  const [jump, setJump] = useState(0);
  const [pose, setPose] = useState<'feliz' | 'celebra' | 'ups'>('feliz');
  const [fb, setFb] = useState<Feedback | null>(null);
  const [finale, setFinale] = useState(false);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });

  const g = useRef({ r: 0, points: 0, ended: false, done: false, deadline: 0, lastTick: 0, mistakes: 0, released: 0, sky: 0, fb: 0, poseN: 0, groups: [] as string[], closed: -1 });

  const tooFew = !round;
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  const setMood = (p: 'celebra' | 'ups') => {
    const s = g.current;
    s.poseN += 1;
    const n = s.poseN;
    setPose(p);
    later(() => {
      if (g.current.poseN === n) setPose('feliz');
    }, 1300);
  };
  const tell = (f: Omit<Feedback, 'n'>) => {
    g.current.fb += 1;
    setFb({ ...f, n: g.current.fb });
  };

  const addStar = () => {
    const s = g.current;
    s.sky += 1;
    const star = newStar(s.sky);
    setSky((l) => [...l.slice(-28), star]);
  };

  // ——— final: la gran suelta ———

  const grandRelease = () => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    setFinale(true);
    setJump((j) => j + 1);
    setMood('celebra');
    fx.fanfare();
    juice.banner('¡Yi Peng!', feria ? `${s.points} puntos · la noche se llena de luz` : 'La noche se llena de luz', color.farol);
    later(() => fx.sparkle(), 900);
    later(() => {
      if (s.done) return;
      s.done = true;
      onDone(score.result(s.points));
    }, 3400);
  };

  // ——— rondas ———

  const startRound = (r: Round) => {
    const s = g.current;
    s.mistakes = 0;
    s.released = 0;
    s.lastTick = 0;
    s.deadline = clock() + (ROUND_S[s.r] ?? 17) * 1000;
    setSecs(ROUND_S[s.r] ?? 17);
    setRound(r);
    setStates({});
    setPhase('play');
  };

  const endRound = (timeout: boolean) => {
    const s = g.current;
    if (!round || s.closed === round.n || s.ended) return;
    s.closed = round.n;
    setPhase('between');
    if (!round.items.some((it) => it.good)) return;
    if (timeout) {
      const lost = round.items.filter((it) => it.good && !states[it.word.id]);
      for (const it of lost) {
        score.hit(false, false);
        onAnswer(false, it.word.id);
      }
      setStates((st) => {
        const n = { ...st };
        for (const it of lost) n[it.word.id] = 'lost';
        return n;
      });
      if (lost.length) tell({ kind: 'lost', lost: lost.map((it) => it.word), label: round.label });
      fx.bell();
    }
    if (feria) {
      const left = Math.max(0, Math.ceil((s.deadline - clock()) / 1000));
      const perfect = !timeout && s.mistakes === 0;
      const bonus = (timeout ? 0 : left * 2) + (perfect ? 30 : 0);
      s.points += bonus;
      setPoints(s.points);
      if (perfect) {
        fx.levelup();
        juice.banner('¡Ronda perfecta!', `+${bonus} · ni un farolillo apagado`, color.buatong);
      } else if (!timeout) juice.banner(`¡Ronda ${s.r + 1} de ${total}!`, bonus ? `+${bonus} por el tiempo` : undefined, color.farol);
    }
    s.groups.push(round.group);
    if (feria && s.r + 1 < total) {
      later(() => {
        s.r += 1;
        const next = makeRound(s.r, pool, [], s.groups, ...sizesFor(true, s.r));
        if (next) startRound(next);
        else grandRelease();
      }, timeout ? 2600 : 2000);
    } else later(grandRelease, timeout ? 2400 : 1300);
  };

  const start = () => {
    const s = g.current;
    s.deadline = clock() + ROUND_S[0] * 1000;
    setPhase('play');
  };

  const onTick = useEffectEvent(() => {
    const s = g.current;
    if (s.ended) return;
    const left = s.deadline - clock();
    const sec = Math.max(0, Math.ceil(left / 1000));
    setSecs(sec);
    if (sec <= 5 && sec > 0 && sec !== s.lastTick) {
      s.lastTick = sec;
      fx.tick();
    }
    if (left <= 0) endRound(true);
  });
  useEffect(() => {
    if (!feria || phase !== 'play') return;
    const t = setInterval(() => onTick(), 250);
    return () => clearInterval(t);
  }, [feria, phase]);

  const tap = (it: Item, e: GestureResponderEvent) => {
    const s = g.current;
    if (phase !== 'play' || !round || states[it.word.id] || s.ended) return;
    const at = tapPoint(e);
    say(it.word.th);
    if (it.good) {
      const combo = score.hit(true);
      onAnswer(true, it.word.id);
      const gain = 10 * multFor(combo);
      s.points += gain;
      setPoints(s.points);
      s.released += 1;
      setStates((st) => ({ ...st, [it.word.id]: 'ok' }));
      juice.burst(at, 'chispas', 18, 120);
      juice.float(at, `+${gain}`, '#FFD34D', 30);
      tell({ kind: 'ok', word: it.word, label: round.label });
      setJump((j) => j + 1);
      if (combo >= 3) setMood('celebra');
      if (combo > 0 && combo % 5 === 0) juice.banner(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
      later(addStar, 1500);
      if (s.released >= round.items.filter((x) => x.good).length) later(() => endRound(false), 700);
    } else {
      score.hit(false);
      onAnswer(false, it.word.id);
      s.mistakes += 1;
      setStates((st) => ({ ...st, [it.word.id]: 'bad' }));
      juice.shake(5);
      setMood('ups');
      tell({ kind: 'bad', word: it.word, label: round.label });
    }
  };

  const goodTotal = round ? round.items.filter((it) => it.good).length : 0;
  const released = round ? round.items.filter((it) => it.good && states[it.word.id] === 'ok').length : 0;
  const low = feria && secs <= 5;

  return (
    <View ref={rootRef} style={{ flex: 1 }} onLayout={(e) => setRootSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Backdrop scene="noche" />
      {rootSize.w > 0
        ? sky.map((st) => <Lucero key={st.id} x={st.fx * rootSize.w} y={st.fy * rootSize.h} s={st.s} delay={st.d} up={finale} />)
        : null}
      <Animated.View style={[{ flex: 1, paddingHorizontal: 14, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <ScoreChip value={points} dark />
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? (
            <>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {Math.min((round?.n ?? 0) + 1, total)}/{total}
                </Text>
              </View>
              <Pop trigger={low ? secs : 0} scale={1.25} style={[styles.pill, low ? styles.pillLow : null]}>
                <Text style={styles.pillText}>0:{String(secs).padStart(2, '0')}</Text>
              </Pop>
            </>
          ) : (
            <Pop trigger={released} style={styles.pill}>
              <Text style={styles.pillText}>
                🏮 {released}/{goodTotal}
              </Text>
            </Pop>
          )}
        </View>

        {round ? (
          <Pop key={round.n} trigger={round.n} style={styles.sign}>
            <Text style={styles.signSmall}>Suelta al cielo los farolillos de…</Text>
            <Text style={styles.signBig} numberOfLines={1}>
              {round.emoji} {round.label}
            </Text>
          </Pop>
        ) : null}

        <View style={{ flex: 1 }} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {round && area.w > 0 && !finale
            ? round.items.map((it, i) => {
                const x = Math.max(2, Math.min(area.w - LW - 2, it.fx * area.w - LW / 2));
                const y = Math.max(4, Math.min(area.h - LH - 26, it.fy * (area.h - 26) - LH / 2));
                const st = states[it.word.id] ?? 'float';
                return (
                  <Farol
                    key={`${round.n}-${it.word.id}`}
                    word={it.word}
                    x={x}
                    y={y}
                    state={st}
                    delay={i * 90}
                    showEs={st === 'ok' || st === 'bad' || st === 'lost'}
                    onPress={(e) => tap(it, e)}
                  />
                );
              })
            : null}
        </View>

        <View style={styles.bottom}>
          <Noi pose={pose} size={74} jump={jump} />
          <View style={{ flex: 1, paddingBottom: 8 }}>
            {fb ? (
              <Strip key={fb.n} fb={fb} />
            ) : (
              <View style={styles.hint}>
                <Text style={styles.hintText}>Yi Peng: cada farolillo que sueltas se lleva un deseo. ¡Elige bien!</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
      {finale && rootSize.w > 0
        ? Array.from({ length: 16 }, (_, k) => <Suelta key={k} x={((k * 0.37 + 0.1) % 1) * rootSize.w * 0.9 + rootSize.w * 0.05} h={rootSize.h} delay={k * 160} s={0.45 + ((k * 7) % 5) * 0.12} />)
        : null}
      {phase === 'count' && !tooFew ? <Countdown dark onDone={start} /> : null}
      {juice.layer}
    </View>
  );
}

function Strip({ fb }: { fb: Feedback }) {
  if (fb.kind === 'lost' && fb.lost) {
    return (
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.strip, { borderColor: '#FFB25C' }]}>
        <Text style={styles.stripHead}>Se escaparon:</Text>
        <Text style={styles.stripText} numberOfLines={2}>
          {fb.lost.map((w) => `${w.th} (${w.es})`).join(' · ')}
        </Text>
      </Animated.View>
    );
  }
  const w = fb.word;
  if (!w) return null;
  const ok = fb.kind === 'ok';
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.strip, { borderColor: ok ? '#FFD34D' : '#8A93C8' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <Th size={17} bold style={{ color: '#FFFFFF', lineHeight: 24 }}>
          {w.th}
        </Th>
        <Rom rom={w.rom} size={12} mono="#FFE7B0" />
        <Text style={styles.stripText}>= {w.es}</Text>
      </View>
      <Text style={[styles.stripSub, { color: ok ? '#FFD34D' : '#C9D0EE' }]}>{ok ? `¡Al cielo! Es de ${fb.label}.` : `No es de ${fb.label}: se apaga.`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pill: { height: 34, paddingHorizontal: 11, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(14,17,40,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,214,140,0.4)' },
  pillLow: { backgroundColor: '#E2474C', borderColor: '#FFC8B8' },
  pillText: { fontFamily: font.displayBold, fontSize: 16, color: '#FFE7B0' },
  sign: {
    marginTop: 6,
    alignSelf: 'center',
    minWidth: '86%',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(20,16,48,0.72)',
    borderWidth: 2,
    borderColor: '#E9B44C',
    shadowColor: '#FFB347',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  signSmall: { fontFamily: font.uiBold, fontSize: 13, color: '#E8DDF5' },
  signBig: { fontFamily: font.displayBold, fontSize: 24, lineHeight: 30, color: '#FFD34D', textShadowColor: 'rgba(255,170,60,0.7)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, minHeight: 88, paddingBottom: 6 },
  hint: { backgroundColor: 'rgba(14,17,40,0.55)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: 'rgba(255,214,140,0.35)' },
  hintText: { fontFamily: font.uiBold, fontSize: 13, color: '#FFE9C2' },
  strip: { backgroundColor: 'rgba(14,17,40,0.82)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2 },
  stripHead: { fontFamily: font.displayBold, fontSize: 14, color: '#FFB25C' },
  stripText: { fontFamily: font.uiHeavy, fontSize: 14, color: '#FFFFFF' },
  stripSub: { fontFamily: font.uiBold, fontSize: 12.5 },
});
