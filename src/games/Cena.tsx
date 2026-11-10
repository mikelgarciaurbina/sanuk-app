import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Txt } from '@/components/ui';
import { DIALOGUES } from '@/content';
import type { Dialogue, DialogueLine } from '@/content/types';
import { fx, say } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { personalize, personalizeRom } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { AnswerCard, MyBubble, SpeakerBubble, Warmth, type CardState, type Said } from './cena/cards';
import { Person, type Face, type Who } from './cena/family';
import { Khantoke } from './cena/table';
import { Pop, tapPoint, useJuice, type Point } from './fx';
import { ComboBadge, useScore } from './kit';
import type { GameProps } from './types';

type Option = NonNullable<DialogueLine['options']>[number];
type ViewRef = ComponentRef<typeof View>;
type Phase = 'talk' | 'postre' | 'fin';
type Sweet = { q: Said & { who: Who }; opts: string[]; listen: boolean };

const NAME: Record<Who, string> = { Mae: 'Mae', Pho: 'Pho', Yai: 'Yai', Nong: 'Nong', Lung: 'Lung', Noi: 'Noi' };
const ROLE: Record<Who, string> = { Mae: 'mamá', Pho: 'papá', Yai: 'abuela', Nong: 'hermana pequeña', Lung: 'tío', Noi: 'tu guía' };
const TINT: Record<Who, string> = { Mae: '#13807F', Pho: '#2B3A86', Yai: '#9C3556', Nong: '#C77A00', Lung: '#2E7A45', Noi: '#3D7BFF' };
/** Sitio fijo en la mesa (Yai y Mae en el centro). */
const SEAT: Who[] = ['Lung', 'Pho', 'Yai', 'Mae', 'Nong', 'Noi'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const now = () => Date.now();

/** Juego 15 · Cena familiar: conversa con la familia alrededor del khantoke y elige qué decir. */
export default function Cena({ mode, extra, gender, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const { height: winH } = useWindowDimensions();
  const [dlg] = useState<Dialogue>(() => (extra?.kind === 'dialogo' && DIALOGUES[extra.id]) || pick(Object.values(DIALOGUES)));
  const lines = dlg.lines;
  const asked = Math.max(1, lines.filter((l) => l.options?.length).length);
  // alto de las cartas de cada pregunta (las frases largas ocupan dos líneas): el panel no cambia de tamaño
  const cardH = (o: Option) => 70 + (personalize(o.th, gender).length > 24 ? 26 : 0) + (o.rom.length + o.es.length > 44 ? 16 : 0);
  const tallest = Math.max(3 * 70 + 16, ...lines.map((l) => (l.options ?? []).reduce((a, o) => a + cardH(o) + 8, -8)));
  const speakers = SEAT.filter((w) => lines.some((l) => l.who === w));
  // la familia entera se sienta a cenar aunque no hable: al menos tres a la mesa
  const extras = (['Yai', 'Mae', 'Pho', 'Nong', 'Lung'] as Who[]).filter((w) => !speakers.includes(w)).slice(0, Math.max(0, 3 - speakers.length));
  const people = SEAT.filter((w) => speakers.includes(w) || extras.includes(w));

  const [phase, setPhase] = useState<Phase>('talk');
  const [idx, setIdx] = useState(0);
  const [speaker, setSpeaker] = useState<Who | null>(null);
  const [thinking, setThinking] = useState(false);
  const [talking, setTalking] = useState<Who | null>(null);
  const [bubble, setBubble] = useState<{ line: Said; key: number } | null>(null);
  const [showEs, setShowEs] = useState(false);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [right, setRight] = useState<string | null>(null);
  const [mine, setMine] = useState<Said | null>(null);
  const [faces, setFaces] = useState<Partial<Record<Who, Face>>>({});
  const [jumps, setJumps] = useState<Partial<Record<Who, number>>>({});
  const [warmth, setWarmth] = useState(0.06);
  const [points, setPoints] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [sweets, setSweets] = useState<Sweet[]>([]);
  const [sq, setSq] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [misses, setMisses] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = useRef(0);
  const cardsAt = useRef(0);
  const tally = useRef(0);
  const mistakes = useRef(0);
  const finished = useRef(false);
  /** Lo que la familia ha dicho de verdad en esta cena (para las preguntas del postre). */
  const heard = useRef<(Said & { who: Who })[]>([]);
  const stageRef = useRef<ViewRef>(null);
  const self = useRef<{ start: () => void } | null>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const P = (s: string) => personalize(s, gender);
  const PR = (s: string) => personalizeRom(s, gender);
  const setFace = (who: Who, f: Face) => setFaces((fs) => ({ ...fs, [who]: f }));
  const hop = (who: Who) => setJumps((js) => ({ ...js, [who]: (js[who] ?? 0) + 1 }));
  const addPoints = (n: number) => {
    tally.current += n;
    setPoints(tally.current);
  };

  // ——— Dibujo: dónde se sienta cada uno ———
  const sw = stage.w;
  const sh = stage.h;
  const tableW = Math.min(sw * 1.04, 440, (sh * 0.42 * 360) / 150);
  const tableH = (tableW * 150) / 360;
  const tableTop = sh - tableH + (tableW / 360) * 22;
  const n = Math.max(1, people.length);
  const size = clamp(Math.min((sw / Math.max(n, 2.4)) * 0.92, sh * 0.4), 68, 140);
  const seatX = (w: Who) => {
    const i = people.indexOf(w);
    return (sw * (i + 0.5)) / n;
  };
  const compact = sh < 300;
  const seatTop = (w: Who) => tableTop - size * 1.1 * (compact ? 0.66 : 0.8) + Math.abs(people.indexOf(w) - (n - 1) / 2) * size * 0.06;

  /** Punto de la pantalla sobre la cabeza de alguien (para los corazones). */
  const atHead = (who: Who, cb: (p: Point) => void) =>
    stageRef.current?.measureInWindow((x, y) => cb({ x: x + seatX(who), y: y + seatTop(who) + size * 0.45 }));

  const speak = (who: Who, th: string) => {
    setTalking(who);
    say(th, { onDone: () => setTalking((t) => (t === who ? null : t)) });
    later(() => setTalking((t) => (t === who ? null : t)), 900 + th.length * 95);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const res = score.result();
    onDone(score.result(feria ? tally.current : res.correct));
  };

  const endDinner = () => {
    setPhase('fin');
    setOptions(null);
    setSpeaker(null);
    setThinking(false);
    setMine(null);
    setFaces(Object.fromEntries(people.map((w) => [w, 'love' as Face])));
    setWarmth((w) => Math.max(w, mistakes.current === 0 ? 1 : w));
    people.forEach((w, i) => later(() => hop(w), i * 140));
    if (feria && mistakes.current === 0) {
      addPoints(200);
      later(() => juice.banner('¡Cena perfecta!', '+200 · ni un fallo', color.farol), 300);
    }
    if (feria) fx.fanfare();
    else fx.done();
    later(() => juice.burst(undefined, 'corazones', 26, 170), 200);
    later(() => juice.burst(undefined, 'confeti', 20, 160), 700);
  };

  const showSweet = (list: Sweet[], i: number) => {
    const s = list[i];
    setSq(i);
    setPicked(null);
    setSpeaker(s.q.who);
    seq.current += 1;
    setBubble({ line: s.q, key: seq.current });
    setShowEs(false);
    later(() => {
      speak(s.q.who, s.q.th);
      cardsAt.current = now();
    }, 350);
  };

  const startDessert = () => {
    setOptions(null);
    setMine(null);
    setThinking(false);
    const seen = new Set<string>();
    const pool = heard.current.filter((l) => (seen.has(l.es) ? false : (seen.add(l.es), true)));
    const count = pool.length < 3 ? 0 : feria ? 3 : 1;
    if (!count) {
      endDinner();
      return;
    }
    const list: Sweet[] = shuffle(pool)
      .slice(0, count)
      .map((q, i) => ({ q, opts: shuffle([q.es, ...shuffle(pool.filter((p) => p.es !== q.es)).slice(0, 2).map((p) => p.es)]), listen: feria && i === count - 1 }));
    setSweets(list);
    setPhase('postre');
    setSpeaker(null);
    setBubble(null);
    fx.levelup();
    juice.banner('¡Hora del postre!', '¿Te acuerdas de lo que han dicho?', color.buatong);
    later(() => showSweet(list, 0), 1500);
  };

  const showLine = (k: number) => {
    const line = lines[k];
    if (!line) {
      startDessert();
      return;
    }
    setIdx(k);
    setOptions(null);
    setWrong([]);
    setRight(null);
    setHint(null);
    setShowEs(false);
    setSpeaker(line.who);
    setThinking(true);
    later(() => {
      setThinking(false);
      setMine(null);
      const said = { th: P(line.th), rom: PR(line.rom), es: line.es };
      heard.current.push({ ...said, who: line.who });
      seq.current += 1;
      setBubble({ line: said, key: seq.current });
      speak(line.who, said.th);
      const typing = Math.min(2400, said.th.length * 42);
      if (line.options?.length) {
        later(() => {
          setOptions(shuffle(line.options!));
          fx.flip();
          cardsAt.current = now();
        }, typing + 300);
      } else later(() => showLine(k + 1), Math.max(2000, typing + 1400));
    }, k === 0 ? 1100 : 700);
  };

  useEffect(() => {
    self.current = { start: () => showLine(0) };
  });
  useEffect(() => {
    const all = timers.current;
    const t = setTimeout(() => self.current?.start(), 300);
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
    };
  }, []);

  // ——— Respuestas ———

  const choose = (o: Option, e: GestureResponderEvent) => {
    if (phase !== 'talk' || !options || right || wrong.includes(o.th)) return;
    const line = lines[idx];
    if (!o.ok) {
      score.hit(false);
      onAnswer(false);
      mistakes.current += 1;
      setMisses(mistakes.current);
      setWrong((w) => [...w, o.th]);
      setShowEs(true);
      setFace(line.who, 'confused');
      setWarmth((w) => Math.max(0.04, w - 0.04));
      juice.shake(6);
      setHint(`Mmm, esa no encaja. ${NAME[line.who]} ha dicho: «${line.es}»`);
      later(() => setFace(line.who, 'idle'), 1900);
      return;
    }
    const combo = score.hit(true);
    onAnswer(true);
    const first = wrong.length === 0;
    let gain = first ? 100 : 40;
    if (feria && first) gain += Math.max(0, Math.round(50 * (1 - (now() - cardsAt.current) / 9000))) + Math.min(5, combo - 1) * 20;
    addPoints(gain);
    setRight(o.th);
    setHint(null);
    setWarmth((w) => Math.min(1, w + (first ? 1 : 0.55) / asked));
    juice.celebrate(tapPoint(e), feria ? `+${gain}` : first ? '¡Eso es!' : '¡Ahora sí!', 'corazones');
    later(() => atHead(line.who, (p) => juice.burst(p, 'corazones', 14, 100)), 250);
    setFaces((fs) => ({ ...Object.fromEntries(people.map((w) => [w, 'happy' as Face])), ...fs, [line.who]: first ? 'love' : 'happy' }));
    hop(line.who);
    later(() => setFaces((fs) => Object.fromEntries(Object.keys(fs).map((w) => [w, 'idle' as Face]))), 2600);
    const said = { th: P(o.th), rom: PR(o.rom), es: o.es };
    later(() => {
      setOptions(null);
      setMine(said);
      say(said.th);
    }, 650);
    const nextLine = lines[idx + 1];
    const r = o.reply;
    if (r && !(nextLine && P(nextLine.th) === P(r.th))) {
      later(() => {
        setThinking(true);
        later(() => {
          setThinking(false);
          const rs = { th: P(r.th), rom: PR(r.rom), es: r.es };
          heard.current.push({ ...rs, who: line.who });
          seq.current += 1;
          setBubble({ line: rs, key: seq.current });
          setShowEs(false);
          setMine(null);
          speak(line.who, rs.th);
          later(() => showLine(idx + 1), Math.max(2100, rs.th.length * 42 + 1500));
        }, 650);
      }, 2300);
    } else later(() => showLine(idx + 1), 2600);
  };

  const chooseSweet = (es: string, e: GestureResponderEvent) => {
    const s = sweets[sq];
    if (phase !== 'postre' || !s || picked) return;
    setPicked(es);
    const ok = es === s.q.es;
    const combo = score.hit(ok);
    onAnswer(ok);
    setShowEs(true);
    if (ok) {
      const gain = 50 + (feria ? Math.min(5, combo - 1) * 10 : 0);
      addPoints(gain);
      juice.celebrate(tapPoint(e), feria ? `+${gain}` : '¡Bien!', 'estrellas');
      setFace(s.q.who, 'love');
      hop(s.q.who);
      setWarmth((w) => Math.min(1, w + 0.05));
    } else {
      mistakes.current += 1;
      setMisses(mistakes.current);
      juice.shake(6);
      setFace(s.q.who, 'confused');
      later(() => speak(s.q.who, s.q.th), 500);
    }
    later(() => {
      setFace(s.q.who, 'idle');
      if (sq + 1 < sweets.length) showSweet(sweets, sq + 1);
      else endDinner();
    }, ok ? 1600 : 2600);
  };

  // ——— Interfaz ———

  const cur = phase === 'talk' ? lines[idx] : null;
  const sweet = phase === 'postre' ? sweets[sq] : null;
  const panelH = Math.min(tallest + (winH < 720 ? 48 : 58), winH * 0.5);
  const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="casa" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title} numberOfLines={1}>
              {dlg.title}
            </Text>
            <Warmth value={warmth} dark />
          </View>
          {score.combo >= 2 ? (
            <View style={styles.pill}>
              <ComboBadge combo={score.combo} />
            </View>
          ) : null}
          {feria ? (
            <Pop trigger={points} style={styles.pill}>
              <Icon name="heart" size={16} color={color.farol} />
              <Text style={styles.pillNum}>{points}</Text>
            </Pop>
          ) : null}
        </View>

        <View ref={stageRef} style={{ flex: 1 }} onLayout={(e) => setStage({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {sw > 0 ? (
            <>
              {people.map((w) => (
                <View key={w} style={{ position: 'absolute', left: seatX(w) - size / 2, top: seatTop(w) }}>
                  <Person who={w} size={size} face={faces[w] ?? 'idle'} talking={talking === w} active={speaker === w} thinking={thinking && speaker === w} jump={jumps[w] ?? 0} />
                </View>
              ))}
              <View style={{ position: 'absolute', left: (sw - tableW) / 2, top: sh - tableH }}>
                <Khantoke width={tableW} />
              </View>
              {bubble && speaker && phase !== 'fin' ? (
                <View style={{ position: 'absolute', left: 10, right: 10, top: 4 }}>
                  <SpeakerBubble
                    name={`${NAME[speaker]} · ${ROLE[speaker]}`}
                    tint={TINT[speaker]}
                    line={sweet?.listen && !picked ? { th: '🔊 · · ·', rom: '', es: sweet.q.es } : bubble.line}
                    typedKey={bubble.key}
                    showEs={showEs}
                    hint={compact ? '' : sweet?.listen && !picked ? 'toca para escuchar' : phase === 'postre' ? 'toca para escuchar otra vez' : undefined}
                    tailX={seatX(speaker) - 10}
                    onReveal={() => {
                      if (phase === 'talk') setShowEs(true);
                      speak(speaker, bubble.line.th);
                    }}
                    onSpeak={() => speak(speaker, bubble.line.th)}
                  />
                </View>
              ) : null}
              {phase === 'fin' ? (
                <Animated.View entering={ZoomIn.springify().damping(12)} style={{ position: 'absolute', left: 16, right: 16, top: 6, alignItems: 'center' }}>
                  <View style={styles.endBubble}>
                    <Text style={styles.endTh}>¡La familia está encantada contigo!</Text>
                    <Text style={styles.endEs}>{dlg.title}</Text>
                  </View>
                </Animated.View>
              ) : null}
              {mine ? (
                <View style={{ position: 'absolute', right: 12, left: 40, bottom: Math.max(6, tableH * 0.35) }}>
                  <MyBubble line={mine} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={[styles.panel, { height: panelH }]}>
          <View style={styles.panelEdge} />
          {phase === 'fin' ? (
            <Animated.View entering={SlideInDown.springify().damping(16)} style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ marginTop: -36 }}>
                  <Noi pose="celebra" size={86} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h2" style={{ color: color.arrozalHondo }}>
                    {stars === 3 ? '¡Cena perfecta!' : '¡Qué buena cena!'}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2].map((s) => (
                      <Animated.View key={s} entering={ZoomIn.delay(200 + s * 180).springify().damping(8)}>
                        <Icon name="star" size={24} color={s < stars ? color.buatongHondo : color.niebla3} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
              </View>
              <Txt v="small" style={{ color: color.tinta2 }}>
                {score.correct} {score.correct === 1 ? 'acierto' : 'aciertos'} · {misses} {misses === 1 ? 'fallo' : 'fallos'} · calor familiar {Math.round(warmth * 100)} %{feria ? ` · ${points} puntos` : ''}
              </Txt>
              <View style={{ flex: 1 }} />
              <Btn v="ok" label="Continuar" onPress={finish} />
            </Animated.View>
          ) : phase === 'postre' && sweet ? (
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.ask}>
                {sweet.listen ? 'Escucha: ¿qué ha dicho ' : '¿Qué ha dicho '}
                <Text style={{ color: TINT[sweet.q.who] }}>{NAME[sweet.q.who]}</Text>?{'  '}
                <Text style={styles.askSub}>
                  postre {sq + 1}/{sweets.length}
                </Text>
              </Text>
              <ScrollView style={{ flex: 1, marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
                {sweet.opts.map((es, i) => {
                  const st: CardState = !picked ? 'idle' : es === sweet.q.es ? 'right' : es === picked ? 'wrong' : 'dim';
                  return <AnswerCard key={`${sq}-${es}`} th={es} rom="" latin state={st} index={i} label={es} onPress={(e) => chooseSweet(es, e)} />;
                })}
              </ScrollView>
            </View>
          ) : options && cur ? (
            <View style={{ flex: 1, gap: 8 }}>
              {hint ? (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Text style={[styles.ask, { color: color.lacaHondo }]} numberOfLines={2}>
                    {hint}
                  </Text>
                </Animated.View>
              ) : (
                <Text style={styles.ask}>
                  ¿Qué le contestas a <Text style={{ color: TINT[cur.who] }}>{NAME[cur.who]}</Text>?
                </Text>
              )}
              <ScrollView style={{ flex: 1, marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
                {options.map((o, i) => {
                  const st: CardState = right === o.th ? 'right' : wrong.includes(o.th) ? 'wrong' : right ? 'dim' : 'idle';
                  return <AnswerCard key={`${idx}-${o.th}`} th={P(o.th)} rom={PR(o.rom)} es={o.es} state={st} index={i} label={`${P(o.th)}, ${o.es}`} onPress={(e) => choose(o, e)} />;
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Noi pose="escucha" size={Math.min(110, panelH * 0.55)} />
              <Text style={[styles.listen, { textAlign: 'center', paddingHorizontal: 8 }]}>{speaker ? `Escucha a ${NAME[speaker]}…` : dlg.scene}</Text>
            </View>
          )}
        </View>
      </Animated.View>
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 2, paddingBottom: 6 },
  title: { fontFamily: font.display, fontSize: 17, color: '#FFF4E2', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF' },
  pillNum: { fontFamily: font.displayBold, fontSize: 17, color: color.tinta },
  panel: {
    backgroundColor: '#FFF6E6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: '#2B1B14',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
  panelEdge: { position: 'absolute', left: 24, right: 24, top: 5, height: 3, borderRadius: 3, backgroundColor: '#E8C98E' },
  ask: { fontFamily: font.uiHeavy, fontSize: 14, color: color.tinta2 },
  askSub: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta3 },
  listen: { fontFamily: font.uiBold, fontSize: 14, color: color.tinta3 },
  endBubble: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#E7DCCB' },
  endTh: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: color.tinta },
  endEs: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta3, textAlign: 'center' },
});
