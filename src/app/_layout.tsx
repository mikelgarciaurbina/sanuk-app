import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka/600SemiBold';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import { NotoSansThaiLooped_500Medium } from '@expo-google-fonts/noto-sans-thai-looped/500Medium';
import { NotoSansThaiLooped_700Bold } from '@expo-google-fonts/noto-sans-thai-looped/700Bold';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { color } from '@/brand/tokens';
import { configureAudio, initAudio } from '@/lib/audio';
import { StoreProvider, useStore } from '@/lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AudioSettings() {
  const { p } = useStore();
  useEffect(() => {
    configureAudio(p.settings);
  }, [p.settings]);
  return null;
}

function Root() {
  const { ready } = useStore();
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    NotoSansThaiLooped_500Medium,
    NotoSansThaiLooped_700Bold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    initAudio();
  }, []);
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;
  return (
    <>
      <AudioSettings />
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: color.niebla2 }}>
      <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 520 : undefined, alignSelf: 'center', overflow: 'hidden', backgroundColor: color.niebla }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.niebla }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="leccion/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="juego/[id]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="carta" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      </View>
      </View>
    </>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Root />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
