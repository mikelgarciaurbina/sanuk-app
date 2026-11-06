// Genera los SVG de Noi (una pose por archivo) a partir de src/brand/noi-art.ts.
// Uso: node scripts/render-noi.mts <carpeta-salida> [tamaño]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NOI_POSES, noiSvg } from '../src/brand/noi-art.ts';

const out = process.argv[2] ?? 'noi-svg';
const size = Number(process.argv[3] ?? 240);
mkdirSync(out, { recursive: true });
for (const pose of NOI_POSES) {
  writeFileSync(join(out, `noi-${pose}.svg`), noiSvg(pose, { size }));
}
console.log(`Noi: ${NOI_POSES.length} poses → ${out}`);
