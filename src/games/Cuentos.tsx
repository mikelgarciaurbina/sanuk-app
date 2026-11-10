// Cuentos de Yai: un libro de cuentos para leer junto a la lámpara de casa. Cada página tiene su ilustración; la voz
// lee y la palabra que suena se ilumina; al tocar una palabra sale su traducción en un bocadillo. Las páginas pasan
// en 3D. Al final, preguntas de lo que ha pasado y de sus palabras, un sello… y el siguiente cuento ya asoma.
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import type { NoiPose } from '@/brand/noi-art';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { STORIES, type Story, type StoryToken } from '@/content';
import { fx, say, stopSpeech } from '@/lib/audio';
import { shuffle } from '@/lib/random';
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

// ——— Preguntas ———

type Question = { kind: 'cuento'; q: string; opts: { text: string; ok: boolean }[] } | { kind: 'palabra'; q: string; th: string; rom?: string; w: string; opts: { text: string; ok: boolean }[] };

function buildQuestions(story: Story, gender: Gender, nVocab: number, prefer: Set<string>): Question[] {
  const qs: Question[] = story.questions.map((qq) => ({ kind: 'cuento', q: qq.q, opts: shuffle(qq.options.map((text, k) => ({ text, ok: k === qq.answer }))) }));
  const seen = new Set<string>();
  const toks = story.pages
    .flatMap((p) => p.lines.flat())
    .filter((t): t is StoryToken & { w: string; es: string } => !!t.w && !!t.es && !t.es.startsWith('(') && !t.th.includes('{') && !seen.has(t.w) && (seen.add(t.w), true));
  const pool = [...shuffle(toks.filter((t) => prefer.has(t.w))), ...shuffle(toks.filter((t) => !prefer.has(t.w)))];
  const vocab: Question[] = [];
  for (const t of pool) {
    if (vocab.length >= nVocab) break;
    const wrong = shuffle(toks.filter((o) => o.es.toLowerCase() !== t.es.toLowerCase()).map((o) => o.es)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2);
    if (wrong.length < 2) continue;
    vocab.push({ kind: 'palabra', q: '¿Qué significa?', th: personalize(t.th, gender), rom: t.rom ? personalizeRom(t.rom, gender) : undefined, w: t.w, opts: shuffle([{ text: t.es, ok: true }, ...wrong.map((text) => ({ text, ok: false }))]) });
  }
  return [...qs, ...vocab];
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

function PageView({
  story,
  idx,
  gender,
  known,
  interactive,
  active,
  trans,
  onWord,
  onWordLayout,
  onLineLayout,
  illusH = 138,
  overlay,
  hint,
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
  onWordLayout?: (li: number, ti: number, e: LayoutChangeEvent) => void;
  onLineLayout?: (li: number, e: LayoutChangeEvent) => void;
  overlay?: ReactNode;
  hint?: boolean;
}) {
  if (idx < 0) return <Cover story={story} />;
  const pg = story.pages[idx];
  return (
    <View style={[StyleSheet.absoluteFill, styles.page]}>
      <Illustration spec={sceneOf(story, idx)} height={illusH} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.lines} scrollEnabled={!!interactive} showsVerticalScrollIndicator={false}>
        {pg.lines.map((line, li) => (
          <View key={li} style={styles.line} onLayout={onLineLayout ? (e) => onLineLayout(li, e) : undefined}>
            {line.map((t, ti) => {
              const th = personalize(t.th, gender);
              const on = active?.li === li && active?.ti === ti;
              const isKnown = !!t.w && !!known[t.w];
              return (
                <Pressable
                  key={ti}
                  disabled={!interactive}
                  hitSlop={3}
                  accessibilityRole="button"
                  accessibilityLabel={`${th}${t.es ? `: ${t.es}` : ''}`}
                  onLayout={onWordLayout ? (e) => onWordLayout(li, ti, e) : undefined}
                  onPress={(e) => onWord?.(li, ti, e)}
                  style={[styles.word, on ? styles.wordOn : null, isKnown ? styles.wordKnown : null]}>
                  <Th size={27} style={{ color: on ? '#5A2E00' : color.tinta }}>
                    {th}
                  </Th>
                </Pressable>
              );
            })}
          </View>
        ))}
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
        {overlay}
      </ScrollView>
      <Text style={styles.folio}>{idx + 1}</Text>
    </View>
  );
}

function Reader({
  story,
  gender,
  known,
  juice,
  onLook,
  onListened,
  onFinish,
}: {
  story: Story;
  gender: Gender;
  known: Record<string, unknown>;
  juice: Juice;
  onLook: (key: string) => void;
  onListened: (page: number) => void;
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
  const rawH = Math.round(Math.max(130, Math.min(sheet.w * 0.58, sheet.h * 0.4)));
  const illusH = Number.isFinite(rawH) ? rawH : 150;
  const rot = useSharedValue(0);
  const live = useRef({ run: 0, timers: [] as ReturnType<typeof setTimeout>[], words: {} as Record<string, { x: number; y: number; w: number; h: number }>, lines: {} as Record<number, number>, dead: false, busy: false });

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

  // el libro se abre solo
  const open = useEffectEvent(() => turnTo(0));
  useEffect(() => {
    const t = setTimeout(open, 900);
    return () => clearTimeout(t);
  }, []);

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

  const tapWord = (li: number, ti: number) => {
    if (!pg) return;
    stop();
    const t = pg.lines[li][ti];
    const th = personalize(t.th, gender);
    say(th);
    fx.tap();
    const L = live.current;
    const lay = L.words[`${li}-${ti}`];
    const ly = L.lines[li] ?? 0;
    if (lay) setBubble({ li, ti, x: lay.x + lay.w / 2, y: ly + lay.y, h: lay.h });
    setActive({ li, ti });
    onLook(t.w ?? th);
  };

  const bt = bubble && pg ? pg.lines[bubble.li][bubble.ti] : null;
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
                style={[
                  styles.bubble,
                  { left: Math.max(0, Math.min(textW - 226, bubble.x - 113)) },
                  bubble.y >= 112 ? { top: bubble.y - 112 } : { top: bubble.y + bubble.h + 8 },
                ]}>
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
        <View style={styles.dots}>
          {story.pages.map((_, k) => (
            <View key={k} style={[styles.dot, k === page ? styles.dotOn : k < page ? styles.dotDone : null]} />
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
              onWordLayout={(li, ti, e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                live.current.words[`${li}-${ti}`] = { x, y, w: width, h: height };
              }}
              onLineLayout={(li, e) => {
                live.current.lines[li] = e.nativeEvent.layout.y;
                if (li === 0) setTextW(e.nativeEvent.layout.width);
              }}
              overlay={bubbleEl}
              hint={page === 0}
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
            setSlow((s) => !s);
          }}
          style={styles.smallBtn}
          accessibilityLabel={slow ? 'Velocidad lenta; cambiar a normal' : 'Velocidad normal; cambiar a lenta'}>
          <View style={[styles.smallFace, slow && { backgroundColor: color.cieloSuave, borderColor: color.cielo }]}>
            <Icon name="turtle" size={20} color={slow ? color.cieloHondo : color.tinta3} />
          </View>
        </Press3D>
        <Press3D onPress={() => setTrans((t) => !t)} style={styles.smallBtn} accessibilityLabel="Traducción de la página">
          <View style={[styles.smallFace, trans && { backgroundColor: color.azafranSuave, borderColor: color.azafran }]}>
            <Text style={styles.esText}>ES</Text>
          </View>
        </Press3D>
        <View style={{ flex: 1 }} />
        {page >= n - 1 ? (
          <Btn label="Preguntas" height={46} style={{ width: 116 }} onPress={() => {
            stop();
            juice.burst(undefined, 'petalos', 14, 120);
            onFinish();
          }} />
        ) : (
          <Press3D onPress={() => turnTo(page + 1)} style={styles.nextBtn} accessibilityLabel="Página siguiente">
            <View style={styles.nextFace}>
              <Text style={styles.nextText}>Pasar</Text>
              <Icon name="arrow" size={20} color={color.tinta} />
            </View>
          </Press3D>
        )}
      </View>
    </View>
  );
}

// ——— Preguntas ———

function Quiz({ qs, feria, score, juice, onAnswer, onEnd }: { qs: Question[]; feria: boolean; score: Score; juice: Juice; onAnswer: (ok: boolean, wordId?: string) => void; onEnd: (points: number, correct: number) => void }) {
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

  const sayWord = useEffectEvent(() => {
    if (q?.kind === 'palabra') say(q.th);
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
    onAnswer(ok, q.kind === 'palabra' ? q.w : undefined);
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
    if (q.kind === 'palabra') later(() => say(q.th), 300);
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
  return (
    <View style={styles.quiz}>
      <View style={styles.readHead}>
        <View style={{ flex: 1 }}>
          <GameTitle title={q.kind === 'cuento' ? '¿Qué ha pasado?' : 'Palabras del cuento'} sub={`Pregunta ${k + 1} de ${qs.length}`} />
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
        </View>
      </Animated.View>
      <View style={{ gap: 12 }}>
        {q.opts.map((o, n) => {
          const state = picked === null ? 'idle' : o.ok ? 'ok' : n === picked ? 'bad' : 'gone';
          return (
            <Animated.View key={`${k}-${n}`} entering={FadeInDown.delay(80 + n * 70).springify().damping(14)}>
              <Press3D onPress={(e) => choose(n, e)} disabled={picked !== null} style={{ minHeight: 62 }} accessibilityLabel={o.text}>
                <View style={[styles.opt, state === 'ok' && styles.optOk, state === 'bad' && styles.optBad, state === 'gone' && { opacity: 0.45 }]}>
                  {state === 'ok' ? <Glow size={120} tint={color.arrozalVivo} strength={0.35} style={{ position: 'absolute', right: -20 }} /> : null}
                  <Txt v="bodyStrong" style={{ flex: 1, textAlign: 'center', color: state === 'ok' ? color.arrozalHondo : state === 'bad' ? color.lacaHondo : color.tinta }}>
                    {o.text}
                  </Txt>
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

// ——— Final: sello y el próximo cuento ———

function Finale({ story, correct, total, points, feria, onClose }: { story: Story; correct: number; total: number; points: number; feria: boolean; onClose: () => void }) {
  const stars = total === 0 ? 3 : correct === total ? 3 : correct >= total * 0.6 ? 2 : 1;
  const next = STORIES[(STORIES.findIndex((s) => s.id === story.id) + 1) % STORIES.length];
  const nc = coverOf(next.id);
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
        <View style={[styles.teaserCover, { backgroundColor: nc.deep }]}>
          <Text style={{ fontSize: 30 }}>{nc.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="eyebrow">El próximo cuento</Txt>
          <Txt v="bodyStrong">{next.title}</Txt>
          <Th size={17}>{next.titleTh}</Th>
        </View>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Shine trigger={1} />
        </View>
      </Animated.View>
      <Btn label="Terminar" onPress={onClose} />
    </View>
  );
}

// ——— El juego ———

export default function Cuentos({ mode, extra, gender, focus, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const { p } = useStore();
  const lessonStory = extra?.kind === 'cuento' ? STORIES.find((s) => s.id === extra.id) : undefined;
  const [story, setStory] = useState<Story | null>(feria ? null : (lessonStory ?? STORIES[0] ?? null));
  const [stage, setStage] = useState<'shelf' | 'read' | 'quiz' | 'end'>(feria ? 'shelf' : 'read');
  const [qs, setQs] = useState<Question[]>([]);
  const [final, setFinal] = useState({ correct: 0, total: 0, points: 0 });
  const live = useRef({ looked: new Set<string>(), listened: new Set<number>(), ended: false });

  const pick = (s: Story) => {
    fx.whoosh();
    setStory(s);
    setStage('read');
  };

  const toQuiz = () => {
    if (!story) return;
    setQs(buildQuestions(story, gender, feria ? 2 : 1, new Set(focus.map((w) => w.id))));
    setStage('quiz');
  };

  const end = (quizPoints: number, correct: number) => {
    const L = live.current;
    const looked = Math.min(60, L.looked.size * 5);
    const listened = story && L.listened.size >= story.pages.length ? 50 : 0;
    const total = qs.length;
    const perfect = total > 0 && correct === total ? 150 : 0;
    const points = quizPoints + (feria ? looked + listened + perfect : 0);
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
    onDone(score.result(feria ? final.points : undefined));
  };

  if (!story && stage !== 'shelf') return null;
  return (
    <View style={styles.root}>
      <Backdrop scene="casa" />
      {stage === 'shelf' ? <Shelf suggested={extra?.kind === 'cuento' ? extra.id : undefined} shelf={extra?.kind === 'cuento' ? extra.shelf : undefined} onPick={pick} /> : null}
      {stage === 'read' && story ? (
        <Reader
          story={story}
          gender={gender}
          known={p.words}
          juice={juice}
          onLook={(key) => {
            const L = live.current;
            if (!L.looked.has(key)) {
              L.looked.add(key);
              if (feria) juice.float(undefined, '+5', color.azafranHondo, 22);
            }
          }}
          onListened={(pg) => live.current.listened.add(pg)}
          onFinish={toQuiz}
        />
      ) : null}
      {stage === 'quiz' && qs.length ? <Quiz qs={qs} feria={feria} score={score} juice={juice} onAnswer={onAnswer} onEnd={end} /> : null}
      {stage === 'end' && story ? <Finale story={story} correct={final.correct} total={final.total} points={final.points} feria={feria} onClose={close} /> : null}
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
