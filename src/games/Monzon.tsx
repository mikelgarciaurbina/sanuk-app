// Juego 3 · Monzón: cae la lluvia sobre el arrozal y cada gota lleva una palabra thai. Toca la que te piden
// antes de que se hunda en el agua: revienta en gotitas, suena y el arrozal crece y verdea. En la feria hay
// paraguas como vidas, niveles con relámpago (más rápido, más gotas, avisos solo de oído) y gotas doradas.
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Rom, Th } from '@/components/ui';
import type { Word } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { pick, rand } from '@/lib/random';

import { Backdrop } from './Backdrop';
import { Countdown, Pop, Press3D, tapPoint, useJuice } from './fx';
import { ComboBadge, useScore } from './kit';
import { Arcoiris, Arrozal, FIELD_H, Paraguas, Rayo } from './monzon/Escena';
import { DROP_H, DROP_W, Gota, type DropState } from './monzon/Gota';
import { LevelChip, MultChip, ScoreChip, clash, distinct, multFor, pickWords, useLater } from './palabras/common';
import type { GameProps } from './types';

const LIVES = 3;
const PER_LEVEL = 6;

type Drop = { id: number; word: Word; x: number; dur: number; golden: boolean; state: DropState };
type Prompt = { word: Word; audio: boolean; n: number };
type Feedback = { n: number; kind: 'ok' | 'bad' | 'missed'; word: Word; tapped?: Word };

/** Duración de la caída: lenta en la lección, cada vez más rápida en la feria. */
/** Azar fuera del render (solo se usa en manejadores y temporizadores). */
const chance = (p: number) => Math.random() < p;
const lane0 = (n: number) => Math.floor(Math.random() * n);

const durFor = (feria: boolean, level: number) => (feria ? Math.max(2500, 7200 - (level - 1) * 650) : 8400);

/** Juego 3 · Monzón: toca la gota con la palabra que te piden antes de que riegue el arrozal. */
export default function Monzon({ mode, words, focus, rounds = 8, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const later = useLater();
  const fieldRef = useRef<ComponentRef<typeof View>>(null);

  const [pool] = useState(() => distinct([...focus, ...words]));
  const [list] = useState(() => (feria ? [] : pickWords(rounds, { focus, pool })));
  const total = feria ? rounds : list.length;
  const [first] = useState<Prompt | null>(() => (feria || !list.length ? null : { word: list[0], audio: false, n: 0 }));
  const [prompt, setPrompt] = useState<Prompt | null>(first);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [phase, setPhase] = useState<'count' | 'play' | 'end'>(feria ? 'count' : 'play');
  const [lives, setLives] = useState(LIVES);
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [hits, setHits] = useState(0);
  const [bolt, setBolt] = useState(0);
  const [fb, setFb] = useState<Feedback | null>(null);
  const [jump, setJump] = useState(0);
  const [rainbow, setRainbow] = useState(false);
  const [field, setField] = useState({ w: 0, h: 0 });

  const g = useRef({
    id: 0,
    n: 0,
    hits: 0,
    lives: LIVES,
    level: 1,
    points: 0,
    ended: false,
    done: false,
    prompt: first,
    drops: [] as Drop[],
    lanes: [] as number[],
    sinceTarget: 0,
    goldenNext: false,
    retry: [] as Word[],
    recent: [] as string[],
    fb: 0,
    w: 0,
    h: 0,
    ox: 0,
    oy: 0,
  });

  const tooFew = pool.length < 2;
  const bail = useEffectEvent(() => onDone(score.result(0)));
  useEffect(() => {
    if (!tooFew) return;
    const t = setTimeout(() => bail(), 400);
    return () => clearTimeout(t);
  }, [tooFew]);

  const fallTo = Math.max(0, field.h - FIELD_H * 0.42 - DROP_H * 0.62);

  // ——— gotas ———

  const putDrops = (fn: (l: Drop[]) => Drop[]) => {
    const s = g.current;
    s.drops = fn(s.drops);
    setDrops(s.drops);
  };
  const setDropState = (id: number, state: DropState) => putDrops((l) => l.map((d) => (d.id === id ? { ...d, state } : d)));
  const removeDrop = (id: number) => putDrops((l) => l.filter((d) => d.id !== id));

  const tell = (kind: Feedback['kind'], word: Word, tapped?: Word) => {
    g.current.fb += 1;
    setFb({ n: g.current.fb, kind, word, tapped });
  };

  // ——— finales ———

  const endGame = (why: 'paraguas' | 'arcoiris') => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    setPhase('end');
    putDrops((l) => l.map((d) => (d.state === 'fall' ? { ...d, state: 'pop' } : d)));
    if (why === 'paraguas') {
      fx.bell();
      juice.banner('¡Sin paraguas!', `${s.points} puntos · nivel ${s.level}`, color.cieloHondo);
    } else {
      setRainbow(true);
      fx.fanfare();
      juice.flash('#FFF6D6');
      juice.banner('¡Arcoíris!', feria ? `${s.points} puntos` : 'El arrozal ya está verde', color.arrozal);
      setJump((j) => j + 1);
    }
    later(() => {
      if (s.done) return;
      s.done = true;
      onDone(score.result(s.points));
    }, 2600);
  };

  const loseLife = () => {
    const s = g.current;
    s.lives -= 1;
    setLives(s.lives);
    juice.shake(10);
    if (s.lives <= 0) endGame('paraguas');
  };

  // ——— avisos ———

  const showPrompt = (p: Prompt) => {
    g.current.prompt = p;
    g.current.sinceTarget = 2;
    setPrompt(p);
    if (p.audio) later(() => say(p.word.th), 350);
  };

  const nextPrompt = () => {
    const s = g.current;
    if (s.ended) return;
    s.n += 1;
    if (s.n >= total) {
      // ya no hay gota buena: las que quedan caen sin contar
      s.prompt = null;
      later(() => endGame('arcoiris'), 500);
      return;
    }
    let word: Word | undefined;
    if (!feria) word = list[s.n];
    else {
      const last = s.prompt?.word.id;
      s.retry = s.retry.filter((w) => w.id !== last);
      const retry = s.retry.length && chance(0.5) ? s.retry.shift() : undefined;
      const fresh = pool.filter((w) => !s.recent.includes(w.id));
      word = retry ?? (fresh.length ? pick(fresh) : pool[0]);
      s.recent = [word.id, ...s.recent].slice(0, Math.min(5, pool.length - 1));
    }
    if (!word) return;
    showPrompt({ word, audio: feria && s.level >= 3 && chance(0.3), n: s.n });
  };

  const start = () => {
    const s = g.current;
    setPhase('play');
    if (!pool.length) return;
    const word = pick(pool);
    s.recent = [word.id];
    showPrompt({ word, audio: false, n: 0 });
  };

  const levelUp = () => {
    const s = g.current;
    s.level += 1;
    setLevel(s.level);
    setBolt((b) => b + 1);
    fx.boom();
    juice.flash('#EEF4FF');
    juice.banner(`¡Nivel ${s.level}!`, s.level === 3 ? 'Más rápido… ¡y a veces solo se oye!' : '¡Más rápido!', color.cieloHondo);
    later(() => fx.levelup(), 260);
  };

  // ——— caer y tocar ———

  const land = (id: number) => {
    const s = g.current;
    const d = s.drops.find((x) => x.id === id);
    if (!d) return;
    removeDrop(id);
    if (d.state !== 'fall' || s.ended) return;
    juice.burst({ x: s.ox + d.x + DROP_W / 2, y: s.oy + fallTo + DROP_H * 0.85 }, 'gotas', 7, 60);
    if (!s.prompt || d.word.id !== s.prompt.word.id) return;
    // se ha escapado la gota buena
    score.hit(false);
    onAnswer(false, d.word.id);
    if (!s.retry.some((w) => w.id === d.word.id)) s.retry.push(d.word);
    tell('missed', d.word);
    say(d.word.th);
    if (feria) {
      loseLife();
      if (s.lives > 0) nextPrompt();
    }
    // en la lección la gota vuelve a caer hasta que la toques
  };

  const spawn = (word: Word) => {
    const s = g.current;
    const lanes = Math.max(2, Math.floor((s.w - 8) / (DROP_W * 0.82)));
    let lane = lane0(lanes);
    for (let k = 0; k < 5 && s.lanes.includes(lane); k++) lane = lane0(lanes);
    s.lanes = [lane, ...s.lanes].slice(0, Math.min(2, lanes - 1));
    const step = (s.w - DROP_W - 8) / Math.max(1, lanes - 1);
    const x = Math.max(4, Math.min(s.w - DROP_W - 4, 4 + lane * step + rand(-6, 6)));
    const golden = !!s.prompt && word.id === s.prompt.word.id && s.goldenNext;
    const dur = durFor(feria, s.level) * rand(0.92, 1.08);
    s.id += 1;
    const d: Drop = { id: s.id, word, x, dur, golden, state: 'fall' };
    putDrops((l) => [...l, d]);
    later(() => land(d.id), dur);
  };

  const spawnTick = useEffectEvent((): number => {
    const s = g.current;
    if (s.ended || !s.prompt || s.w === 0) return 400;
    const falling = s.drops.filter((d) => d.state === 'fall');
    const max = feria ? Math.min(6, 3 + Math.floor((s.level - 1) / 2)) : 3;
    const gap = feria ? Math.max(620, 1500 - (s.level - 1) * 140) : 1900;
    if (falling.length >= max) return 300;
    const target = s.prompt.word;
    const targetFalling = falling.some((d) => d.word.id === target.id);
    if (!targetFalling && (s.sinceTarget >= 2 || chance(0.5))) {
      s.sinceTarget = 0;
      spawn(target);
      return gap;
    }
    const others = pool.filter((w) => w.id !== target.id && !clash(w, target) && !falling.some((d) => d.word.id === w.id || clash(d.word, w)));
    if (!others.length) return 300;
    s.sinceTarget += 1;
    spawn(pick(others));
    return gap;
  });
  useEffect(() => {
    if (phase !== 'play') return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(loop, spawnTick());
    };
    t = setTimeout(loop, 450);
    return () => clearTimeout(t);
  }, [phase]);

  const tap = (d: Drop, e: GestureResponderEvent) => {
    const s = g.current;
    if (s.ended || d.state !== 'fall' || !s.prompt) return;
    const at = tapPoint(e);
    const target = s.prompt.word;
    if (d.word.id === target.id) {
      const combo = score.hit(true);
      onAnswer(true, d.word.id);
      say(d.word.th);
      fx.plip();
      const gain = 10 * multFor(combo) * (d.golden ? 3 : 1);
      s.points += gain;
      s.hits += 1;
      setPoints(s.points);
      setHits(s.hits);
      setDropState(d.id, 'pop');
      later(() => removeDrop(d.id), 240);
      juice.burst(at, 'gotas', 16, 150);
      juice.ring(at, '#DDF0FF', 104);
      juice.float(at, `+${gain}`, '#0F3F9E', 30);
      tell('ok', d.word);
      setJump((j) => j + 1);
      if (d.golden) {
        s.goldenNext = false;
        fx.sparkle();
        juice.burst(at, 'monedas', 12, 130);
        if (feria && s.lives < LIVES) {
          s.lives += 1;
          setLives(s.lives);
          juice.banner('¡Paraguas extra!', 'la gota dorada te protege', color.buatong);
        }
      } else if (combo > 0 && combo % 5 === 0) {
        s.goldenNext = true;
        juice.banner(`¡Racha ×${combo}!`, 'la próxima gota buena será dorada', color.buatong);
      }
      if (feria && s.hits % PER_LEVEL === 0) levelUp();
      nextPrompt();
      return;
    }
    score.hit(false);
    onAnswer(false, target.id);
    if (!s.retry.some((w) => w.id === target.id)) s.retry.push(target);
    setDropState(d.id, 'bad');
    later(() => removeDrop(d.id), 560);
    juice.shake(6);
    tell('bad', target, d.word);
    if (feria) loseLife();
  };

  const onField = (w: number, h: number) => {
    const s = g.current;
    s.w = w;
    s.h = h;
    setField({ w, h });
    fieldRef.current?.measureInWindow((x, y) => {
      s.ox = x;
      s.oy = y;
    });
  };

  const grow = Math.min(1, hits / Math.max(1, feria ? 30 : total));

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="lluvia" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          {feria ? (
            <View style={{ flexDirection: 'row', gap: 2 }}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Paraguas key={i} lost={i >= lives} />
              ))}
            </View>
          ) : (
            <Pop trigger={hits} style={styles.prog}>
              <Text style={styles.progText}>
                {Math.min(hits, total)}
                <Text style={{ fontSize: 14, color: '#DCE6F5' }}> / {total}</Text>
              </Text>
            </Pop>
          )}
          <View style={styles.hudMid}>
            <ComboBadge combo={score.combo} />
            <MultChip mult={multFor(score.combo)} />
          </View>
          {feria ? <LevelChip level={level} /> : null}
          <ScoreChip value={points} />
        </View>

        <Cartel prompt={prompt} fb={fb} />

        <View ref={fieldRef} style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => onField(e.nativeEvent.layout.width, e.nativeEvent.layout.height)}>
          {field.w > 0 ? <Arcoiris width={field.w} show={rainbow} /> : null}
          {field.w > 0 ? <Arrozal width={field.w} grow={rainbow ? 1 : grow} ripe={rainbow} /> : null}
          {drops.map((d) => (
            <Gota key={d.id} word={d.word} x={d.x} fallTo={fallTo} dur={d.dur} state={d.state} golden={d.golden} onPress={(e) => tap(d, e)} />
          ))}
          <View pointerEvents="none" style={styles.noi}>
            <Noi pose={phase === 'end' ? 'celebra' : 'feliz'} size={64} jump={jump} />
          </View>
          {field.w > 0 ? <Rayo n={bolt} width={field.w} /> : null}
        </View>
      </Animated.View>
      {phase === 'count' && !tooFew ? <Countdown onDone={start} /> : null}
      {juice.layer}
    </View>
  );
}

/** Cartel de madera colgado bajo las nubes con lo que hay que buscar (o un altavoz si es de oído). */
function Cartel({ prompt, fb }: { prompt: Prompt | null; fb: Feedback | null }) {
  const w = prompt?.word;
  return (
    <View style={styles.cartelWrap}>
      <View style={{ height: 12, marginBottom: -3 }}>
        <View style={[styles.rope, { left: '16%' }]} />
        <View style={[styles.rope, { right: '16%' }]} />
      </View>
      <Pop trigger={prompt?.n ?? -1} scale={1.08} style={styles.cartel}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 300 100">
          <Defs>
            <LinearGradient id="mzWood" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#E3B27A" />
              <Stop offset="0.55" stopColor="#C98A4E" />
              <Stop offset="1" stopColor="#9E6232" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={100} rx={14} fill="url(#mzWood)" />
          <Path d="M10 30 Q150 24 290 32 M10 62 Q150 70 290 60" stroke="#8A5226" strokeOpacity={0.35} strokeWidth={2} fill="none" />
          <Rect x={6} y={5} width={288} height={6} rx={3} fill="#FFFFFF" opacity={0.28} />
          <Circle cx={16} cy={16} r={3.4} fill="#6E4422" />
          <Circle cx={284} cy={16} r={3.4} fill="#6E4422" />
        </Svg>
        {!w ? (
          <Text style={styles.cartelSmall}>Prepárate…</Text>
        ) : prompt.audio ? (
          <Press3D onPress={() => say(w.th)} style={{ alignSelf: 'stretch' }} accessibilityLabel="Escuchar otra vez">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 4 }}>
              <View style={styles.speaker}>
                <Icon name="speaker" size={26} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.cartelSmall}>¡Escucha y toca la gota!</Text>
                <Text style={styles.cartelHint}>toca aquí para oírla otra vez</Text>
              </View>
            </View>
          </Press3D>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.cartelSmall}>Toca la gota de…</Text>
            <Text numberOfLines={2} style={[styles.cartelBig, w.es.length > 18 ? { fontSize: 19, lineHeight: 23 } : null]}>
              {w.emoji ? `${w.emoji} ` : ''}«{w.es}»
            </Text>
          </View>
        )}
      </Pop>
      <View style={{ minHeight: 34, alignItems: 'center', marginTop: 4 }}>{fb ? <FeedbackPill key={fb.n} fb={fb} /> : null}</View>
    </View>
  );
}

function FeedbackPill({ fb }: { fb: Feedback }) {
  const ok = fb.kind === 'ok';
  return (
    <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.pill, { borderColor: ok ? '#2DBE78' : '#FF8A5B' }]}>
      <Th size={16} bold style={{ lineHeight: 23 }}>
        {fb.word.th}
      </Th>
      <Rom rom={fb.word.rom} size={11.5} />
      <Text numberOfLines={1} style={[styles.pillText, { color: ok ? color.arrozalHondo : color.lacaHondo }]}>
        {ok ? `= ${fb.word.es}` : fb.kind === 'missed' ? `= ${fb.word.es} · ¡se escapó!` : `= ${fb.word.es}`}
      </Text>
      {fb.tapped ? (
        <Text numberOfLines={1} style={styles.pillSub}>
          {fb.tapped.th} es «{fb.tapped.es}»
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 14, paddingTop: 4 },
  hudMid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  prog: { height: 36, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: 'rgba(20,30,52,0.45)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  progText: { fontFamily: font.displayBold, fontSize: 19, color: '#FFFFFF' },
  cartelWrap: { paddingHorizontal: 22, marginTop: -2 },
  cartel: {
    minHeight: 76,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#1B2438',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cartelSmall: { fontFamily: font.uiHeavy, fontSize: 13, color: '#5A3416', textAlign: 'center' },
  cartelHint: { fontFamily: font.uiBold, fontSize: 11.5, color: '#7A4A22', textAlign: 'center' },
  cartelBig: { fontFamily: font.displayBold, fontSize: 25, color: '#3A1F0B', textAlign: 'center' },
  speaker: { width: 46, height: 46, borderRadius: 23, backgroundColor: color.cielo, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: color.cieloHondo },
  pill: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: 6, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 2, maxWidth: '100%' },
  pillSub: { width: '100%', textAlign: 'center', fontFamily: font.uiBold, fontSize: 12, color: color.tinta2 },
  pillText: { fontFamily: font.uiHeavy, fontSize: 13, flexShrink: 1 },
  noi: { position: 'absolute', left: 6, bottom: 2 },
  rope: { position: 'absolute', top: -6, width: 3, height: 20, borderRadius: 2, backgroundColor: '#5A3A20' },
});
