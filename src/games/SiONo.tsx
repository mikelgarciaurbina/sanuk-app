// Juego 4 · ¿Sí o บ่?: un mazo de cartas en 3D; la de arriba se arrastra con el dedo y se inclina siguiendo
// el gesto. ¿La traducción es correcta? Derecha = ใช่ (sí), izquierda = บ่ («no» en el norte). Mezcla thai →
// español y español → thai, y lo que se falla vuelve. En la feria cada carta tiene su reloj, cada vez más corto.
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

import { Backdrop } from './Backdrop';
import { Countdown, Pop, Press3D, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { LevelChip, MultChip, ScoreChip, clash, distinct, multFor, pointIn, useLater } from './palabras/common';
import { CARD_H, CardBack, CardFace, SwipeCard, type Deal, type Verdict } from './siono/Carta';
import type { GameProps } from './types';

const PER_LEVEL = 6;
type Pose = 'feliz' | 'celebra' | 'ups';
type Feedback = { n: number; ok: boolean; timeout: boolean; d: Deal };

const clock = () => Date.now();
/** Segundos por carta en la feria: empieza holgado y se acorta en cada nivel. */
const timeFor = (level: number) => Math.max(2400, 6200 - (level - 1) * 650);

function makeDeal(id: number, pool: Word[], focus: Word[], opts: { prefer?: Word; avoid?: string } = {}): Deal {
  const base = (focus.length && Math.random() < 0.6 ? focus : pool).filter((w) => w.id !== opts.avoid);
  const word = opts.prefer ?? base[Math.floor(Math.random() * base.length)] ?? pool[0];
  const dir = Math.random() < 0.3 ? 'es' : 'th';
  const others = pool.filter((w) => w.id !== word.id && !clash(w, word));
  const truth = others.length === 0 || Math.random() < 0.5;
  let other = word;
  if (!truth) {
    // distractor verosímil: de la misma familia de palabras si se puede
    const same = others.filter((w) => w.cat && w.cat === word.cat);
    const src = same.length && Math.random() < 0.7 ? same : others;
    other = src[Math.floor(Math.random() * src.length)];
  }
  return { id, word, other, truth, dir };
}

/** Juego 4 · ¿Sí o บ่?: desliza la carta según sea correcta la traducción. */
export default function SiONo({ mode, words, focus, rounds = 6, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const total = rounds;
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const deckRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  const [deck, setDeck] = useState<Deal[]>(() => {
    const out: Deal[] = [];
    for (let k = 0; k < (feria ? 3 : total); k++) out.push(makeDeal(k + 1, pool, feria ? [] : focus, { avoid: out[k - 1]?.word.id }));
    return out;
  });
  const [i, setI] = useState(0);
  const [cmd, setCmd] = useState({ n: 0, yes: true });
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [jump, setJump] = useState(0);
  const [pose, setPose] = useState<Pose>('feliz');

  const g = useRef({ i: 0, id: 100, points: 0, level: 1, ended: false, done: false, extra: 0, fbN: 0, poseN: 0, decided: -1, shownAt: 0, retry: [] as { w: Word; at: number }[] });

  const tooFew = pool.length < 2;
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

  const finish = () => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    fx.fanfare();
    setMood('celebra');
    setJump((j) => j + 1);
    [0.3, 0.7, 0.5].forEach((x, k) =>
      later(() => pointIn(deckRef, x, 0.3 + k * 0.1, (at) => juice.burst(at, k === 2 ? 'estrellas' : 'confeti', 24, 180)), k * 220),
    );
    juice.banner(feria ? '¡Mazo terminado!' : '¡Hecho!', feria ? `${s.points} puntos · nivel ${s.level}` : 'ใช่ · ¡muy bien!', color.arrozal);
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
    juice.banner(`¡Nivel ${s.level}!`, `${(timeFor(s.level) / 1000).toFixed(1).replace('.', ',')} s por carta`, color.cieloHondo);
  };

  const decide = (d: Deal, v: Verdict) => {
    const s = g.current;
    if (s.ended || s.decided === d.id) return;
    s.decided = d.id;
    const ok = v !== null && v === d.truth;
    s.fbN += 1;
    setFb({ n: s.fbN, ok, timeout: v === null, d });
    say(d.word.th);
    if (ok) {
      const combo = score.hit(true);
      onAnswer(true, d.word.id);
      const quick = feria ? Math.max(0, Math.round((1 - (clock() - s.shownAt) / timeFor(s.level)) * 10)) : 0;
      const gain = 10 * multFor(combo) + quick;
      s.points += gain;
      setPoints(s.points);
      pointIn(deckRef, v ? 0.78 : 0.22, 0.42, (at) => juice.celebrate(at, `+${gain}`, combo >= 5 ? 'confeti' : 'estrellas'));
      setJump((j) => j + 1);
      if (combo >= 3) setMood('celebra');
      if (combo > 0 && combo % 5 === 0) juice.banner(`¡Racha ×${combo}!`, 'los puntos se multiplican', color.farol);
    } else {
      score.hit(false);
      onAnswer(false, d.word.id);
      juice.shake(8);
      setMood('ups');
      if (!s.retry.some((r) => r.w.id === d.word.id)) s.retry.push({ w: d.word, at: s.i + 3 });
    }

    s.i += 1;
    let len = deck.length;
    if (!feria) {
      // lo que se falla vuelve al final del mazo (hasta tres cartas extra)
      if (!ok && s.extra < 3) {
        s.extra += 1;
        s.id += 1;
        setDeck((dk) => [...dk, makeDeal(s.id, pool, focus, { prefer: d.word })]);
        len += 1;
      }
      if (s.i >= len) {
        later(finish, 350);
        return;
      }
    } else {
      if (s.i >= total) {
        later(finish, 350);
        return;
      }
      if (s.i % PER_LEVEL === 0) levelUp();
      if (s.i + 2 >= len) {
        const due = s.retry.findIndex((r) => r.at <= s.i);
        const prefer = due >= 0 ? s.retry.splice(due, 1)[0].w : undefined;
        s.id += 1;
        setDeck((dk) => [...dk, makeDeal(s.id, pool, [], { prefer, avoid: dk[dk.length - 1]?.word.id })]);
      }
    }
    s.shownAt = clock() + 200;
    setI(s.i);
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
  const shown = Math.min(i + 1, feria ? total : deck.length);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Backdrop scene="dia" />
      <Animated.View style={[{ flex: 1, paddingHorizontal: 18, paddingTop: 4 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <ScoreChip value={points} />
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? <LevelChip level={level} /> : null}
          <Pop trigger={shown} style={styles.count}>
            <Text style={styles.countText}>
              {shown}
              <Text style={{ color: color.tinta3, fontSize: 14 }}> / {feria ? total : deck.length}</Text>
            </Text>
          </Pop>
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            <Text style={{ color: color.laca }}>← บ่ (no)</Text>   ¿Es correcta?   <Text style={{ color: color.arrozal }}>ใช่ (sí) →</Text>
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
                <SwipeCard key={top.id} d={top} cmd={cmd} timeMs={feria && phase === 'play' ? timeFor(level) : 0} showRom onDecide={(v) => decide(top, v)} />
              ) : null}
            </>
          ) : null}
        </View>

        <View style={{ minHeight: 58, justifyContent: 'center' }}>{fb ? <Answer key={fb.n} fb={fb} /> : null}</View>

        <View style={styles.buttons}>
          <Press3D onPress={() => press(false)} disabled={phase !== 'play'} style={styles.btnWrap} accessibilityLabel="บ่, no es correcta">
            <View style={[styles.btn, { backgroundColor: '#E2474C', borderColor: '#A9262B' }]}>
              <Icon name="close" size={30} color="#FFFFFF" stroke={3.6} />
              <Th size={15} bold style={styles.btnTh}>
                บ่
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
      </Animated.View>
      {phase === 'count' && !tooFew ? <Countdown onDone={start} /> : null}
      {juice.layer}
    </GestureHandlerRootView>
  );
}

/** Tira con la respuesta: confirma al acertar y enseña las dos parejas al fallar. */
function Answer({ fb }: { fb: Feedback }) {
  const { d, ok } = fb;
  const head = ok ? (d.truth ? '¡Sí! ใช่' : '¡Bien visto! บ่') : fb.timeout ? '¡Tiempo!' : d.truth ? 'Era que sí' : 'Era que no';
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.answer, { borderColor: ok ? '#2DBE78' : '#FF8A5B' }]}>
      <Text style={[styles.answerHead, { color: ok ? color.arrozalHondo : color.lacaHondo }]}>{head}</Text>
      <View style={{ flex: 1 }}>
        <View style={styles.answerRow}>
          <Th size={17} bold style={{ lineHeight: 24 }}>
            {d.word.th}
          </Th>
          <Rom rom={d.word.rom} size={12} />
          <Text style={styles.answerEs} numberOfLines={1}>
            = {d.word.es}
          </Text>
        </View>
        {!d.truth ? (
          <View style={styles.answerRow}>
            <Th size={14} style={{ lineHeight: 21, color: color.tinta2 }}>
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
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  count: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  countText: { fontFamily: font.displayBold, fontSize: 18, color: color.tinta },
  legend: { alignSelf: 'center', marginTop: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)' },
  legendText: { fontFamily: font.uiHeavy, fontSize: 12.5, color: color.tinta2 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: CARD_H + 30 },
  under: { position: 'absolute', width: '100%', maxWidth: 340, height: CARD_H, borderRadius: 28, shadowColor: '#1D2347', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2.5, paddingHorizontal: 12, paddingVertical: 6, shadowColor: '#1D2347', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  answerHead: { fontFamily: font.displayBold, fontSize: 15, maxWidth: 92 },
  answerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  answerEs: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta, flexShrink: 1 },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, paddingTop: 2 },
  btnWrap: { width: 84, height: 84 },
  btn: { flex: 1, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 6, shadowColor: '#1D2347', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  btnTh: { color: '#FFFFFF', lineHeight: 20, marginTop: -2 },
});
