import Svg, { Circle, Path, Rect, SvgXml } from 'react-native-svg';

import { color } from '@/brand/tokens';

/** Iconos ilustrados de la historia (farolillo, plátano, curva, sello, paraguas de Bo Sang, carta, luna, cofre). */
const ART = {
  farol:
    '<svg viewBox="0 0 64 64"><circle cx="32" cy="30" r="27" fill="#FFB347" opacity=".22"/><path d="M19 13 C19 9 45 9 45 13 L49 44 C49 51 15 51 15 44 Z" fill="#FF7A3D"/><path d="M24 13 C24 11 40 11 40 13 L42 44 C42 48 22 48 22 44 Z" fill="#FFB347"/><path d="M28 13 L27.5 47 M36 13 L36.5 47" stroke="#FF8A4D" stroke-width="1.6"/><ellipse cx="32" cy="48" rx="11" ry="3.2" fill="#C2410C"/><path d="M32 50 C28.5 53.5 29.5 57.5 32 60 C34.5 57.5 35.5 53.5 32 50 Z" fill="#FFD166"/></svg>',
  farolOff:
    '<svg viewBox="0 0 64 64"><path d="M19 13 C19 9 45 9 45 13 L49 44 C49 51 15 51 15 44 Z" fill="#B7C5D6"/><path d="M24 13 C24 11 40 11 40 13 L42 44 C42 48 22 48 22 44 Z" fill="#D5DEEA"/><ellipse cx="32" cy="48" rx="11" ry="3.2" fill="#8E98B1"/></svg>',
  platano:
    '<svg viewBox="0 0 64 64"><path d="M14 18 C10 34 18 50 34 54 C44 56 54 52 58 46 C46 48 34 44 26 34 C21 28 19 22 20 16 Z" fill="#FFC83D"/><path d="M20 16 C19 22 21 28 26 34 C34 44 46 48 58 46 C55 50 50 52 46 53 C34 52 24 44 19 32 C17 26 17 20 20 16 Z" fill="#E8A600"/><path d="M14 18 L13 11 C13 9 16 8 18 9 L20 16 Z" fill="#7A5A1E"/><path d="M56 45 l4 1 -1 3 -4 -1 Z" fill="#5B3F12"/><path d="M18 26 C19 36 24 44 32 48" stroke="#FFE7A3" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
  curva:
    '<svg viewBox="0 0 64 64"><rect x="11" y="11" width="42" height="42" rx="8" transform="rotate(45 32 32)" fill="#FFC83D"/><rect x="15" y="15" width="34" height="34" rx="6" transform="rotate(45 32 32)" fill="none" stroke="#1D2347" stroke-width="2.5"/><path d="M26 45 C26 37 38 37 38 29 L38 23" stroke="#1D2347" stroke-width="4.2" fill="none" stroke-linecap="round"/><path d="M32.5 25 L38 19 L43.5 25" stroke="#1D2347" stroke-width="4.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sello:
    '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#FDE7E7"/><circle cx="32" cy="32" r="23" fill="none" stroke="#D93A3F" stroke-width="3" stroke-dasharray="3.2 3"/><circle cx="32" cy="32" r="16.5" fill="none" stroke="#D93A3F" stroke-width="2.5"/><path d="M32 21.5 l3.1 6.6 7.2 .9 -5.3 4.9 1.4 7.1 -6.4 -3.6 -6.4 3.6 1.4 -7.1 -5.3 -4.9 7.2 -.9 Z" fill="#D93A3F"/></svg>',
  paraguas:
    '<svg viewBox="0 0 64 64"><path d="M7 31 C7 17 19 8 32 8 C45 8 57 17 57 31 C53 28 48 28 44.5 31 C41 28 36 28 32 31 C28 28 23 28 19.5 31 C16 28 11 28 7 31 Z" fill="#FF6A3D"/><path d="M32 8 C26 14 21.5 22 19.5 31 M32 8 C38 14 42.5 22 44.5 31 M32 8 L32 31" stroke="#C2410C" stroke-width="1.6" fill="none"/><circle cx="21" cy="21" r="3.2" fill="#FFC83D"/><circle cx="43" cy="21" r="3.2" fill="#FFC83D"/><circle cx="32" cy="16" r="2.6" fill="#FFFFFF"/><path d="M32 31 L32 52 C32 57 25.5 57 25.5 52" stroke="#7A4A1E" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>',
  carta:
    '<svg viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="34" rx="5" fill="#FFFDF7" stroke="#E7C9A9" stroke-width="2"/><path d="M10 18 L32 36 L54 18" stroke="#9A5B32" stroke-width="2.6" fill="none" stroke-linejoin="round"/><circle cx="46" cy="40" r="7" fill="#D93A3F"/><path d="M43 40 h6 M46 37 v6" stroke="#FFF" stroke-width="1.8" stroke-linecap="round"/></svg>',
  luna:
    '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27" fill="#FFD166" opacity=".2"/><path d="M41 9 C27 11 17 22 18 36 C19 50 33 58 47 53 C36 50 28 41 28 30 C28 21 33 13 41 9 Z" fill="#FFC83D"/><path d="M41 9 C33 13 28 21 28 30 C28 41 36 50 47 53 C43 55 38 56 34 55 C25 52 20 44 20 34 C20 22 29 12 41 9 Z" fill="#E8A600"/><circle cx="45" cy="21" r="2.4" fill="#FFF3C4"/><circle cx="51" cy="33" r="1.6" fill="#FFF3C4"/><circle cx="43" cy="42" r="1.2" fill="#FFF3C4"/></svg>',
  cofre:
    '<svg viewBox="0 0 64 64"><rect x="8" y="26" width="48" height="28" rx="5" fill="#8E5530"/><path d="M8 30 C8 12 56 12 56 30 Z" fill="#C07A45"/><rect x="8" y="27" width="48" height="6" fill="#FFC83D"/><rect x="28" y="30" width="8" height="11" rx="2" fill="#FFC83D"/><circle cx="32" cy="35" r="1.6" fill="#8E5530"/></svg>',
} as const;

export type ArtIcon = keyof typeof ART;

export function Art({ name, size = 24 }: { name: ArtIcon; size?: number }) {
  return <SvgXml xml={ART[name]} width={size} height={size} />;
}

type IconName =
  | 'close' | 'back' | 'speaker' | 'turtle' | 'mic' | 'play' | 'pause' | 'lock' | 'check' | 'star' | 'x'
  | 'camino' | 'feria' | 'palabras' | 'pasaporte' | 'settings' | 'book' | 'bulb' | 'refresh' | 'arrow' | 'heart'
  | 'home' | 'users' | 'map' | 'briefcase' | 'sparkle';

export function Icon({ name, size = 24, color: c = color.tinta3, stroke = 2.4 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: c, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'x' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...p} />}
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'speaker' && (
        <>
          <Path d="M4 9v6h4l5 4V5L8 9H4z" fill={c} stroke={c} strokeWidth={stroke} strokeLinejoin="round" />
          <Path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" {...p} />
        </>
      )}
      {name === 'turtle' && (
        <>
          <Path d="M4 15c0-4 3.6-7 8-7s7 3 7 6v1H4z" {...p} />
          <Path d="M19 13c1.5 0 2.5-1 2.5-2.5M7 15v3M15 15v3M9 8l1.5 3.5M14.5 8L13 11.5" {...p} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x={9} y={3} width={6} height={12} rx={3} fill={c} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...p} />
        </>
      )}
      {name === 'play' && <Path d="M7 4.5v15l12-7.5z" fill={c} />}
      {name === 'pause' && (
        <>
          <Rect x={6} y={5} width={4} height={14} rx={1.5} fill={c} />
          <Rect x={14} y={5} width={4} height={14} rx={1.5} fill={c} />
        </>
      )}
      {name === 'lock' && (
        <>
          <Rect x={5} y={11} width={14} height={10} rx={3} {...p} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} />
        </>
      )}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />}
      {name === 'star' && <Path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill={c} />}
      {name === 'heart' && <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={c} />}
      {name === 'camino' && <Path d="M8 22c0-7 9-7 9-12S10 6 10 2" {...p} strokeWidth={stroke + 1} />}
      {name === 'feria' && (
        <>
          <Circle cx={12} cy={10.5} r={7.5} {...p} />
          <Path d="M12 3v15M4.5 10.5h15M6.7 5.2l10.6 10.6M17.3 5.2L6.7 15.8M8.5 22l3.5-4 3.5 4" {...p} />
        </>
      )}
      {name === 'palabras' && (
        <>
          <Rect x={3.5} y={5.5} width={12} height={15} rx={2.5} {...p} />
          <Path d="M8.5 3.5h9a3 3 0 0 1 3 3v12M7 11h5M7 14.5h3.5" {...p} />
        </>
      )}
      {name === 'pasaporte' && (
        <>
          <Rect x={4.5} y={2.5} width={15} height={19} rx={2.5} {...p} />
          <Circle cx={12} cy={10} r={3.5} {...p} />
          <Path d="M8 17h8" {...p} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...p} />
          <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...p} />
        </>
      )}
      {name === 'book' && (
        <>
          <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...p} />
          <Path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" {...p} />
        </>
      )}
      {name === 'bulb' && (
        <>
          <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" {...p} />
        </>
      )}
      {name === 'refresh' && <Path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" {...p} />}
      {name === 'home' && (
        <>
          <Path d="M3 11l9-7 9 7M5 10v10h14V10" {...p} />
          <Path d="M12 17.5s-3-1.8-3-3.6a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.8-3 3.6-3 3.6z" fill={c} stroke={c} strokeWidth={1} />
        </>
      )}
      {name === 'users' && (
        <>
          <Circle cx={8.5} cy={8} r={3.2} {...p} />
          <Circle cx={16.5} cy={9} r={2.6} {...p} />
          <Path d="M3 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.4c2.6-.6 5.6.6 6.5 4.6" {...p} />
        </>
      )}
      {name === 'map' && <Path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14" {...p} />}
      {name === 'briefcase' && (
        <>
          <Rect x={3} y={7} width={18} height={13} rx={3} {...p} />
          <Path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" {...p} />
        </>
      )}
      {name === 'sparkle' && <Path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z" fill={c} />}
    </Svg>
  );
}

/** Contorno de tono (24×14) para chips y botones. */
export function ToneGlyph({ path, size = 22, color: c }: { path: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={(size * 14) / 24} viewBox="0 0 24 14">
      <Path d={path} stroke={c} strokeWidth={2.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
