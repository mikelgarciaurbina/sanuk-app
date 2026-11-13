// Juego 4 · ¿Sí o บ่?: un mazo de cartas en 3D; la de arriba se arrastra con el dedo y se inclina siguiendo
// el gesto. ¿La traducción es correcta? Derecha = ใช่ (sí), izquierda = ไม่ใช่ (no; บ่, el «no» del norte, cuando
// ya se ha aprendido). Mezcla thai → español y español → thai, y lo que se falla vuelve. En la lección cada carta
// dice su thai al aparecer y, si sobran cartas, las palabras nuevas salen dos veces (del thai al significado y al
// revés, una cierta y otra no), nunca seguidas. En la feria hay tres vidas (se recuperan con rachas), cada carta
// tiene su reloj, cada vez más corto, y desde el nivel 2 salen cartas doradas (×3) y desde el 3 cartas de oído.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Pop, Press3D, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { LevelChip, MultChip, ScoreChip, ToastRibbon, clash, distinct, multFor, pointIn, romFor, useLater, useToast } from './palabras/common';
import { CARD_H, CardBack, CardFace, SwipeCard, thaiOf, type Deal, type Verdict } from './siono/Carta';
import { Vidas } from './siono/Vidas';
import type { GameProps } from './types';

const PER_LEVEL = 6;
const LIVES = 3;
type Pose = 'feliz' | 'celebra' | 'ups';
type Feedback = { n: number; ok: boolean; timeout: boolean; d: Deal };

const clock = () => Date.now();
/** Segundos por carta en la feria: empieza holgado y se acorta en cada nivel. */
const timeFor = (level: number) => Math.max(2400, 6200 - (level - 1) * 650);
const levelOf = (k: number) => Math.floor(k / PER_LEVEL) + 1;

type DealOpts = { truth?: boolean; dir?: 'th' | 'es'; romOf: (w: Word) => boolean; golden?: boolean; audio?: boolean };

function makeDeal(id: number, pool: Word[], word: Word, o: DealOpts): Deal {
  const others = pool.filter((w) => w.id !== word.id && !clash(w, word));
  const truth = others.length === 0 || (o.truth ?? Math.random() < 0.5);
  let other = word;
  if (!truth) {
    // distractor verosímil: de la misma familia de palabras si se puede
    const same = others.filter((w) => w.cat && w.cat === word.cat);
    other = pick(same.length && Math.random() < 0.7 ? same : others);
  }
  const dir = o.audio ? 'th' : (o.dir ?? (Math.random() < 0.3 ? 'es' : 'th'));
  return { id, word, other, truth, dir, rom: o.romOf(dir === 'th' ? word : other), golden: o.golden, audio: o.audio };
}

/** Ordena las palabras sin dos cartas seguidas de la misma (si se puede): la que más veces queda va antes. */
function spread(bag: Word[]): Word[] {
  const left = shuffle(bag);
  const out: Word[] = [];
  while (left.length) {
    const last = out[out.length - 1]?.id;
    const times = (w: Word) => left.filter((x) => x.id === w.id).length;
    const cands = left.filter((w) => w.id !== last);
    const best = (cands.length ? cands : left).reduce((a, b) => (times(b) > times(a) ? b : a));
    out.push(left.splice(left.indexOf(best), 1)[0]);
  }
  return out;
}

/**
 * Mazo de la lección: cada palabra nueva sale una vez y, si sobran cartas, se alternan palabras de repaso con una
 * segunda vuelta de las nuevas (nunca dos seguidas iguales, aunque la lección traiga una sola palabra nueva).
 * La mitad de las cartas son ciertas; la segunda vez que sale una palabra cambia la respuesta y se pregunta al
 * revés (del significado al thai).
 */
function lessonDeck(total: number, pool: Word[], focus: Word[], romOf: (w: Word) => boolean): Deal[] {
  const isNew = (w: Word) => focus.some((f) => f.id === w.id);
  const news = shuffle(pool.filter(isNew));
  const olds = shuffle(pool.filter((w) => !isNew(w)));
  const bag = news.slice(0, total);
  const second = [...news];
  for (let turn = 0; bag.length < total && (olds.length || second.length); turn++) {
    const w = turn % 2 === 0 ? (olds.shift() ?? second.shift()) : (second.shift() ?? olds.shift());
    if (w) bag.push(w);
  }
  // con muy pocas palabras hay que repetir más: siempre la que menos veces ha salido
  while (bag.length < total) {
    const times = (w: Word) => bag.filter((x) => x.id === w.id).length;
    bag.push(pool.reduce((a, b) => (times(b) < times(a) ? b : a)));
  }
  const truths = shuffle(Array.from({ length: total }, (_, k) => k % 2 === 0));
  const first = new Map<string, boolean>();
  return spread(bag).map((w, k) => {
    const before = first.get(w.id);
    const truth = before === undefined ? truths[k] : !before;
    if (before === undefined) first.set(w.id, truth);
    const dir = before !== undefined ? 'es' : isNew(w) ? 'th' : undefined;
    return makeDeal(k + 1, pool, w, { truth, dir, romOf });
  });
}

/** Carta `k` (desde 0) de la feria: su nivel decide si lleva transcripción y si puede ser dorada o de oído. */
function feriaDeal(id: number, k: number, pool: Word[], reads: boolean | undefined, o: { prefer?: Word; avoid?: string[] } = {}): Deal {
  const level = levelOf(k);
  const fresh = pool.filter((w) => !o.avoid?.includes(w.id));
  const word = o.prefer ?? pick(fresh.length ? fresh : pool);
  const golden = level >= 2 && Math.random() < 0.16;
  const audio = !golden && level >= 3 && Math.random() < 0.25;
  return makeDeal(id, pool, word, { romOf: () => romFor(reads, { feria: true, level }), golden, audio });
}

/** Juego 4 · ¿Sí o บ่?: desliza la carta según sea correcta la traducción. */
export default function SiONo({ mode, words, focus, rounds = 6, reads, review, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const total = rounds;
  const score = useScore(mode);
  const juice = useJuice();
  const toast = useToast();
  const later = useLater();
  const deckRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  // «no»: ไม่ใช่ (lección 2) hasta que se aprende บ่, el «no» del norte que da nombre al juego
  const [noTh] = useState(() => ([...focus, ...words].some((w) => w.id === 'bo') ? 'บ่' : 'ไม่ใช่'));
  const tooFew = pool.length < 2;
  const [deck, setDeck] = useState<Deal[]>(() => {
    if (pool.length < 2) return [];
    if (!feria) return lessonDeck(total, pool, focus, (w) => romFor(reads, { feria: false, review: review || !focus.some((f) => f.id === w.id) }));
    const out: Deal[] = [];
    for (let k = 0; k < 3; k++) out.push(feriaDeal(k + 1, k, pool, reads, { avoid: out.map((d) => d.word.id) }));
    return out;
  });
  const [i, setI] = useState(0);
  const [cmd, setCmd] = useState({ n: 0, yes: true });
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(LIVES);
  // letrero de nivel delante: el reloj de la carta espera a que se quite
  const [hold, setHold] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [jump, setJump] = useState(0);
  const [pose, setPose] = useState<Pose>('feliz');

  const g = useRef({ i: 0, id: 100, points: 0, level: 1, lives: LIVES, ended: false, done: false, extra: 0, fbN: 0, poseN: 0, decided: -1, shownAt: 0, retry: [] as { w: Word; at: number }[] });

  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  const setMood = (p: Pose) => {
    const s = g.current;
    s.poseN += 1;
    const n = s.poseN;
    setPose(p);
    later(() => {
      if (g.current.poseN === n) setPose('feliz');
    }, 1200);
  };

  const finish = (why: 'mazo' | 'vidas') => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    setJump((j) => j + 1);
    if (why === 'vidas') {
      // sin vidas: se acaba la partida, sin drama
      fx.bell();
      juice.banner('ไม่เป็นไร', `Sin vidas · ${s.points} puntos · nivel ${s.level}`, color.cieloHondo);
    } else {
      fx.fanfare();
      setMood('celebra');
      [0.3, 0.7, 0.5].forEach((x, k) =>
        later(() => pointIn(deckRef, x, 0.3 + k * 0.1, (at) => juice.burst(at, k === 2 ? 'estrellas' : 'confeti', 24, 180)), k * 220),
      );
      if (feria) {
        const bonus = s.lives * 20;
        s.points += bonus;
        setPoints(s.points);
        juice.banner('¡Mazo terminado!', `${s.points} puntos · +${bonus} por las vidas`, color.arrozal);
      } else juice.banner('¡Hecho!', 'ใช่ · ¡muy bien!', color.arrozal);
    }
    later(() => {
      if (s.done) return;
      s.done = true;
      onDone(score.result(s.points));
    }, 1900);
  };

  const levelUp = () => {
    const s = g.current;
    s.level += 1;
    setLevel(s.level);
    fx.levelup();
    const secs = `${(timeFor(s.level) / 1000).toFixed(1).replace('.', ',')} s por carta`;
    const sub = s.level === 2 ? (reads ? 'Sin transcripción: ¡a leer! · doradas ×3' : `${secs} · cartas doradas ×3`) : s.level === 3 ? 'Más rápido… ¡y cartas de oído!' : secs;
    juice.banner(`¡Nivel ${s.level}!`, sub, color.cieloHondo);
    // el letrero tapa la carta: su reloj no empieza hasta que se va
    setHold(true);
    later(() => {
      g.current.shownAt = clock();
      setHold(false);
    }, 1250);
  };

  const decide = (d: Deal, v: Verdict) => {
    const s = g.current;
    if (s.ended || s.decided === d.id) return;
    s.decided = d.id;
    const ok = v !== null && v === d.truth;
    s.fbN += 1;
    setFb({ n: s.fbN, ok, timeout: v === null, d });
    if (ok) {
      const combo = score.hit(true);
      onAnswer(true, d.word.id);
      const quick = feria ? Math.max(0, Math.round((1 - (clock() - s.shownAt) / timeFor(s.level)) * 10)) : 0;
      const gain = (10 * multFor(combo) + quick) * (d.golden ? 3 : 1);
      s.points += gain;
      setPoints(s.points);
      pointIn(deckRef, v ? 0.78 : 0.22, 0.42, (at) => {
        juice.celebrate(at, `+${gain}`, d.golden ? 'monedas' : combo >= 5 ? 'confeti' : 'estrellas');
      });
      if (d.golden) fx.sparkle();
      setJump((j) => j + 1);
      if (combo >= 3 || d.golden) setMood('celebra');
      if (combo > 0 && combo % 5 === 0) {
        if (feria && s.lives < LIVES) {
          // la racha devuelve una vida
          s.lives += 1;
          setLives(s.lives);
          fx.sparkle();
          toast.show('¡Vida extra!', `racha de ${combo} seguidas`, '#E2475C');
        } else toast.show(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
      }
    } else {
      score.hit(false);
      // si se acabó el tiempo quizá solo faltó rapidez: la carta vuelve, pero la palabra no baja en el repaso
      if (v !== null) onAnswer(false, d.word.id);
      juice.shake(8);
      setMood('ups');
      if (!s.retry.some((r) => r.w.id === d.word.id)) s.retry.push({ w: d.word, at: s.i + 3 });
      if (feria) {
        s.lives -= 1;
        setLives(s.lives);
      }
    }

    s.i += 1;
    const next = deck[s.i];
    // La palabra buena se oye al responder. En la lección la carta ya la dijo al aparecer: solo se repite si se
    // falló o si lo que sonó era la propuesta equivocada, y entonces la carta siguiente espera a que termine.
    const heard = !feria && thaiOf(d) === d.word.th;
    const tell = !(ok && heard) && !(feria && next?.audio);
    if (tell) say(d.word.th);
    const wait = feria ? 0 : tell ? 1150 : 150;
    const advance = () => {
      g.current.shownAt = clock() + 200;
      setI(g.current.i);
    };

    let len = deck.length;
    if (!feria) {
      // lo que se falla vuelve al final del mazo (hasta tres cartas extra), ya como repaso
      if (!ok && s.extra < 3) {
        s.extra += 1;
        s.id += 1;
        const again = makeDeal(s.id, pool, d.word, { romOf: () => romFor(reads, { feria: false, review: true }) });
        setDeck((dk) => [...dk, again]);
        len += 1;
      }
      if (s.i >= len) {
        later(() => finish('mazo'), Math.max(350, wait));
        return;
      }
      later(advance, wait);
      return;
    }
    if (s.lives <= 0) {
      later(() => finish('vidas'), 450);
      return;
    }
    if (s.i >= total) {
      later(() => finish('mazo'), 350);
      return;
    }
    if (s.i % PER_LEVEL === 0) levelUp();
    if (s.i + 2 >= len) {
      const due = s.retry.findIndex((r) => r.at <= s.i);
      const prefer = due >= 0 ? s.retry.splice(due, 1)[0].w : undefined;
      s.id += 1;
      const avoid = deck.slice(-Math.min(4, pool.length - 1)).map((x) => x.word.id);
      const more = feriaDeal(s.id, len, pool, reads, { prefer, avoid });
      setDeck((dk) => [...dk, more]);
    }
    advance();
  };

  const start = () => {
    g.current.shownAt = clock();
    setPhase('play');
  };

  const press = (yes: boolean) => {
    if (phase !== 'play' || g.current.ended) return;
    fx.tap();
    setCmd((c) => ({ n: c.n + 1, yes }));
  };

  const top = deck[i];
  const next = deck[i + 1];
  const shown = Math.min(i + 1, deck.length);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Backdrop scene="dia" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 18, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          {feria ? <Vidas lives={lives} total={LIVES} size={26} /> : <ScoreChip value={points} />}
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? (
            <>
              <LevelChip level={level} label="Nv" />
              <ScoreChip value={points} />
            </>
          ) : (
            <Pop trigger={shown} style={styles.count}>
              <Text style={styles.countText}>
                {shown}
                <Text style={{ color: color.tinta3, fontSize: 14 }}> / {deck.length}</Text>
              </Text>
            </Pop>
          )}
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            <Text style={{ color: color.laca }}>← {noTh} (no)</Text>   ¿Es correcta?   <Text style={{ color: color.arrozal }}>ใช่ (sí) →</Text>
          </Text>
        </View>

        <View ref={deckRef} style={styles.deck}>
          {top ? (
            <>
              <View pointerEvents="none" style={[styles.under, { transform: [{ translateY: 28 }, { scale: 0.88 }, { rotate: '3deg' }] }]}>
                <CardBack />
              </View>
              {next ? (
                <View pointerEvents="none" style={[styles.under, { transform: [{ translateY: 14 }, { scale: 0.94 }, { rotate: '-2deg' }] }]}>
                  <CardFace d={next} />
                </View>
              ) : null}
              {phase !== 'end' ? (
                <SwipeCard
                  key={top.id}
                  d={top}
                  cmd={cmd}
                  timeMs={feria && phase === 'play' && !hold ? timeFor(level) : 0}
                  noTh={noTh}
                  speak={phase === 'play' && (!feria || !!top.audio)}
                  onDecide={(v) => decide(top, v)}
                />
              ) : null}
            </>
          ) : null}
        </View>

        {/* alto fijo: la respuesta no empuja el mazo */}
        <View style={styles.answerSlot}>{fb ? <Answer key={fb.n} fb={fb} noTh={noTh} /> : null}</View>

        <View style={styles.buttons}>
          <Press3D onPress={() => press(false)} disabled={phase !== 'play'} style={styles.btnWrap} accessibilityLabel={`${noTh}, no es correcta`}>
            <View style={[styles.btn, { backgroundColor: '#E2474C', borderColor: '#A9262B' }]}>
              <Icon name="close" size={noTh.length > 2 ? 26 : 30} color="#FFFFFF" stroke={3.6} />
              <Th size={noTh.length > 2 ? 14 : 15} bold style={styles.btnTh}>
                {noTh}
              </Th>
            </View>
          </Press3D>
          <Noi pose={pose} size={88} jump={jump} />
          <Press3D onPress={() => press(true)} disabled={phase !== 'play'} style={styles.btnWrap} accessibilityLabel="ใช่, es correcta">
            <View style={[styles.btn, { backgroundColor: '#2DBE78', borderColor: '#13854F' }]}>
              <Icon name="check" size={32} color="#FFFFFF" stroke={3.6} />
              <Th size={15} bold style={styles.btnTh}>
                ใช่
              </Th>
            </View>
          </Press3D>
        </View>
        <ToastRibbon toast={toast.now} style={{ top: 44 }} />
      </Animated.View>
      {phase === 'count' && !tooFew ? <Countdown onDone={start} /> : null}
      {juice.layer}
    </GestureHandlerRootView>
  );
}

/** Tira con la respuesta: confirma al acertar y enseña las dos parejas al fallar. */
function Answer({ fb, noTh }: { fb: Feedback; noTh: string }) {
  const { d, ok } = fb;
  const head = ok ? (d.truth ? '¡Sí! ใช่' : `¡Bien visto! ${noTh}`) : fb.timeout ? '¡Tiempo!' : d.truth ? 'Era que sí' : 'Era que no';
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.answer, { borderColor: ok ? '#2DBE78' : '#FF8A5B' }]}>
      <Text style={[styles.answerHead, { color: ok ? color.arrozalHondo : color.lacaHondo }]}>{head}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.answerRow}>
          <Th size={17} bold numberOfLines={1} style={{ lineHeight: 24, flexShrink: 1 }}>
            {d.word.th}
          </Th>
          <View style={styles.answerRom}>
            <Rom rom={d.word.rom} size={12} />
          </View>
          <Text style={styles.answerEs} numberOfLines={1}>
            = {d.word.es}
          </Text>
        </View>
        {!d.truth ? (
          <View style={styles.answerRow}>
            <Th size={14} numberOfLines={1} style={{ lineHeight: 21, color: color.tinta2, flexShrink: 1 }}>
              {d.other.th}
            </Th>
            <Text style={[styles.answerEs, { color: color.tinta2, fontSize: 12.5 }]} numberOfLines={1}>
              = {d.other.es}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  count: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  countText: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta },
  legend: { alignSelf: 'center', marginTop: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)' },
  legendText: { fontFamily: font.uiHeavy, fontSize: 12.5, color: color.tinta2 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: CARD_H + 30 },
  under: { position: 'absolute', width: '100%', maxWidth: 340, height: CARD_H, borderRadius: 28, shadowColor: '#1D2347', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  answerSlot: { height: 64, justifyContent: 'center' },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#1D2347', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  answerHead: { fontFamily: font.displayBold, fontSize: 15, maxWidth: 92 },
  answerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, overflow: 'hidden' },
  answerRom: { flexShrink: 1, maxHeight: 17, overflow: 'hidden' },
  answerEs: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta, flexShrink: 2 },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, paddingTop: 2 },
  btnWrap: { width: 84, height: 84 },
  btn: { flex: 1, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, shadowColor: '#1D2347', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  btnTh: { color: '#FFFFFF', lineHeight: 20, marginTop: -2 },
});
