import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color, font, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Confetti, Mountains, MistBand, Stars } from '@/components/Scenery';
import { Bar, Btn, Rom, Sheet, SpeakBtn, Speech, Th, Tile, Txt, type TileState } from '@/components/ui';
import { YAI_LETTER } from '@/content/yai';
import { fx, say } from '@/lib/audio';
import { HAS_SEASON_2, SEASON_2_STOPS } from '@/content';
import { useStore, type Profile } from '@/lib/store';

const MOTIVES: { id: Profile['motive']; title: string; sub: string; tint: string; icon: 'home' | 'users' | 'map' | 'briefcase' | 'sparkle'; ink: string }[] = [
  { id: 'pareja', title: 'Mi pareja y su familia', sub: 'Para la mesa, las fiestas y las sobremesas', tint: color.lacaSuave, icon: 'home', ink: color.laca },
  { id: 'amigos', title: 'Amigos tailandeses', sub: 'Para reírte en su idioma', tint: color.cieloSuave, icon: 'users', ink: color.cieloHondo },
  { id: 'viajar', title: 'Viajar por Tailandia', sub: 'Del mercado a la montaña', tint: color.arrozalSuave, icon: 'map', ink: color.arrozal },
  { id: 'vivir', title: 'Vivir o trabajar allí', sub: 'Para el día a día', tint: color.tecaSuave, icon: 'briefcase', ink: color.teca },
  { id: 'curiosidad', title: 'Por curiosidad', sub: 'Porque suena precioso', tint: '#FFF6D9', icon: 'sparkle', ink: color.buatongHondo },
];

const LEVELS: { start: number; title: string; sub: string }[] = [
  { start: 1, title: 'Nada de nada', sub: 'Empiezas en Chiang Mai, curva 0' },
  { start: 3, title: 'Unas palabras sueltas', sub: 'sawatdee, khop khun… · empiezas en Mae Taeng' },
  { start: 5, title: 'Me defiendo hablando', sub: 'Pido comida, saludo, pregunto · empiezas en Pai' },
  { start: 6, title: 'Leo algo del alfabeto', sub: 'Empiezas en la cueva Tham Lod' },
  ...(HAS_SEASON_2 ? [{ start: SEASON_2_STOPS[0].n, title: 'Ya converso en thai', sub: 'Saltas a la temporada 2: un año en el pueblo, hacia el B1' }] : []),
];

const GOALS = [
  { goal: 30, min: '5 min', name: 'Paseo' },
  { goal: 60, min: '10 min', name: 'Excursión' },
  { goal: 90, min: '15 min', name: 'Aventura' },
  { goal: 120, min: '20 min', name: 'Expedición' },
];

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { finishOnboarding, addBananas, seeWords } = useStore();
  const [step, setStep] = useState(0);
  const [motive, setMotive] = useState<Profile['motive']>('pareja');
  const [gender, setGender] = useState<Profile['gender']>('m');
  const [level, setLevel] = useState(1);
  const [goal, setGoal] = useState(60);

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    finishOnboarding({ name: '', gender, motive, startStop: level, goal });
    seeWords(['sawatdii']);
    addBananas(15);
    router.replace('/(tabs)');
  };

  const pad = { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 16 };

  return (
    <View style={{ flex: 1, backgroundColor: step === 0 ? '#F7E9DF' : step === 9 ? color.noche : color.niebla }}>
      <Animated.View key={step} entering={step === 0 ? FadeIn : FadeInRight.springify().damping(18)} exiting={FadeOutLeft.duration(160)} style={[{ flex: 1 }, step === 0 ? null : pad]}>
        {step === 0 && <Splash onStart={next} bottom={insets.bottom} />}
        {step === 1 && <Story onNext={next} onSkip={() => setStep(3)} />}
        {step === 2 && <Letter onNext={next} onSkip={() => setStep(3)} />}
        {step === 3 && <MeetNoi onNext={next} />}
        {step === 4 && (
          <Question n={1} onBack={back} title="¿Con quién quieres hablar en thai?" onNext={next}>
            {MOTIVES.map((m) => (
              <Option key={m.id} selected={motive === m.id} onPress={() => setMotive(m.id)} title={m.title} sub={m.sub} tint={m.tint} icon={<View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: m.tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon} size={26} color={m.ink} stroke={2.2} /></View>} />
            ))}
          </Question>
        )}
        {step === 5 && (
          <Question n={2} onBack={back} title="¿Cómo acabarás tus frases?" sub="En thai, las frases amables terminan con una partícula que depende de quién habla." onNext={next}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['m', 'f'] as const).map((g) => (
                <Pressable
                  key={g}
                  accessibilityRole="button"
                  accessibilityState={{ selected: gender === g }}
                  onPress={() => {
                    setGender(g);
                    fx.tap();
                    say(g === 'm' ? 'ครับ' : 'ค่ะ');
                  }}
                  style={[styles.option, { flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }, gender === g && styles.optionSel]}>
                  <Th size={44} bold>
                    {g === 'm' ? 'ครับ' : 'ค่ะ'}
                  </Th>
                  <Rom rom={g === 'm' ? 'khráp' : 'khâ'} size={17} />
                  <Txt v="h3" style={{ fontSize: 16 }}>{g === 'm' ? 'Hablo como hombre' : 'Hablo como mujer'}</Txt>
                  <Txt v="small">«yo» = {g === 'm' ? 'ผม phǒm' : 'ฉัน chǎn'}</Txt>
                </Pressable>
              ))}
            </View>
            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <SpeakBtn size={44} onPress={() => say(gender === 'm' ? 'ขอบคุณครับ' : 'ขอบคุณค่ะ')} />
              <View>
                <Th size={20}>{gender === 'm' ? 'ขอบคุณครับ' : 'ขอบคุณค่ะ'}</Th>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Rom rom={gender === 'm' ? 'khɔ̀ɔp-khun khráp' : 'khɔ̀ɔp-khun khâ'} />
                  <Txt v="small">· Gracias</Txt>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Noi pose="escucha" size={96} />
              <Speech tail="left" style={{ flex: 1, marginBottom: 24 }}>
                <Txt v="bodyStrong" style={{ fontSize: 15 }}>Con ella, cada frase sonará amable. Puedes cambiarla cuando quieras.</Txt>
              </Speech>
            </View>
          </Question>
        )}
        {step === 6 && (
          <Question n={3} onBack={back} title="¿Cuánto thai sabes ya?" onNext={next}>
            {LEVELS.map((l, i) => (
              <Option key={l.start} selected={level === l.start} onPress={() => setLevel(l.start)} title={l.title} sub={l.sub} icon={<LevelIcon n={i} />} />
            ))}
          </Question>
        )}
        {step === 7 && (
          <Question n={4} onBack={back} title="¿Cuánto quieres viajar cada día?" onNext={next} cta="Probar mi primera curva">
            <LanternGoal goal={goal} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {GOALS.map((g) => (
                <Pressable
                  key={g.goal}
                  accessibilityRole="button"
                  accessibilityState={{ selected: goal === g.goal }}
                  onPress={() => {
                    setGoal(g.goal);
                    fx.tap();
                  }}
                  style={[styles.option, { width: '47.5%', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }, goal === g.goal && styles.optionSel]}>
                  <Txt v="num" style={{ fontSize: 24 }}>{g.min}</Txt>
                  <Txt v="h3" style={{ fontSize: 16 }}>{g.name}</Txt>
                  <Txt v="small">{g.goal} plátanos{g.goal === 60 ? ' · recomendado' : ''}</Txt>
                </Pressable>
              ))}
            </View>
            <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Art name="paraguas" size={38} />
              <Txt v="small" style={{ flex: 1 }}>
                <Txt v="small" style={{ color: color.tinta }}>Empiezas con 2 paraguas de Bo Sang.</Txt> Si un día llueve y no juegas, protegen tu racha. Aquí nadie pierde por un mal día.
              </Txt>
            </View>
          </Question>
        )}
        {step === 8 && <FirstWord onDone={next} />}
        {step === 9 && <FirstLantern onDone={finish} />}
      </Animated.View>
    </View>
  );
}

// ——— pasos ———

function Splash({ onStart, bottom }: { onStart: () => void; bottom: number }) {
  const clusters = ['ส', 'นุ', 'ก'];
  return (
    <View style={{ flex: 1 }}>
      <Mountains height={560} house />
      <View style={{ alignItems: 'center', paddingTop: 110, gap: 2 }}>
        <View style={{ flexDirection: 'row' }}>
          {clusters.map((c, i) => (
            <Animated.View key={c} entering={FadeInDown.delay(300 + i * 180).springify().damping(9)}>
              <Th size={86} bold style={{ lineHeight: 120 }}>
                {c}
              </Th>
            </Animated.View>
          ))}
        </View>
        <Animated.Text entering={FadeIn.delay(950)} style={{ fontFamily: font.displayBold, fontSize: 30, color: color.azafranHondo, letterSpacing: 0.6 }}>
          Sanuk
        </Animated.Text>
        <Animated.View entering={FadeIn.delay(1200)}>
          <Txt v="body" style={{ marginTop: 8, fontSize: 17 }}>Thai, curva a curva.</Txt>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(700).springify()} style={{ position: 'absolute', left: 26, bottom: 214 + bottom }}>
        <Noi pose="hola" size={150} />
      </Animated.View>
      <View style={[styles.splashPanel, { paddingBottom: Math.max(bottom, 16) + 20 }]}>
        <Txt v="small" style={{ textAlign: 'center' }}>1.864 curvas te separan de una familia que aún no conoce tu voz.</Txt>
        <Btn label="Empezar el viaje" onPress={onStart} />
      </View>
    </View>
  );
}

function Dots({ on, onSkip }: { on: number; onSkip?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ height: 8, width: i === on ? 22 : 8, borderRadius: 8, backgroundColor: i === on ? color.tinta : color.niebla4 }} />
        ))}
      </View>
      {onSkip ? (
        <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
          <Txt v="bodyStrong" style={{ color: color.tinta2 }}>Saltar</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function Story({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, gap: 20 }}>
      <Dots on={0} onSkip={onSkip} />
      <View style={[styles.figure]}>
        <Svg width="100%" height="100%" viewBox="0 0 350 340" preserveAspectRatio="xMidYMid slice">
          <Rect width={350} height={340} fill="#DCE5F1" />
          <Circle cx={70} cy={70} r={26} fill="#FFF4DD" />
          <Path d="M0 190 L70 140 L130 176 L200 120 L270 168 L350 130 L350 340 L0 340 Z" fill="#B9C9DC" />
          <Path d="M0 250 L90 196 L170 236 L250 188 L350 228 L350 340 L0 340 Z" fill="#8FB3A8" />
          <Path d="M144 202 L190 168 L236 202 Z" fill="#7E4626" />
          <Rect x={154} y={202} width={72} height={44} fill="#B06D3D" />
          <Rect x={166} y={214} width={18} height={16} rx={2} fill={color.buatong} />
          <Rect x={196} y={214} width={18} height={16} rx={2} fill="#6B3A1F" />
          <Path d="M160 246 v26 M220 246 v26 M190 246 v26" stroke="#6B3A1F" strokeWidth={5} />
          <Path d="M0 300 L120 252 L230 290 L350 250 L350 340 L0 340 Z" fill="#5E9A7B" />
        </Svg>
        <MistBand top={160} width={240} opacity={0.8} />
        <MistBand top={240} width={260} opacity={0.75} delay={800} distance={-40} />
      </View>
      <Animated.View entering={FadeInDown.delay(200)} style={{ gap: 10 }}>
        <Txt v="eyebrow">Capítulo 0 · La invitación</Txt>
        <Txt v="h1">En lo alto de Mae Hong Son, la niebla se queda a dormir.</Txt>
        <Txt>Allí, en una casa de teca, una familia espera conocerte. Todavía no habla tu idioma. Tú todavía no hablas el suyo.</Txt>
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Btn label="Siguiente" onPress={onNext} />
    </View>
  );
}

function Letter({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const lines = YAI_LETTER.slice(0, 6);
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, gap: 16 }}>
      <Dots on={1} onSkip={onSkip} />
      <View style={{ gap: 6 }}>
        <Txt v="eyebrow">Llega una carta</Txt>
        <Txt v="h2">Yai, la abuela, te ha escrito.</Txt>
      </View>
      <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.paper}>
        <View style={styles.stamp}>
          <Art name="farol" size={38} />
        </View>
        {lines.map((l, i) => (
          <Th key={i} size={19} style={{ opacity: 0.32, letterSpacing: 1 }}>
            {l.tokens.map((t) => t.th).join('')}
          </Th>
        ))}
        <MistBand top={70} width={300} height={34} opacity={0.75} />
        <MistBand top={170} width={300} height={30} opacity={0.7} delay={600} distance={-30} />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt v="small">
          Entiendes el <Txt v="small" style={{ color: color.tinta }}>0 %</Txt>
        </Txt>
        <Bar value={0} />
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Noi pose="piensa" size={112} />
        <Speech tail="left" style={{ flex: 1, marginBottom: 30 }}>
          <Txt v="bodyStrong" style={{ fontSize: 15 }}>Todavía es niebla. Para cuando lleguemos arriba, la leerás entera. Prometido.</Txt>
        </Speech>
      </View>
      <Btn label="¿Y cómo llego hasta allí?" onPress={onNext} />
    </View>
  );
}

function MeetNoi({ onNext }: { onNext: () => void }) {
  const [jump, setJump] = useState(0);
  const [heard, setHeard] = useState(false);
  const hello = () => {
    setJump((j) => j + 1);
    setHeard(true);
    say('สวัสดี');
  };
  useEffect(() => {
    const t = setTimeout(hello, 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, gap: 14 }}>
      <Dots on={2} />
      <Animated.View entering={ZoomIn.delay(200).springify().damping(10)} style={{ alignSelf: 'center' }}>
        <Speech tail="bottom" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Th size={26} bold>
            สวัสดี!
          </Th>
          <Txt v="h3">Soy Noi.</Txt>
        </Speech>
      </Animated.View>
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 280 }}>
        <View style={styles.noiHalo} />
        <Noi pose="hola" size={270} jump={jump} onPress={hello} accessibilityLabel="Noi. Tócala para que te salude" />
      </View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Txt v="h1" style={{ textAlign: 'center' }}>Mi nombre significa «pequeña».</Txt>
        <Txt style={{ textAlign: 'center' }}>Peso 1.200 kilos y me sé las 1.864 curvas de memoria. Yo te llevo hasta la casa de Yai.</Txt>
      </View>
      {heard ? (
        <Animated.View entering={FadeInDown.springify()} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <Art name="sello" size={40} />
          <View style={{ flex: 1 }}>
            <Txt v="small" style={{ fontSize: 12 }}>Tu primera palabra · toca a Noi para oírla</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Th size={20}>สวัสดี</Th>
              <Rom rom="sà-wàt-dii" />
              <Txt v="small">· hola</Txt>
            </View>
          </View>
        </Animated.View>
      ) : null}
      <View style={{ flex: 1 }} />
      <Btn label="¡Vamos, Noi!" onPress={onNext} />
    </View>
  );
}

function Question({ n, title, sub, children, onNext, onBack, cta = 'Continuar' }: { n: number; title: string; sub?: string; children: ReactNode; onNext: () => void; onBack: () => void; cta?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Atrás" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={24} />
        </Pressable>
        <Bar value={n / 4} />
        <View style={{ width: 12 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 14, paddingBottom: 20 }}>
        <View style={{ gap: 8 }}>
          <Txt v="eyebrow">Pregunta {n} de 4</Txt>
          <Txt v="h2">{title}</Txt>
          {sub ? <Txt>{sub}</Txt> : null}
        </View>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: 20 }}>
        <Btn label={cta} onPress={onNext} />
      </View>
    </View>
  );
}

function Option({ title, sub, selected, onPress, tint, icon }: { title: string; sub: string; selected: boolean; onPress: () => void; tint?: string; icon?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        fx.tap();
        onPress();
      }}
      style={[styles.option, selected && styles.optionSel]}>
      {icon ?? <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint ?? color.niebla2 }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="h3" style={{ fontSize: 17 }}>{title}</Txt>
        <Txt v="small">{sub}</Txt>
      </View>
      {selected ? (
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color.azafran, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={16} color={color.tinta} stroke={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

function LevelIcon({ n }: { n: number }) {
  const fills = [color.azafran, color.monte2, color.monte3, color.monte4];
  return (
    <Svg width={52} height={40} viewBox="0 0 52 40">
      <Path d="M2 38 L14 22 L22 30 L34 12 L50 38 Z" fill={color.niebla3} />
      {n === 0 && <Path d="M2 38 L14 22 L22 30 Z" fill={fills[0]} />}
      {n === 1 && <Path d="M2 38 L14 22 L22 30 L28 21 L28 38 Z" fill={fills[1]} />}
      {n === 2 && <Path d="M2 38 L14 22 L22 30 L34 12 L38 18 L38 38 Z" fill={fills[2]} />}
      {n >= 3 && <Path d="M2 38 L14 22 L22 30 L34 12 L50 38 Z" fill={fills[3]} />}
      {n === 4 && <Path d="M44 4 C38 5 35 10 36 15 C37 20 42 22 47 20 C43 19 40 16 40 12 C40 8 41 6 44 4 Z" fill={color.buatong} />}
    </Svg>
  );
}

function LanternGoal({ goal }: { goal: number }) {
  const glow = useSharedValue(1);
  useEffect(() => {
    glow.value = withRepeat(withSequence(withTiming(1.12, { duration: 1100 }), withTiming(1, { duration: 1100 })), -1, true);
  }, [glow]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));
  const size = 70 + goal * 0.6;
  return (
    <View style={styles.lantern}>
      <Stars n={10} />
      <Animated.View style={[{ position: 'absolute', width: size + 60, height: size + 60, borderRadius: 999, backgroundColor: '#FF8A3D', opacity: 0.2 }, s]} />
      <Art name="farol" size={size} />
      <Txt v="small" style={{ position: 'absolute', bottom: 10, color: '#FFE6C7' }}>Cada día que cumples, enciendes un farolillo</Txt>
    </View>
  );
}

function FirstWord({ onDone }: { onDone: () => void }) {
  const opts = ['Hola', 'Gracias', 'Perdón'];
  const [pick, setPick] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => say('สวัสดี'), 500);
    return () => clearTimeout(t);
  }, []);
  const state = (o: string): TileState => (!checked ? (pick === o ? 'sel' : 'idle') : o === 'Hola' ? 'ok' : o === pick ? 'bad' : 'gone');
  const ok = pick === 'Hola';
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
        <View style={{ width: 44 }} />
        <Bar value={checked ? 1 : 0.4} />
        <View style={styles.miniChip}>
          <Art name="platano" size={20} />
          <Txt v="bodyStrong">+15</Txt>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 20, paddingTop: 16 }}>
        <Txt v="h2">¿Qué ha dicho Noi?</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Noi pose="escucha" size={130} />
          <View style={{ gap: 10 }}>
            <SpeakBtn size={84} onPress={() => say('สวัสดี')} />
            <SpeakBtn slow size={40} onPress={() => say('สวัสดี', { slow: true })} />
          </View>
        </View>
        <View style={{ gap: 12 }}>
          {opts.map((o) => (
            <Tile key={o} state={state(o)} disabled={checked} height={58} onPress={() => setPick(o)} accessibilityLabel={o}>
              <Txt v="h3">{o}</Txt>
            </Tile>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }} />
      {!checked ? (
        <View style={{ paddingHorizontal: 20 }}>
          <Btn
            label={pick ? 'Comprobar' : 'Elige una respuesta'}
            disabled={!pick}
            onPress={() => {
              setChecked(true);
              if (pick === 'Hola') fx.ok();
              else fx.bad();
            }}
          />
        </View>
      ) : (
        <Sheet kind={ok ? 'ok' : 'bad'} title={ok ? '¡เก่งมาก! ¡Qué crack!' : 'ไม่เป็นไร. Era «hola»'} action="Continuar" onAction={onDone}>
          <Txt style={{ color: ok ? color.arrozalHondo : color.lacaHondo }}>
            สวัสดี sirve para hola y adiós, a cualquier hora. Al decirlo, junta las manos a la altura del pecho: es el <Txt v="bodyStrong" style={{ color: ok ? color.arrozalHondo : color.lacaHondo }}>wai</Txt>.
          </Txt>
        </Sheet>
      )}
    </View>
  );
}

function FirstLantern({ onDone }: { onDone: () => void }) {
  const rise = useSharedValue(40);
  // el confeti sale en cuanto aparece el farolillo
  const [run] = useState(1);
  useEffect(() => {
    fx.bell();
    rise.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [rise]);
  const sway = useSharedValue(0);
  useEffect(() => {
    sway.value = withRepeat(withSequence(withTiming(-4, { duration: 1300 }), withTiming(4, { duration: 1300 })), -1, true);
  }, [sway]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }, { rotate: `${sway.value}deg` }] }));
  const firstLine = YAI_LETTER[0].tokens;
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, gap: 16, alignItems: 'center' }}>
      <Stars n={22} />
      <Animated.View style={[{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }, s]}>
        <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#FF8A3D', opacity: 0.18 }} />
        <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFB347', opacity: 0.28 }} />
        <Art name="farol" size={150} />
      </Animated.View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Txt v="eyebrow" style={{ color: color.buatong }}>Día 1 · racha encendida</Txt>
        <Txt v="h1" style={{ color: '#FFFFFF', textAlign: 'center' }}>Has encendido tu primer farolillo</Txt>
        <Txt style={{ color: '#C9D0EE', textAlign: 'center' }}>Y algo más: la primera palabra de la carta de Yai ya no es niebla.</Txt>
      </View>
      <View style={[styles.letterStrip]}>
        {firstLine.map((t, i) => (
          <Th key={i} size={22} style={i === 0 ? null : { opacity: 0.25 }}>
            {t.th}
          </Th>
        ))}
        <Txt v="small" style={{ marginLeft: 'auto' }}>
          สวัสดี = hola
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
        {[
          { icon: 'platano' as const, v: '+15', l: 'plátanos' },
          { icon: 'farol' as const, v: '1', l: 'día de racha' },
          { icon: 'paraguas' as const, v: '2', l: 'paraguas' },
        ].map((s2) => (
          <View key={s2.l} style={styles.nightStat}>
            <Art name={s2.icon} size={30} />
            <Txt v="num" style={{ color: '#FFFFFF' }}>{s2.v}</Txt>
            <Txt v="small" style={{ color: '#C9D0EE', fontSize: 11 }}>{s2.l}</Txt>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        <Noi pose="celebra" size={96} />
      </View>
      <Btn label="Ver el camino" onPress={onDone} style={{ alignSelf: 'stretch' }} />
      <Confetti run={run} />
    </View>
  );
}

const styles = StyleSheet.create({
  splashPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 26, gap: 12, backgroundColor: color.niebla, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  figure: { height: 330, borderRadius: 32, overflow: 'hidden', ...shadow.card, backgroundColor: '#DCE5F1' },
  paper: { padding: 22, paddingTop: 26, backgroundColor: '#FFFDF7', borderRadius: 10, transform: [{ rotate: '-2deg' }], overflow: 'hidden', ...shadow.card },
  stamp: { position: 'absolute', right: 14, top: 12, width: 56, height: 56, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#E7C9A9', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF6E8' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, ...shadow.card },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3, borderBottomWidth: 5 },
  optionSel: { backgroundColor: color.azafranSuave, borderColor: color.azafran, borderBottomColor: color.azafranHondo },
  noiHalo: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#FFFFFF', ...shadow.card },
  lantern: { height: 170, borderRadius: 28, backgroundColor: color.noche, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  miniChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: color.niebla3 },
  letterStrip: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFDF7', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 },
  nightStat: { flex: 1, borderRadius: 18, backgroundColor: color.noche2, padding: 12, alignItems: 'center', gap: 4 },
});
