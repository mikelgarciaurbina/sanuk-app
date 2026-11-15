import { Platform, useWindowDimensions } from 'react-native';
import { createContext, useContext } from 'react';

import { contentWidth } from './viewport';

export const AppViewport = createContext<{ width: number; height: number; offsetX: number } | null>(null);
export const BackgroundOutsets = createContext({ left: 0, right: 0, bottom: 0 });

/** Geometría local del contenido, después de reservar la cámara y la navegación del sistema. */
export function useAppDimensions() {
  const window = useWindowDimensions();
  const viewport = useContext(AppViewport);
  const width = contentWidth(window.width, Platform.OS === 'web');
  return { ...window, width, offsetX: (window.width - width) / 2, ...viewport };
}
