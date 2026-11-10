import { router, type Href } from 'expo-router';

/** Vuelve a la pantalla anterior o, si se llegó por un enlace directo y no hay historial, a `fallback`. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
