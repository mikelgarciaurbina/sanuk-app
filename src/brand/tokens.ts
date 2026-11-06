/**
 * Sanuk · tokens del sistema de diseño.
 * Cada valor sale del viaje de Chiang Mai a Mae Hong Son (ver site/ → /design-system).
 */

export const color = {
  // fondos
  niebla: '#F3F6FA', // la mañana en la montaña
  niebla2: '#E8EEF5',
  niebla3: '#D5DEEA',
  niebla4: '#B7C5D6',
  blanco: '#FFFFFF',
  // texto
  tinta: '#1D2347', // índigo de la camisa mo hom
  tinta2: '#4B5378',
  tinta3: '#5F6988',
  // acción principal
  azafran: '#FFA41B', // túnicas de los monjes
  azafranHondo: '#D97F06',
  azafranSuave: '#FFF0D6',
  // acierto y progreso
  arrozal: '#13854F',
  arrozalHondo: '#0B5E37',
  arrozalVivo: '#2DBE78',
  arrozalSuave: '#DDF5E8',
  // racha
  farol: '#FF6A3D', // khom loy de Yi Peng
  farolSuave: '#FFE6DC',
  // recompensa
  buatong: '#FFC83D', // girasoles de Doi Mae U-Kho
  buatongHondo: '#C98F00',
  // error amable
  laca: '#D93A3F', // laca roja Lanna
  lacaHondo: '#A9262B',
  lacaSuave: '#FDE8E8',
  // selección y audio
  cielo: '#3D7BFF',
  cieloHondo: '#2257D6',
  cieloSuave: '#E3ECFF',
  // textil y noche
  mohom: '#2B3A86',
  noche: '#141936',
  noche2: '#232B5C',
  // mascota y madera
  noi: '#F6BFAC',
  teca: '#9A5B32',
  tecaSuave: '#F4E6D8',
  // paisaje
  monte1: '#C9D6E4',
  monte2: '#9CBFB3',
  monte3: '#6FA587',
  monte4: '#4F8B6B',
  alba: '#FFE2B8',
} as const;

export type ToneId = 'M' | 'L' | 'F' | 'H' | 'R';

/** Los 5 tonos del thai: color de relleno (chips) y de texto (sobre blanco). */
export const tones: Record<ToneId, { name: string; thai: string; fill: string; on: string; text: string; path: string }> = {
  M: { name: 'Medio', thai: 'สามัญ', fill: '#8E98B1', on: '#1D2347', text: '#5F6988', path: 'M2 7 H22' },
  L: { name: 'Bajo', thai: 'เอก', fill: '#4555D6', on: '#FFFFFF', text: '#3F4FD0', path: 'M2 9 L22 12' },
  F: { name: 'Descendente', thai: 'โท', fill: '#E2474C', on: '#FFFFFF', text: '#C9353B', path: 'M2 8 Q10 0 22 13' },
  H: { name: 'Alto', thai: 'ตรี', fill: '#FFC23D', on: '#1D2347', text: '#9A6400', path: 'M2 9 Q15 9 22 2' },
  R: { name: 'Ascendente', thai: 'จัตวา', fill: '#14A47C', on: '#1D2347', text: '#0B7A5C', path: 'M2 6 Q10 14 22 2' },
};

export const radius = { s: 12, m: 16, l: 20, xl: 24, xxl: 32, pill: 999 } as const;
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

/** Familias cargadas con @expo-google-fonts (ver src/app/_layout.tsx). */
export const font = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  ui: 'Nunito_600SemiBold',
  uiBold: 'Nunito_700Bold',
  uiHeavy: 'Nunito_800ExtraBold',
  uiBlack: 'Nunito_900Black',
  thai: 'NotoSansThaiLooped_500Medium',
  thaiBold: 'NotoSansThaiLooped_700Bold',
} as const;

/** Movimiento: «peso y alegría». Muelles para Reanimated (withSpring). */
export const motion = {
  pop: { damping: 14, stiffness: 260, mass: 1 },
  boing: { damping: 9, stiffness: 180, mass: 1 },
  trompa: { damping: 18, stiffness: 120, mass: 1 },
  suave: { damping: 20, stiffness: 160, mass: 1 },
  dur: { tap: 90, rapido: 160, base: 240, lento: 420, historia: 900 },
  nieblaMs: 18000,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1D2347',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;
