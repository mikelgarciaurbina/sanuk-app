import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Txt } from '@/components/ui';
import { DIALOGUES } from '@/content';
import type { Dialogue, DialogueLine, DialoguePlace, Word } from '@/content/types';
import { fx } from '@/lib/audio';
import { pick, shuffle } from '@/lib/random';
import { personalize, personalizeRom } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { AnswerCard, MyBubble, SpeakerBubble, Warmth, type CardState, type Said } from './cena/cards';
import { Person, type Face, type Who } from './cena/family';
import { PLACES, PlaceBack, PlaceFront, TopShade } from './cena/places';
import { Pop, tapPoint, useGameFrame, useJuice, type Point } from './fx';
import { ComboBadge, useScore } from './kit';
import { sayThen } from './mercado/voz';
import type { GameProps } from './types';

type Option = NonNullable<DialogueLine['options']>[number];
type ViewRef = ComponentRef<typeof View>;
/** escena: se cuenta dónde estás y con quién · talk: la conversación · postre: ¿qué han dicho? · fin */
type Phase = 'escena' | 'talk' | 'postre' | 'fin';
type Heard = Said & { who: Who };
type Sweet = { q: Heard; opts: string[]; listen: boolean };

const NAME: Record<Who, string> = { Mae: 'Mae', Pho: 'Pho', Yai: 'Yai', Nong: 'Nong', Lung: 'Lung', Noi: 'Noi' };
const ROLE: Record<Who, string> = { Mae: 'mamá', Pho: 'papá', Yai: 'abuela', Nong: 'hermana pequeña', Lung: 'tío', Noi: 'tu guía' };
const TINT: Record<Who, string> = { Mae: '#13807F', Pho: '#2B3A86', Yai: '#9C3556', Nong: '#C77A00', Lung: '#2E7A45', Noi: '#3D7BFF' };
const SHE: Who[] = ['Yai', 'Mae', 'Nong', 'Noi'];
/** Sitio fijo en la mesa (Yai y Mae en el centro). */
const SEAT: Who[] = ['Lung', 'Pho', 'Yai', 'Mae', 'Nong', 'Noi'];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const now = () => Date.now();

/** Lo que cuesta cada ayuda en la feria (puntos de los 100 de cada pregunta). */
const COST = { wrong: 30, cards: 20, line: 15 };

/** Partículas de cortesía que la app pone según quien aprende: no cuentan como palabras nuevas. */
const POLITE = ['ค่ะ', 'คะ', 'ครับ'];

/** ¿Se entiende la frase entera con las palabras que ya se saben? */
function understood(th: string, words: Word[]): boolean {
  const known = new Set<string>(POLITE);
  for (const w of words) for (const f of w.th.split(/[\s…/()ๆ]+/)) if (f) known.add(f);
  return th
    .split(/[^\u0E00-\u0E7F]+|ๆ/)
    .filter(Boolean)
    .every((chunk) => {
      const ok = new Array<boolean>(chunk.length + 1).fill(false);
      ok[0] = true;
      for (let i = 0; i < chunk.length; i++) if (ok[i]) for (let j = i + 1; j <= Math.min(chunk.length, i + 20); j++) if (known.has(chunk.slice(i, j))) ok[j] = true;
      return ok[chunk.length];
    });
}

/** Quién contesta dentro de una opción: quien hizo la pregunta, salvo que la respuesta traiga su propia voz (`reply.who`). */
const replyWho = (line: DialogueLine, o: Option): Who => (o.reply as { who?: Who } | undefined)?.who ?? line.who;

/** A quién le has caído bien, según con quién has hablado y dónde. */
function happyLine(speakers: Who[], place: DialoguePlace): string {
  if (speakers.length === 1 && speakers[0] === 'Noi') return '¡Noi está orgullosa de ti!';
  if (place === 'mesa' || speakers.length > 2) return '¡La familia está encantada contigo!';
  if (speakers.length === 1) return `¡${NAME[speakers[0]]} está ${SHE.includes(speakers[0]) ? 'encantada' : 'encantado'} contigo!`;
  return `¡${NAME[speakers[0]]} y ${NAME[speakers[1]]} están ${speakers.every((w) => SHE.includes(w)) ? 'encantadas' : 'encantados'} contigo!`;
}

/** Cómo se llama la barra que se llena: el calor de la familia, la alegría de Noi o la confianza de quien te habla. */
function meterName(speakers: Who[], place: DialoguePlace): string {
  if (speakers.length === 1 && speakers[0] === 'Noi') return 'Alegría de Noi';
  if (place === 'mesa' || speakers.length !== 1) return 'Calor familiar';
  return `Confianza de ${NAME[speakers[0]]}`;
}

/**
 * Juego 15 · Cena familiar: una conversación de verdad con la familia (o con Noi), en el sitio donde ocurre.
 * Se avanza cuando la voz termina o al tocar «Seguir», nunca con un reloj. En la lección hay todo el apoyo; en la
 * feria primero se escucha, el español de las cartas está escondido (verlo cuesta puntos) y se puntúa en %.
 */
export default function Cena({ mode, extra, gender, words, oral = false, reads = false, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const score = useScore(mode);
  const juice = useJuice();
  const frame = useGameFrame();
  const { height: winH } = useWindowDimensions();
  const [dlg] = useState<Dialogue>(() => (extra?.kind === 'dialogo' && DIALOGUES[extra.id]) || pick(Object.values(DIALOGUES)));
  const lines = dlg.lines;
  const asked = Math.max(1, lines.filter((l) => l.options?.length).length);

  // quién está: solo quien habla en esta conversación; la familia entera, solo alrededor de la mesa
  const voices = new Set<Who>();
  for (const l of lines) {
    voices.add(l.who);
    for (const o of l.options ?? []) if (o.reply) voices.add(replyWho(l, o));
  }
  const speakers = SEAT.filter((w) => voices.has(w));
  // sin `place`, la mesa; pero Noi a solas nunca está cenando con la familia: es la calle, antes de salir
  const place: DialoguePlace = dlg.place ?? (speakers.length === 1 && speakers[0] === 'Noi' ? 'calle' : 'mesa');
  const look = PLACES[place] ?? PLACES.mesa;
  const mesa = place === 'mesa';
  const extras = mesa ? (['Yai', 'Mae', 'Pho', 'Nong', 'Lung'] as Who[]).filter((w) => !speakers.includes(w)).slice(0, Math.max(0, 3 - speakers.length)) : [];
  const people = SEAT.filter((w) => speakers.includes(w) || extras.includes(w));
  const meter = meterName(speakers, place);

  // apoyo: en la lección todo a la vista; en la feria primero se oye y el español de las cartas se esconde
  const listenFirst = feria && !oral;
  const showRom = !reads;

  // alto de las cartas de cada pregunta (las frases largas ocupan dos líneas): el panel no cambia de tamaño
  const cardH = (o: Option) => 63 + (personalize(o.th, gender).length > 24 ? 28 : 0) + ((showRom ? o.rom.length : 0) + o.es.length > 40 ? 17 : 0);
  const tallest = Math.max(3 * 63 + 16, ...lines.map((l) => (l.options ?? []).reduce((a, o) => a + cardH(o) + 8, -8)));

  const [phase, setPhase] = useState<Phase>('escena');
  const [idx, setIdx] = useState(0);
  const [speaker, setSpeaker] = useState<Who | null>(null);
  const [thinking, setThinking] = useState(false);
  const [talking, setTalking] = useState<Who | null>(null);
  const [bubble, setBubble] = useState<{ line: Said; key: number; who: Who } | null>(null);
  /** aún solo se oye: el bocadillo enseña una onda de sonido en vez de la frase */
  const [veil, setVeil] = useState(false);
  const [showEs, setShowEs] = useState(false);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [right, setRight] = useState<string | null>(null);
  const [mine, setMine] = useState<Said | null>(null);
  const [faces, setFaces] = useState<Partial<Record<Who, Face>>>({});
  const [jumps, setJumps] = useState<Partial<Record<Who, number>>>({});
  const [warmth, setWarmth] = useState(0.06);
  const [points, setPoints] = useState(0);
  const [pct, setPct] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [sweets, setSweets] = useState<Sweet[]>([]);
  const [sq, setSq] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [misses, setMisses] = useState(0);
  /** el siguiente paso está listo: se puede tocar «Seguir» (o llegará solo tras la pausa) */
  const [canGo, setCanGo] = useState(false);
  /** pistas de esta pregunta (feria): se ha mirado el español de las cartas · se ha traducido la frase de la familia */
  const [peekCards, setPeekCards] = useState(false);
  const [peekLine, setPeekLine] = useState(false);
  /** de oído (primera lección): la opción que se está escuchando, a falta de confirmar, y las que ya se han oído */
  const [preview, setPreview] = useState<string | null>(null);
  const [heardOpts, setHeardOpts] = useState<string[]>([]);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hush = useRef<(() => void)[]>([]);
  const voice = useRef(0);
  const seq = useRef(0);
  const cardsAt = useRef(0);
  const tally = useRef(0);
  const best = useRef(0);
  const mistakes = useRef(0);
  const finished = useRef(false);
  /** la pregunta ya está contestada: un segundo toque (dos dedos sobre dos cartas) no vuelve a contar */
  const lock = useRef(false);
  /** fallos en la pregunta en curso */
  const fails = useRef(0);
  /** el paso en curso de la conversación: lo que quedara pendiente de un paso anterior ya no cuenta */
  const flow = useRef({ id: 0, go: null as (() => void) | null, auto: undefined as ReturnType<typeof setTimeout> | undefined, held: false });
  /** Lo que la familia ha dicho de verdad en esta conversación (para las preguntas del final). */
  const heard = useRef<Heard[]>([]);
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
    best.current += 100;
    setPoints(tally.current);
  };

  // ——— El hilo de la conversación: cada paso espera a que termine la voz o a un toque ———

  /** Empieza un paso nuevo. */
  const step = () => {
    const f = flow.current;
    f.id += 1;
    f.go = null;
    f.held = false;
    clearTimeout(f.auto);
    setCanGo(false);
    return f.id;
  };
  const alive = (id: number) => flow.current.id === id;
  /**
   * El siguiente paso queda listo: llega solo tras una pausa cómoda o, antes, al tocar «Seguir». Si quien aprende
   * está estudiando la frase (la ha traducido o la ha vuelto a oír), ya no llega solo: espera a su toque.
   */
  const ready = (id: number, fn: () => void, pause: number) => {
    if (!alive(id)) return;
    const f = flow.current;
    f.go = () => {
      if (alive(id)) fn();
    };
    setCanGo(true);
    clearTimeout(f.auto);
    if (!f.held) f.auto = setTimeout(() => flow.current.go?.(), pause);
  };
  const hold = () => {
    flow.current.held = true;
    clearTimeout(flow.current.auto);
  };
  const goOn = () => flow.current.go?.();
  /** Pausa tras una frase de la familia: lo justo en la feria; en la lección, tiempo para leer la traducción. */
  const pauseAfter = (l: Said) => (feria ? 1300 + Math.min(1500, l.th.length * 30) : 2000 + Math.min(3000, l.es.length * 50));

  /** Habla alguien de la familia: mueve la boca hasta que la voz termina de verdad, y entonces avisa. */
  const speak = (who: Who, th: string, then?: () => void) => {
    voice.current += 1;
    const my = voice.current;
    setTalking(who);
    hush.current.push(
      sayThen(th, () => {
        if (voice.current === my) setTalking(null);
        then?.();
      }),
    );
  };
  /** Suena tu frase (o una opción): la familia escucha. */
  const hear = (th: string, then?: () => void) => {
    voice.current += 1;
    setTalking(null);
    hush.current.push(sayThen(th, () => then?.()));
  };

  // ——— Dibujo: dónde está cada uno ———
  const sw = stage.w;
  const sh = stage.h;
  const tableW = Math.min(sw * 1.04, 440, (sh * 0.42 * 360) / 150);
  const frontH = mesa ? (tableW * 150) / 360 : clamp(sh * 0.3, 64, 124);
  const n = Math.max(1, people.length);
  const size = clamp(Math.min((sw / Math.max(n, 2.4)) * 0.92, sh * 0.4), 68, 140);
  // en la mesa se reparten por todo el ancho; fuera de ella, juntos
  const rowW = mesa ? sw : Math.min(sw, n * size * 1.22);
  const seatX = (w: Who) => (sw - rowW) / 2 + (rowW * (people.indexOf(w) + 0.5)) / n;
  const compact = sh < 300;
  /** altura a la que empieza lo que tapa a quien habla (la mesa, el mostrador, la jardinera…) */
  const surface = sh - frontH + (mesa ? (tableW / 360) * 22 : frontH * look.lip);
  const seatTop = (w: Who) => surface - size * 1.1 * (compact ? 0.66 : 0.8) + (mesa ? Math.abs(people.indexOf(w) - (n - 1) / 2) * size * 0.06 : 0);

  /** Punto de la pantalla sobre la cabeza de alguien (para los corazones). */
  const atHead = (who: Who, cb: (p: Point) => void) =>
    stageRef.current?.measureInWindow((x, y) => cb({ x: x + seatX(who), y: y + seatTop(who) + size * 0.45 }));

  /** La feria puntúa en %: así una charla de dos preguntas y una de seis se pueden comparar. */
  const percent = () => (best.current ? Math.round((100 * tally.current) / best.current) : 100);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(score.result(feria ? percent() : score.result().correct));
  };

  const endTalk = () => {
    step();
    setPhase('fin');
    setOptions(null);
    setSpeaker(null);
    setThinking(false);
    setMine(null);
    setFaces(Object.fromEntries(people.map((w) => [w, 'love' as Face])));
    setWarmth((w) => Math.max(w, mistakes.current === 0 ? 1 : w));
    people.forEach((w, i) => later(() => hop(w), i * 140));
    setPct(percent());
    if (feria && mistakes.current === 0) later(() => juice.banner(look.perfect, 'ni un fallo', color.farol), 300);
    if (feria) fx.fanfare();
    else fx.done();
    later(() => juice.burst(undefined, 'corazones', 26, 170), 200);
    later(() => juice.burst(undefined, 'confeti', 20, 160), 700);
  };

  const showSweet = (list: Sweet[], i: number) => {
    const id = step();
    lock.current = false;
    const s = list[i];
    setSq(i);
    setPicked(null);
    setSpeaker(s.q.who);
    seq.current += 1;
    setBubble({ line: s.q, key: seq.current, who: s.q.who });
    setVeil(s.listen);
    setShowEs(false);
    later(() => {
      if (!alive(id)) return;
      speak(s.q.who, s.q.th);
      cardsAt.current = now();
    }, 350);
  };

  /** Al final: «¿qué ha dicho…?» con lo que se ha oído de verdad en esta conversación. */
  const startRecall = () => {
    const id = step();
    setOptions(null);
    setMine(null);
    setThinking(false);
    const seen = new Set<string>();
    const pool = heard.current.filter((l) => (seen.has(l.es) ? false : (seen.add(l.es), true)));
    // solo se pregunta por frases que se entienden con lo ya aprendido; en la primera curva, nada
    const askable = pool.filter((l) => understood(l.th, words));
    const count = oral || pool.length < 3 ? 0 : Math.min(askable.length, feria ? 3 : 1);
    if (!count) {
      endTalk();
      return;
    }
    const list: Sweet[] = shuffle(askable)
      .slice(0, count)
      .map((q, i) => ({ q, opts: shuffle([q.es, ...shuffle(pool.filter((p) => p.es !== q.es)).slice(0, 2).map((p) => p.es)]), listen: feria && i === count - 1 }));
    setSweets(list);
    setPhase('postre');
    setSpeaker(null);
    setBubble(null);
    fx.levelup();
    juice.banner(look.recall, speakers.length === 1 ? `¿Te acuerdas de lo que ha dicho ${NAME[speakers[0]]}?` : '¿Te acuerdas de lo que han dicho?', color.buatong);
    later(() => {
      if (alive(id)) showSweet(list, 0);
    }, 1500);
  };

  const showLine = (k: number) => {
    const line = lines[k];
    if (!line) {
      startRecall();
      return;
    }
    const id = step();
    lock.current = false;
    fails.current = 0;
    setIdx(k);
    setOptions(null);
    setWrong([]);
    setRight(null);
    setHint(null);
    setShowEs(false);
    setPeekCards(false);
    setPeekLine(false);
    setPreview(null);
    setHeardOpts([]);
    setSpeaker(line.who);
    setThinking(true);
    later(() => {
      if (!alive(id)) return;
      setThinking(false);
      setMine(null);
      const said = { th: P(line.th), rom: PR(line.rom), es: line.es };
      heard.current.push({ ...said, who: line.who });
      seq.current += 1;
      setBubble({ line: said, key: seq.current, who: line.who });
      // en la feria primero se escucha: la frase aparece escrita cuando la voz ha terminado
      setVeil(listenFirst);
      speak(line.who, said.th, () => {
        if (!alive(id)) return;
        setVeil(false);
        if (line.options?.length) {
          later(() => {
            if (!alive(id)) return;
            setOptions(shuffle(line.options!));
            fx.flip();
            cardsAt.current = now();
          }, listenFirst ? 450 : 150);
          return;
        }
        // una frase que solo se escucha: en la lección, su traducción llega sola; luego, pausa o «Seguir»
        if (!feria) setShowEs(true);
        ready(id, () => showLine(k + 1), pauseAfter(said));
      });
    }, k === 0 ? 800 : 650);
  };

  const start = () => {
    // la escena se queda el tiempo de leerla (o hasta «Empezar»): ahí se cuenta la historia
    const id = step();
    ready(
      id,
      () => {
        setPhase('talk');
        showLine(0);
      },
      clamp(2200 + dlg.scene.length * 55, 3200, 9000),
    );
  };

  useEffect(() => {
    self.current = { start };
  });
  useEffect(() => {
    const all = timers.current;
    const voices = hush.current;
    const f = flow.current;
    const t = setTimeout(() => self.current?.start(), 300);
    return () => {
      clearTimeout(t);
      clearTimeout(f.auto);
      f.id += 1;
      all.forEach(clearTimeout);
      voices.forEach((stop) => stop());
    };
  }, []);

  // ——— Respuestas ———

  const choose = (o: Option, at?: Point) => {
    if (lock.current || phase !== 'talk' || !options || right || wrong.includes(o.th)) return;
    const line = lines[idx];
    setPreview(null);
    if (!o.ok) {
      score.hit(false);
      onAnswer(false);
      mistakes.current += 1;
      fails.current += 1;
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
    lock.current = true;
    const id = step();
    const combo = score.hit(true);
    onAnswer(true);
    const first = fails.current === 0;
    // cada pregunta vale 100: 70 por acertar (menos fallos y pistas) y hasta 30 por contestar con soltura
    let gain = first ? 100 : 40;
    if (feria) {
      gain = Math.max(15, 70 - fails.current * COST.wrong - (peekCards ? COST.cards : 0) - (peekLine ? COST.line : 0));
      if (first && !peekCards && !peekLine) gain += Math.round(30 * clamp(1 - (now() - cardsAt.current - 3000) / 9000, 0, 1));
    }
    addPoints(gain);
    setRight(o.th);
    setHint(null);
    setWarmth((w) => Math.min(1, w + (first ? 1 : 0.55) / asked));
    juice.celebrate(at, feria ? `+${gain}` : first ? '¡Eso es!' : '¡Ahora sí!', 'corazones');
    if (feria && combo >= 3 && combo % 3 === 0) later(() => juice.float(undefined, `¡${combo} seguidas!`, color.farol, 26), 350);
    later(() => atHead(line.who, (p) => juice.burst(p, 'corazones', 14, 100)), 250);
    setFaces((fs) => ({ ...Object.fromEntries(people.map((w) => [w, 'happy' as Face])), ...fs, [line.who]: first ? 'love' : 'happy' }));
    hop(line.who);
    later(() => setFaces((fs) => Object.fromEntries(Object.keys(fs).map((w) => [w, 'idle' as Face]))), 2600);
    const said = { th: P(o.th), rom: PR(o.rom), es: o.es };
    const next = lines[idx + 1];
    const r = o.reply;
    later(() => {
      if (!alive(id)) return;
      setOptions(null);
      setMine(said);
      // tu frase suena entera; solo entonces te contestan
      hear(said.th, () => {
        if (!alive(id)) return;
        if (!r || (next && P(next.th) === P(r.th))) {
          ready(id, () => showLine(idx + 1), 900);
          return;
        }
        const who = replyWho(line, o);
        later(() => {
          if (!alive(id)) return;
          setSpeaker(who);
          setThinking(true);
          later(() => {
            if (!alive(id)) return;
            setThinking(false);
            const rs = { th: P(r.th), rom: PR(r.rom), es: r.es };
            heard.current.push({ ...rs, who });
            seq.current += 1;
            setBubble({ line: rs, key: seq.current, who });
            setShowEs(false);
            setVeil(listenFirst);
            speak(who, rs.th, () => {
              if (!alive(id)) return;
              setVeil(false);
              if (!feria) setShowEs(true);
              ready(id, () => showLine(idx + 1), pauseAfter(rs));
            });
          }, 600);
        }, 450);
      });
    }, 650);
  };

  /** Oír una opción sin elegirla (su altavoz). De oído, además queda señalada para confirmarla con «Decir esto». */
  const hearOption = (o: Option) => {
    if (phase !== 'talk' || right) return;
    fx.tap();
    hear(P(o.th));
    if (oral) {
      setPreview(o.th);
      setHeardOpts((list) => (list.includes(o.th) ? list : [...list, o.th]));
    }
  };

  const chooseSweet = (es: string, e: GestureResponderEvent) => {
    const s = sweets[sq];
    if (lock.current || phase !== 'postre' || !s || picked) return;
    lock.current = true;
    const id = step();
    setPicked(es);
    setVeil(false);
    const ok = es === s.q.es;
    score.hit(ok);
    onAnswer(ok);
    setShowEs(true);
    addPoints(ok ? 100 : 0);
    if (ok) {
      juice.celebrate(tapPoint(e), feria ? '+100' : '¡Bien!', 'estrellas');
      setFace(s.q.who, 'love');
      hop(s.q.who);
      setWarmth((w) => Math.min(1, w + 0.05));
    } else {
      mistakes.current += 1;
      setMisses(mistakes.current);
      juice.shake(6);
      setFace(s.q.who, 'confused');
      later(() => {
        if (alive(id)) speak(s.q.who, s.q.th);
      }, 500);
    }
    later(() => {
      ready(
        id,
        () => {
          setFace(s.q.who, 'idle');
          if (sq + 1 < sweets.length) showSweet(sweets, sq + 1);
          else endTalk();
        },
        ok ? 900 : 2400,
      );
    }, 800);
  };

  /** Tocar el bocadillo: si aún solo se oía, enseña la frase; si ya se ve, la traduce (en la feria cuesta) y la repite. */
  const tapBubble = () => {
    if (!bubble) return;
    if (phase === 'talk' && veil) {
      setVeil(false);
      return;
    }
    if (phase === 'talk') {
      if (!showEs) {
        setShowEs(true);
        if (feria && lines[idx]?.options?.length && !right) setPeekLine(true);
      }
      hold();
    }
    speak(bubble.who, bubble.line.th);
  };
  const replay = () => {
    if (!bubble) return;
    if (phase === 'talk') hold();
    speak(bubble.who, bubble.line.th);
  };

  // ——— Interfaz ———

  const cur = phase === 'talk' ? lines[idx] : null;
  const sweet = phase === 'postre' ? sweets[sq] : null;
  // de oído las cartas son más altas (transcripción grande, thai y, al oírlas, la traducción) y hay un botón debajo:
  // el panel crece para que las tres respuestas se vean enteras, también con el aviso de «esa no encaja»
  const panelH = Math.min(tallest + (winH < 720 ? 52 : 62) + (oral ? 54 + 72 : 0), winH * (oral ? 0.6 : 0.52));
  const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
  const scored = !!cur?.options?.length && !right;
  const bubbleHint = compact
    ? ''
    : phase === 'postre'
      ? veil
        ? 'toca para escuchar'
        : 'toca para escuchar otra vez'
      : veil
        ? 'toca para ver la frase'
        : feria && scored
          ? `toca para traducir · −${COST.line}`
          : 'toca para traducir';
  const chosen = preview ? options?.find((o) => o.th === preview) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene={look.scene} />
      {look.light ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -frame.top }}>
          <TopShade height={frame.top + 104} />
        </View>
      ) : null}
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        <View style={styles.hud}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title} numberOfLines={1}>
              {dlg.title}
            </Text>
            <Warmth value={warmth} dark label={meter} />
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
              <PlaceBack place={place} w={sw} h={sh} top={seatTop(people[0])} size={size} n={n} />
              {people.map((w) => (
                <View key={w} style={{ position: 'absolute', left: seatX(w) - size / 2, top: seatTop(w) }}>
                  <Person who={w} size={size} face={faces[w] ?? 'idle'} talking={talking === w} active={speaker === w} thinking={thinking && speaker === w} jump={jumps[w] ?? 0} />
                </View>
              ))}
              <PlaceFront place={place} w={sw} h={frontH} tableW={tableW} size={size} n={n} />
              {bubble && speaker && phase !== 'fin' && phase !== 'escena' ? (
                <View style={{ position: 'absolute', left: 10, right: 10, top: 4 }}>
                  <SpeakerBubble
                    name={`${NAME[bubble.who]} · ${ROLE[bubble.who]}`}
                    tint={TINT[bubble.who]}
                    line={bubble.line}
                    typedKey={bubble.key}
                    showEs={showEs}
                    showRom={showRom || showEs}
                    veil={veil}
                    oral={oral}
                    hint={bubbleHint}
                    tailX={seatX(bubble.who) - 10}
                    onReveal={tapBubble}
                    onSpeak={replay}
                  />
                </View>
              ) : null}
              {phase === 'fin' ? (
                <Animated.View entering={ZoomIn.springify().damping(12)} style={{ position: 'absolute', left: 16, right: 16, top: 6, alignItems: 'center' }}>
                  <View style={styles.endBubble}>
                    <Text style={styles.endTh}>{happyLine(speakers, place)}</Text>
                    <Text style={styles.endEs}>{dlg.title}</Text>
                  </View>
                </Animated.View>
              ) : null}
              {mine ? (
                <View style={{ position: 'absolute', right: 12, left: 40, bottom: Math.max(6, frontH * 0.35) }}>
                  <MyBubble line={mine} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={[styles.panel, { height: panelH }]}>
          <View style={styles.panelEdge} />
          {phase === 'escena' ? (
            <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1, gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Noi pose="hola" size={Math.min(104, panelH * 0.42)} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Txt v="h3">{dlg.title}</Txt>
                  <Text style={styles.scene}>{dlg.scene}</Text>
                </View>
              </View>
              <Btn label="Empezar" onPress={goOn} />
            </Animated.View>
          ) : phase === 'fin' ? (
            <Animated.View entering={SlideInDown.springify().damping(16)} style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ marginTop: -36 }}>
                  <Noi pose="celebra" size={86} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h2" style={{ color: color.arrozalHondo }}>
                    {stars === 3 ? look.perfect : look.good}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2].map((s) => (
                      <Animated.View key={s} entering={ZoomIn.delay(200 + s * 180).springify().damping(8)}>
                        <Icon name="star" size={24} color={s < stars ? color.buatongHondo : color.niebla3} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
                {feria ? (
                  <Animated.View entering={ZoomIn.delay(500).springify().damping(9)} style={styles.pct}>
                    <Text style={styles.pctNum}>{pct}</Text>
                    <Text style={styles.pctSign}>%</Text>
                  </Animated.View>
                ) : null}
              </View>
              <Txt v="small" style={{ color: color.tinta2 }}>
                {score.correct} {score.correct === 1 ? 'acierto' : 'aciertos'} · {misses} {misses === 1 ? 'fallo' : 'fallos'} · {meter.charAt(0).toLowerCase() + meter.slice(1)} {Math.round(warmth * 100)} %
                {feria ? ` · conversación al ${pct} %` : ''}
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
                  {look.recallTag} {sq + 1}/{sweets.length}
                </Text>
              </Text>
              <ScrollView style={{ flex: 1, marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 6 }}>
                {sweet.opts.map((es, i) => {
                  const st: CardState = !picked ? 'idle' : es === sweet.q.es ? 'right' : es === picked ? 'wrong' : 'dim';
                  return <AnswerCard key={`${sq}-${es}`} th={es} latin state={st} index={i} label={es} onPress={(e) => chooseSweet(es, e)} />;
                })}
              </ScrollView>
            </View>
          ) : options && cur ? (
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26 }}>
                {hint ? (
                  <Animated.View entering={FadeIn.duration(180)} style={{ flex: 1 }}>
                    <Text style={[styles.ask, { color: color.lacaHondo }]} numberOfLines={2}>
                      {hint}
                    </Text>
                  </Animated.View>
                ) : (
                  <Text style={[styles.ask, { flex: 1 }]} numberOfLines={2}>
                    {oral ? 'Toca para oírlas. ' : ''}¿Qué le contestas a <Text style={{ color: TINT[cur.who] }}>{NAME[cur.who]}</Text>?
                  </Text>
                )}
                {feria && !peekCards && !right ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Ver las respuestas en español. Cuesta ${COST.cards} puntos`} hitSlop={8} onPress={() => setPeekCards(true)} style={styles.peek}>
                    <Text style={styles.peekText}>en español · −{COST.cards}</Text>
                  </Pressable>
                ) : null}
              </View>
              <ScrollView style={{ flex: 1, marginHorizontal: -14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingBottom: 6 }}>
                {options.map((o, i) => {
                  const st: CardState = right === o.th ? 'right' : wrong.includes(o.th) ? 'wrong' : right ? 'dim' : 'idle';
                  // el español: siempre en la lección; de oído, cuando ya se ha oído la carta; en la feria, con la pista o al resolver
                  const es = oral ? (heardOpts.includes(o.th) || st !== 'idle' ? o.es : undefined) : !feria || peekCards || st !== 'idle' ? o.es : undefined;
                  const rom = showRom || (feria && (peekCards || st !== 'idle')) ? PR(o.rom) : undefined;
                  return (
                    <AnswerCard
                      key={`${idx}-${o.th}`}
                      th={P(o.th)}
                      rom={rom}
                      es={es}
                      state={st}
                      index={i}
                      oral={oral}
                      selected={preview === o.th}
                      label={es ? `${P(o.th)}, ${es}` : P(o.th)}
                      onPress={(e) => (oral ? hearOption(o) : choose(o, tapPoint(e)))}
                      onHear={() => hearOption(o)}
                    />
                  );
                })}
              </ScrollView>
              {oral ? <Btn v="ok" height={44} label={chosen ? 'Decir esto' : 'Escucha y elige'} disabled={!chosen || !!right} onPress={() => chosen && choose(chosen)} /> : null}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Noi pose="escucha" size={Math.min(104, panelH * (canGo ? 0.4 : 0.55))} />
              <Text style={[styles.listen, { textAlign: 'center', paddingHorizontal: 8 }]}>{mine && !talking ? 'Así se dice…' : speaker ? `Escucha a ${NAME[speaker]}…` : ' '}</Text>
              {canGo ? (
                <Animated.View entering={ZoomIn.springify().damping(13)} style={{ alignSelf: 'stretch' }}>
                  <Btn label="Seguir" height={48} onPress={goOn} />
                </Animated.View>
              ) : null}
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
  scene: { fontFamily: font.uiBold, fontSize: 15, lineHeight: 21, color: color.tinta2 },
  peek: { height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.cieloSuave, borderWidth: 1.5, borderColor: color.cielo, justifyContent: 'center' },
  peekText: { fontFamily: font.uiHeavy, fontSize: 11, color: color.cieloHondo },
  pct: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 12, height: 44, borderRadius: 16, backgroundColor: color.farolSuave, borderWidth: 2, borderColor: color.farol },
  pctNum: { fontFamily: font.displayBold, fontSize: 26, lineHeight: 40, color: color.farol },
  pctSign: { fontFamily: font.uiHeavy, fontSize: 14, color: color.farol, marginLeft: 1 },
  endBubble: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#E7DCCB' },
  endTh: { fontFamily: font.display, fontSize: 20, lineHeight: 26, color: color.tinta, textAlign: 'center' },
  endEs: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta3, textAlign: 'center' },
});
