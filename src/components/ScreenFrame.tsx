import { useState, type ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

import { color } from '@/brand/tokens';
import { AppViewport, BackgroundOutsets } from '@/lib/layout';
import { contentWidth, foregroundWidth } from '@/lib/viewport';

/** Protege los controles; los fondos pueden seguir dibujándose detrás de las áreas reservadas. */
export function ScreenFrame({ children, tab = false }: { children: ReactNode; tab?: boolean }) {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const window = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const bottom = tab ? insets.bottom : 0;
  const width = foregroundWidth(frame.width, insets.left, insets.right);
  const offsetX = (Platform.OS === 'web' ? (window.width - contentWidth(window.width, true)) / 2 : frame.x) + insets.left;
  return (
    <View style={{ flex: 1, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: bottom, backgroundColor: color.niebla }}>
      <View style={{ flex: 1 }} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        <AppViewport.Provider value={{ width: size?.width ?? width, height: size?.height ?? frame.height - bottom, offsetX }}>
          <BackgroundOutsets.Provider value={{ left: insets.left, right: insets.right, bottom }}>
            <SafeAreaInsetsContext.Provider value={{ ...insets, left: 0, right: 0, bottom: insets.bottom - bottom }}>
              {children}
            </SafeAreaInsetsContext.Provider>
          </BackgroundOutsets.Provider>
        </AppViewport.Provider>
      </View>
    </View>
  );
}
