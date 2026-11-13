// «Dilo tú»: la pizarra donde montas con fichas la cantidad que dices en thai. Cada ficha suena al tocarla,
// así que también se puede montar de oído. Lo que llevas dicho se ve en tu bocadillo; se toca para quitarlo.
import { useEffect, useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { Btn, Rom, Th } from '@/components/ui';

import { Press3D } from '../fx';
import type { NumTile } from './logic';

export type SayState = 'idle' | 'ok' | 'bad';

function Slate() {
  const u = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 360 200" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${u}w`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D9A066" />
          <Stop offset="1" stopColor="#8E5530" />
        </LinearGradient>
        <LinearGradient id={`${u}b`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A5E4F" />
          <Stop offset="1" stopColor="#1F3A2E" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={360} height={200} rx={20} fill={`url(#${u}w)`} />
      <Rect x={6} y={6} width={348} height={188} rx={15} fill={`url(#${u}b)`} />
      <Ellipse cx={110} cy={60} rx={120} ry={40} fill="#FFFFFF" opacity={0.05} />
      <Path d="M24 182 C120 174 240 186 336 178" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.1} fill="none" />
      <Rect x={0} y={0} width={360} height={3} rx={1.5} fill="#FFE2B8" opacity={0.55} />
    </Svg>
  );
}

/**
 * `tiles`: las fichas (palabras de número) · `picked`: las que llevas dichas, en orden · `wrong`: sube cada vez
 * que te equivocas (el bocadillo tiembla) · `showRom`: transcripción bajo cada ficha (se quita cuando ya se lee).
 */
export function SayBoard({ prompt, tiles, picked, state, wrong, showRom, disabled, height, onPick, onUnpick, onSay }: { prompt: string; tiles: NumTile[]; picked: number[]; state: SayState; wrong: number; showRom: boolean; disabled: boolean; height: number; onPick: (t: NumTile) => void; onUnpick: (t: NumTile) => void; onSay: () => void }) {
  const shake = useSharedValue(0);
  useEffect(() => {
    if (wrong) shake.value = withSequence(withTiming(-9, { duration: 50 }), withTiming(9, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 60 }));
  }, [wrong, shake]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const tileH = Math.max(40, Math.min(54, (height - 104) / 2 - 3));
  const said = picked.map((id) => tiles.find((t) => t.id === id)).filter((t): t is NumTile => !!t);
  const tone = state === 'ok' ? { bg: color.arrozalSuave, border: color.arrozalVivo } : state === 'bad' ? { bg: color.lacaSuave, border: color.laca } : { bg: color.azafranSuave, border: color.azafran };
  return (
    <View style={{ height, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 6 }}>
      <Slate />
      <Text style={styles.prompt} numberOfLines={1}>
        {prompt}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Animated.View style={[styles.strip, { backgroundColor: tone.bg, borderColor: tone.border }, st]}>
          <Text style={styles.you}>TÚ</Text>
          {said.length ? (
            said.map((t) => (
              <Animated.View key={t.id} entering={ZoomIn.duration(140)}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Quitar ${t.th}`} disabled={disabled} hitSlop={6} onPress={() => onUnpick(t)} style={styles.word}>
                  <Th size={17} bold style={{ lineHeight: 26 }}>
                    {t.th}
                  </Th>
                </Pressable>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.empty}>toca las fichas en orden</Text>
          )}
        </Animated.View>
        <Btn v="ok" label="Decir" height={41} style={{ width: 100 }} disabled={disabled || said.length === 0} onPress={onSay} icon={<Icon name="speaker" size={17} color={disabled || said.length === 0 ? color.tinta3 : '#FFFFFF'} />} />
      </View>
      <View style={styles.rack}>
        {tiles.map((t) => {
          const used = picked.includes(t.id);
          return (
            <Press3D key={t.id} disabled={disabled || used} onPress={() => onPick(t)} accessibilityLabel={`${t.th}${showRom ? `, ${t.rom}` : ''}`} depth={9} style={{ width: '23%', height: tileH, opacity: used ? 0.28 : 1 }}>
              <View style={styles.tileDepth}>
                <View style={styles.tile}>
                  <Th size={showRom ? 17 : 20} bold style={{ lineHeight: showRom ? 23 : 28 }} numberOfLines={1}>
                    {t.th}
                  </Th>
                  {showRom ? <Rom rom={t.rom} size={10.5} /> : null}
                </View>
              </View>
            </Press3D>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { fontFamily: font.uiHeavy, fontSize: 13, color: '#EAF4EC', textAlign: 'center' },
  strip: { flex: 1, minHeight: 46, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, borderRadius: 16, borderWidth: 2, paddingHorizontal: 10, paddingVertical: 3 },
  you: { fontFamily: font.uiHeavy, fontSize: 10, letterSpacing: 1, color: color.azafranHondo, marginRight: 2 },
  word: { paddingHorizontal: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 2, borderBottomColor: '#E8C08E' },
  empty: { fontFamily: font.uiBold, fontSize: 12, color: color.tinta3 },
  rack: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: 6 },
  tileDepth: { flex: 1, borderRadius: 13, backgroundColor: '#B98A4E', paddingBottom: 4 },
  tile: { flex: 1, borderRadius: 13, backgroundColor: '#FFF6DA', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
});
