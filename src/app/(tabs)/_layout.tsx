import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, font } from '@/brand/tokens';
import { Icon } from '@/components/icons';
import { fx } from '@/lib/audio';

const TABS: Record<string, { label: string; icon: 'camino' | 'feria' | 'palabras' | 'pasaporte' }> = {
  index: { label: 'Camino', icon: 'camino' },
  feria: { label: 'Feria', icon: 'feria' },
  palabras: { label: 'Palabras', icon: 'palabras' },
  pasaporte: { label: 'Pasaporte', icon: 'pasaporte' },
};

function TabButton({ focused, label, icon, onPress }: { focused: boolean; label: string; icon: 'camino' | 'feria' | 'palabras' | 'pasaporte'; onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (focused) s.value = withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 240 }));
  }, [focused, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label} onPress={onPress} style={styles.tab}>
      <Animated.View style={[styles.iconWrap, focused && styles.iconOn, a]}>
        <Icon name={icon} size={26} color={focused ? color.azafranHondo : color.tinta3} stroke={focused ? 2.6 : 2.2} />
      </Animated.View>
      <Text style={[styles.label, { color: focused ? color.tinta : color.tinta3 }]}>{label}</Text>
    </Pressable>
  );
}

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        return (
          <TabButton
            key={route.key}
            focused={focused}
            label={meta.label}
            icon={meta.icon}
            onPress={() => {
              if (focused) return;
              fx.tap();
              navigateToTab(route.key);
            }}
          />
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.niebla } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="feria" />
      <Tabs.Screen name="palabras" />
      <Tabs.Screen name="pasaporte" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingTop: 8, borderTopWidth: 1, borderTopColor: color.niebla3 },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 52 },
  iconWrap: { width: 52, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: color.azafranSuave },
  label: { fontFamily: font.uiHeavy, fontSize: 11 },
});
