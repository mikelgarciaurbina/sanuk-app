import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';

import { color, font } from '@/brand/tokens';
import { Noi } from '@/components/Noi';
import { Icon } from '@/components/icons';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { fx, say } from '@/lib/audio';
import { thaiDigits } from '@/lib/thai';

import { Backdrop } from './Backdrop';
import { Glow, Pop, Press3D, centerOf, tapPoint, useJuice, type Point } from './fx';
import { ComboBadge, useScore } from './kit';
import { GoodsDisplay } from './mercado/goods';
import { amountLine, answersOf, askLine, breakdown, haggleLine, howMuchLine, knowledge, makePlan, makeRound, numberParts, priceLine, quoteLine, sayTarget, sorryLine, thanksLine, type Line, type NumTile, type Round } from './mercado/logic';
import { WalletPiece } from './mercado/money';
import { SayBoard, type SayState } from './mercado/say';
import { Awning, Bubble, Counter, MeBubble, PriceTag, SpeedBar, TrayBase, WalletBase } from './mercado/stall';
import { StackBadge, TrayPiece, arrange, pile, type TrayItem } from './mercado/tray';
import { Vendor, type Mood } from './mercado/vendor';
import { sayThen } from './mercado/voz';
import type { GameProps } from './types';

type ViewRef = ComponentRef<typeof View>;
/** intro: llega el cliente · ask: te toca preguntar el precio · play: pagas · trato: estáis regateando · done: ronda cerrada */
type Phase = 'intro' | 'ask' | 'play' | 'trato' | 'done';
type Verdict = 'justo' | 'falta' | 'sobra';
type Outcome = { ok: boolean; stars: number; gain: number; speed: number; mult: number; bonus: number; note?: string };
type Box = { x: number; y: number; w: number; h: number };

const NOTES = [20, 50, 100, 500];
/** La vendedora espera a que el precio lo digas tú (cuando aún no se ha presentado «เท่าไหร่»). */
const WAITING: Line = { th: '· · · ?', rom: '', es: '' };
const COINS = [1, 2, 5, 10];
/** Alturas de la bandeja, la cartera y la barra inferior (más justas en pantallas bajas). */
const SIZES = { tall: { tray: 100, wallet: 134, bar: 84, awning: 46 }, short: { tray: 88, wallet: 122, bar: 78, awning: 32 } };
const SPEED_MS = 13000;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Milisegundos desde `t` (para el bonus de rapidez; solo en manejadores). */
const since = (t: number) => Date.now() - t;
const now = () => Date.now();

/**
 * Juego 14 · Paga justo: la vendedora dice el precio en thai y pagas con billetes y monedas de verdad; a veces
 * regateas, compruebas el cambio o el número lo dices tú. Los precios solo usan números ya enseñados.
 */
export default function Mercado({ mode, words, focus, rounds, reads = false, gender, onAnswer, onDone }: GameProps) {
  const feria = mode === 'feria';
  const { height: winH } = useWindowDimensions();
  const S = winH < 720 ? SIZES.short : SIZES.tall;
  const TRAY_H = S.tray;
  const score = useScore(mode);
  const juice = useJuice();
  const [k] = useState(() => knowledge(words, focus));
  const [plan, setPlan] = useState(() => {
    const n = Math.max(1, rounds ?? 2);
    // lección: ver y oír → solo de oído → y una ronda corta más en la que el número lo dices tú
    return makePlan(mode, feria ? Math.max(4, rounds ?? 8) : n >= 2 ? n + 1 : n, k, { reads });
  });
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [tray, setTray] = useState<TrayItem[]>([]);
  const [change, setChange] = useState<TrayItem[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hinted, setHinted] = useState(false);
  const [haggled, setHaggled] = useState(false);
  /** la rebaja vale desde que la vendedora la dice, no desde que la pides */
  const [dealOn, setDealOn] = useState(false);
  /** «dilo tú»: fichas que llevas dichas, en orden */
  const [picked, setPicked] = useState<number[]>([]);
  const [sayState, setSayState] = useState<SayState>('idle');
  const [wrongSay, setWrongSay] = useState(0);
  const [line, setLine] = useState<Line | null>(null);
  const [lineKey, setLineKey] = useState(0);
  const [me, setMe] = useState<Line | null>(null);
  const [mood, setMood] = useState<Mood>('idle');
  const [talking, setTalking] = useState(false);
  const [jump, setJump] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [speedRun, setSpeedRun] = useState(0);
  const [stall, setStall] = useState({ w: 0, h: 0 });
  const [trayW, setTrayW] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const planRef = useRef(plan);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hush = useRef<(() => void)[]>([]);
  const voice = useRef(0);
  const uid = useRef(0);
  const quoteAt = useRef(0);
  const tally = useRef(0);
  const advanced = useRef(-1);
  const finished = useRef(false);
  /** la ronda ya está decidida: un segundo toque (dos dedos, doble clic) no vuelve a puntuarla */
  const closed = useRef(false);
  const trayRef = useRef<ViewRef>(null);
  const vendorRef = useRef<ViewRef>(null);
  const self = useRef<{ start: (n: number) => void } | null>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const measureTray = () => trayRef.current?.measureInWindow((x, y, w, h) => setBox((b) => (b && b.x === x && b.y === y && b.w === w && b.h === h ? b : { x, y, w, h })));

  const r = plan[i];
  const target = r.kind === 'regateo' && dealOn && r.deal !== undefined ? r.deal : r.price;
  const sum = tray.reduce((a, m) => a + m.v, 0);
  const right = r.kind === 'cambio' && r.paid ? r.paid - r.price : 0;
  /** el número lo dices tú · la bandeja enseña lo que has pagado y tu cambio · la vendedora pregunta en vez de decir el precio */
  const saying = r.kind === 'decir';
  const sayN = saying ? sayTarget(r) : 0;
  const changeLook = r.kind === 'cambio' || (saying && r.ask === 'cambio');
  const asksYou = (x: Round) => x.kind === 'decir' && x.ask === 'precio' && x.show !== 'oculto';
  const truth: Verdict | null = r.kind !== 'cambio' || r.change === undefined ? null : r.change === right ? 'justo' : r.change < right ? 'falta' : 'sobra';
  const liveStars = Math.max(1, 3 - mistakes - (feria && hinted ? 1 : 0));
  const hudStars = phase === 'done' && outcome ? outcome.stars : liveStars;

  /** Habla la vendedora: mueve la boca hasta que la voz termina de verdad (también con la voz lenta). */
  const speak = (th: string, slow = false, then?: () => void) => {
    voice.current += 1;
    const my = voice.current;
    setTalking(true);
    hush.current.push(
      sayThen(
        th,
        () => {
          if (voice.current === my) setTalking(false);
          then?.();
        },
        { slow },
      ),
    );
  };
  /** Hablas tú: la vendedora escucha, y `then` llega cuando has terminado de decirlo. */
  const mine = (th: string, then: () => void) => {
    voice.current += 1;
    setTalking(false);
    hush.current.push(sayThen(th, then));
  };

  const dropChange = (amount: number, delay0: number) => {
    if (amount <= 0) return;
    const pieces: TrayItem[] = breakdown(amount).map((v, j) => {
      uid.current += 1;
      return { id: uid.current, v, from: { x: (box?.w ?? 320) * 0.66, y: -150 }, delay: delay0 + j * 170 };
    });
    setChange((c) => [...c, ...pieces]);
    pieces.forEach((p) => later(() => (p.v < 20 ? fx.coin() : fx.swish()), (p.delay ?? 0) + 420));
  };

  const quote = (nr: Round) => {
    // normalmente dice el precio; en «dilo tú» lo pregunta («เท่าไหร่คะ») y espera a que se lo digas
    const l = asksYou(nr) ? howMuchLine(k) : quoteLine(nr.good, nr.qty, nr.price, k, nr.casual);
    setLine(l ?? WAITING);
    setLineKey((x) => x + 1);
    if (l) speak(l.th);
    setPhase('play');
    quoteAt.current = now();
    if (feria) setSpeedRun((x) => x + 1);
    measureTray();
    if (nr.kind === 'cambio' && nr.change !== undefined) later(() => dropChange(nr.change!, 0), 1700);
  };

  const startRound = (n: number) => {
    const list = planRef.current;
    const nr = list[n];
    closed.current = false;
    setI(n);
    setTray([]);
    setChange([]);
    setMistakes(0);
    setRevealed(false);
    setHinted(false);
    setHaggled(false);
    setDealOn(false);
    setPicked([]);
    setSayState('idle');
    setLine(null);
    setMe(null);
    setMood('idle');
    setMsg(null);
    setVerdict(null);
    setOutcome(null);
    setReceipt(false);
    setLeaving(false);
    setPhase('intro');
    if (feria && n === 0) juice.banner('¡Abre el mercado!', 'Paga justo… y rápido', color.buatong);
    else if (feria && nr.level > list[n - 1].level) {
      fx.levelup();
      juice.banner(`¡Nivel ${nr.level}!`, nr.show === 'thai' ? 'Precios en cifras thai' : 'Ahora, solo de oído', color.farol);
    }
    later(measureTray, 80);
    if ((nr.kind === 'cambio' || (nr.kind === 'decir' && nr.ask === 'cambio')) && nr.paid) {
      const notes: TrayItem[] = breakdown(nr.paid).map((v, j) => {
        uid.current += 1;
        return { id: uid.current, v, from: { x: 60 + j * 30, y: TRAY_H + 160 }, delay: j * 160 };
      });
      later(() => {
        setTray(notes);
        notes.forEach((p) => later(() => fx.swish(), (p.delay ?? 0) + 200));
      }, 500);
    }
    if (!feria && k.canAsk && (nr.kind === 'pagar' || nr.kind === 'regateo')) {
      later(() => setPhase('ask'), 500);
      return;
    }
    later(
      () => {
        fx.bell();
        quote(nr);
      },
      feria && n === 0 ? 1500 : 700,
    );
  };

  useEffect(() => {
    self.current = { start: startRound };
  });
  useEffect(() => {
    const all = timers.current;
    const voices = hush.current;
    const t = setTimeout(() => self.current?.start(0), 350);
    return () => {
      clearTimeout(t);
      all.forEach(clearTimeout);
      voices.forEach((stop) => stop());
    };
  }, []);

  const finishGame = () => {
    if (finished.current) return;
    finished.current = true;
    if (feria) {
      fx.fanfare();
      juice.banner('¡Mercado cerrado!', `${tally.current} puntos`, color.buatong);
      juice.burst(undefined, 'confeti', 34, 200);
      later(() => onDone(score.result(tally.current)), 1800);
    } else onDone(score.result(tally.current));
  };

  const advance = (from: number) => {
    if (advanced.current >= from || finished.current) return;
    advanced.current = from;
    if (from + 1 >= planRef.current.length) finishGame();
    else startRound(from + 1);
  };

  /** Lo que se falla vuelve: una ronda posterior usará el mismo número. */
  const relearn = (nr: Round) => {
    if (!nr.numWord) return;
    const list = planRef.current;
    const j = list.findIndex((x, idx) => idx > i + 1 && x.kind === 'pagar');
    if (j < 0) return;
    const fresh = makeRound('pagar', list[j].level, list[j].show, { ...k, fresh: new Set([nr.numWord.th]), focus: [nr.numWord, ...k.focus] });
    const next = list.map((x, idx) => (idx === j ? { ...fresh, gloss: x.gloss } : x));
    planRef.current = next;
    setPlan(next);
  };

  const finishRound = (ok: boolean, combo: number, opts: { note?: string; quiet?: boolean; delay?: number } = {}) => {
    setPhase('done');
    // la pista (ver el precio escrito) cuesta una estrella en la feria, también cuando compruebas el cambio
    const stars = ok ? liveStars : 0;
    let gain = 0;
    let speed = 0;
    let mult = 1;
    let bonus = 0;
    if (feria && ok) {
      const base = stars * 10 * r.level;
      // la rapidez cuenta de verdad: hasta la mitad más si pagas justo a la primera con la barra aún llena
      speed = mistakes === 0 && !hinted ? Math.round(base * 0.5 * Math.max(0, 1 - since(quoteAt.current) / SPEED_MS)) : 0;
      bonus = r.kind === 'regateo' && dealOn ? 10 * r.level : 0;
      mult = 1 + Math.min(4, Math.max(0, combo - 1)) * 0.25;
      gain = Math.round((base + speed + bonus) * mult);
    } else if (ok) gain = stars;
    tally.current += gain;
    setPoints(tally.current);
    setHistory((h) => [...h, stars]);
    setOutcome({ ok, stars, gain, speed, mult, bonus, note: opts.note });
    // al cerrar la ronda, la pizarra enseña el precio (sin que cuente como pista)
    if (r.show !== 'num') setRevealed(true);
    if (ok) {
      if (!opts.quiet) {
        setMood(stars === 3 ? 'love' : 'happy');
        later(() => speak(thanksLine(k).th), 450);
      }
      setJump((x) => x + 1);
      if (r.kind === 'pagar' || r.kind === 'regateo') setLeaving(true);
      centerOf(trayRef, (p) => juice.celebrate(p, feria ? `+${gain}` : saying ? '¡Bien dicho!' : '¡Justo!', 'monedas'));
      if (feria && stars === 3 && speed >= stars * r.level * 2.5) {
        later(() => {
          fx.sparkle();
          juice.banner('¡Perfecto!', saying ? 'Dicho a la primera y deprisa' : r.kind === 'cambio' ? 'Bien visto, y deprisa' : 'Justo, a la primera y deprisa', color.buatong);
        }, 700);
      }
    } else if (!opts.quiet) setMood('oops');
    later(() => {
      setReceipt(true);
      for (let s = 0; s < stars; s++) later(() => fx.sparkle(), 350 + s * 200);
    }, opts.delay ?? (ok ? 1150 : 1400));
    // tras un fallo, el recibo se queda hasta que lo tocas: es donde se aprende la frase
    if (feria && ok) later(() => advance(i), (opts.delay ?? 1150) + 3450);
  };

  // ——— Acciones ———

  const ask = () => {
    if (phase !== 'ask') return;
    const l = askLine(gender);
    setMe(l);
    fx.pop();
    setPhase('intro');
    // ella contesta cuando has terminado de preguntar
    mine(l.th, () => {
      later(() => setMe(null), 700);
      quote(r);
    });
  };

  const haggle = () => {
    if (closed.current || phase !== 'play' || haggled || r.deal === undefined) return;
    const deal = r.deal;
    setHaggled(true);
    // mientras regateáis no se paga: el precio nuevo vale cuando ella lo dice
    setPhase('trato');
    const l = haggleLine(gender, k.saysCaro);
    setMe(l);
    fx.pop();
    mine(l.th, () => {
      setMood('happy');
      setJump((x) => x + 1);
      later(() => {
        setMe(null);
        const pl = priceLine(deal, k, r.casual);
        setLine(pl);
        setLineKey((x) => x + 1);
        speak(pl.th);
        setDealOn(true);
        setMood('idle');
        setPhase('play');
        quoteAt.current = now();
        if (feria) setSpeedRun((x) => x + 1);
      }, 550);
    });
  };

  // ——— «Dilo tú» ———

  const pickTile = (t: NumTile) => {
    if (phase !== 'play' || !saying || picked.includes(t.id)) return;
    fx.tap();
    voice.current += 1;
    setTalking(false);
    say(t.th);
    setSayState('idle');
    setMsg(null);
    setPicked((list) => (list.includes(t.id) ? list : [...list, t.id]));
  };

  const unpickTile = (t: NumTile) => {
    if (phase !== 'play') return;
    fx.tap();
    setSayState('idle');
    setPicked((list) => list.filter((id) => id !== t.id));
  };

  const sayIt = () => {
    const tiles = r.tiles;
    if (closed.current || phase !== 'play' || !saying || !tiles || picked.length === 0) return;
    const parts = picked.map((id) => tiles.find((t) => t.id === id)?.th ?? '');
    const ok = answersOf(sayN).includes(parts.join(''));
    const combo = score.hit(ok);
    const first = mistakes === 0;
    onAnswer(ok, first ? r.numWord?.id : undefined);
    if (ok) {
      closed.current = true;
      setMsg(null);
      setSayState('ok');
      const l = amountLine(sayN, gender, k, parts);
      setMe(l);
      finishRound(true, combo, { quiet: true, delay: 1900, note: r.ask === 'cambio' ? `${r.paid} − ${r.price} = ${sayN} ฿ de cambio.` : undefined });
      // lo dices tú… y ella te da las gracias cuando terminas
      mine(l.th, () => {
        setMood('love');
        speak(thanksLine(k).th);
        later(() => setMe(null), 900);
      });
      if (r.ask === 'cambio') dropChange(sayN, 500);
      else {
        // el dinero justo va a la bandeja y de ahí a la vendedora
        const pieces: TrayItem[] = breakdown(sayN).map((v, j) => {
          uid.current += 1;
          return { id: uid.current, v, from: { x: (box?.w ?? 320) / 2, y: TRAY_H + 120 }, delay: 250 + j * 120 };
        });
        setTray(pieces);
        pieces.forEach((pc) => later(() => (pc.v < 20 ? fx.coin() : fx.swish()), (pc.delay ?? 0) + 300));
        later(() => setLeaving(true), 1150 + pieces.length * 120);
      }
      return;
    }
    juice.shake();
    const m = mistakes + 1;
    setMistakes(m);
    setSayState('bad');
    setWrongSay((x) => x + 1);
    setMood('oops');
    if (r.show !== 'num') setRevealed(true);
    if (feria && first) relearn(r);
    if (m >= 3) {
      closed.current = true;
      setPhase('done');
      later(() => {
        // la solución queda puesta en tu bocadillo y se oye despacio
        const used = new Set<number>();
        const solution = numberParts(sayN).map((th) => {
          const t = tiles.find((x) => x.th === th && !used.has(x.id));
          if (t) used.add(t.id);
          return t?.id ?? -1;
        });
        setPicked(solution.filter((id) => id > 0));
        setSayState('idle');
        setMsg(`Era ${sayN}: así se dice.`);
        voice.current += 1;
        say(amountLine(sayN, gender, k).th, { slow: true });
        finishRound(false, 0, { quiet: true, delay: 2200 });
      }, 800);
      return;
    }
    const n = numberParts(sayN).length;
    setMsg(m === 1 ? `Casi. Son ${n} ${n === 1 ? 'ficha' : 'fichas'}: tócalas para oírlas.` : 'Con calma: escucha cada ficha.');
    // si el precio se oía, la vendedora lo repite despacio
    if (line && !asksYou(r)) later(() => speak(line.th, true), 750);
    later(() => setMood((md) => (md === 'oops' ? 'idle' : md)), 2400);
  };

  const addMoney = (v: number, at: Point | null, dragged: boolean): boolean => {
    if (phase !== 'play' || changeLook || saying) return false;
    if (dragged && (!box || !at || at.y > box.y + box.h + 30 || at.y < box.y - 80)) return false;
    if (tray.length >= 24) {
      setMsg('¡La bandeja está llena!');
      return false;
    }
    uid.current += 1;
    const id = uid.current;
    const from = at && box ? { x: at.x - box.x, y: at.y - box.y } : { x: (box?.w ?? 300) / 2, y: TRAY_H + 120 };
    setTray((t) => [...t, { id, v, from }]);
    setMsg(null);
    if (mood === 'wow' || mood === 'oops') setMood('idle');
    later(() => (v < 20 ? fx.coin() : fx.swish()), dragged ? 160 : 330);
    return true;
  };

  const removeMoney = (id: number) => {
    if (phase !== 'play') return;
    fx.tap();
    setMsg(null);
    setTray((t) => t.filter((m) => m.id !== id));
  };

  const reveal = () => {
    if (revealed) return;
    fx.flip();
    setRevealed(true);
    setHinted(true);
  };

  const pay = () => {
    if (closed.current || phase !== 'play' || changeLook || saying || sum === 0) return;
    const ok = sum === target;
    const combo = score.hit(ok);
    const first = mistakes === 0;
    onAnswer(ok, first ? r.numWord?.id : undefined);
    if (ok) {
      closed.current = true;
      setMsg(null);
      const note =
        r.kind === 'regateo'
          ? dealOn
            ? `Regateo con gracia: de ${r.price} a ${r.deal} ฿.`
            : `Has pagado ${r.price} ฿… ¡podías haber regateado!`
          : undefined;
      finishRound(true, combo, { note });
      return;
    }
    juice.shake();
    const m = mistakes + 1;
    setMistakes(m);
    const over = sum > target;
    setMood(over ? 'wow' : 'oops');
    if (r.kind === 'regateo' && dealOn && sum === r.price) setMsg('¡Ya te lo había rebajado!');
    else if (feria) setMsg(over ? '¡Te pasas! Escucha otra vez.' : 'Te falta dinero. Escucha otra vez.');
    else setMsg(over ? `Te pasas ${sum - target} ฿.` : `Te faltan ${target - sum} ฿.`);
    if (r.show !== 'num') setRevealed(true);
    if (feria && first) relearn(r);
    if (m >= 3) {
      // la ronda se cierra ya: si no, otro toque en «Pagar» antes de enseñar la solución la contaba dos veces
      closed.current = true;
      setPhase('done');
      later(() => {
        setTray(
          breakdown(target).map((v) => {
            uid.current += 1;
            return { id: uid.current, v, from: null };
          }),
        );
        setMsg(`Eran ${target} ฿: así se paga justo.`);
        finishRound(false, 0);
      }, 900);
      return;
    }
    later(() => line && speak(line.th, true), 750);
    later(() => setMood((md) => (md === 'wow' || md === 'oops' ? 'idle' : md)), 2400);
  };

  const judge = (v: Verdict, e: GestureResponderEvent) => {
    if (closed.current || phase !== 'play' || r.kind !== 'cambio' || verdict || !truth || change.length === 0) return;
    closed.current = true;
    setVerdict(v);
    const ok = v === truth;
    const combo = score.hit(ok);
    onAnswer(ok, r.numWord?.id);
    if (ok) juice.celebrate(tapPoint(e), '¡Bien visto!', 'monedas');
    else juice.shake();
    const note = `${r.paid} − ${r.price} = ${right} ฿ de cambio. ${truth === 'justo' ? 'Te ha dado justo eso.' : truth === 'falta' ? `Te ha dado ${r.change}: faltaban ${right - r.change!} ฿.` : `Te ha dado ${r.change}: sobraban ${r.change! - right} ฿.`}`;
    if (truth === 'falta')
      later(() => {
        setMood('oops');
        speak(sorryLine(k).th);
        dropChange(right - r.change!, 0);
      }, 650);
    else if (truth === 'sobra')
      later(() => {
        setMood('love');
        setJump((x) => x + 1);
        speak(thanksLine(k).th);
        centerOf(vendorRef, (p) => juice.burst(p, 'corazones', 14, 110));
      }, 650);
    else
      later(() => {
        setMood('happy');
        speak(thanksLine(k).th);
      }, 650);
    finishRound(ok, combo, { note, quiet: true });
  };

  // ——— Dibujo ———

  const sw = stall.w;
  const sh = stall.h;
  const counterH = clamp(sh * 0.21, 46, 66);
  const vw = clamp(Math.min(sw * 0.37, sh * 0.62), 108, 176);
  const vk = vw / 160;
  const vh = vw * (170 / 160);
  const vBottom = counterH - vw * 0.2;
  const vTop = sh - vBottom - vh;
  const tagW = clamp(sw * 0.21, 70, 92);
  const goodsH = clamp(sh * 0.34, 62, 132);
  const goodsW = Math.max(80, sw - vw - tagW - 18);
  const bubbleTop = S.awning + 4;
  const tailTop = clamp(vTop + 96 * vk - bubbleTop - 8, 14, 56);

  const noteW = clamp((trayW - 24) / 4, 60, 82);
  const coinK = 0.5;
  const trayItems = changeLook ? [...tray, ...change] : tray;
  const area = { y: 10, h: TRAY_H - 18 };
  const paidSlots = changeLook ? pile(tray, { ...area, x: 8, w: noteW + 16 }, noteW, coinK) : null;
  const restPart = changeLook ? arrange(change, { ...area, x: noteW + 34, w: Math.max(60, trayW - noteW - 42) }, noteW, coinK) : arrange(tray, { ...area, x: 12, w: Math.max(60, trayW - 24) }, noteW, coinK);
  const slots = { ...paidSlots, ...restPart.slots };
  const badges = phase === 'done' && !changeLook ? [] : restPart.badges;
  const leaveTo = { x: 40 - 12, y: -(TRAY_H + 40) };
  // con «mil» ya enseñado entra el billete de 1.000 en la cartera
  const notes = k.top > 999 ? [...NOTES, 1000] : NOTES;
  const walletNoteW = clamp((trayW - 34 - (notes.length - 1) * 8) / notes.length, 54, 92);
  // solo de oído: el bocadillo no enseña la frase hasta que pides la pista, fallas o se cierra la ronda
  const veiled = r.show === 'oculto' && !revealed && phase !== 'done' && !!line && line !== WAITING;
  // quien ya lee va perdiendo la transcripción: fuera en los niveles 2 y 3 de la feria
  const hideRom = reads && feria && r.level >= 2;
  const sayPrompt = !saying
    ? ''
    : r.ask === 'cambio'
      ? `Pagas con ${r.paid} ฿. Dile cuánto cambio te toca`
      : r.show === 'oculto'
        ? 'Repite en thai el precio que has oído'
        : 'Dile el precio en thai';

  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="mercado" />
      <Animated.View style={[{ flex: 1 }, juice.shakeStyle]}>
        {/* Marcador */}
        <View style={styles.hud}>
          {feria ? (
            <View style={styles.level}>
              <Text style={styles.levelText}>Nivel {r.level}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {plan.map((_, n) => (
              <RoundDot key={n} state={n < history.length ? (history[n] > 0 ? 'ok' : 'bad') : n === i ? 'now' : 'next'} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          {score.combo >= 2 ? (
            <View style={styles.pill}>
              <ComboBadge combo={score.combo} />
            </View>
          ) : null}
          {feria ? (
            <Pop trigger={points} style={styles.pill}>
              <MiniCoin />
              <Text style={styles.pillNum}>{points}</Text>
            </Pop>
          ) : (
            <View style={[styles.pill, { gap: 1 }]} accessibilityLabel={`${hudStars} estrellas`}>
              {[1, 2, 3].map((s) => (
                <Icon key={s} name="star" size={18} color={s <= hudStars ? color.buatongHondo : color.niebla4} />
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 10, paddingHorizontal: 16, justifyContent: 'center' }}>{feria && phase === 'play' && speedRun ? <SpeedBar run={speedRun} ms={SPEED_MS} /> : null}</View>

        {/* El puesto */}
        <View style={{ flex: 1, minHeight: 210 }} onLayout={(e) => setStall({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {sw > 0 ? (
            <>
              <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
                <Awning width={sw} height={S.awning} />
              </View>
              <View ref={vendorRef} style={{ position: 'absolute', left: 4, top: vTop }}>
                <Vendor width={vw} mood={mood} talking={talking} jump={jump} />
              </View>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: counterH }}>
                <Counter width={sw} height={counterH} />
              </View>
              <View key={`g${i}`} style={{ position: 'absolute', left: vw + 6, bottom: counterH - 12, width: goodsW, height: goodsH }}>
                <GoodsDisplay good={r.good} qty={r.qty} width={goodsW} height={goodsH} />
              </View>
              {line ? (
                <View style={{ position: 'absolute', right: 8, bottom: counterH - 14 }}>
                  <PriceTag
                    key={`t${i}`}
                    price={r.price}
                    deal={dealOn ? r.deal : undefined}
                    show={r.show}
                    revealed={revealed}
                    gloss={r.gloss}
                    onReveal={(r.show === 'oculto' || (r.show === 'thai' && !r.gloss)) && phase === 'play' ? reveal : undefined}
                    w={tagW}
                  />
                </View>
              ) : null}
              <View style={{ position: 'absolute', left: vw - 6, right: 10, top: bubbleTop }}>
                <Bubble
                  label="ป้า · la vendedora"
                  line={phase === 'ask' ? null : line}
                  typedKey={lineKey}
                  tailTop={tailTop}
                  veiled={veiled}
                  hideRom={hideRom}
                  onSpeak={line && line !== WAITING ? () => speak(line.th) : undefined}
                />
              </View>
              {me ? (
                <View style={{ position: 'absolute', right: 12, bottom: counterH + 8, maxWidth: sw * 0.7, zIndex: 30 }}>
                  <MeBubble line={me} />
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {/* La bandeja */}
        <View
          ref={trayRef}
          onLayout={(e) => {
            setTrayW(e.nativeEvent.layout.width);
            measureTray();
          }}
          style={{ height: TRAY_H, marginHorizontal: 12, marginTop: 6, zIndex: 20 }}>
          {trayW > 0 ? <TrayBase width={trayW} height={TRAY_H} /> : null}
          {trayW > 0
            ? trayItems.map((m, n) => (
                <TrayPiece
                  key={m.id}
                  item={m}
                  slot={slots[m.id] ?? { x: 0, y: 0, r: 0 }}
                  noteW={noteW}
                  coinK={coinK}
                  order={n}
                  leaving={leaving}
                  leaveTo={leaveTo}
                  label={changeLook || saying ? `${m.v} baht` : `Quitar ${m.v} baht`}
                  onPress={phase === 'play' && !changeLook && !saying ? () => removeMoney(m.id) : undefined}
                />
              ))
            : null}
          {badges.map((b) => (
            <StackBadge key={b.key} b={b} />
          ))}
          {changeLook ? (
            <>
              <View style={[styles.trayChip, { left: 6 }]}>
                <Text style={styles.trayChipText}>Pagas {r.paid} ฿</Text>
              </View>
              <View style={[styles.trayChip, { left: noteW + 44 }]}>
                <Text style={styles.trayChipText}>Tu cambio</Text>
              </View>
            </>
          ) : saying ? null : (
            <View style={[styles.sum, sum === target && phase !== 'intro' && sum > 0 && r.show === 'num' ? { borderColor: color.arrozalVivo } : null]} pointerEvents="none">
              <Text style={styles.sumLabel}>Tu pago</Text>
              <Rolling value={sum} />
              <Text style={styles.sumBaht}>฿</Text>
            </View>
          )}
          {msg ? (
            <Animated.View entering={FadeIn.duration(160)} style={styles.msg} pointerEvents="none">
              <Text style={styles.msgText}>{msg}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Pizarra para decirlo tú, pregunta del cambio o cartera */}
        {saying ? (
          <View style={{ marginHorizontal: 12, marginTop: 10, zIndex: 30 }}>
            <SayBoard
              key={`s${i}`}
              prompt={sayPrompt}
              tiles={r.tiles ?? []}
              picked={picked}
              state={sayState}
              wrong={wrongSay}
              showRom={!reads || (feria && r.level === 1)}
              disabled={phase !== 'play'}
              height={S.wallet + S.bar - 10}
              onPick={pickTile}
              onUnpick={unpickTile}
              onSay={sayIt}
            />
          </View>
        ) : r.kind === 'cambio' ? (
          <View style={{ marginHorizontal: 12, marginTop: 10, height: S.wallet + S.bar - 10, padding: 14, gap: 10 }}>
            <WalletBase />
            <Txt v="h3" style={{ color: '#FFF4DE', textAlign: 'center' }}>
              ¿Te ha dado bien el cambio?
            </Txt>
            <Text style={styles.walletHint}>Has pagado con {r.paid} ฿. Escucha el precio y cuenta.</Text>
            <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
              {(
                [
                  ['justo', 'Está justo', color.arrozalVivo, color.arrozal],
                  ['falta', 'Me falta', color.farol, '#C9471F'],
                  ['sobra', 'Me sobra', color.cielo, color.cieloHondo],
                ] as const
              ).map(([v, label, face, depth]) => {
                const chosen = verdict === v;
                const isTruth = verdict && truth === v;
                return (
                  <Press3D key={v} disabled={!!verdict || change.length === 0 || phase !== 'play'} onPress={(e) => judge(v, e)} accessibilityLabel={label} style={{ flex: 1 }}>
                    <View style={[styles.judge, { backgroundColor: depth, opacity: change.length === 0 && !verdict ? 0.55 : verdict && !chosen && !isTruth ? 0.45 : 1 }]}>
                      <View style={[styles.judgeFace, { backgroundColor: face }]}>
                        <Icon name={v === 'justo' ? 'check' : v === 'falta' ? 'arrow' : 'sparkle'} size={22} color="#FFFFFF" stroke={3} />
                        <Text style={styles.judgeText}>{label}</Text>
                      </View>
                      {isTruth ? <View style={styles.judgeRing} /> : null}
                    </View>
                  </Press3D>
                );
              })}
            </View>
          </View>
        ) : (
          <>
            <View style={{ marginHorizontal: 12, marginTop: 10, height: S.wallet, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, justifyContent: 'space-between', zIndex: 30 }}>
              <WalletBase />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.walletTitle}>TU CARTERA</Text>
                <Text style={styles.walletHint}>toca o arrastra a la bandeja</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {notes.map((v) => (
                  <WalletPiece key={v} v={v} noteW={walletNoteW} disabled={phase !== 'play'} label={`Billete de ${v} baht`} onDrop={(at, dragged) => addMoney(v, at, dragged)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' }}>
                {COINS.map((v) => (
                  <WalletPiece key={v} v={v} noteW={walletNoteW} coinK={0.64} disabled={phase !== 'play'} label={`Moneda de ${v} baht`} onDrop={(at, dragged) => addMoney(v, at, dragged)} />
                ))}
              </View>
            </View>
            <View style={{ height: S.bar, flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 10 }}>
              {phase === 'ask' ? (
                <View style={{ flex: 1 }}>
                  <Glow size={260} tint={color.buatong} strength={0.45} style={{ position: 'absolute', left: '50%', top: -100, marginLeft: -130 }} />
                  <Press3D onPress={ask} accessibilityLabel={`Preguntar: ${askLine(gender).th}`} style={{ flex: 1 }}>
                    <View style={[styles.say, { backgroundColor: color.azafranHondo }]}>
                      <View style={[styles.sayFace, { backgroundColor: color.azafran }]}>
                        <Icon name="speaker" size={20} color={color.tinta} />
                        <View style={{ flexShrink: 1 }}>
                          <Th size={17} bold>{askLine(gender).th}</Th>
                          <Text style={styles.sayEs}>Pregunta: ¿cuánto cuesta esto?</Text>
                        </View>
                      </View>
                    </View>
                  </Press3D>
                </View>
              ) : (
                <>
                  {r.kind === 'regateo' && !haggled && phase === 'play' ? (
                    <Animated.View entering={ZoomIn.springify().damping(12)} style={{ flex: 1 }}>
                      <Press3D onPress={haggle} accessibilityLabel={`Regatear: ${haggleLine(gender, k.saysCaro).th}`} style={{ flex: 1 }}>
                        <View style={[styles.say, { backgroundColor: '#C9471F' }]}>
                          <View style={[styles.sayFace, { backgroundColor: color.farol, paddingHorizontal: 10 }]}>
                            <View style={{ flexShrink: 1 }}>
                              <Th size={15} bold style={{ color: '#FFFFFF' }} numberOfLines={1}>
                                {haggleLine(gender, false).th}
                              </Th>
                              <Text style={[styles.sayEs, { color: '#FFE6DC' }]}>¡Regatea!</Text>
                            </View>
                          </View>
                        </View>
                      </Press3D>
                    </Animated.View>
                  ) : null}
                  <View style={{ flex: 1.3 }}>
                    <Btn v="ok" label={sum > 0 ? `Pagar ${sum} ฿` : r.kind === 'regateo' && !haggled ? 'Pagar' : 'Elige con qué pagar'} disabled={sum === 0 || phase !== 'play'} onPress={pay} />
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {receipt && outcome ? (
        <Receipt
          ok={outcome.ok}
          stars={outcome.stars}
          line={saying ? amountLine(sayN, gender, k) : quoteLine(r.good, r.qty, r.price, k, r.casual)}
          price={saying ? sayN : dealOn && r.deal !== undefined ? r.deal : r.price}
          note={outcome.note}
          feria={feria}
          points={feria ? outcome : null}
          last={i + 1 >= plan.length}
          kind={r.kind}
          onNext={() => advance(i)}
        />
      ) : null}
      {juice.layer}
    </View>
  );
}

// ——— Piezas pequeñas ———

function RoundDot({ state }: { state: 'ok' | 'bad' | 'now' | 'next' }) {
  const size = state === 'now' ? 14 : 11;
  const bg = state === 'ok' ? color.buatong : state === 'bad' ? '#FF9A8A' : state === 'now' ? '#FFFFFF' : 'rgba(255,255,255,0.25)';
  return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: bg, borderWidth: state === 'now' ? 3 : 0, borderColor: color.azafran }} />;
}

function MiniCoin() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 20, backgroundColor: color.buatong, borderWidth: 2, borderColor: color.buatongHondo, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: font.displayBold, fontSize: 10, color: '#7A5600' }}>฿</Text>
    </View>
  );
}

/** Número que corre hasta su valor (el total de la bandeja). */
function Rolling({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const t = setInterval(() => {
      const d = value - cur.current;
      if (d === 0) {
        clearInterval(t);
        return;
      }
      cur.current += Math.abs(d) <= 2 ? d : Math.round(d / 3);
      setShown(cur.current);
    }, 32);
    return () => clearInterval(t);
  }, [value]);
  return (
    <Pop trigger={value} scale={1.15}>
      <Text style={styles.sumNum}>{shown}</Text>
    </Pop>
  );
}

function Receipt({ ok, stars, line, price, note, feria, points, last, kind, onNext }: { ok: boolean; stars: number; line: Line; price: number; note?: string; feria: boolean; points: Outcome | null; last: boolean; kind: Round['kind']; onNext: () => void }) {
  const title = !ok ? 'ไม่เป็นไร' : kind === 'cambio' ? '¡Bien visto!' : kind === 'decir' ? '¡Bien dicho!' : stars === 3 ? '¡Perfecto!' : '¡Pagado!';
  const stamp = !ok ? '¡ÁNIMO!' : kind === 'cambio' ? 'CAMBIO OK' : kind === 'decir' ? 'BIEN DICHO' : 'PAGADO';
  return (
    <Animated.View entering={SlideInDown.springify().damping(17).stiffness(170)} style={styles.receipt}>
      <View style={styles.zigzag}>
        {Array.from({ length: 26 }, (_, n) => (
          <View key={n} style={styles.tooth} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ marginTop: -40, marginLeft: -6 }}>
          <Noi pose={ok ? 'celebra' : 'ups'} size={84} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h2" style={{ color: ok ? color.arrozalHondo : color.lacaHondo, fontSize: 21 }} numberOfLines={1}>{title}</Txt>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[0, 1, 2].map((s) => (
              <Animated.View key={s} entering={ZoomIn.delay(250 + s * 200).springify().damping(8)}>
                <Icon name="star" size={24} color={s < stars ? color.buatongHondo : color.niebla3} />
              </Animated.View>
            ))}
          </View>
        </View>
        <Animated.View entering={ZoomIn.delay(150).springify().damping(9)}>
          <View style={[styles.stamp, { borderColor: ok ? color.laca : color.tinta3, transform: [{ rotate: '-12deg' }] }]}>
            <Text style={[styles.stampText, { color: ok ? color.laca : color.tinta3 }]}>{stamp}</Text>
          </View>
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Th size={19} bold>{line.th}</Th>
        </View>
        <Btn v="blue" height={38} style={{ width: 50 }} silent onPress={() => say(line.th)} accessibilityLabel="Escuchar" icon={<Icon name="speaker" size={20} color="#FFFFFF" />} />
      </View>
      <Rom rom={line.rom} size={13} />
      <Txt v="bodyStrong" style={{ fontSize: 15, lineHeight: 20 }}>{line.es}</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{price} ฿</Text>
        </View>
        <View style={styles.chip}>
          <Th size={13} bold style={{ color: color.tinta2 }}>{thaiDigits(price)} บาท</Th>
        </View>
        {points && points.ok ? (
          <>
            {points.speed > 0 ? (
              <View style={[styles.chip, { backgroundColor: color.arrozalSuave }]}>
                <Text style={styles.chipText}>⚡ rapidez +{points.speed}</Text>
              </View>
            ) : null}
            {points.bonus > 0 ? (
              <View style={[styles.chip, { backgroundColor: color.farolSuave }]}>
                <Text style={styles.chipText}>regateo +{points.bonus}</Text>
              </View>
            ) : null}
            {points.mult > 1 ? (
              <View style={[styles.chip, { backgroundColor: color.azafranSuave }]}>
                <Text style={styles.chipText}>racha ×{points.mult}</Text>
              </View>
            ) : null}
            <View style={[styles.chip, { backgroundColor: color.buatong }]}>
              <Text style={styles.chipText}>+{points.gain} puntos</Text>
            </View>
          </>
        ) : null}
      </View>
      {note ? <Txt v="small" style={{ color: color.tinta2 }}>{note}</Txt> : null}
      <Btn v={ok ? 'ok' : 'primary'} label={last ? (feria ? 'Cerrar el mercado' : 'Terminar') : feria ? 'Siguiente cliente' : 'Siguiente'} onPress={onNext} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 4, height: 40 },
  level: { height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.farol, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: '#C9471F' },
  levelText: { fontFamily: font.uiHeavy, fontSize: 12, color: '#FFFFFF' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF' },
  pillNum: { fontFamily: font.displayBold, fontSize: 17, color: color.tinta },
  sum: { position: 'absolute', right: 10, top: -14, flexDirection: 'row', alignItems: 'baseline', gap: 5, paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E8C08E' },
  sumLabel: { fontFamily: font.uiHeavy, fontSize: 11, color: color.tinta3, alignSelf: 'center' },
  sumNum: { fontFamily: font.displayBold, fontSize: 19, color: color.tinta },
  sumBaht: { fontFamily: font.uiHeavy, fontSize: 13, color: color.tinta3 },
  trayChip: { position: 'absolute', top: -12, height: 22, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  trayChipText: { fontFamily: font.uiHeavy, fontSize: 11, color: color.teca },
  msg: { position: 'absolute', left: 10, top: -14, maxWidth: '62%', minHeight: 30, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: color.laca, justifyContent: 'center' },
  msgText: { fontFamily: font.uiHeavy, fontSize: 12, color: '#FFFFFF' },
  walletTitle: { fontFamily: font.uiHeavy, fontSize: 11, letterSpacing: 1.4, color: '#FFE2B8' },
  walletHint: { fontFamily: font.uiBold, fontSize: 11, color: '#F1D4AE', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  judge: { flex: 1, borderRadius: 18, paddingBottom: 5 },
  judgeFace: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  judgeText: { fontFamily: font.display, fontSize: 15, color: '#FFFFFF', textAlign: 'center' },
  judgeRing: { position: 'absolute', left: -4, right: -4, top: -4, bottom: -4, borderRadius: 22, borderWidth: 3, borderColor: '#FFFFFF' },
  say: { flex: 1, borderRadius: 18, paddingBottom: 5, maxHeight: 66 },
  sayFace: { flex: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  sayEs: { fontFamily: font.uiBold, fontSize: 11, color: color.tinta2, marginTop: -2 },
  receipt: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 6,
    backgroundColor: '#FFFDF6',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 14,
  },
  zigzag: { position: 'absolute', top: -7, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', height: 8 },
  tooth: { width: 10, height: 10, backgroundColor: '#FFFDF6', transform: [{ rotate: '45deg' }], marginTop: 3 },
  stamp: { borderWidth: 3, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  stampText: { fontFamily: font.displayBold, fontSize: 14, letterSpacing: 1 },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: color.niebla2, justifyContent: 'center' },
  chipText: { fontFamily: font.uiHeavy, fontSize: 12, color: color.tinta },
});
