// La respuesta a Yai: cierra el arco de la carta. Eliges dos frases, las oyes, la carta sube al cielo
// en un farolillo y Yai te contesta.
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font, shadow } from '@/brand/tokens';
import { Art, Icon } from '@/components/icons';
import { Noi } from '@/components/Noi';
import { Btn, Rom, Th, Txt } from '@/components/ui';
import { HAS_SEASON_2, SENTENCES, letterProgress } from '@/content';
import type { Sentence } from '@/content/types';
import { Backdrop } from '@/games/Backdrop';
import { Person } from '@/games/cena/family';
import { Floaty, Glow, Press3D, useJuice } from '@/games/fx';
import { fx, say, stopSpeech } from '@/lib/audio';
import { useStore } from '@/lib/store';
import { joinThai, personalize, personalizeRom, type Gender } from '@/lib/thai';
import { goBack } from '@/lib/nav';

/** Frases de la lección «Responder a Yai»: la carta empieza con la primera y se eligen dos de las demás. */
const OPENER = 'b142';
const CHOICES = ['b143', 'b144', 'b145', 'b146'];
const SIGN = { th: 'จาก หลาน', rom: 'jàak lǎan' };
const YAI_ANSWER = { th: 'ยายดีใจมากจ้ะ ยายรอหลานอยู่นะ', rom: 'yaai dii-jai mâak jâ, yaai rɔɔ lǎan yùu ná', es: 'La abuela está muy contenta. Te espera, cielo.' };

const thaiOf = (s: Sentence, g: Gender) => joinThai(s.th.map((t) => personalize(t, g)));

type Phase = 'escribir' | 'enviando' | 'respuesta';

export default function Respuesta() {
  const { p, sendReply } = useStore();
  const insets = useSafeAreaInsets();
  const g = p.profile.gender;
  const ready = letterProgress(p).pct >= 100 || !!p.reply;
  const [chosen, setChosen] = useState<string[]>(() => p.reply?.sentences ?? []);
  const [phase, setPhase] = useState<Phase>(() => (p.reply ? 'respuesta' : 'escribir'));
  const opener = SENTENCES[OPENER];
  const options = CHOICES.map((id) => SENTENCES[id]).filter(Boolean);
  const letter = [opener, ...chosen.map((id) => SENTENCES[id])].filter(Boolean);

  const close = () => {
    stopSpeech();
    goBack('/carta');
  };
  const toggle = (id: string) => {
    fx.tap();
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 2 ? [c[1], id] : [...c, id]));
    const s = SENTENCES[id];
    if (s) say(thaiOf(s, g));
  };
  const readAll = () => say([...letter.map((s) => thaiOf(s, g)), SIGN.th].join(' '));
  const send = () => {
    stopSpeech();
    sendReply(chosen);
    fx.whoosh();
    setPhase('enviando');
    setTimeout(() => {
      fx.fanfare();
      setPhase('respuesta');
    }, 3000);
  };

  if (!ready)
    return (
      <View style={[styles.center, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <Noi pose="piensa" size={160} />
        <Txt v="h2" style={{ textAlign: 'center' }}>Primero, lee la carta entera</Txt>
        <Txt style={{ textAlign: 'center' }}>Cuando la niebla se despeje del todo, podrás contestarle a Yai.</Txt>
        <Btn label="Volver" onPress={close} style={{ alignSelf: 'stretch' }} />
      </View>
    );

  if (phase === 'enviando') return <Sending />;
  if (phase === 'respuesta')
    return (
      <YaiAnswers
        letter={letter}
        gender={g}
        onWriteAgain={() => setPhase('escribir')}
        onClose={close}
        onContinue={() => {
          stopSpeech();
          router.replace('/(tabs)');
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: color.niebla }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 20, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}>
            <Icon name="back" size={24} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Txt v="eyebrow">La carta de Yai</Txt>
            <Txt v="h2">Tu respuesta</Txt>
          </View>
        </View>

        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.paper}>
          <PaperLine s={opener} g={g} strong />
          {[0, 1].map((k) => {
            const id = chosen[k];
            const s = id ? SENTENCES[id] : undefined;
            return s ? (
              <Pressable key={id} onPress={() => toggle(id)} accessibilityRole="button" accessibilityLabel={`Quitar: ${s.es}`}>
                <Animated.View entering={FadeIn.duration(200)}>
                  <PaperLine s={s} g={g} />
                </Animated.View>
              </Pressable>
            ) : (
              <View key={`hueco${k}`} style={styles.slot}>
                <Txt v="small" style={{ color: color.tinta3 }}>{k === 0 ? 'Elige una frase de abajo' : 'Y otra más'}</Txt>
              </View>
            );
          })}
          <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
            <Th size={20}>{SIGN.th}</Th>
            <Rom rom={SIGN.rom} size={12} />
          </View>
        </Animated.View>

        <Txt v="eyebrow">Elige dos frases para Yai</Txt>
        {options.map((s) => {
          const n = chosen.indexOf(s.id);
          return (
            <Press3D key={s.id} onPress={() => toggle(s.id)} accessibilityLabel={s.es} depth={8}>
              <View style={[styles.choice, n >= 0 && styles.choiceOn]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Th size={19}>{thaiOf(s, g)}</Th>
                  <Rom rom={personalizeRom(s.rom, g)} size={12} />
                  <Txt v="small">{s.es}</Txt>
                </View>
                <View style={[styles.badge, n >= 0 && styles.badgeOn]}>
                  <Txt v="bodyStrong" style={{ color: n >= 0 ? color.tinta : color.tinta3 }}>{n >= 0 ? n + 1 : '+'}</Txt>
                </View>
              </View>
            </Press3D>
          );
        })}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Btn v="ghost" label="Escuchar" disabled={!chosen.length} onPress={readAll} silent style={{ flex: 1 }} icon={<Icon name="speaker" size={20} color={color.cieloHondo} />} />
        <Btn label={chosen.length < 2 ? `Elige ${2 - chosen.length} más` : 'Enviar a Yai'} disabled={chosen.length < 2} onPress={send} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function PaperLine({ s, g, strong }: { s: Sentence; g: Gender; strong?: boolean }) {
  return (
    <View style={{ gap: 1, paddingVertical: 6 }}>
      <Th size={strong ? 22 : 20} bold={strong}>
        {thaiOf(s, g)}
      </Th>
      <Rom rom={personalizeRom(s.rom, g)} size={12} />
      <Txt v="small" style={{ fontSize: 12 }}>{s.es}</Txt>
    </View>
  );
}

/** La carta, doblada, sube al cielo de la noche en un farolillo hacia la montaña. */
function Sending() {
  const { height } = useWindowDimensions();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) });
  }, [y]);
  const st = useAnimatedStyle(() => ({ opacity: y.value > 0.85 ? (1 - y.value) / 0.15 : 1, transform: [{ translateY: -y.value * height * 0.62 }, { scale: 1 - y.value * 0.55 }] }));
  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="noche" />
      <View style={[styles.center, { justifyContent: 'flex-end', paddingBottom: height * 0.14 }]}>
        <Animated.View style={[{ alignItems: 'center' }, st]}>
          <Glow size={220} tint="#FFB347" style={{ position: 'absolute', top: -40 }} />
          <Floaty amp={4} rotate={4}>
            <Art name="farol" size={130} />
          </Floaty>
          <View style={styles.folded} />
        </Animated.View>
        <Txt v="h2" style={{ color: '#FFFFFF', textAlign: 'center', marginTop: 24 }}>Tu carta vuela hacia la montaña…</Txt>
      </View>
    </View>
  );
}

/** Yai recibe la carta y contesta, con su voz. */
function YaiAnswers({ letter, gender, onWriteAgain, onClose, onContinue }: { letter: Sentence[]; gender: Gender; onWriteAgain: () => void; onClose: () => void; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const juice = useJuice();
  const [talking, setTalking] = useState(false);
  const speak = () => {
    setTalking(true);
    say(YAI_ANSWER.th, { onDone: () => setTalking(false) });
  };
  // solo al llegar: corazones y la voz de Yai, una vez
  const greet = useEffectEvent(() => {
    juice.burst(undefined, 'corazones', 22, 150);
    speak();
  });
  useEffect(() => {
    const t = setTimeout(() => greet(), 500);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <Backdrop scene="casa" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 20, gap: 14, alignItems: 'center' }}>
        <Txt v="eyebrow" style={{ color: '#FFE7B0' }}>Mae Hong Son · casa de Yai</Txt>
        <Person who="Yai" size={170} face="love" talking={talking} active thinking={false} jump={0} />
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.answer, { alignSelf: 'stretch' }]}>
          <Txt v="eyebrow">Yai te contesta</Txt>
          <Th size={22} bold>
            {YAI_ANSWER.th}
          </Th>
          <Rom rom={YAI_ANSWER.rom} size={13} />
          <Txt v="bodyStrong">{YAI_ANSWER.es}</Txt>
          <Btn v="blue" label="Oír a Yai" height={44} silent onPress={speak} icon={<Icon name="speaker" size={20} color="#FFFFFF" />} />
        </Animated.View>
        <View style={[styles.answer, { alignSelf: 'stretch', backgroundColor: '#FFFDF7' }]}>
          <Txt v="eyebrow">Tu carta</Txt>
          {letter.map((s) => (
            <Th key={s.id} size={17}>
              {thaiOf(s, gender)}
            </Th>
          ))}
          <Th size={17} style={{ alignSelf: 'flex-end' }}>
            {SIGN.th}
          </Th>
        </View>
        {HAS_SEASON_2 ? (
          <Animated.View entering={FadeInDown.delay(900).springify()} style={[styles.answer, { alignSelf: 'stretch', backgroundColor: '#FFFBEA' }]}>
            <Txt v="eyebrow">Continuará</Txt>
            <Txt v="h3">Lo has prometido: volverás.</Txt>
            <Txt v="small">Y esta vez no serán unos días. Temporada 2 · Un año en el pueblo: doce lunas con la familia, de Songkran a la cosecha del arroz.</Txt>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={{ gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Btn label={HAS_SEASON_2 ? 'Seguir el camino' : 'Volver a la carta'} onPress={HAS_SEASON_2 ? onContinue : onClose} />
        <Btn v="ghost" label="Escribir otra carta" onPress={onWriteAgain} />
      </View>
      {juice.layer}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24, backgroundColor: color.niebla },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  paper: { backgroundColor: '#FFFDF7', borderRadius: 10, padding: 18, gap: 4, transform: [{ rotate: '-0.6deg' }], ...shadow.card },
  slot: { height: 54, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: color.niebla4, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, borderWidth: 2, borderColor: 'transparent', ...shadow.card },
  choiceOn: { borderColor: color.buatong, backgroundColor: '#FFFBEA' },
  badge: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.niebla2, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: color.buatong },
  folded: { width: 46, height: 30, marginTop: -6, borderRadius: 4, backgroundColor: '#FFFDF7', transform: [{ rotate: '-8deg' }], ...shadow.card },
  answer: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 6, ...shadow.card },
  title: { fontFamily: font.displayBold },
});
