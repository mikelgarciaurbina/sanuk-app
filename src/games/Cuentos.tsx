// Cuentos de Yai: un libro de cuentos para leer junto a la lámpara de casa. Cada página tiene su ilustración; la voz
// lee y la palabra que suena se ilumina; al tocar una palabra sale su traducción en un bocadillo. Las páginas pasan
// en 3D… pero no solas: cada página trae un reto de lectura sacado de sus propias palabras («toca la que significa
// niebla», «toca la que oyes»), distinto en cada lectura, y hasta resolverlo no se pasa. Escuchar la página y
// curiosear palabras tiene premio. Al final, preguntas de lo que ha pasado y de sus palabras (leídas, no oídas, si
// ya se sabe leer), un sello… y el siguiente cuento que de verdad espera: en la estantería o más adelante en el camino.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { LESSONS, STORIES, type Story, type StoryToken } from '@/content';
import { fx, say, stopSpeech } from '@/lib/audio';
import { pick as pickOne, shuffle } from '@/lib/random';
import { useStore } from '@/lib/store';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Floaty, Glow, Pop, Press3D, Shine, tapPoint, useJuice, type Juice } from './fx';
import { ComboBadge, GameTitle, useScore } from './kit';
import { coverOf, Illustration, sceneOf } from './cuentos/escenas';
import type { GameProps } from './types';

/** Reloj (fuera del componente: el compilador de React no deja llamar a Date.now() en el cuerpo). */
const now = () => Date.now();
type Score = ReturnType<typeof useScore>;

// ——— Preguntas y retos ———

type Opt = { text: string; rom?: string; ok: boolean };
/** `cuento`: qué ha pasado · `palabra`: una palabra thai, ¿qué significa? · `lee`: ¿cuál de estas palabras thai dice…? */
type Question =
  | { kind: 'cuento'; q: string; opts: Opt[] }
  | { kind: 'palabra'; q: string; th: string; rom?: string; w: string; opts: Opt[] }
  | { kind: 'lee'; q: string; es: string; th: string; w?: string; opts: Opt[] };

type StoryWord = { th: string; rom?: string; es: string; w?: string };

/** ¿Se puede preguntar por esta palabra? Tiene traducción propia (no una nota entre paréntesis) y no cambia con quien lee. */
const askable = (t: StoryToken): t is StoryToken & { es: string } => !!t.es && !t.es.startsWith('(') && !t.th.includes('{');

/** Las palabras del cuento por las que se puede preguntar, sin repetir. */
function storyWords(story: Story, gender: Gender): StoryWord[] {
  const seen = new Set<string>();
  const out: StoryWord[] = [];
  for (const t of story.pages.flatMap((p) => p.lines.flat())) {
    if (!askable(t) || seen.has(t.th)) continue;
    seen.add(t.th);
    out.push({ th: personalize(t.th, gender), rom: t.rom ? personalizeRom(t.rom, gender) : undefined, es: t.es, w: t.w });
  }
  return out;
}

function buildQuestions(story: Story, gender: Gender, nVocab: number, nRead: number, prefer: Set<string>): Question[] {
  const qs: Question[] = story.questions.map((qq) => ({ kind: 'cuento', q: qq.q, opts: shuffle(qq.options.map((text, k) => ({ text, ok: k === qq.answer }))) }));
  const words = storyWords(story, gender);
  const differs = (a: StoryWord, b: StoryWord) => a.th !== b.th && a.es.toLowerCase() !== b.es.toLowerCase();
  // del thai al español: palabras del palabrario (así cuentan para el repaso), primero las de la lección
  const known = words.filter((t) => !!t.w);
  const pool = [...shuffle(known.filter((t) => prefer.has(t.w ?? ''))), ...shuffle(known.filter((t) => !prefer.has(t.w ?? '')))];
  const vocab: Question[] = [];
  for (const t of pool) {
    if (vocab.length >= nVocab) break;
    const wrong = shuffle(words.filter((o) => differs(o, t)).map((o) => o.es)).filter((x, k, a) => a.indexOf(x) === k).slice(0, 2);
    if (wrong.length < 2 || !t.w) continue;
    vocab.push({ kind: 'palabra', q: '¿Qué significa?', th: t.th, rom: t.rom, w: t.w, opts: shuffle([{ text: t.es, ok: true }, ...wrong.map((text) => ({ text, ok: false }))]) });
  }
  // del español al thai: elegir, leyendo, cuál de tres palabras del cuento es (las que más se parecen de largo)
  const used = new Set(vocab.map((v) => (v.kind === 'palabra' ? v.th : '')));
  const read: Question[] = [];
  for (const t of shuffle(words.filter((x) => !used.has(x.th)))) {
    if (read.length >= nRead) break;
    const near = shuffle(words.filter((o) => differs(o, t))).sort((a, b) => Math.abs([...a.th].length - [...t.th].length) - Math.abs([...b.th].length - [...t.th].length));
    if (near.length < 2) continue;
    read.push({ kind: 'lee', q: '¿Cuál de estas dice…?', es: t.es, th: t.th, w: t.w, opts: shuffle([t, near[0], near[1]].map((o) => ({ text: o.th, rom: o.rom, ok: o.th === t.th }))) });
  }
  return [...qs, ...vocab, ...read];
}

/**
 * El reto de una página: tocar en el texto la palabra que significa algo o (si ya se sabe leer) la que se oye.
 * Sale de las palabras de esa página, al azar, así que cada lectura pide otra. `accept`: las que valen («línea-palabra»).
 */
type PageTask = { kind: 'significa' | 'suena'; th: string; es: string; w?: string; accept: string[] };

function makeTasks(story: Story, gender: Gender, reads: boolean): (PageTask | null)[] {
  return story.pages.map((pg) => {
    const toks = pg.lines.flatMap((line, li) => line.map((t, ti) => ({ t, key: `${li}-${ti}` })));
    const fair = toks.flatMap(({ t }) => (askable(t) ? [t] : []));
    // con menos de tres palabras distintas no hay nada que buscar
    if (new Set(fair.map((t) => t.th)).size < 3) return null;
    const t = pickOne(fair);
    const kind = reads && Math.random() < 0.4 ? 'suena' : 'significa';
    const es = t.es.toLowerCase();
    const accept = toks.filter((x) => x.t.th === t.th || (kind === 'significa' && x.t.es?.toLowerCase() === es)).map((x) => x.key);
    return { kind, th: personalize(t.th, gender), es: t.es, w: t.w, accept };
  });
}

/** El cuento que espera después: en la feria, otro de la estantería; en el camino, el de la siguiente lección con cuento. */
function nextStory(story: Story, feria: boolean, shelf?: string[]): { story: Story; label: string } | null {
  if (feria) {
    const open = (shelf ? STORIES.filter((s) => shelf.includes(s.id)) : STORIES).filter((s) => s.id !== story.id);
    return open.length ? { story: pickOne(open), label: 'También en tu estantería' } : null;
  }
  const road = [...new Set(LESSONS.flatMap((l) => (l.extra?.kind === 'cuento' ? [l.extra.id] : [])))];
  const k = road.indexOf(story.id);
  const next = k >= 0 ? STORIES.find((s) => s.id === road[k + 1]) : undefined;
  return next ? { story: next, label: 'Más adelante en el camino' } : null;
}

// ——— La estantería (feria) ———

function Shelf({ suggested, shelf, onPick }: { suggested?: string; shelf?: string[]; onPick: (s: Story) => void }) {
  // solo los cuentos ya leídos en el camino: los demás llegan con sus lecciones
  const open = shelf ? STORIES.filter((s) => shelf.includes(s.id)) : STORIES;
  const rows: Story[][] = [];
  open.forEach((s, k) => {
    if (k % 3 === 0) rows.push([]);
    rows[rows.length - 1].push(s);
  });
  return (
    <View style={styles.shelfWrap}>
      <View style={styles.readHeadPlain}>
        <GameTitle title="La estantería de Yai" sub={open.length < STORIES.length ? 'Los cuentos que ya has leído en el camino. Llegarán más.' : 'Elige un cuento y léelo con ella.'} />
      </View>
      <View style={{ gap: 4, marginTop: 10 }}>
        {rows.map((row, r) => (
          <View key={r}>
            <View style={styles.shelfRow}>
              {row.map((s, k) => (
                <BookCover key={s.id} story={s} hot={s.id === suggested} onPress={() => onPick(s)} />
              ))}
            </View>
            <Plank />
          </View>
        ))}
      </View>
    </View>
  );
}

function Plank() {
  return (
    <Svg width="100%" height={18} viewBox="0 0 340 18" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="cuentosPlank" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C98A4B" />
          <Stop offset="1" stopColor="#7A4A22" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={340} height={12} rx={3} fill="url(#cuentosPlank)" />
      <Rect x={4} y={12} width={332} height={5} rx={2} fill="#000000" opacity={0.18} />
    </Svg>
  );
}

function BookCover({ story, hot, onPress }: { story: Story; hot?: boolean; onPress: () => void }) {
  const c = coverOf(story.id);
  const body = (
    <View style={styles.bookCover}>
      <Svg width={96} height={132} viewBox="0 0 96 132" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`cv${story.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.tint} />
            <Stop offset="1" stopColor={c.deep} />
          </LinearGradient>
        </Defs>
        <Rect x={2} y={2} width={92} height={128} rx={8} fill={`url(#cv${story.id})`} />
        <Rect x={2} y={2} width={12} height={128} rx={4} fill="#000000" opacity={0.18} />
        <Rect x={20} y={10} width={66} height={112} rx={6} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="3 3" />
        <Rect x={92} y={8} width={3} height={116} fill="#FFF8E7" />
      </Svg>
      <Text style={styles.coverEmoji}>{c.emoji}</Text>
      <Text style={styles.coverTitle} numberOfLines={3}>
        {story.title}
      </Text>
    </View>
  );
  return (
    <Press3D onPress={onPress} style={{ width: 96, height: 132 }} accessibilityLabel={`Leer el cuento ${story.title}${hot ? ', el cuento de hoy' : ''}`}>
      {hot ? (
        <Floaty amp={4} ms={1800}>
          <Glow size={170} tint="#FFD36A" strength={0.6} style={{ position: 'absolute', left: -37, top: -19 }} />
          {body}
          <View style={styles.ribbon}>
            <Text style={styles.ribbonText}>Hoy</Text>
          </View>
        </Floaty>
      ) : (
        body
      )}
    </Press3D>
  );
}

// ——— El libro ———

type Bubble = { li: number; ti: number; x: number; y: number; h: number };
type Turn = { from: number; to: number; dir: 1 | -1; id: number };

function Cover({ story }: { story: Story }) {
  const c = coverOf(story.id);
  return (
    <View style={[StyleSheet.absoluteFill, styles.coverPage, { backgroundColor: c.deep }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 300 420" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`big${story.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.tint} />
            <Stop offset="1" stopColor={c.deep} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={300} height={420} fill={`url(#big${story.id})`} />
        <Rect x={16} y={16} width={268} height={388} rx={14} fill="none" stroke="#FFE7A6" strokeWidth={3} />
        <Rect x={26} y={26} width={248} height={368} rx={10} fill="none" stroke="#FFE7A6" strokeWidth={1.2} strokeDasharray="4 5" />
        {[
          [40, 40],
          [260, 40],
          [40, 380],
          [260, 380],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={5} fill="#FFE7A6" />
        ))}
      </Svg>
      <Text style={styles.coverBig}>{c.emoji}</Text>
      <Th size={28} bold style={{ color: '#FFFFFF', textAlign: 'center' }}>
        {story.titleTh}
      </Th>
      <Text style={styles.coverName}>{story.title}</Text>
      <Text style={styles.coverBy}>Un cuento de Yai</Text>
    </View>
  );
}

type ViewRef = ComponentRef<typeof View>;

function PageView({
  story,
  idx,
  gender,
  known,
  interactive,
  active,
  trans,
  onWord,
  onWordRef,
  linesRef,
  illusH = 138,
  overlay,
  hint,
  glow,
  solved,
}: {
  story: Story;
  idx: number;
  illusH?: number;
  gender: Gender;
  known: Record<string, unknown>;
  interactive?: boolean;
  active?: { li: number; ti: number } | null;
  trans?: boolean;
  onWord?: (li: number, ti: number, e: GestureResponderEvent) => void;
  onWordRef?: (key: string, ref: ViewRef | null) => void;
  linesRef?: (ref: ViewRef | null) => void;
  overlay?: ReactNode;
  hint?: boolean;
  /** palabras que brillan como pista del reto y palabras del reto ya resuelto («línea-palabra») */
  glow?: string[];
  solved?: string[];
}) {
  if (idx < 0) return <Cover story={story} />;
  const pg = story.pages[idx];
  return (
    <View style={[StyleSheet.absoluteFill, styles.page]}>
      <Illustration spec={sceneOf(story, idx)} height={illusH} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.lines} scrollEnabled={!!interactive} showsVerticalScrollIndicator={false}>
        {/* el bocadillo se coloca respecto a este bloque: se mide al tocar, no se guarda de una página a otra */}
        <View ref={linesRef} collapsable={false} style={{ gap: 4 }}>
          {pg.lines.map((line, li) => (
            <View key={li} style={styles.line}>
              {line.map((t, ti) => {
                const th = personalize(t.th, gender);
                const key = `${li}-${ti}`;
                const on = active?.li === li && active?.ti === ti;
                const isKnown = !!t.w && !!known[t.w];
                return (
                  <Pressable
                    key={ti}
                    ref={onWordRef ? (r) => onWordRef(key, r) : undefined}
                    disabled={!interactive}
                    hitSlop={3}
                    accessibilityRole="button"
                    accessibilityLabel={`${th}${t.es ? `: ${t.es}` : ''}`}
                    onPress={(e) => onWord?.(li, ti, e)}
                    style={[styles.word, isKnown ? styles.wordKnown : null, glow?.includes(key) ? styles.wordHint : null, solved?.includes(key) ? styles.wordSolved : null, on ? styles.wordOn : null]}>
                    <Th size={27} style={{ color: on ? '#5A2E00' : color.tinta }}>
                      {th}
                    </Th>
                  </Pressable>
                );
              })}
            </View>
          ))}
          {overlay}
        </View>
        {trans ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.trans}>
            <Txt v="body" style={{ color: '#6E4A2A', fontStyle: 'italic' }}>
              {pg.es}
            </Txt>
          </Animated.View>
        ) : null}
        {hint && !trans ? (
          <Txt v="small" style={styles.hint}>
            Toca una palabra para ver qué significa. Subrayadas en verde: las que ya sabes.
          </Txt>
        ) : null}
      </ScrollView>
      <Text style={styles.folio}>{idx + 1}</Text>
    </View>
  );
}

/** El reto de la página: una nota de Yai entre el libro y los mandos. Tiembla si se intenta pasar sin resolverlo. */
function TaskNote({ task, solved, nudge, onSpeak }: { task: PageTask; solved: boolean; nudge: number; onSpeak: () => void }) {
  const dx = useSharedValue(0);
  useEffect(() => {
    if (!nudge) return;
    dx.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 70 }), withTiming(-5, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [nudge, dx]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));
  return (
    <Animated.View style={[styles.task, solved ? styles.taskDone : null, st]}>
      <Pop trigger={solved} scale={1.5}>
        <Text style={styles.taskEmoji}>{solved ? '⭐' : task.kind === 'suena' ? '👂' : '🔎'}</Text>
      </Pop>
      <View style={{ flex: 1 }}>
        <Txt v="eyebrow" style={{ fontSize: 10, color: solved ? color.arrozalHondo : color.azafranHondo }}>
          {solved ? '¡Reto conseguido!' : 'Reto de la página'}
        </Txt>
        {solved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6 }}>
            <Th size={19} bold>
              {task.th}
            </Th>
            <Txt v="bodyStrong" style={{ color: color.arrozalHondo }} numberOfLines={1}>
              = {task.es}
            </Txt>
          </View>
        ) : (
          <Txt v="bodyStrong" numberOfLines={2} style={{ fontSize: 15, lineHeight: 20 }}>
            {task.kind === 'suena' ? 'Toca en el texto la palabra que oyes' : `Toca en el texto la palabra que significa «${task.es}»`}
          </Txt>
        )}
      </View>
      {task.kind === 'suena' || solved ? (
        <Press3D onPress={onSpeak} style={styles.bubbleSpeak} accessibilityLabel={solved ? 'Escuchar la palabra' : 'Escuchar otra vez la palabra que hay que buscar'}>
          <View style={styles.bubbleSpeakFace}>
            <Icon name="speaker" size={18} color="#FFFFFF" />
          </View>
        </Press3D>
      ) : null}
    </Animated.View>
  );
}

function Reader({
  story,
  gender,
  reads,
  known,
  juice,
  bonus,
  onLook,
  onListened,
  onTask,
  onFinish,
}: {
  story: Story;
  gender: Gender;
  reads: boolean;
  known: Record<string, unknown>;
  juice: Juice;
  /** plátanos ganados leyendo (lección): por escuchar y por curiosear */
  bonus: number;
  onLook: (key: string) => void;
  onListened: (page: number) => void;
  /** se ha tocado una palabra con el reto abierto: `first` = es el primer intento de esa página */
  onTask: (ok: boolean, first: boolean, e: GestureResponderEvent, wordId?: string) => void;
  onFinish: () => void;
}) {
  const n = story.pages.length;
  const [page, setPage] = useState(-1);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<{ li: number; ti: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const [trans, setTrans] = useState(false);
  const [textW, setTextW] = useState(300);
  const [sheet, setSheet] = useState({ w: 330, h: 460 });
  const [tasks] = useState(() => makeTasks(story, gender, reads));
  const [solved, setSolved] = useState<Record<number, boolean>>({});
  const [hinted, setHinted] = useState<Record<number, boolean>>({});
  const [nudge, setNudge] = useState(0);
  const rawH = Math.round(Math.max(130, Math.min(sheet.w * 0.58, sheet.h * 0.4)));
  const illusH = Number.isFinite(rawH) ? rawH : 150;
  const rot = useSharedValue(0);
  const live = useRef({
    run: 0,
    timers: [] as ReturnType<typeof setTimeout>[],
    words: {} as Record<string, ViewRef | null>,
    lines: null as ViewRef | null,
    misses: {} as Record<number, number>,
    dead: false,
    busy: false,
  });

  const later = (fn: () => void, ms: number) => {
    const L = live.current;
    L.timers.push(
      setTimeout(() => {
        if (!L.dead) fn();
      }, ms),
    );
  };
  useEffect(() => {
    const L = live.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
      stopSpeech();
    };
  }, []);

  const stop = () => {
    live.current.run += 1;
    stopSpeech();
    setPlaying(false);
    setActive(null);
  };

  const task = page >= 0 ? tasks[page] : null;
  const open = !!task && !solved[page];

  const turnTo = (to: number) => {
    const L = live.current;
    if (L.busy || to < -1 || to > n - 1 || to === page) return;
    L.busy = true;
    stop();
    setBubble(null);
    const dir: 1 | -1 = to > page ? 1 : -1;
    setTurn({ from: page, to, dir, id: now() });
    fx.flip();
    rot.set(dir === 1 ? 0 : -180);
    rot.set(withTiming(dir === 1 ? -180 : 0, { duration: 680, easing: Easing.inOut(Easing.cubic) }));
    later(() => {
      setPage(to);
      setTurn(null);
      live.current.busy = false;
    }, 700);
  };

  /** Pasar página (o ir a las preguntas) pide haber resuelto el reto de esta. */
  const forward = (go: () => void) => {
    if (open) {
      fx.tap();
      setNudge((x) => x + 1);
      juice.float(undefined, 'Primero, el reto de la página', color.azafranHondo, 22);
      return;
    }
    go();
  };

  // el libro se abre solo
  const openBook = useEffectEvent(() => turnTo(0));
  useEffect(() => {
    const t = setTimeout(openBook, 900);
    return () => clearTimeout(t);
  }, []);

  // un reto de oído se anuncia solo al llegar a la página
  const announce = useEffectEvent(() => {
    if (task?.kind === 'suena' && open) say(task.th);
  });
  useEffect(() => {
    if (page < 0) return;
    const t = setTimeout(announce, 650);
    return () => clearTimeout(t);
  }, [page]);

  const pg = page >= 0 ? story.pages[page] : null;

  /** Lee la página frase a frase; la palabra que suena se ilumina (a ojo: según su longitud). */
  const play = () => {
    if (!pg) return;
    if (playing) {
      stop();
      return;
    }
    const L = live.current;
    L.run += 1;
    const id = L.run;
    const at = page;
    setPlaying(true);
    setBubble(null);
    const speakLine = (li: number) => {
      if (live.current.run !== id) return;
      if (li >= pg.lines.length) {
        setPlaying(false);
        setActive(null);
        onListened(at);
        return;
      }
      const toks = pg.lines[li].map((t) => personalize(t.th, gender));
      const per = slow ? 200 : 120;
      let started = false;
      const startWords = () => {
        if (started || live.current.run !== id) return;
        started = true;
        let acc = 0;
        toks.forEach((tk, ti) => {
          later(() => live.current.run === id && setActive({ li, ti }), acc);
          acc += Math.max(240, [...tk].length * per);
        });
      };
      say(joinThai(toks), {
        slow,
        onStart: startWords,
        onDone: () => {
          if (live.current.run !== id) return;
          later(() => speakLine(li + 1), 160);
        },
      });
      later(startWords, 450);
    };
    speakLine(0);
  };

  const tapWord = (li: number, ti: number, e: GestureResponderEvent) => {
    if (!pg) return;
    stop();
    const t = pg.lines[li][ti];
    const th = personalize(t.th, gender);
    const key = `${li}-${ti}`;
    say(th);
    fx.tap();
    // dónde está ahora mismo la palabra dentro del texto (medido al tocar: nunca queda de otra página)
    const L = live.current;
    const word = L.words[key];
    const block = L.lines;
    if (word && block) {
      word.measureInWindow((wx, wy, ww, wh) => {
        block.measureInWindow((bx, by, bw) => {
          if (L.dead) return;
          if (bw > 0) setTextW(bw);
          setBubble({ li, ti, x: wx - bx + ww / 2, y: wy - by, h: wh });
        });
      });
    }
    setActive({ li, ti });
    onLook(t.w ?? th);
    // el reto de la página: ¿es la palabra que se pedía?
    if (task && open) {
      const first = L.misses[page] === undefined;
      if (task.accept.includes(key)) {
        if (first) L.misses[page] = 0;
        setSolved((x) => ({ ...x, [page]: true }));
        onTask(true, first, e, task.w);
      } else {
        L.misses[page] = (L.misses[page] ?? 0) + 1;
        if (first) onTask(false, true, e, task.w);
        // al segundo despiste, la palabra buscada se ilumina
        if (L.misses[page] >= 2) setHinted((x) => ({ ...x, [page]: true }));
      }
    }
  };

  const bt = bubble && pg ? pg.lines[bubble.li]?.[bubble.ti] : null;
  const leafIdx = turn ? (turn.dir === 1 ? turn.from : turn.to) : page;
  const underIdx = turn ? (turn.dir === 1 ? turn.to : turn.from) : page;

  const leaf = useAnimatedStyle(() => ({ transform: [{ perspective: 1400 }, { rotateY: `${rot.value}deg` }] }));
  const front = useAnimatedStyle(() => ({ opacity: rot.value > -90 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ opacity: rot.value > -90 ? 0 : Math.max(0, Math.min(1, (180 + rot.value) / 40)) }));
  const shade = useAnimatedStyle(() => ({ opacity: Math.sin((-rot.value / 180) * Math.PI) * 0.4 }));

  const bubbleEl =
    bubble && bt ? (
      <Animated.View
        key={`${bubble.li}-${bubble.ti}`}
        entering={ZoomIn.springify().damping(13)}
        exiting={FadeOut.duration(120)}
        style={[styles.bubble, { left: Math.max(0, Math.min(textW - 226, bubble.x - 113)) }, bubble.y >= 112 ? { top: bubble.y - 112 } : { top: bubble.y + bubble.h + 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Th size={22} bold style={{ color: '#FFFFFF' }}>
              {personalize(bt.th, gender)}
            </Th>
            {bt.rom ? <Rom rom={personalizeRom(bt.rom, gender)} mono="#FFE2B8" size={14} /> : null}
            <Txt v="bodyStrong" style={{ color: '#FFFFFF' }}>
              {bt.es ?? '—'}
            </Txt>
          </View>
          <Press3D onPress={() => say(personalize(bt.th, gender))} style={styles.bubbleSpeak} accessibilityLabel="Escuchar la palabra">
            <View style={styles.bubbleSpeakFace}>
              <Icon name="speaker" size={18} color="#FFFFFF" />
            </View>
          </Press3D>
        </View>
      </Animated.View>
    ) : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.readHead}>
        <View style={{ flex: 1 }}>
          <GameTitle title={story.title} sub={page < 0 ? 'Abriendo el libro…' : `Página ${page + 1} de ${n} · toca una palabra`} />
        </View>
        {bonus ? (
          <Pop trigger={bonus} scale={1.4}>
            <View style={styles.bonus}>
              <Text style={styles.bonusText}>🍌 +{bonus}</Text>
            </View>
          </Pop>
        ) : null}
        <View style={styles.dots}>
          {story.pages.map((_, k) => (
            <View key={k} style={[styles.dot, solved[k] ? styles.dotSolved : k < page ? styles.dotDone : null, k === page ? styles.dotOn : null]} />
          ))}
        </View>
      </View>

      {/* el libro: tapas, lomo y la hoja */}
      <View style={styles.bookWrap}>
        <View style={styles.book}>
          <View style={styles.spine} />
          <View style={styles.sheet} onLayout={(e) => setSheet({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <PageView
              story={story}
              idx={underIdx}
              gender={gender}
              known={known}
              illusH={illusH}
              interactive={!turn}
              active={turn ? null : active}
              trans={!turn && trans}
              onWord={tapWord}
              onWordRef={(key, r) => {
                live.current.words[key] = r;
              }}
              linesRef={(r) => {
                live.current.lines = r;
              }}
              overlay={bubbleEl}
              hint={page === 0}
              glow={!turn && task && open && hinted[page] ? task.accept : undefined}
              solved={!turn && task && solved[page] ? task.accept : undefined}
            />
            {turn ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, shade]} /> : null}
            {turn ? (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: 'left center' }, leaf]}>
                <Animated.View style={[StyleSheet.absoluteFill, front]}>
                  <PageView story={story} idx={leafIdx} gender={gender} known={known} illusH={illusH} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, styles.paperBack, back]} />
              </Animated.View>
            ) : null}
          </View>
        </View>
      </View>

      {/* el reto de la página */}
      {task && !turn ? (
        <Animated.View key={page} entering={FadeInDown.springify().damping(15)} style={styles.taskRow}>
          <TaskNote task={task} solved={!!solved[page]} nudge={nudge} onSpeak={() => say(task.th)} />
        </Animated.View>
      ) : null}

      {/* mandos */}
      <View style={styles.controls}>
        <Press3D onPress={() => turnTo(page - 1)} disabled={page <= 0} style={styles.navBtn} accessibilityLabel="Página anterior">
          <View style={[styles.navFace, page <= 0 && { opacity: 0.4 }]}>
            <Icon name="back" size={22} color={color.tinta} />
          </View>
        </Press3D>
        <Press3D onPress={play} disabled={page < 0} style={styles.playBtn} accessibilityLabel={playing ? 'Pausar' : 'Escuchar la página'}>
          <View style={styles.playFace}>
            <Icon name={playing ? 'pause' : 'play'} size={26} color="#FFFFFF" />
          </View>
        </Press3D>
        <Press3D
          onPress={() => {
            stop();
            setSlow((x) => !x);
          }}
          style={styles.smallBtn}
          accessibilityLabel={slow ? 'Velocidad lenta; cambiar a normal' : 'Velocidad normal; cambiar a lenta'}>
          <View style={[styles.smallFace, slow && { backgroundColor: color.cieloSuave, borderColor: color.cielo }]}>
            <Icon name="turtle" size={20} color={slow ? color.cieloHondo : color.tinta3} />
          </View>
        </Press3D>
        <Press3D onPress={() => setTrans((x) => !x)} style={styles.smallBtn} accessibilityLabel="Traducción de la página">
          <View style={[styles.smallFace, trans && { backgroundColor: color.azafranSuave, borderColor: color.azafran }]}>
            <Text style={styles.esText}>ES</Text>
          </View>
        </Press3D>
        <View style={{ flex: 1 }} />
        {page >= n - 1 ? (
          <Press3D
            onPress={() =>
              forward(() => {
                stop();
                juice.burst(undefined, 'petalos', 14, 120);
                onFinish();
              })
            }
            style={[styles.nextBtn, { width: 116 }]}
            accessibilityLabel={open ? 'Preguntas: antes, resuelve el reto de la página' : 'Ir a las preguntas'}>
            <View style={[styles.nextFace, { gap: 4 }, open && styles.nextLocked]}>
              {open ? <Icon name="lock" size={16} color={color.tinta2} /> : null}
              <Text style={[styles.nextText, { fontSize: open ? 14 : 16 }]}>Preguntas</Text>
            </View>
          </Press3D>
        ) : (
          <Press3D onPress={() => forward(() => turnTo(page + 1))} style={styles.nextBtn} accessibilityLabel={open ? 'Pasar página: antes, resuelve el reto' : 'Página siguiente'}>
            <View style={[styles.nextFace, open && styles.nextLocked]}>
              <Text style={styles.nextText}>Pasar</Text>
              <Icon name={open ? 'lock' : 'arrow'} size={open ? 18 : 20} color={open ? color.tinta2 : color.tinta} />
            </View>
          </Press3D>
        )}
      </View>
    </View>
  );
}

// ——— Preguntas ———

function Quiz({ qs, feria, reads, score, juice, onAnswer, onEnd }: { qs: Question[]; feria: boolean; reads: boolean; score: Score; juice: Juice; onAnswer: (ok: boolean, wordId?: string) => void; onEnd: (points: number, correct: number) => void }) {
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [pose, setPose] = useState<NoiPose>('piensa');
  const [jump, setJump] = useState(0);
  const [points, setPoints] = useState(0);
  const live = useRef({ points: 0, correct: 0, timers: [] as ReturnType<typeof setTimeout>[], dead: false });
  const q = qs[k];

  useEffect(() => {
    const L = live.current;
    L.dead = false;
    return () => {
      L.dead = true;
      L.timers.forEach(clearTimeout);
    };
  }, []);
  const later = (fn: () => void, ms: number) => {
    const L = live.current;
    L.timers.push(
      setTimeout(() => {
        if (!L.dead) fn();
      }, ms),
    );
  };

  // quien ya sabe leer tiene que leer la palabra: la voz solo llega después de contestar (o si la pide)
  const sayWord = useEffectEvent(() => {
    if (q?.kind === 'palabra' && !reads) say(q.th);
  });
  useEffect(() => {
    const t = setTimeout(sayWord, 350);
    return () => clearTimeout(t);
  }, [k]);

  const choose = (n: number, e: GestureResponderEvent) => {
    if (picked !== null || !q) return;
    setPicked(n);
    const ok = q.opts[n].ok;
    const combo = score.hit(ok);
    onAnswer(ok, q.kind === 'cuento' ? undefined : q.w);
    if (ok) live.current.correct += 1;
    if (ok) {
      const gain = feria ? Math.round(100 * Math.min(3, 1 + 0.25 * Math.max(0, combo - 1))) : 0;
      live.current.points += gain;
      setPoints(live.current.points);
      juice.celebrate(tapPoint(e), feria ? `+${gain}` : '¡Sí!');
      setPose('celebra');
      setJump((j) => j + 1);
    } else {
      juice.shake(7);
      setPose('ups');
    }
    if (q.kind !== 'cuento') later(() => say(q.th), 300);
    later(
      () => {
        setPicked(null);
        setPose('piensa');
        if (k + 1 >= qs.length) onEnd(live.current.points, live.current.correct);
        else setK(k + 1);
      },
      ok ? 1300 : 2300,
    );
  };

  if (!q) return null;
  const thaiOpts = q.kind === 'lee';
  return (
    <View style={styles.quiz}>
      <View style={styles.readHead}>
        <View style={{ flex: 1 }}>
          <GameTitle title={q.kind === 'cuento' ? '¿Qué ha pasado?' : q.kind === 'lee' ? 'Léelo tú' : 'Palabras del cuento'} sub={`Pregunta ${k + 1} de ${qs.length}`} />
        </View>
        {feria ? (
          <Pop trigger={points}>
            <View style={styles.points}>
              <Icon name="star" size={16} color={color.buatongHondo} />
              <Txt v="num" style={{ fontSize: 18 }}>
                {points}
              </Txt>
            </View>
          </Pop>
        ) : null}
        <ComboBadge combo={score.combo} />
      </View>
      <Animated.View key={k} entering={FadeInDown.springify().damping(15)} style={styles.qCard}>
        <Noi pose={pose} size={86} jump={jump} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="h3">{q.q}</Txt>
          {q.kind === 'palabra' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Th size={34} bold>
                {q.th}
              </Th>
              <Press3D onPress={() => say(q.th)} style={styles.bubbleSpeak} accessibilityLabel="Escuchar la palabra">
                <View style={styles.bubbleSpeakFace}>
                  <Icon name="speaker" size={18} color="#FFFFFF" />
                </View>
              </Press3D>
            </View>
          ) : null}
          {q.kind === 'palabra' && q.rom && picked !== null ? <Rom rom={q.rom} /> : null}
          {q.kind === 'lee' ? (
            <Txt v="h2" style={{ color: color.azafranHondo }}>
              «{q.es}»
            </Txt>
          ) : null}
        </View>
      </Animated.View>
      <View style={{ gap: 12 }}>
        {q.opts.map((o, n) => {
          const state = picked === null ? 'idle' : o.ok ? 'ok' : n === picked ? 'bad' : 'gone';
          const tint = state === 'ok' ? color.arrozalHondo : state === 'bad' ? color.lacaHondo : color.tinta;
          return (
            <Animated.View key={`${k}-${n}`} entering={FadeInDown.delay(80 + n * 70).springify().damping(14)}>
              <Press3D onPress={(e) => choose(n, e)} disabled={picked !== null} style={{ minHeight: 62 }} accessibilityLabel={o.text}>
                <View style={[styles.opt, state === 'ok' && styles.optOk, state === 'bad' && styles.optBad, state === 'gone' && { opacity: 0.45 }]}>
                  {state === 'ok' ? <Glow size={120} tint={color.arrozalVivo} strength={0.35} style={{ position: 'absolute', right: -20 }} /> : null}
                  {thaiOpts ? (
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Th size={26} bold style={{ color: tint }}>
                        {o.text}
                      </Th>
                      {/* la transcripción solo acompaña a quien aún no lee; a quien lee, después de contestar */}
                      {o.rom && (!reads || picked !== null) ? <Rom rom={o.rom} size={13} /> : null}
                    </View>
                  ) : (
                    <Txt v="bodyStrong" style={{ flex: 1, textAlign: 'center', color: tint }}>
                      {o.text}
                    </Txt>
                  )}
                  {state === 'ok' ? <Icon name="check" size={22} color={color.arrozal} stroke={3} /> : state === 'bad' ? <Icon name="x" size={20} color={color.laca} stroke={3} /> : null}
                </View>
              </Press3D>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

// ——— Final: sello y el cuento que espera ———

function Finale({ story, correct, total, points, feria, shelf, onClose }: { story: Story; correct: number; total: number; points: number; feria: boolean; shelf?: string[]; onClose: () => void }) {
  const stars = total === 0 ? 3 : correct === total ? 3 : correct >= total * 0.6 ? 2 : 1;
  // solo un cuento al que se pueda llegar: otro de la estantería o el de la siguiente lección con cuento
  const [next] = useState(() => nextStory(story, feria, shelf));
  const nc = next ? coverOf(next.story.id) : null;
  const stamp = useSharedValue(2.4);
  useEffect(() => {
    stamp.value = withSequence(withTiming(1, { duration: 260, easing: Easing.in(Easing.quad) }), withSpring(1, { damping: 8, stiffness: 200 }));
  }, [stamp]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: stamp.value }, { rotate: '-8deg' }], opacity: Math.min(1, 3 - stamp.value) }));
  return (
    <View style={styles.finale}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[styles.seal, st]}>
          <Svg width={170} height={170} viewBox="0 0 170 170" style={StyleSheet.absoluteFill}>
            <Circle cx={85} cy={85} r={80} fill="#FDE7E7" />
            <Circle cx={85} cy={85} r={74} fill="none" stroke="#D93A3F" strokeWidth={4} strokeDasharray="5 5" />
            <Circle cx={85} cy={85} r={58} fill="none" stroke="#D93A3F" strokeWidth={3} />
          </Svg>
          <Text style={styles.sealEmoji}>{coverOf(story.id).emoji}</Text>
          <Text style={styles.sealText}>¡Cuento leído!</Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          {[0, 1, 2].map((n) => (
            <Animated.View key={n} entering={ZoomIn.delay(450 + n * 200).springify().damping(7)}>
              <Icon name="star" size={36} color={n < stars ? color.buatong : color.niebla3} />
            </Animated.View>
          ))}
        </View>
        <Txt v="bodyStrong" style={{ marginTop: 6, color: '#FFFFFF' }}>
          {correct} de {total} respuestas{feria ? ` · ${points} puntos` : ''}
        </Txt>
      </View>
      <Animated.View entering={FadeInDown.delay(900).springify().damping(14)} style={styles.teaser}>
        {next && nc ? (
          <>
            <View style={[styles.teaserCover, { backgroundColor: nc.deep }]}>
              <Text style={{ fontSize: 30 }}>{nc.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="eyebrow">{next.label}</Txt>
              <Txt v="bodyStrong">{next.story.title}</Txt>
              <Th size={17}>{next.story.titleTh}</Th>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.teaserCover, { backgroundColor: color.teca }]}>
              <Text style={{ fontSize: 30 }}>👵</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="eyebrow">Yai guarda más cuentos</Txt>
              <Txt v="bodyStrong">{feria ? 'Sigue el camino y tu estantería se irá llenando.' : 'Este vuelve a leerse cuando quieras en la estantería de la feria.'}</Txt>
            </View>
          </>
        )}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Shine trigger={1} />
        </View>
      </Animated.View>
      <Btn label="Terminar" onPress={onClose} />
    </View>
  );
}

// ——— El juego ———

export default function Cuentos({ mode, extra, gender, focus, reads = false, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const { p } = useStore();
  const shelf = extra?.kind === 'cuento' ? extra.shelf : undefined;
  const lessonStory = extra?.kind === 'cuento' ? STORIES.find((s) => s.id === extra.id) : undefined;
  const [story, setStory] = useState<Story | null>(feria ? null : (lessonStory ?? STORIES[0] ?? null));
  const [stage, setStage] = useState<'shelf' | 'read' | 'quiz' | 'end'>(feria ? 'shelf' : 'read');
  const [qs, setQs] = useState<Question[]>([]);
  const [final, setFinal] = useState({ correct: 0, total: 0, points: 0 });
  const [bonus, setBonus] = useState(0);
  const live = useRef({ looked: new Set<string>(), listened: new Set<number>(), ended: false, tasks: 0, tasksOk: 0, taskPoints: 0, bonus: 0 });

  const pick = (s: Story) => {
    fx.whoosh();
    setStory(s);
    setStage('read');
  };

  /** Plátanos por leer con ganas (lección): escuchar una página, curiosear palabras. */
  const reward = (text: string) => {
    const L = live.current;
    L.bonus += 1;
    setBonus(L.bonus);
    fx.coin();
    juice.float(undefined, text, color.azafranHondo, 24);
  };

  const look = (key: string) => {
    const L = live.current;
    if (L.looked.has(key)) return;
    L.looked.add(key);
    if (feria) juice.float(undefined, '+5', color.azafranHondo, 22);
    // en la lección, un plátano cada dos palabras nuevas que se miran (hasta cuatro)
    else if (L.looked.size % 2 === 0 && L.looked.size <= 8) reward('+1 🍌 por curiosear');
  };

  const listened = (pg: number) => {
    const L = live.current;
    if (L.listened.has(pg)) return;
    L.listened.add(pg);
    if (feria) juice.float(undefined, '¡Página escuchada!', color.cieloHondo, 22);
    else reward('+1 🍌 por escuchar');
  };

  /** El reto de una página: el primer toque cuenta como respuesta (y para el repaso de esa palabra). */
  const pageTask = (ok: boolean, first: boolean, e: GestureResponderEvent, wordId?: string) => {
    const L = live.current;
    let combo = score.combo;
    if (first) {
      combo = score.hit(ok);
      onAnswer(ok, wordId);
      L.tasks += 1;
      if (ok) L.tasksOk += 1;
    }
    if (!ok) return;
    if (!first) fx.sparkle();
    const gain = feria ? (first ? Math.round(60 * Math.min(3, 1 + 0.25 * Math.max(0, combo - 1))) : 20) : 0;
    L.taskPoints += gain;
    juice.celebrate(tapPoint(e), feria ? `+${gain}` : first ? '¡Leído!' : '¡Eso es!');
  };

  const toQuiz = () => {
    if (!story) return;
    setQs(buildQuestions(story, gender, feria ? 2 : 1, 1, new Set(focus.map((w) => w.id))));
    setStage('quiz');
  };

  const end = (quizPoints: number, quizCorrect: number) => {
    const L = live.current;
    const looked = Math.min(60, L.looked.size * 5);
    const heard = story && L.listened.size >= story.pages.length ? 50 : 0;
    const total = qs.length + L.tasks;
    const correct = quizCorrect + L.tasksOk;
    const perfect = total > 0 && correct === total ? 150 : 0;
    const points = quizPoints + (feria ? L.taskPoints + looked + heard + perfect : 0);
    setFinal({ correct, total, points });
    setStage('end');
    fx.fanfare();
    juice.burst(undefined, 'petalos', 30, 190);
    if (feria && looked) juice.float(undefined, `+${looked} por mirar palabras`, color.azafranHondo, 22);
  };

  const close = () => {
    const L = live.current;
    if (L.ended) return;
    L.ended = true;
    stopSpeech();
    const r = score.result(feria ? final.points : undefined);
    onDone({ ...r, bananas: r.bananas + L.bonus });
  };

  if (!story && stage !== 'shelf') return null;
  return (
    <View style={styles.root}>
      <Backdrop scene="casa" />
      {stage === 'shelf' ? <Shelf suggested={extra?.kind === 'cuento' ? extra.id : undefined} shelf={shelf} onPick={pick} /> : null}
      {stage === 'read' && story ? <Reader story={story} gender={gender} reads={reads} known={p.words} juice={juice} bonus={bonus} onLook={look} onListened={listened} onTask={pageTask} onFinish={toQuiz} /> : null}
      {stage === 'quiz' && qs.length ? <Quiz qs={qs} feria={feria} reads={reads} score={score} juice={juice} onAnswer={onAnswer} onEnd={end} /> : null}
      {stage === 'end' && story ? <Finale story={story} correct={final.correct} total={final.total} points={final.points} feria={feria} shelf={shelf} onClose={close} /> : null}
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'visible' },
  shelfWrap: { flex: 1, paddingHorizontal: 14, paddingTop: 4 },
  readHeadPlain: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,248,231,0.92)', borderWidth: 2, borderColor: '#F3C98B' },
  shelfRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingHorizontal: 6, paddingTop: 10 },
  bookCover: { width: 96, height: 132, alignItems: 'center', justifyContent: 'center', paddingLeft: 12, paddingRight: 6, gap: 4 },
  coverEmoji: { fontSize: 34, lineHeight: 42 },
  coverTitle: { fontFamily: font.uiHeavy, fontSize: 11, lineHeight: 13, color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  ribbon: { position: 'absolute', top: -6, right: -8, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: color.farol, justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  ribbonText: { fontFamily: font.uiHeavy, fontSize: 11, color: '#FFFFFF' },
  readHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: 'rgba(255,248,231,0.92)', borderWidth: 2, borderColor: '#F3C98B' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E7CFA6' },
  dotOn: { width: 20, backgroundColor: color.azafran },
  dotDone: { backgroundColor: color.azafranHondo },
  dotSolved: { backgroundColor: color.arrozalVivo },
  bonus: { height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.buatong, justifyContent: 'center' },
  bonusText: { fontFamily: font.uiHeavy, fontSize: 13, color: color.tinta },
  bookWrap: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  book: { flex: 1, borderRadius: 18, backgroundColor: '#7A2E2A', padding: 7, paddingLeft: 14, shadowColor: '#2A1408', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  spine: { position: 'absolute', left: 4, top: 10, bottom: 10, width: 6, borderRadius: 3, backgroundColor: '#4E1A18' },
  sheet: { flex: 1, borderRadius: 12, backgroundColor: '#FFF8E7', overflow: 'hidden' },
  page: { backgroundColor: '#FFF8E7', padding: 10, paddingBottom: 26 },
  coverPage: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
  coverBig: { fontSize: 72, lineHeight: 86 },
  coverName: { fontFamily: font.displayBold, fontSize: 22, color: '#FFFFFF', textAlign: 'center' },
  coverBy: { fontFamily: font.uiBold, fontSize: 13, color: '#FFE7A6' },
  lines: { paddingHorizontal: 2, paddingTop: 10, paddingBottom: 8, gap: 4 },
  hint: { marginTop: 14, textAlign: 'center', color: '#B98F55' },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  word: { paddingHorizontal: 3, borderRadius: 8, minHeight: 40, justifyContent: 'center' },
  wordOn: { backgroundColor: '#FFD36A' },
  wordKnown: { borderBottomWidth: 3, borderBottomColor: 'rgba(45,190,120,0.55)' },
  wordHint: { backgroundColor: 'rgba(255,200,61,0.3)', borderWidth: 2, borderColor: color.azafran, borderStyle: 'dashed' },
  wordSolved: { backgroundColor: color.arrozalSuave },
  taskRow: { paddingHorizontal: 14, paddingBottom: 4 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, backgroundColor: 'rgba(255,248,231,0.97)', borderWidth: 2, borderColor: color.azafran, borderBottomWidth: 4 },
  taskDone: { backgroundColor: '#F2FFF7', borderColor: color.arrozalVivo },
  taskEmoji: { fontSize: 26, lineHeight: 32 },
  trans: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,200,61,0.16)', borderLeftWidth: 4, borderLeftColor: color.azafran },
  folio: { position: 'absolute', bottom: 6, alignSelf: 'center', left: 0, right: 0, textAlign: 'center', fontFamily: font.display, fontSize: 13, color: '#B98F55' },
  shade: { backgroundColor: '#3A2410' },
  paperBack: { backgroundColor: '#F4E6C8', borderRadius: 12 },
  bubble: { position: 'absolute', width: 226, padding: 10, borderRadius: 16, backgroundColor: 'rgba(29,35,71,0.95)', shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  bubbleSpeak: { width: 42, height: 42 },
  bubbleSpeakFace: { flex: 1, borderRadius: 14, backgroundColor: color.cielo, borderBottomWidth: 3, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 4 },
  navBtn: { width: 44, height: 46 },
  navFace: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 56, height: 56 },
  playFace: { flex: 1, borderRadius: 30, backgroundColor: color.cielo, borderBottomWidth: 5, borderBottomColor: color.cieloHondo, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { width: 42, height: 44 },
  smallFace: { flex: 1, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 4, alignItems: 'center', justifyContent: 'center' },
  esText: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta2 },
  nextBtn: { width: 104, height: 46 },
  nextFace: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 16, backgroundColor: color.azafran, borderBottomWidth: 4, borderBottomColor: color.azafranHondo, alignItems: 'center', justifyContent: 'center' },
  nextLocked: { backgroundColor: color.niebla2, borderBottomColor: color.niebla4 },
  nextText: { fontFamily: font.display, fontSize: 17, color: color.tinta },
  quiz: { flex: 1, gap: 14, paddingBottom: 20 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 9, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: color.buatong },
  qCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 12, borderRadius: 22, backgroundColor: 'rgba(255,248,231,0.96)', borderWidth: 2, borderColor: '#F3C98B' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, marginHorizontal: 16, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 5, overflow: 'hidden' },
  optOk: { backgroundColor: color.arrozalSuave, borderColor: color.arrozalVivo },
  optBad: { backgroundColor: color.lacaSuave, borderColor: color.laca },
  finale: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  seal: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center' },
  sealEmoji: { fontSize: 46, lineHeight: 56 },
  sealText: { fontFamily: font.displayBold, fontSize: 19, color: '#D93A3F' },
  teaser: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,248,231,0.96)', borderWidth: 2, borderColor: '#F3C98B', overflow: 'hidden' },
  teaserCover: { width: 56, height: 72, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 6, borderLeftColor: 'rgba(0,0,0,0.25)' },
});
