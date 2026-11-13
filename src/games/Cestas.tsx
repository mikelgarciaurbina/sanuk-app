// Juego 12 · Cestas del mercado. En thai las cosas se cuentan con su clasificador: แมว สาม ตัว = «gato tres ‹de
// animal›». En el puesto del mercado nocturno, la cinta trae bandejas con cosas: tócalas a su cesta o lánzalas con
// el dedo. La cesta rebota, saltan monedas y suena la frase entera. Las cestas no se mueven del puesto, así que cada
// vez se va más rápido. Feria: la cinta corre más en cada nivel (y no espera aunque tengas la bandeja en la mano),
// se abre una cesta nueva por nivel, bandejas de oro (×3), y lo que se cae o se falla vuelve más tarde. Desde el
// nivel 2 las cestas ya no enseñan dibujos: hay que leer el clasificador. อัน es el comodín: vale para las cosas
// pequeñas («vale, pero mejor คัน») y no cuenta como fallo. Usa el banco de clasificadores y las palabras
// aprendidas que tienen clasificador; al repaso le llega el clasificador (la palabra que de verdad se practica).
import { useEffect, useId, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeInDown, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { NoiPose } from '@/brand/noi-art';
import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Btn, Rom, SpeakBtn, Th } from '@/components/ui';
import { knownForms } from '@/content';
import { CLASSIFIERS, classifierItemsFor } from '@/content/drills';
import type { Category, Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { randInt, shuffle } from '@/lib/random';
import { thaiNumber, thaiNumberRom } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Countdown, Glow, Pop, useJuice, type Point } from './fx';
import { GameHud, WORD_BY_TH, clamp, measureBox, useLater, type Box, type ViewRef } from './frases/shared';
import { useScore } from './kit';
import type { GameProps } from './types';

// ——— Clasificadores y cosas ———

type Clf = { clf: string; rom: string; es: string; icons: string[]; core: boolean };

/** Lo que asoma por cada cesta (pista del primer nivel). Tres por cesta: nunca se enseña el mismo dibujo de la bandeja. */
const ICONS: Record<string, string[]> = {
  ตัว: ['🐱', '👕', '🐟'],
  คน: ['🧒', '👩‍🏫', '👵'],
  ใบ: ['🍃', '🍽️', '🎟️'],
  ลูก: ['🥭', '⚽', '🍊'],
  อัน: ['🧸', '🧽', '🔑'],
  คัน: ['🚗', '☂️', '🥄'],
  เล่ม: ['📕', '🔪', '🕯️'],
  หลัง: ['🏠', '🛖', '🏡'],
  ดอก: ['🌸', '🔑', '🌼'],
  ต้น: ['🌳', '🌱', '🎋'],
  ฟอง: ['🥚', '🍳'],
  ผืน: ['🧣', '🧵', '🛏️'],
};

/** Los del banco (drills.ts) y algunos más que llevan las palabras del temario. */
const CLFS: Clf[] = [
  ...CLASSIFIERS.map((c) => ({ ...c, icons: ICONS[c.clf] ?? ['📦'], core: true })),
  { clf: 'แก้ว', rom: 'gɛ̂ɛo', es: 'bebidas en vaso', icons: ['☕', '🥤', '🍵'], core: false },
  { clf: 'ลำ', rom: 'lam', es: 'barcos y aviones', icons: ['⛵', '✈️', '🛶'], core: false },
  { clf: 'แห่ง', rom: 'hɛ̀ng', es: 'lugares: templos, pueblos', icons: ['🛕', '🌉', '🏘️'], core: false },
  { clf: 'คู่', rom: 'khûu', es: 'pares (zapatos…)', icons: ['👟', '🧦', '🥢'], core: false },
  { clf: 'บาน', rom: 'baan', es: 'puertas y ventanas', icons: ['🚪', '🪟'], core: false },
  { clf: 'รูป', rom: 'rûup', es: 'monjes y novicios', icons: ['🧘', '🙇‍♂️'], core: false },
];
const CLF_BY: Record<string, Clf> = Object.fromEntries(CLFS.map((c) => [c.clf, c]));

/** `soft`: se puede contar con อัน aunque tenga un clasificador mejor · `clfId`: la palabra del clasificador, para el repaso. */
type Thing = { th: string; rom: string; es: string; emoji: string; clf: string; alts: string[]; id?: string; learned: boolean; soft: boolean };

/** Nombres que hacen de clasificador sin que su ficha lo diga: เพื่อนสองคน, รองเท้าสองคู่. */
const NOUN_CLF = new Set(['คน', 'คู่']);

/**
 * La palabra que enseña cada clasificador *como clasificador*: su ficha (o su nota) lo dice, o es un nombre que
 * cuenta lo suyo. Que se conozca la misma escritura con otro sentido no basta: ลำ «rico», บาน «florecer» o
 * รูป «foto» no abren las cestas de barcos, puertas o monjes. Es también la palabra que va al repaso.
 */
function taughtClassifiers(words: Word[]): Map<string, Word> {
  const m = new Map<string, Word>();
  for (const w of words) {
    if (!CLF_BY[w.th]) continue;
    const says = /clasificador/i.test(`${w.es} ${w.note ?? ''}`);
    if ((says || NOUN_CLF.has(w.th)) && (!m.has(w.th) || (says && !/clasificador/i.test(m.get(w.th)!.es)))) m.set(w.th, w);
  }
  return m;
}

/**
 * อัน es el comodín de las cosas pequeñas («si no sabes el clasificador, อัน te saca del apuro»): se acepta para
 * objetos de mano, nunca para personas, animales, ropa, vehículos, casas, lugares, plantas, telas, bebidas o libros.
 */
const AN = 'อัน';
const NO_AN_CLF = new Set(['คน', 'ตัว', 'หลัง', 'แห่ง', 'ต้น', 'ลำ', 'แก้ว', 'รูป', 'ผืน']);
const NO_AN_CAT = new Set<Category>(['animal', 'transporte', 'familia', 'lugar', 'naturaleza', 'bebida']);
const NO_AN_TH = new Set(['หนังสือ', 'สมุด', 'อัลบั้ม', 'เกวียน']);
const anOk = (th: string, clf: string, cat?: Category) => clf !== AN && !NO_AN_CLF.has(clf) && !NO_AN_TH.has(th) && !(cat && NO_AN_CAT.has(cat));
type Item = { key: string; thing: Thing; n: number; level: number; gold: boolean; retry: boolean };

const firstEs = (es: string) => es.split(/[;,(]/)[0].trim();

/** Plural español de lo que se cuenta: gato → gatos, pez → peces, camión → camiones, goma de borrar → gomas de borrar,
 *  hermana pequeña → hermanas pequeñas (el adjetivo que va detrás también concuerda). */
function pluralWord(f: string): string {
  const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/[aeiouáéó]$/.test(f)) return `${f}s`;
  if (/[íú]$/.test(f)) return `${f}es`;
  if (/z$/.test(f)) return `${f.slice(0, -1)}ces`;
  if (/[sx]$/.test(f)) return /[áéíóú][sx]$/.test(f) ? `${f.slice(0, -2)}${plain(f.slice(-2, -1))}${f.slice(-1)}es` : f;
  // préstamos acabados en consonante rara (songthaew, tuk-tuk, wok): solo una -s
  if (/(ng|[kptbgmwhcf])$/.test(f)) return `${f}s`;
  return /[áéíóú][nrlsdj]?$/.test(f.slice(-2)) ? `${f.replace(/([áéíóú])([nrlsdj]?)$/, (_, v: string, c: string) => plain(v) + c)}es` : `${f}es`;
}
function plural(es: string): string {
  const [f, ...rest] = es.split(' ');
  const adjective = rest.length === 1 && !/^(de|del|con|para|a|al|en|sin|y|o)$/.test(rest[0]);
  return [pluralWord(f), ...(adjective ? [pluralWord(rest[0])] : rest)].join(' ');
}
const NUM_ES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco'];

/** Cosas para contar: solo las presentadas, y solo con clasificadores que ya se han enseñado como tales. */
function collect(words: Word[], focus: Word[], taught: Map<string, Word>): Thing[] {
  const known = knownForms([...words, ...focus]);
  const map = new Map<string, Thing>();
  for (const it of classifierItemsFor(known)) {
    if (!taught.has(it.clf)) continue;
    const w = WORD_BY_TH.get(it.th);
    map.set(it.th, { th: it.th, rom: it.rom, es: it.es, emoji: it.emoji ?? '📦', clf: it.clf, alts: [], id: w?.id, learned: true, soft: anOk(it.th, it.clf, w?.cat) });
  }
  const learned = new Set([...words, ...focus].map((w) => w.id));
  for (const w of [...focus, ...words]) {
    if (!w.clf || !w.emoji || !CLF_BY[w.clf] || w.clf === w.th || !taught.has(w.clf)) continue;
    const have = map.get(w.th);
    if (have) {
      if (have.clf !== w.clf && !have.alts.includes(w.clf)) have.alts.push(w.clf);
      have.learned = true;
      have.id = w.id;
      continue;
    }
    const es = firstEs(w.es);
    if (es.length > 18) continue;
    map.set(w.th, { th: w.th, rom: w.rom, es, emoji: w.emoji, clf: w.clf, alts: [], id: w.id, learned: learned.has(w.id), soft: anOk(w.th, w.clf, w.cat) });
  }
  return [...map.values()];
}

/** Cestas de cada nivel: empiezan por clasificadores con cosas aprendidas y en cada nivel se abre una más. */
function basketSets(things: Thing[], first: string[], start: number, levels: number): Clf[][] {
  const count = (c: string) => things.filter((t) => t.clf === c).length;
  const order = [...new Set([...first, ...shuffle(CLFS.filter((c) => c.core && count(c.clf) >= 2).map((c) => c.clf)), ...shuffle(CLFS.filter((c) => !c.core && count(c.clf) >= 2).map((c) => c.clf))])].filter((c) => count(c) >= 1);
  return Array.from({ length: levels }, (_, i) => order.slice(0, Math.min(order.length, start + i)).map((c) => CLF_BY[c]));
}

function makeGame(mode: GameProps['mode'], words: Word[], focus: Word[], n: number) {
  const taught = taughtClassifiers([...focus, ...words]);
  const things = collect(words, focus, taught);
  const focusTh = new Set(focus.map((w) => w.th));
  const focusClfs = [...new Set(things.filter((t) => focusTh.has(t.th)).map((t) => t.clf))];
  const learnedClfs = shuffle([...new Set(things.filter((t) => t.learned).map((t) => t.clf))]);
  const nLevels = mode === 'feria' ? 4 : 1;
  const sets = basketSets(things, [...focusClfs, ...learnedClfs.slice(0, 1)], mode === 'feria' ? 3 : 4, nLevels);
  const perLevel = mode === 'feria' ? [Math.ceil(n * 0.28), Math.ceil(n * 0.28), Math.ceil(n * 0.22), n] : [n];
  const items: Item[] = [];
  let prev = '';
  for (let lv = 0; lv < nLevels && items.length < n; lv++) {
    const set = new Set(sets[lv].map((c) => c.clf));
    const fresh = lv > 0 ? sets[lv].find((c) => !sets[lv - 1].some((x) => x.clf === c.clf))?.clf : undefined;
    const pool = things.filter((t) => set.has(t.clf));
    const want = Math.min(perLevel[lv], n - items.length);
    const ordered: Thing[] = [];
    // primero lo nuevo de la lección y la cesta que se acaba de abrir
    for (const t of shuffle(pool.filter((t) => focusTh.has(t.th) || t.clf === fresh))) if (!ordered.includes(t)) ordered.push(t);
    for (const t of shuffle(pool.filter((t) => t.learned))) if (!ordered.includes(t)) ordered.push(t);
    for (const t of shuffle(pool)) if (!ordered.includes(t)) ordered.push(t);
    if (fresh) {
      const k = ordered.findIndex((t) => t.clf === fresh);
      if (k > 0) ordered.unshift(...ordered.splice(k, 1));
    }
    const goldAt = mode === 'feria' && lv > 0 ? 1 + Math.floor(Math.random() * Math.max(1, want - 1)) : -1;
    for (let j = 0, c = 0; j < want && ordered.length; c++) {
      const t = ordered[c % ordered.length];
      if (t.th === prev && ordered.length > 1) continue;
      prev = t.th;
      const top = mode === 'feria' && lv === 0 ? 3 : 5;
      items.push({ key: `i${items.length}`, thing: t, n: 2 + Math.floor(Math.random() * (top - 1)), level: lv + 1, gold: j === goldAt, retry: false });
      j++;
    }
  }
  return { items, sets, taught };
}

const phraseOf = (it: Item) => `${it.thing.th} ${thaiNumber(it.n)} ${it.thing.clf}`;
const romOf = (it: Item) => `${it.thing.rom} ${thaiNumberRom(it.n)} ${CLF_BY[it.thing.clf]?.rom ?? ''}`;
const esOf = (it: Item) => `${NUM_ES[it.n]} ${plural(it.thing.es)}`;

// ——— Juego ———

/** `enter`: la bandeja aún no está en la cinta (empieza la partida, sube el nivel): las cestas no aceptan nada. */
type Phase = 'intro' | 'enter' | 'play' | 'fly';
type Geo = { beltY: number; xStart: number; xMid: number; xEnd: number; rootX: number; rootY: number; w: number };
const BELT_MS = [0, 7600, 6200, 5200, 4400];
type Clock = { start: number; ms: number };
/** Reloj de la cinta (se lee en manejadores; la cinta animada es solo para verla). */
const clockFrom = (delay: number, ms: number): Clock => ({ start: Date.now() + delay, ms });
const left = (c: Clock) => clamp(1 - (Date.now() - c.start) / c.ms, 0, 1);
const DUMMY: Item = { key: 'vacio', thing: { th: '', rom: '', es: '', emoji: '', clf: 'ตัว', alts: [], learned: false, soft: false }, n: 2, level: 1, gold: false, retry: false };
const TRAY_W = 124;
const TRAY_H = 104;

export default function Cestas({ mode, words, focus, rounds, reads, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const reduced = useReducedMotion();
  const win = useWindowDimensions();
  const [setup] = useState(() => makeGame(mode, words, focus, rounds ?? (feria ? 14 : 5)));
  const [items, setItems] = useState(setup.items);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>(feria ? 'intro' : 'enter');
  const [points, setPoints] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [bumps, setBumps] = useState<Record<string, number>>({});
  const [bad, setBad] = useState<string | null>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const [answered, setAnswered] = useState<null | { ok: boolean; clf: string; soft?: boolean }>(null);
  const [pose, setPose] = useState<NoiPose>('feliz');
  const [jump, setJump] = useState(0);
  const rootRef = useRef<ViewRef>(null);
  const beltRef = useRef<ViewRef>(null);
  const basketRefs = useRef<Record<string, ComponentRef<typeof View> | null>>({});
  const api = useRef({ start: (_: number) => {}, miss: () => {}, next: () => {}, begin: () => {} });
  const [onCountdown] = useState(() => () => api.current.begin());
  const game = useRef({
    points: 0,
    finished: false,
    token: 0,
    geo: null as Geo | null,
    clock: { start: 0, ms: 1 },
    drag: { x0: 0, y0: 0, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, moved: false, active: false },
    retries: 0,
    started: -1,
  });

  const ix = useSharedValue(-400);
  const iy = useSharedValue(0);
  const isc = useSharedValue(1);
  const irot = useSharedValue(0);
  const iop = useSharedValue(1);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const stripes = useSharedValue(0);

  const item = items[i] ?? DUMMY;
  const baskets = items.length ? (setup.sets[item.level - 1] ?? []) : [];
  const level = item.level;

  const itemStyle = useAnimatedStyle(() => ({
    opacity: iop.value,
    transform: [{ translateX: ix.value + dx.value - TRAY_W / 2 }, { translateY: iy.value + dy.value - TRAY_H / 2 }, { rotate: `${irot.value}deg` }, { scale: isc.value }],
  }));
  const stripeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -stripes.value * 28 }] }));

  useEffect(() => {
    if (!feria || reduced) return;
    stripes.value = withRepeat(withTiming(1, { duration: 520, easing: Easing.linear }), -1, false);
  }, [feria, reduced, stripes]);

  // sin cosas que contar no hay juego
  useEffect(() => {
    const g = game.current;
    if (!items.length && !g.finished) {
      g.finished = true;
      onDone(score.result(0));
    }
  });


  const measureGeo = async (): Promise<Geo | null> => {
    const [root, belt] = await Promise.all([measureBox(rootRef), measureBox(beltRef)]);
    if (!root || !belt || !root.w) {
      // sin medidas (la pantalla aún no se ha pintado): una cinta aproximada, para que la partida nunca se quede parada
      game.current.geo ??= { rootX: 0, rootY: 0, w: win.width, beltY: 230, xStart: win.width - TRAY_W / 2 - 14, xMid: win.width / 2, xEnd: TRAY_W / 2 + 14 };
      return game.current.geo;
    }
    const g: Geo = {
      rootX: root.x,
      rootY: root.y,
      w: root.w,
      // la bandeja apoyada en la cinta (la cinta está abajo de su caja)
      beltY: belt.y - root.y + belt.h - 80,
      xStart: root.w - TRAY_W / 2 - 14,
      xMid: root.w / 2,
      xEnd: TRAY_W / 2 + 14,
    };
    game.current.geo = g;
    return g;
  };

  /** Una bandeja nueva entra en la cinta. */
  const startItem = (idx: number) => {
    const it = items[idx];
    if (!it) return;
    const g = game.current;
    if (g.started === idx) return;
    g.started = idx;
    g.token += 1;
    const token = g.token;
    measureGeo().then((geo) => {
      if (!geo || token !== game.current.token) return;
      dx.set(0);
      dy.set(0);
      isc.set(1);
      irot.set(0);
      iop.set(1);
      iy.set(geo.beltY);
      ix.set(geo.w + TRAY_W);
      // ahora sí hay bandeja: las cestas empiezan a aceptar
      setPhase('play');
      if (!feria) {
        ix.set(withSpring(geo.xMid, { damping: 14, stiffness: 120 }));
        irot.set(withSequence(withTiming(-14, { duration: 260 }), withSpring(0, { damping: 8, stiffness: 180 })));
        return;
      }
      const ms = BELT_MS[it.level] ?? 5000;
      game.current.clock = clockFrom(260, ms);
      ix.set(withSequence(withTiming(geo.xStart, { duration: 260, easing: Easing.out(Easing.quad) }), withTiming(geo.xEnd, { duration: ms, easing: Easing.linear })));
      later(() => {
        if (token === game.current.token) api.current.miss();
      }, ms + 300);
    });
  };

  const begin = () => {
    setPhase('enter');
    startItem(0);
  };

  const clfInfo = CLF_BY[item.thing.clf];
  const okFor = (c: string) => c === item.thing.clf || item.thing.alts.includes(c);
  /** Lo que se practica aquí es el clasificador: al repaso va su palabra, no la de la cosa. */
  const clfId = (c: string) => setup.taught.get(c)?.id;

  // ——— Resolver ———

  const remaining = () => (feria ? left(game.current.clock) : 0);

  const flyTo = (clf: string, done: (mouth: Point) => void) => {
    const ref = { current: basketRefs.current[clf] ?? null };
    Promise.all([measureBox(rootRef), measureBox(ref)]).then(([root, b]) => {
      if (!root || !b) {
        // sin medidas no hay vuelo, pero la respuesta se resuelve igual
        const geo = game.current.geo;
        later(() => done({ x: (geo?.rootX ?? 0) + (geo?.xMid ?? win.width / 2), y: (geo?.rootY ?? 0) + (geo?.beltY ?? 230) + 150 }), 80);
        return;
      }
      const mouth = { x: b.x - root.x + b.w / 2, y: b.y - root.y + b.w * 0.2 };
      // la bandeja sale de donde esté ahora (en la cinta, en la mano o rebotando)
      cancelAnimation(ix);
      cancelAnimation(iy);
      const start = { x: ix.get() + dx.get(), y: iy.get() + dy.get() };
      ix.set(start.x);
      iy.set(start.y);
      dx.set(0);
      dy.set(0);
      const up = Math.min(start.y, mouth.y) - 70;
      ix.set(withTiming(mouth.x, { duration: 440, easing: Easing.out(Easing.quad) }));
      iy.set(withSequence(withTiming(up, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(mouth.y, { duration: 240, easing: Easing.in(Easing.quad) })));
      isc.set(withTiming(0.42, { duration: 440 }));
      irot.set(withTiming((mouth.x > start.x ? 1 : -1) * 200, { duration: 440 }));
      later(() => done({ x: mouth.x + root.x, y: mouth.y + root.y }), 450);
    });
  };

  const land = (clf: string, at: Point, reward: boolean) => {
    setBumps((b) => ({ ...b, [clf]: (b[clf] ?? 0) + 1 }));
    setCounts((c) => ({ ...c, [clf]: (c[clf] ?? 0) + 1 }));
    iop.set(withTiming(0, { duration: 120 }));
    if (reward) {
      juice.burst({ x: at.x, y: at.y - 6 }, 'monedas', 14, 120);
      fx.coin();
    } else {
      juice.ring(at, color.arrozalVivo, 80);
      fx.pop();
    }
  };

  const answer = (clf: string) => {
    if (phase !== 'play') return;
    const g = game.current;
    g.token += 1;
    g.drag.active = false;
    setPhase('fly');
    const ok = okFor(clf);
    const rem = remaining();
    if (!ok && clf === AN && item.thing.soft) {
      // el comodín: vale, pero hay uno mejor. Ni fallo ni acierto (el repaso no se entera) y vuelve más tarde.
      flyTo(clf, (at) => {
        land(clf, at, false);
        juice.float({ x: at.x, y: at.y - 30 }, `${AN} vale… ¡mejor ${item.thing.clf}!`, color.buatong, 22);
        if (feria) {
          g.points += 5;
          setPoints(g.points);
        }
        setGlow(item.thing.clf);
        setPose('feliz');
        setJump((j) => j + 1);
        setAnswered({ ok: true, clf, soft: true });
        say(phraseOf(item));
        if (feria) later(() => api.current.next(), 1900);
      });
      requeue();
      return;
    }
    onAnswer(ok, clfId(ok ? clf : item.thing.clf));
    if (ok) {
      flyTo(clf, (at) => {
        const combo = score.hit(true);
        const mult = Math.min(4, 1 + Math.floor(combo / 4)) * (item.gold ? 3 : 1);
        const pts = (10 + Math.round(rem * 10)) * mult;
        g.points += pts;
        setPoints(g.points);
        land(clf, at, true);
        juice.float({ x: at.x, y: at.y - 30 }, feria ? `+${pts}` : clf, color.buatong, 26);
        if (item.gold) juice.burst(at, 'estrellas', 16, 140);
        setPose('celebra');
        setJump((j) => j + 1);
        setAnswered({ ok: true, clf });
        say(phraseOf(item));
        if (combo === 5 || combo === 10) {
          juice.banner(`¡Racha ×${combo}!`, 'Puntos multiplicados', color.farol);
          fx.sparkle();
        }
        later(() => api.current.next(), 1150);
      });
      return;
    }
    // cesta equivocada: rebota en el borde y se va a la buena
    flyTo(clf, (at) => {
      score.hit(false);
      setBad(clf);
      juice.shake(6);
      juice.float({ x: at.x, y: at.y - 24 }, '¡Esa no!', '#FFB4A8', 22);
      setPose('ups');
      isc.set(withTiming(0.7, { duration: 200 }));
      iy.set(withTiming(at.y - (game.current.geo?.rootY ?? 0) - 90, { duration: 260, easing: Easing.out(Easing.quad) }));
      setGlow(item.thing.clf);
      later(() => {
        flyTo(item.thing.clf, (at2) => {
          land(item.thing.clf, at2, false);
          setAnswered({ ok: false, clf });
          say(phraseOf(item));
          if (feria) later(() => api.current.next(), 1700);
        });
      }, 420);
      requeue();
    });
  };

  const miss = () => {
    const g = game.current;
    g.token += 1;
    // si la tenías en la mano, se te cae igual: la cinta no espera
    g.drag.active = false;
    setPhase('fly');
    // que se acabe el tiempo no demuestra que no se sepa el clasificador: cuenta en la partida, no en el repaso
    score.hit(false);
    fx.boom();
    isc.set(withSpring(1, { damping: 12, stiffness: 260 }));
    iy.set(withTiming(iy.get() + 140, { duration: 520, easing: Easing.in(Easing.quad) }));
    irot.set(withTiming(-110, { duration: 520 }));
    iop.set(withDelay(300, withTiming(0, { duration: 220 })));
    juice.float(undefined, '¡Se cayó de la cinta!', '#FFB4A8', 24);
    setGlow(item.thing.clf);
    setPose('ups');
    later(() => {
      setAnswered({ ok: false, clf: '' });
      say(phraseOf(item));
    }, 500);
    requeue();
    later(() => api.current.next(), 2100);
  };

  /** Lo que se falla vuelve: en la feria unas bandejas después; en la lección, una vez al final. */
  const requeue = () => {
    const g = game.current;
    if (g.retries >= (feria ? 3 : 1)) return;
    g.retries += 1;
    const again: Item = { ...item, key: `x${item.key}`, retry: true, gold: false, n: randInt(2, 4) };
    if (!feria) {
      setItems((list) => [...list, again]);
      return;
    }
    const target = items.findIndex((x, k) => k >= i + 3 && !x.retry && !x.gold && setup.sets[x.level - 1].some((c) => c.clf === item.thing.clf));
    if (target > 0) setItems((list) => list.map((x, k) => (k === target ? { ...again, level: x.level } : x)));
  };

  const next = () => {
    if (i + 1 >= items.length) {
      finish();
      return;
    }
    const nx = items[i + 1];
    setI(i + 1);
    setAnswered(null);
    setBad(null);
    setGlow(null);
    setPose('feliz');
    setPhase('enter');
    const up = feria && nx.level > item.level;
    const delay = up ? 1500 : 0;
    if (up) {
      const fresh = setup.sets[nx.level - 1].find((c) => !setup.sets[item.level - 1].some((x) => x.clf === c.clf));
      const sub = nx.level === 2 ? `${fresh ? `Cesta nueva: ${fresh.clf}. ` : ''}Ya sin dibujos: ¡a leer!` : fresh ? `Cesta nueva: ${fresh.clf} · ${fresh.es}` : 'La cinta va más rápido';
      juice.banner(`¡Nivel ${nx.level}!`, sub, color.farol);
      fx.levelup();
    } else if (nx.gold) {
      juice.banner('¡Bandeja de oro!', 'Puntos ×3', color.buatongHondo);
      fx.sparkle();
    }
    iop.set(0);
    if (delay) later(() => api.current.start(i + 1), delay);
    else startItem(i + 1);
  };

  const finish = () => {
    const g = game.current;
    if (g.finished) return;
    g.finished = true;
    if (!feria) {
      onDone(score.result(g.points));
      return;
    }
    juice.banner('¡Puesto cerrado!', `${g.points} puntos`, color.buatong);
    juice.burst(undefined, 'monedas', 30, 190);
    fx.fanfare();
    later(() => onDone(score.result(g.points)), 1400);
  };

  // ——— Arrastrar y lanzar la bandeja ———

  const grab = (e: GestureResponderEvent) => {
    if (phase !== 'play') return;
    const d = game.current.drag;
    const { pageX, pageY, timestamp } = e.nativeEvent;
    Object.assign(d, { x0: pageX, y0: pageY, lx: pageX, ly: pageY, lt: timestamp, vx: 0, vy: 0, moved: false, active: true });
    // la bandeja sigue al dedo, pero el reloj de la cinta no se para: si se acaba el tiempo, se cae de la mano
    cancelAnimation(ix);
    isc.set(withSpring(1.08, { damping: 12, stiffness: 260 }));
  };
  const move = (e: GestureResponderEvent) => {
    const d = game.current.drag;
    if (!d.active) return;
    const { pageX, pageY, timestamp } = e.nativeEvent;
    const dt = Math.max(1, timestamp - d.lt);
    d.vx = d.vx * 0.4 + ((pageX - d.lx) / dt) * 0.6;
    d.vy = d.vy * 0.4 + ((pageY - d.ly) / dt) * 0.6;
    d.lx = pageX;
    d.ly = pageY;
    d.lt = timestamp;
    if (Math.abs(pageX - d.x0) + Math.abs(pageY - d.y0) > 10) d.moved = true;
    dx.set(pageX - d.x0);
    dy.set(pageY - d.y0);
  };
  const release = () => {
    const d = game.current.drag;
    if (!d.active) return;
    d.active = false;
    isc.set(withSpring(1, { damping: 12, stiffness: 260 }));
    if (!d.moved) {
      say(item.thing.th);
      resume();
      return;
    }
    const keys = baskets.map((c) => c.clf);
    Promise.all(keys.map((k) => measureBox({ current: basketRefs.current[k] ?? null }))).then((boxes) => {
      // hacia dónde va el lanzamiento: si va hacia abajo, se proyecta hasta la fila de cestas
      let px = d.lx;
      let py = d.ly;
      const rows = boxes.filter((b): b is Box => !!b).map((b) => b.y + b.h * 0.4);
      const rowY = rows.length ? Math.min(...rows) : py;
      if (d.vy > 0.25 && py < rowY) {
        const t = (rowY - py) / d.vy;
        px += d.vx * t;
        py = rowY;
      }
      let best = -1;
      let bestD = Infinity;
      boxes.forEach((b, k) => {
        if (!b) return;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h * 0.45;
        const dist = Math.hypot((px - cx) * 1.2, py - cy);
        if (dist < bestD) {
          bestD = dist;
          best = k;
        }
      });
      if (best >= 0 && bestD < 150) answer(keys[best]);
      else {
        dx.set(withSpring(0, { damping: 14, stiffness: 160 }));
        dy.set(withSpring(0, { damping: 14, stiffness: 160 }));
        resume();
      }
    });
  };
  /** La bandeja vuelve a la cinta (feria) y llega al final justo cuando se acaba su tiempo, que no se ha parado. */
  const resume = () => {
    const g = game.current;
    if (!feria || phase !== 'play' || !g.geo) return;
    ix.set(withTiming(g.geo.xEnd, { duration: Math.max(1, left(g.clock) * g.clock.ms), easing: Easing.linear }));
  };

  const cols = baskets.length <= 4 ? 2 : 3;
  // los temporizadores y la cuenta atrás llaman siempre a la versión más reciente de cada acción
  useEffect(() => {
    api.current = { start: startItem, miss, next, begin };
  });
  // la primera bandeja de la lección entra en cuanto se sabe dónde está la cinta
  useEffect(() => {
    if (feria || !items.length) return;
    const t = setTimeout(() => {
      if (game.current.started < 0) api.current.start(0);
    }, 350);
    return () => clearTimeout(t);
  }, [feria, items.length]);
  // Pistas del primer nivel (y de la lección): qué cuenta cada cesta, en español y con dibujos. Desde el nivel 2
  // de la feria solo queda el clasificador escrito: hay que leerlo.
  const showHint = !feria || level <= 1;
  // Transcripción: siempre mientras no se sabe leer; después, solo en el primer nivel y en la primera pasada.
  const showRom = !reads || (feria ? level <= 1 : !item.retry);
  const wrongText = answered?.soft
    ? `${AN} vale para salir del paso, pero ${item.thing.th} se cuenta con ${item.thing.clf}: ${clfInfo?.es ?? ''}`
    : answered && !answered.ok
      ? `${item.thing.th} se cuenta con ${item.thing.clf}: ${clfInfo?.es ?? ''}`
      : null;

  if (!items.length) return <View style={{ flex: 1 }} />;

  return (
    <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
      <Backdrop scene="mercado" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <GameHud label="CESTA" i={i + 1} n={items.length} points={feria ? points : undefined} combo={score.combo} dark />

        {/* el pedido: la frase con el hueco del clasificador */}
        <View style={styles.orderRow}>
          <View style={styles.order}>
            <Text style={styles.orderLabel}>{item.gold ? 'PEDIDO DE ORO ×3' : 'CUENTA EN THAI'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6 }}>
              <Th size={26} bold style={{ color: '#3A2410' }}>
                {`${item.thing.th} ${thaiNumber(item.n)}`}
              </Th>
              <View style={[styles.slot, answered ? (answered.soft ? styles.slotSoft : answered.ok ? styles.slotOk : styles.slotBad) : null]}>
                {answered ? (
                  <Pop trigger={answered}>
                    <Th size={24} bold style={{ color: answered.soft ? color.buatongHondo : answered.ok ? color.arrozalHondo : color.lacaHondo }}>
                      {item.thing.clf}
                    </Th>
                  </Pop>
                ) : (
                  <Text style={styles.slotQ}>?</Text>
                )}
              </View>
            </View>
            {answered || showRom ? <Rom rom={answered ? romOf(item) : `${item.thing.rom} ${thaiNumberRom(item.n)} …`} size={13} /> : null}
            <Text style={styles.orderEs}>{esOf(item)}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 2, marginTop: 8 }}>
            <Noi pose={pose} size={62} jump={jump} />
            <SpeakBtn size={34} onPress={() => say(answered ? phraseOf(item) : `${item.thing.th} ${thaiNumber(item.n)}`)} />
          </View>
        </View>

        {/* la cinta */}
        <View ref={beltRef} collapsable={false} style={styles.beltArea}>
          <Belt stripeStyle={stripeStyle} />
          {wrongText && (!feria || answered?.soft) ? (
            <Animated.View entering={FadeInDown.springify().damping(14)} style={[styles.explain, answered?.soft ? styles.explainSoft : null]}>
              <Text style={[styles.explainText, answered?.soft ? { color: '#5A3A00' } : null]}>{wrongText}</Text>
              {feria ? null : <Btn label="Siguiente" height={40} style={{ width: 120 }} onPress={next} />}
            </Animated.View>
          ) : null}
        </View>

        {/* las cestas, sobre el mostrador de madera del puesto */}
        <View style={[styles.baskets, { paddingHorizontal: cols === 2 ? 34 : 14 }]}>
          <Counter />
          {baskets.map((c) => (
            <View key={c.clf} style={{ width: cols === 2 ? '46%' : '31%' }}>
              <Basket
                info={c}
                icons={showHint ? c.icons.filter((e) => e !== item.thing.emoji).slice(0, 2).join('') : ''}
                rom={showRom}
                count={counts[c.clf] ?? 0}
                bump={bumps[c.clf] ?? 0}
                bad={bad === c.clf}
                glow={glow === c.clf}
                showHint={showHint}
                disabled={phase !== 'play'}
                onPress={() => answer(c.clf)}
                setRef={(v) => {
                  basketRefs.current[c.clf] = v;
                }}
              />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* la bandeja (encima de todo: se puede lanzar) */}
      <Animated.View
        style={[styles.item, itemStyle]}
        onStartShouldSetResponder={() => phase === 'play'}
        onMoveShouldSetResponder={() => phase === 'play'}
        onResponderTerminationRequest={() => false}
        onResponderGrant={grab}
        onResponderMove={move}
        onResponderRelease={release}
        onResponderTerminate={release}>
        <Tray item={item} />
      </Animated.View>

      {phase === 'intro' ? <Countdown onDone={onCountdown} dark /> : null}
      {juice.layer}
    </View>
  );
}

// ——— Piezas ———

/** Mostrador de teca del puesto, con su tela de cuadros (pha khao ma). */
function Counter() {
  const u = `ct${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={styles.counter}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7A4A24" />
            <Stop offset="0.25" stopColor="#5C3418" />
            <Stop offset="1" stopColor="#2E180A" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u}w)`} />
        {[0.18, 0.38, 0.58, 0.78].map((y) => (
          <Rect key={y} x="0" y={`${y * 100}%`} width="100%" height={1.5} fill="#2A1406" opacity={0.6} />
        ))}
      </Svg>
      <View style={styles.counterEdge} />
      <View style={styles.cloth}>
        {Array.from({ length: 16 }, (_, k) => (
          <View key={k} style={[styles.check, { backgroundColor: k % 2 ? '#2B5FD9' : '#E8473F' }]} />
        ))}
      </View>
    </View>
  );
}

/** Cinta de madera con rodillos; las rayas corren en la feria. */
function Belt({ stripeStyle }: { stripeStyle: ReturnType<typeof useAnimatedStyle> }) {
  const u = `bt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={styles.belt}>
      <View style={styles.beltBody}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <LinearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#8A5A30" />
              <Stop offset="0.5" stopColor="#6B4322" />
              <Stop offset="1" stopColor="#4A2C14" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${u}b)`} />
        </Svg>
        <Animated.View style={[styles.stripes, stripeStyle]}>
          {Array.from({ length: 24 }, (_, k) => (
            <View key={k} style={styles.stripe} />
          ))}
        </Animated.View>
        <View style={styles.beltShine} />
      </View>
      <View style={[styles.roller, { left: -4 }]} />
      <View style={[styles.roller, { right: -4 }]} />
      <View style={styles.legs}>
        {[0, 1, 2, 3].map((k) => (
          <View key={k} style={styles.leg} />
        ))}
      </View>
    </View>
  );
}

const SPOTS: Record<number, [number, number][]> = {
  2: [[-17, 2], [17, 2]],
  3: [[-22, 6], [22, 6], [0, -12]],
  4: [[-20, 8], [20, 8], [-12, -12], [14, -12]],
  5: [[-26, 8], [0, 10], [26, 8], [-13, -12], [13, -12]],
};

/** Bandeja de bambú tejida (กระด้ง) con las cosas y su etiqueta. */
function Tray({ item }: { item: Item }) {
  const u = `tr${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const gold = item.gold;
  const spots = SPOTS[item.n] ?? SPOTS[3];
  return (
    <View style={{ width: TRAY_W, height: TRAY_H }}>
      {gold ? <Glow size={170} tint={color.buatong} strength={0.85} style={{ position: 'absolute', left: TRAY_W / 2 - 85, top: TRAY_H / 2 - 85 }} /> : null}
      <Svg width={TRAY_W} height={TRAY_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${u}t`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gold ? '#FFE680' : '#E8C27A'} />
            <Stop offset="1" stopColor={gold ? '#D99A00' : '#A8742F'} />
          </LinearGradient>
        </Defs>
        <Ellipse cx={TRAY_W / 2} cy={TRAY_H - 12} rx={56} ry={9} fill="#000000" opacity={0.28} />
        <Ellipse cx={TRAY_W / 2} cy={TRAY_H - 26} rx={56} ry={17} fill={`url(#${u}t)`} stroke={gold ? '#B07800' : '#7A5420'} strokeWidth={2.5} />
        <Ellipse cx={TRAY_W / 2} cy={TRAY_H - 27} rx={44} ry={11} fill="none" stroke={gold ? '#FFF2B0' : '#F6DFA8'} strokeWidth={1.4} opacity={0.8} />
        {[-36, -18, 0, 18, 36].map((x) => (
          <Path key={x} d={`M${TRAY_W / 2 + x} ${TRAY_H - 41} q3 15 0 30`} stroke={gold ? '#C08300' : '#8A6024'} strokeWidth={1.2} opacity={0.6} fill="none" />
        ))}
      </Svg>
      {spots.map(([x, y], k) => (
        <Text key={k} style={[styles.thing, { left: TRAY_W / 2 + x - 17, top: TRAY_H - 66 + y }]}>
          {item.thing.emoji}
        </Text>
      ))}
      <View style={[styles.tag, gold ? { backgroundColor: '#FFF2B0' } : null]}>
        <Th size={15} bold style={{ color: '#3A2410' }} numberOfLines={1}>
          {item.thing.th}
        </Th>
      </View>
    </View>
  );
}

function Basket({ info, icons, rom, count, bump, bad, glow, showHint, disabled, onPress, setRef }: { info: Clf; icons: string; rom: boolean; count: number; bump: number; bad: boolean; glow: boolean; showHint: boolean; disabled: boolean; onPress: () => void; setRef: (v: ComponentRef<typeof View> | null) => void }) {
  const u = `bk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sy = useSharedValue(1);
  const rot = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    sy.value = withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, { damping: 5, stiffness: 260 }));
  }, [bump, sy]);
  useEffect(() => {
    if (bad) rot.value = withSequence(withTiming(-10, { duration: 70 }), withTiming(9, { duration: 90 }), withTiming(-6, { duration: 80 }), withTiming(3, { duration: 80 }), withTiming(0, { duration: 70 }));
  }, [bad, rot]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }, { scaleY: sy.value }, { scaleX: 2 - sy.value }] }));
  const W = 100;
  const H = 74;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cesta ${info.clf}: ${info.es}`} disabled={disabled} onPress={onPress} style={{ alignItems: 'center' }}>
      <View ref={setRef} collapsable={false} style={{ width: '100%', alignItems: 'center' }}>
        {glow ? <Glow size={170} tint={color.arrozalVivo} strength={0.75} style={{ position: 'absolute', top: -40, alignSelf: 'center' }} /> : null}
        <Animated.View style={[{ width: '100%', aspectRatio: W / H, transformOrigin: '50% 100%' }, st]}>
          {/* lo que asoma por la boca de la cesta (solo como pista, y nunca lo mismo que hay en la bandeja) */}
          {icons ? (
            <Text style={styles.peek} numberOfLines={1}>
              {icons}
            </Text>
          ) : null}
          <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#EDC27A" />
                <Stop offset="1" stopColor="#A06A2A" />
              </LinearGradient>
              <LinearGradient id={`${u}r`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F7D99A" />
                <Stop offset="1" stopColor="#B5823A" />
              </LinearGradient>
            </Defs>
            <Ellipse cx={50} cy={70} rx={40} ry={4} fill="#000000" opacity={0.35} />
            <Path d="M7 22 L93 22 L84 66 Q50 74 16 66 Z" fill={`url(#${u}b)`} />
            {[33, 44, 55].map((y) => (
              <Path key={y} d={`M${8 + (y - 22) * 0.2} ${y} Q50 ${y + 5} ${92 - (y - 22) * 0.2} ${y}`} stroke="#8A5820" strokeWidth={1.6} fill="none" opacity={0.7} />
            ))}
            {[20, 35, 50, 65, 80].map((x) => (
              <Path key={x} d={`M${x} 24 L${50 + (x - 50) * 0.8} 69`} stroke="#8A5820" strokeWidth={1.2} opacity={0.45} />
            ))}
            <Ellipse cx={50} cy={22} rx={45} ry={7} fill="none" stroke={`url(#${u}r)`} strokeWidth={6} />
            <Path d="M14 19 Q50 12 86 19" stroke="#FFF1C8" strokeWidth={1.4} fill="none" opacity={0.8} />
          </Svg>
          <View style={styles.label}>
            <Th size={22} bold style={{ color: '#3A2410', lineHeight: 28 }}>
              {info.clf}
            </Th>
          </View>
          {count ? (
            <Pop trigger={count} style={styles.count}>
              <Text style={styles.countText}>{count}</Text>
            </Pop>
          ) : null}
        </Animated.View>
      </View>
      {rom ? <Rom rom={info.rom} size={12} mono="#FFE3B8" style={styles.basketRom} /> : null}
      {showHint ? (
        <Text style={styles.basketHint} numberOfLines={2}>
          {info.es}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, marginTop: 2 },
  order: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFF4DE',
    borderWidth: 2,
    borderColor: '#E8B865',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  orderLabel: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1.1, color: '#B5651D' },
  orderEs: { fontFamily: font.uiBold, fontSize: 14, color: '#5A3A1A' },
  slot: { minWidth: 52, height: 38, paddingHorizontal: 6, borderRadius: 10, borderWidth: 2.5, borderStyle: 'dashed', borderColor: '#D9A54A', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,90,0.25)' },
  slotOk: { borderStyle: 'solid', borderColor: color.arrozalVivo, backgroundColor: color.arrozalSuave },
  slotBad: { borderStyle: 'solid', borderColor: color.laca, backgroundColor: color.lacaSuave },
  slotSoft: { borderStyle: 'solid', borderColor: color.buatong, backgroundColor: '#FFF2C2' },
  slotQ: { fontFamily: font.displayBold, fontSize: 22, color: '#C98F00' },
  beltArea: { height: 150, justifyContent: 'flex-end', paddingBottom: 18 },
  belt: { marginHorizontal: 6, height: 40 },
  beltBody: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#3A2210' },
  stripes: { position: 'absolute', left: 0, top: 4, bottom: 4, flexDirection: 'row', width: 24 * 28 },
  stripe: { width: 14, marginRight: 14, height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,220,160,0.16)' },
  beltShine: { position: 'absolute', left: 12, right: 12, top: 4, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,236,200,0.35)' },
  roller: { position: 'absolute', top: -3, width: 46, height: 46, borderRadius: 23, backgroundColor: '#5A3A1E', borderWidth: 4, borderColor: '#C9A06A' },
  legs: { position: 'absolute', left: 30, right: 30, top: 38, flexDirection: 'row', justifyContent: 'space-between' },
  leg: { width: 8, height: 16, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: '#3A2210' },
  explain: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,244,222,0.97)',
    borderWidth: 2,
    borderColor: color.laca,
  },
  explainSoft: { borderColor: color.buatong, backgroundColor: 'rgba(255,248,214,0.97)' },
  explainText: { flex: 1, fontFamily: font.uiBold, fontSize: 14, lineHeight: 18, color: '#5A1A1A' },
  baskets: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', columnGap: 10, rowGap: 6, paddingTop: 4 },
  counter: { position: 'absolute', left: 0, right: 0, top: 44, bottom: -60, borderTopLeftRadius: 10, borderTopRightRadius: 10, overflow: 'hidden' },
  counterEdge: { position: 'absolute', left: 0, right: 0, top: 0, height: 5, backgroundColor: '#B07A45' },
  cloth: { position: 'absolute', left: 0, right: 0, top: 5, height: 8, flexDirection: 'row', opacity: 0.85 },
  check: { flex: 1, height: '100%' },
  peek: { position: 'absolute', top: -14, left: 0, right: 0, textAlign: 'center', fontSize: 22, letterSpacing: -2 },
  label: { position: 'absolute', left: '22%', right: '22%', top: '42%', paddingVertical: 1, borderRadius: 9, backgroundColor: '#FFF4DE', borderWidth: 1.5, borderColor: '#8A5820', alignItems: 'center' },
  count: { position: 'absolute', right: '6%', top: '6%', minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5, backgroundColor: color.buatong, borderWidth: 2, borderColor: color.buatongHondo, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: font.displayBold, fontSize: 12, color: '#5A3A00' },
  basketRom: { fontFamily: font.uiHeavy, marginTop: 2 },
  basketHint: { fontFamily: font.uiBold, fontSize: 11, lineHeight: 14, color: '#F2D8C8', textAlign: 'center' },
  item: { position: 'absolute', left: 0, top: 0, width: TRAY_W, height: TRAY_H, zIndex: 40 },
  thing: { position: 'absolute', width: 34, fontSize: 28, lineHeight: 34, textAlign: 'center' },
  tag: { position: 'absolute', right: -6, top: 2, paddingHorizontal: 7, borderRadius: 8, backgroundColor: '#FFF4DE', borderWidth: 1.5, borderColor: '#8A5820', transform: [{ rotate: '8deg' }] },
});
