// Genera los SVG fuente del icono, el splash y el favicon a partir de Noi.
// Uso: node scripts/make-icons.mts <carpeta>  (luego se rasterizan a PNG)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { noiSvg } from '../src/brand/noi-art.ts';

const out = process.argv[2] ?? 'icons-svg';
mkdirSync(out, { recursive: true });
const inner = (pose: Parameters<typeof noiSvg>[0]) => noiSvg(pose).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect width="1024" height="1024" fill="#FFE2B8"/>
<circle cx="512" cy="430" r="380" fill="#FFF0D6"/>
<path d="M0 820 L180 700 L340 780 L520 660 L700 760 L860 690 L1024 760 L1024 1024 L0 1024 Z" fill="#9CBFB3"/>
<path d="M0 900 L220 820 L430 880 L640 810 L1024 880 L1024 1024 L0 1024 Z" fill="#6FA587"/>
<g transform="translate(92 64) scale(3.5)">${inner('hola')}</g>
</svg>`;
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<rect width="1024" height="1024" fill="#FFE2B8"/>
<g transform="translate(212 200) scale(2.5)">${inner('feliz')}</g>
</svg>`;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<rect width="512" height="512" fill="#F7E9DF"/>
<g transform="translate(16 16) scale(2)">${inner('hola')}</g>
</svg>`;
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
<rect width="240" height="240" rx="48" fill="#FFE2B8"/>
<g transform="translate(-30 -6) scale(1.25)">${inner('feliz')}</g>
</svg>`;
writeFileSync(join(out, 'icon.svg'), icon);
writeFileSync(join(out, 'android-fg.svg'), fg);
writeFileSync(join(out, 'splash.svg'), splash);
writeFileSync(join(out, 'favicon.svg'), fav);
console.log('icon svgs →', out);
