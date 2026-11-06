/**
 * Noi (น้อย) — la elefanta exploradora de Sanuk.
 *
 * Fuente única del dibujo. Cada capa es un fragmento SVG:
 *  - la web y el lienzo de diseño usan `noiSvg(pose)` (un SVG completo, cada capa con su clase),
 *  - la app pinta cada capa con `SvgXml` dentro de una vista animada (`noiParts(pose)`).
 *
 * Personaje: cabeza grande, ojos enormes y brillantes, piel melocotón (los «elefantes blancos»
 * de Tailandia son en realidad rosados), sombrero de exploradora con frangipani, pañuelo de
 * cuadros pha khao ma, camisa de safari, pantalón oliva y mochila índigo de rayas Lanna.
 */

export type NoiPose = 'feliz' | 'hola' | 'celebra' | 'piensa' | 'ups' | 'duerme' | 'escucha';
export const NOI_POSES: NoiPose[] = ['feliz', 'hola', 'celebra', 'piensa', 'ups', 'duerme', 'escucha'];

export type NoiPartId =
  | 'shadow' | 'earL' | 'earR' | 'pack' | 'legs' | 'body' | 'head' | 'eyes' | 'brows'
  | 'mouth' | 'trunk' | 'hat' | 'armL' | 'armR' | 'extras';

export const NOI_COLORS = {
  skin: '#F6BFAC',
  skinLight: '#FFE6DB',
  skinShade: '#E39A86',
  earIn: '#F48E9A',
  blush: '#FF8FA3',
  freckle: '#E58C8C',
  iris: '#4A2A1A',
  ink: '#2A160E',
  brow: '#9A5E4C',
  nail: '#FFF4EC',
  hat: '#7D8C4E',
  hatBand: '#4F5C2E',
  shirt: '#F6E8CC',
  shorts: '#6C7B40',
  pack: '#2B3A86',
  scarf: '#FFA41B',
  mouth: '#6B2234',
  tongue: '#FF8C9C',
} as const;

/** Puntos de giro de las capas animables (viewBox 240×240). */
export const NOI_PIVOTS: Record<'earL' | 'earR' | 'armL' | 'armR' | 'trunk' | 'eyes' | 'hat' | 'body', { x: number; y: number }> = {
  earL: { x: 68, y: 104 },
  earR: { x: 172, y: 104 },
  armL: { x: 86, y: 160 },
  armR: { x: 154, y: 160 },
  trunk: { x: 120, y: 108 },
  eyes: { x: 120, y: 100 },
  hat: { x: 120, y: 44 },
  body: { x: 120, y: 232 },
};

/** Degradados y patrón compartidos por todas las capas. */
export const NOI_DEFS =
  '<defs>' +
  '<radialGradient id="noi-skin" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#FFE6DB"/><stop offset=".55" stop-color="#F8C3B1"/><stop offset="1" stop-color="#E8A08C"/></radialGradient>' +
  '<radialGradient id="noi-skin2" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#FCD6C8"/><stop offset="1" stop-color="#E39A86"/></radialGradient>' +
  '<radialGradient id="noi-ear" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#FFC9CC"/><stop offset="1" stop-color="#F28896"/></radialGradient>' +
  '<radialGradient id="noi-iris" cx="45%" cy="62%" r="70%"><stop offset="0" stop-color="#A36A43"/><stop offset=".5" stop-color="#4A2A1A"/><stop offset="1" stop-color="#1E0F08"/></radialGradient>' +
  '<linearGradient id="noi-hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93A361"/><stop offset="1" stop-color="#6A793F"/></linearGradient>' +
  '<linearGradient id="noi-shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCF3E0"/><stop offset="1" stop-color="#E9D6AE"/></linearGradient>' +
  '<linearGradient id="noi-shorts" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C8D4E"/><stop offset="1" stop-color="#5A6936"/></linearGradient>' +
  '<linearGradient id="noi-pack" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4BA6"/><stop offset="1" stop-color="#25317A"/></linearGradient>' +
  '<pattern id="noi-pkm" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">' +
  '<rect width="10" height="10" fill="#FFA41B"/><rect width="5" height="10" fill="#E5484D" opacity=".45"/><rect width="10" height="5" fill="#FFFFFF" opacity=".28"/>' +
  '</pattern>' +
  '</defs>';

// ——— capas fijas ———

const SHADOW = '<ellipse cx="120" cy="232" rx="58" ry="6" fill="#2A160E" opacity=".13"/>';

const earPaths = (m: (x: number) => number) => ({
  outer: `M${m(72)} 72 C${m(56)} 48 ${m(18)} 46 ${m(8)} 80 C${m(0)} 110 ${m(14)} 144 ${m(42)} 152 C${m(58)} 157 ${m(70)} 146 ${m(70)} 132 Z`,
  inner: `M${m(68)} 84 C${m(56)} 66 ${m(30)} 66 ${m(22)} 88 C${m(16)} 108 ${m(26)} 132 ${m(46)} 140 C${m(58)} 144 ${m(64)} 134 ${m(64)} 124 Z`,
});
const ear = (side: 'l' | 'r') => {
  const m = (x: number) => (side === 'l' ? x : 240 - x);
  const p = earPaths(m);
  return (
    `<path d="${p.outer}" fill="url(#noi-skin2)"/>` +
    `<path d="${p.inner}" fill="url(#noi-ear)"/>` +
    `<circle cx="${m(19)}" cy="100" r="1.9" fill="#E58C8C"/><circle cx="${m(16)}" cy="114" r="1.4" fill="#E58C8C"/><circle cx="${m(24)}" cy="128" r="1.7" fill="#E58C8C"/>`
  );
};

const PACK =
  '<path d="M78 154 C64 158 58 186 64 204 C68 208 78 206 80 200 Z" fill="url(#noi-pack)"/>' +
  '<path d="M162 154 C176 158 182 186 176 204 C172 208 162 206 160 200 Z" fill="url(#noi-pack)"/>' +
  '<path d="M64 186 L80 186 M176 186 L160 186" stroke="#FFC83D" stroke-width="3"/>' +
  '<path d="M64 191 L80 191 M176 191 L160 191" stroke="#E5484D" stroke-width="2"/>';

const LEGS =
  '<path d="M85 196 H116 L117 222 C117 229 112 232 106 232 H94 C88 232 83 229 84 222 Z" fill="url(#noi-skin2)"/>' +
  '<path d="M124 196 H155 L156 222 C157 229 152 232 146 232 H134 C128 232 123 229 123 222 Z" fill="url(#noi-skin2)"/>' +
  '<ellipse cx="91" cy="228" rx="3.2" ry="2.5" fill="#FFF4EC"/><ellipse cx="100" cy="229.5" rx="3.2" ry="2.5" fill="#FFF4EC"/><ellipse cx="109" cy="228" rx="3.2" ry="2.5" fill="#FFF4EC"/>' +
  '<ellipse cx="131" cy="228" rx="3.2" ry="2.5" fill="#FFF4EC"/><ellipse cx="140" cy="229.5" rx="3.2" ry="2.5" fill="#FFF4EC"/><ellipse cx="149" cy="228" rx="3.2" ry="2.5" fill="#FFF4EC"/>';

const BODY =
  // pantalón oliva con cinturón
  '<path d="M80 184 C100 188 140 188 160 184 L162 204 C150 208 136 208 128 204 L124 196 H116 L112 204 C104 208 90 208 78 204 Z" fill="url(#noi-shorts)"/>' +
  '<path d="M80 184 C100 188 140 188 160 184 L160.5 190 C140 194 100 194 79.5 190 Z" fill="#4F5C2E"/>' +
  '<rect x="114" y="185.5" width="12" height="7" rx="2" fill="#FFC83D"/>' +
  // camisa de safari
  '<path d="M84 148 C96 145 144 145 156 148 C164 158 166 172 162 188 C140 192 100 192 78 188 C74 172 76 158 84 148 Z" fill="url(#noi-shirt)"/>' +
  '<path d="M133 165 h15 v11 a2 2 0 0 1 -2 2 h-11 a2 2 0 0 1 -2 -2 Z" fill="none" stroke="#D9C39A" stroke-width="1.6"/>' +
  '<path d="M133 168 h15" stroke="#D9C39A" stroke-width="1.6"/>' +
  // tirantes de la mochila
  '<path d="M97 150 C96 164 95 176 96 188 M143 150 C144 164 145 176 144 188" stroke="#2B3A86" stroke-width="7" stroke-linecap="round" fill="none"/>' +
  '<rect x="91.5" y="168" width="9" height="6" rx="1.5" fill="#FFC83D"/><rect x="139.5" y="168" width="9" height="6" rx="1.5" fill="#FFC83D"/>' +
  // sombra bajo la barbilla
  '<ellipse cx="120" cy="152" rx="42" ry="7" fill="#8A5A48" opacity=".2"/>' +
  // pañuelo pha khao ma
  '<path d="M90 146 C104 154 136 154 150 146 L134 174 C128 182 112 182 106 174 Z" fill="url(#noi-pkm)"/>' +
  '<path d="M150 150 L163 160 L156 166 Z M147 154 L153 169 L145 169 Z" fill="url(#noi-pkm)"/>' +
  '<circle cx="147" cy="151" r="6" fill="#E8820A"/>';

const HEAD =
  '<path d="M120 42 C158 42 186 66 186 100 C186 132 160 154 120 154 C80 154 54 132 54 100 C54 66 82 42 120 42 Z" fill="url(#noi-skin)"/>' +
  '<ellipse cx="120" cy="130" rx="27" ry="17" fill="#FFE6DB" opacity=".5"/>' +
  '<ellipse cx="80" cy="123" rx="11" ry="7.5" fill="#FF8FA3" opacity=".5"/>' +
  '<ellipse cx="160" cy="123" rx="11" ry="7.5" fill="#FF8FA3" opacity=".5"/>' +
  '<circle cx="74" cy="121" r="1.3" fill="#E58C8C"/><circle cx="79" cy="126" r="1.3" fill="#E58C8C"/><circle cx="84" cy="120" r="1.3" fill="#E58C8C"/>' +
  '<circle cx="156" cy="120" r="1.3" fill="#E58C8C"/><circle cx="161" cy="126" r="1.3" fill="#E58C8C"/><circle cx="166" cy="121" r="1.3" fill="#E58C8C"/>';

const plumeria = (cx: number, cy: number) =>
  [0, 72, 144, 216, 288]
    .map((deg) => `<ellipse cx="${cx}" cy="${cy - 6.5}" rx="4.4" ry="7.2" fill="#FFFFFF" transform="rotate(${deg} ${cx} ${cy})"/>`)
    .join('') +
  `<circle cx="${cx}" cy="${cy}" r="3.6" fill="#FFC83D"/><circle cx="${cx}" cy="${cy}" r="1.6" fill="#F08A00"/>`;

const HAT =
  '<ellipse cx="120" cy="60" rx="56" ry="7" fill="#C98472" opacity=".35"/>' +
  '<path d="M50 46 C54 33 186 33 190 46 C192 55 172 61 120 61 C68 61 48 55 50 46 Z" fill="url(#noi-hat)"/>' +
  '<path d="M56 51 C72 57 168 57 184 51" stroke="#A8B77A" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>' +
  '<path d="M78 41 C78 18 98 6 120 6 C142 6 162 18 162 41 Z" fill="url(#noi-hat)"/>' +
  '<path d="M78.5 31 C100 35 140 35 161.5 31 L162 41 C140 45 100 45 78 41 Z" fill="#4F5C2E"/>' +
  '<ellipse cx="104" cy="16" rx="13" ry="5" fill="#FFFFFF" opacity=".2" transform="rotate(-15 104 16)"/>' +
  plumeria(93, 33);

// ——— capas que cambian con la pose ———

const SLEEVE_L = '<path d="M80 150 C71 154 68 163 70 171 C78 173 88 169 95 162 C95 155 89 149 80 150 Z" fill="url(#noi-shirt)"/>';
const SLEEVE_R = '<path d="M160 150 C169 154 172 163 170 171 C162 173 152 169 145 162 C145 155 151 149 160 150 Z" fill="url(#noi-shirt)"/>';
const nail = (cx: number, cy: number, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="2.4" ry="1.9" fill="#FFF4EC" transform="rotate(${rot} ${cx} ${cy})"/>`;

const ARM = {
  lDown:
    '<path d="M84 156 C72 164 66 180 68 194 C69 202 78 204 82 198 C86 190 88 178 94 168 Z" fill="url(#noi-skin2)"/>' +
    nail(72, 199, 20) + nail(78, 201, 10) + SLEEVE_L,
  rDown:
    '<path d="M156 156 C168 164 174 180 172 194 C171 202 162 204 158 198 C154 190 152 178 146 168 Z" fill="url(#noi-skin2)"/>' +
    nail(168, 199, -20) + nail(162, 201, -10) + SLEEVE_R,
  lWave:
    '<path d="M80 166 C64 152 46 134 36 114 C31 102 37 92 47 94 C55 96 58 105 62 115 C68 129 82 146 94 158 Z" fill="url(#noi-skin2)"/>' +
    nail(37, 101, -60) + nail(42, 95, -35) + SLEEVE_L,
  lUp:
    '<path d="M80 166 C62 150 44 126 36 104 C32 92 40 84 50 88 C58 91 60 100 64 112 C70 128 84 146 94 158 Z" fill="url(#noi-skin2)"/>' +
    nail(38, 91, -60) + nail(44, 86, -35) + SLEEVE_L,
  rUp:
    '<path d="M160 166 C178 150 196 126 204 104 C208 92 200 84 190 88 C182 91 180 100 176 112 C170 128 156 146 146 158 Z" fill="url(#noi-skin2)"/>' +
    nail(202, 91, 60) + nail(196, 86, 35) + SLEEVE_R,
  rChin:
    '<path d="M158 162 C168 154 172 142 170 132 C168 124 159 122 155 128 C151 135 150 146 146 158 Z" fill="url(#noi-skin2)"/>' +
    nail(158, 125, -30) + nail(164, 124, 10) + SLEEVE_R,
  lHead:
    '<path d="M80 164 C68 150 62 128 64 106 C66 94 76 90 81 97 C86 105 82 120 84 134 C86 146 90 154 94 160 Z" fill="url(#noi-skin2)"/>' +
    nail(67, 99, -40) + nail(73, 94, -10) + SLEEVE_L,
  rEar:
    '<path d="M156 162 C168 150 176 132 178 116 C180 104 172 98 166 104 C160 110 160 122 156 134 C152 146 150 152 146 158 Z" fill="url(#noi-skin2)"/>' +
    nail(170, 101, 20) + nail(176, 105, 50) + SLEEVE_R,
};

const EYES = {
  open:
    '<ellipse cx="98" cy="100" rx="12.5" ry="15" fill="url(#noi-iris)"/>' +
    '<ellipse cx="142" cy="100" rx="12.5" ry="15" fill="url(#noi-iris)"/>' +
    '<circle cx="102.5" cy="93.5" r="5.2" fill="#FFFFFF"/><circle cx="93.5" cy="106" r="2.3" fill="#FFFFFF"/><circle cx="103" cy="105.5" r="1.3" fill="#FFFFFF" opacity=".85"/>' +
    '<circle cx="146.5" cy="93.5" r="5.2" fill="#FFFFFF"/><circle cx="137.5" cy="106" r="2.3" fill="#FFFFFF"/><circle cx="147" cy="105.5" r="1.3" fill="#FFFFFF" opacity=".85"/>' +
    '<path d="M86.5 93 q-5 -2 -8 -7 M88.5 88.5 q-3 -4 -3 -9 M92 86 q-1 -4 0 -8" stroke="#2A160E" stroke-width="2.3" stroke-linecap="round" fill="none"/>' +
    '<path d="M153.5 93 q5 -2 8 -7 M151.5 88.5 q3 -4 3 -9 M148 86 q1 -4 0 -8" stroke="#2A160E" stroke-width="2.3" stroke-linecap="round" fill="none"/>',
  happy:
    '<path d="M86 105 Q98 88 110 105 M130 105 Q142 88 154 105" stroke="#2A160E" stroke-width="4.2" stroke-linecap="round" fill="none"/>' +
    '<path d="M85 99 l-6 -3 M155 99 l6 -3" stroke="#2A160E" stroke-width="2.3" stroke-linecap="round"/>',
  soft:
    '<path d="M87 102 Q98 92 109 102 M131 102 Q142 92 153 102" stroke="#2A160E" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<path d="M86 98 l-6 -2 M154 98 l6 -2" stroke="#2A160E" stroke-width="2.3" stroke-linecap="round"/>',
  closed:
    '<path d="M87 100 Q98 109 109 100 M131 100 Q142 109 153 100" stroke="#2A160E" stroke-width="3.6" stroke-linecap="round" fill="none"/>' +
    '<path d="M87 101 l-5 3 M153 101 l5 3" stroke="#2A160E" stroke-width="2.2" stroke-linecap="round"/>',
};

const BROWS = {
  normal: '<path d="M86 80 Q97 73 108 78 M132 78 Q143 73 154 80" stroke="#9A5E4C" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
  raised: '<path d="M86 76 Q97 68 108 73 M132 73 Q143 68 154 76" stroke="#9A5E4C" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
  think: '<path d="M86 82 Q97 80 108 81 M132 74 Q143 65 154 73" stroke="#9A5E4C" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
  worried: '<path d="M87 83 Q96 77 107 75 M133 75 Q144 77 153 83" stroke="#9A5E4C" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
  calm: '<path d="M88 86 Q97 84 106 86 M134 86 Q143 84 152 86" stroke="#9A5E4C" stroke-width="3" stroke-linecap="round" fill="none"/>',
};

const MOUTH = {
  open:
    '<path d="M95 137 C96 151 113 155 117 141 Z" fill="#6B2234"/>' +
    '<path d="M99 146 C102 151 110 152 113 146 C109 143 103 143 99 146 Z" fill="#FF8C9C"/>',
  grin:
    '<path d="M92 135 C93 156 117 159 121 139 Z" fill="#6B2234"/>' +
    '<path d="M97 148 C101 155 112 156 116 148 C111 144 102 144 97 148 Z" fill="#FF8C9C"/>' +
    '<path d="M95 138 L118 140" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>',
  small: '<path d="M99 144 Q105 148 111 143" stroke="#6B2234" stroke-width="3" stroke-linecap="round" fill="none"/>',
  wavy: '<path d="M96 145 Q100 149 104 145 Q108 141 112 145" stroke="#6B2234" stroke-width="3" stroke-linecap="round" fill="none"/>',
  o: '<ellipse cx="105" cy="145" rx="3.6" ry="4.4" fill="#6B2234"/>',
  smile: '<path d="M96 140 Q105 150 114 140" stroke="#6B2234" stroke-width="3.2" stroke-linecap="round" fill="none"/>',
};

type TrunkDef = { s: [string, number][]; tip: [number, number]; wr: string; flare?: [number, number] };
const TRUNKS: Record<'curl' | 'up' | 'droop' | 'think', TrunkDef> = {
  curl: {
    s: [['M120 108 C120 128 120 140 126 148', 20], ['M126 148 C134 158 150 156 152 144', 16], ['M152 144 C154 135 147 129 141 133', 12]],
    tip: [141, 133],
    wr: 'M110 122 Q120 126 130 122 M110.5 132 Q120.5 136 130.5 132',
  },
  up: {
    s: [['M120 108 C121 124 128 132 140 130', 20], ['M140 130 C154 126 160 112 158 98', 16], ['M158 98 C157 89 162 83 169 83', 12]],
    tip: [171, 83],
    flare: [171, 83],
    wr: 'M134 120 Q139 130 136 140 M147 116 Q155 120 162 116',
  },
  droop: {
    s: [['M120 108 C120 130 120 146 120 160', 20], ['M120 160 C120 170 124 176 130 175', 16], ['M130 175 C135 174 137 170 135 166', 12]],
    tip: [135, 166],
    wr: 'M110 124 Q120 128 130 124 M110 136 Q120 140 130 136 M110 148 Q120 152 130 148',
  },
  think: {
    s: [['M120 108 C120 128 118 140 112 148', 20], ['M112 148 C104 156 90 152 90 142', 16], ['M90 142 C90 134 97 131 101 135', 12]],
    tip: [101, 135],
    wr: 'M110 122 Q120 126 130 122 M109 133 Q118 137 127 133',
  },
};

const trunk = (t: TrunkDef) =>
  t.s.map(([d, w]) => `<path d="${d}" stroke="#D98F7C" stroke-width="${w}" stroke-linecap="round" fill="none" opacity=".45" transform="translate(2 3)"/>`).join('') +
  t.s.map(([d, w]) => `<path d="${d}" stroke="#F7C4B2" stroke-width="${w}" stroke-linecap="round" fill="none"/>`).join('') +
  (t.flare ? `<ellipse cx="${t.flare[0]}" cy="${t.flare[1]}" rx="7" ry="6" fill="#F7C4B2"/>` : '') +
  `<path d="${t.wr}" stroke="#D98F7C" stroke-width="2" stroke-linecap="round" fill="none" opacity=".85"/>` +
  `<ellipse cx="${t.tip[0]}" cy="${t.tip[1]}" rx="2.6" ry="2" fill="#9A4F40"/>` +
  '<circle cx="115" cy="118" r="1.4" fill="#E58C8C"/><circle cx="124" cy="126" r="1.2" fill="#E58C8C"/>';

const star = (cx: number, cy: number, s: number, fill: string) =>
  `<path d="M${cx} ${cy - s} Q${cx} ${cy} ${cx + s} ${cy} Q${cx} ${cy} ${cx} ${cy + s} Q${cx} ${cy} ${cx - s} ${cy} Q${cx} ${cy} ${cx} ${cy - s} Z" fill="${fill}"/>`;

const EXTRAS: Record<NoiPose, string> = {
  feliz: '',
  hola: '<path d="M22 98 q-7 -8 -1 -17 M29 80 q-1 -9 6 -13 M44 72 q3 -6 9 -7" stroke="#FFA41B" stroke-width="2.8" stroke-linecap="round" fill="none"/>',
  celebra:
    star(28, 60, 10, '#FFC83D') + star(214, 58, 9, '#FFC83D') + star(206, 140, 6, '#FF6A3D') + star(30, 150, 6, '#FF6A3D') +
    '<circle cx="40" cy="26" r="3.4" fill="#2DBE78"/><circle cx="200" cy="22" r="3" fill="#3D7BFF"/><circle cx="222" cy="100" r="2.6" fill="#FFA41B"/><circle cx="18" cy="104" r="2.6" fill="#3D7BFF"/>',
  piensa:
    '<circle cx="196" cy="58" r="4.5" fill="#FFFFFF" stroke="#B7C5D6" stroke-width="2"/>' +
    '<circle cx="208" cy="40" r="6.5" fill="#FFFFFF" stroke="#B7C5D6" stroke-width="2"/>' +
    '<circle cx="224" cy="18" r="10" fill="#FFFFFF" stroke="#B7C5D6" stroke-width="2"/>',
  ups:
    '<path d="M180 62 C185 70 187 75 183 79 C179 83 172 80 172 75 C172 71 175 67 180 62 Z" fill="#8FD3FF"/>' +
    '<circle cx="176.5" cy="74" r="1.6" fill="#FFFFFF"/>' +
    '<path d="M58 84 l-6 -5 M66 78 l-2 -8 M52 94 l-8 -2" stroke="#9A5E4C" stroke-width="2.4" stroke-linecap="round"/>',
  duerme:
    '<path d="M178 70 h11 l-11 11 h11" stroke="#4555D6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M196 44 h14 l-14 14 h14" stroke="#4555D6" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M214 14 h17 l-17 17 h17" stroke="#4555D6" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  escucha: '<path d="M220 88 Q227 100 220 112 M228 80 Q238 100 228 120" stroke="#3D7BFF" stroke-width="3" stroke-linecap="round" fill="none"/>',
};

type PoseDef = {
  armL: keyof typeof ARM;
  armR: keyof typeof ARM;
  eyes: keyof typeof EYES;
  eyeShift?: [number, number];
  brows: keyof typeof BROWS;
  mouth: keyof typeof MOUTH;
  trunk: keyof typeof TRUNKS;
  ears?: { l: string; r: string };
  hat?: string;
};

const earTf = (deg: number, s = 1) => ({
  l: `translate(68 104) rotate(${-deg}) scale(${s}) translate(-68 -104)`,
  r: `translate(172 104) rotate(${deg}) scale(${s}) translate(-172 -104)`,
});

export const NOI_POSE_DEFS: Record<NoiPose, PoseDef> = {
  feliz: { armL: 'lDown', armR: 'rDown', eyes: 'open', brows: 'normal', mouth: 'open', trunk: 'curl', hat: 'rotate(-6 120 44)' },
  hola: { armL: 'lWave', armR: 'rDown', eyes: 'open', brows: 'raised', mouth: 'open', trunk: 'curl', ears: earTf(4), hat: 'rotate(-8 120 44)' },
  celebra: { armL: 'lUp', armR: 'rUp', eyes: 'happy', brows: 'raised', mouth: 'grin', trunk: 'up', ears: earTf(-8), hat: 'translate(0 -6) rotate(-10 120 44)' },
  piensa: { armL: 'lDown', armR: 'rChin', eyes: 'open', eyeShift: [3, -3], brows: 'think', mouth: 'small', trunk: 'think', hat: 'rotate(-4 120 44)' },
  ups: { armL: 'lHead', armR: 'rDown', eyes: 'soft', brows: 'worried', mouth: 'wavy', trunk: 'curl', hat: 'rotate(7 120 44)' },
  duerme: { armL: 'lDown', armR: 'rDown', eyes: 'closed', brows: 'calm', mouth: 'o', trunk: 'droop', ears: earTf(-6), hat: 'translate(0 7) rotate(9 120 44)' },
  escucha: { armL: 'lDown', armR: 'rEar', eyes: 'open', eyeShift: [3, 0], brows: 'raised', mouth: 'smile', trunk: 'curl', ears: earTf(8, 1.08), hat: 'rotate(-5 120 44)' },
};

export type NoiPart = { id: NoiPartId; markup: string; transform?: string };

/** Capas de una pose en orden de pintado (atrás → delante). */
export function noiParts(pose: NoiPose): NoiPart[] {
  const p = NOI_POSE_DEFS[pose];
  const [dx, dy] = p.eyeShift ?? [0, 0];
  return [
    { id: 'shadow', markup: SHADOW },
    { id: 'earL', markup: ear('l'), transform: p.ears?.l },
    { id: 'earR', markup: ear('r'), transform: p.ears?.r },
    { id: 'pack', markup: PACK },
    { id: 'legs', markup: LEGS },
    { id: 'body', markup: BODY },
    { id: 'head', markup: HEAD },
    { id: 'eyes', markup: EYES[p.eyes], transform: dx || dy ? `translate(${dx} ${dy})` : undefined },
    { id: 'brows', markup: BROWS[p.brows] },
    { id: 'mouth', markup: MOUTH[p.mouth] },
    { id: 'trunk', markup: trunk(TRUNKS[p.trunk]) },
    { id: 'hat', markup: HAT, transform: p.hat },
    { id: 'armL', markup: ARM[p.armL] },
    { id: 'armR', markup: ARM[p.armR] },
    { id: 'extras', markup: EXTRAS[pose] },
  ];
}

/** ¿La pose tiene los ojos abiertos? (para el parpadeo). */
export const noiEyesOpen = (pose: NoiPose) => NOI_POSE_DEFS[pose].eyes === 'open';

const CLASS: Record<NoiPartId, string> = {
  shadow: 'noi-shadow', earL: 'noi-ear-l', earR: 'noi-ear-r', pack: 'noi-pack', legs: 'noi-legs', body: 'noi-body',
  head: 'noi-head', eyes: 'noi-eyes', brows: 'noi-brows', mouth: 'noi-mouth', trunk: 'noi-trunk', hat: 'noi-hat',
  armL: 'noi-arm-l', armR: 'noi-arm-r', extras: 'noi-extras',
};

/** Una capa suelta como documento SVG (para SvgXml en la app). */
export function noiLayerXml(part: NoiPart): string {
  const g = part.transform ? `<g transform="${part.transform}">${part.markup}</g>` : part.markup;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${NOI_DEFS}${g}</svg>`;
}

/** SVG completo de una pose; cada capa lleva su clase (noi-ear-l, noi-eyes, noi-trunk…) para animarla con CSS. */
export function noiSvg(pose: NoiPose, opts: { size?: number; title?: string } = {}): string {
  const size = opts.size ?? 240;
  const title = opts.title ?? `Noi, la elefanta exploradora de Sanuk (${pose})`;
  const body = noiParts(pose)
    .map((part) => `<g class="${CLASS[part.id]}"${part.transform ? ` transform="${part.transform}"` : ''}>${part.markup}</g>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}" role="img" aria-label="${title}">${NOI_DEFS}${body}</svg>`;
}
