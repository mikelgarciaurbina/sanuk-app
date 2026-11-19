import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, getCompileCacheDir } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFunction } from 'node:vm';

const require = createRequire(import.meta.url);
const cacheDir = fileURLToPath(new URL('../../node_modules/.cache/sanuk-tests/', import.meta.url));
// Cambiar de compilador o modificar estas opciones también invalida la compilación anterior.
const compilerKey = createHash('sha256')
  .update(require('typescript/package.json').version)
  .update(readFileSync(new URL(import.meta.url)))
  .digest('hex');

function compiledSource(file: URL, path: string): string {
  const source = readFileSync(file, 'utf8');
  const key = createHash('sha256').update(compilerKey).update(source).digest('hex');
  // Una entrada local por módulo. Se respeta NODE_DISABLE_COMPILE_CACHE.
  const slot = getCompileCacheDir() && join(cacheDir, encodeURIComponent(path) + '.json');
  if (slot) {
    try {
      const cached = JSON.parse(readFileSync(slot, 'utf8'));
      if (cached.key === key && typeof cached.code === 'string') return cached.code;
    } catch { /* Primera ejecución o caché ilegible. */ }
  }

  const ts: typeof import('typescript') = require('typescript');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  if (slot) {
    const temporary = `${slot}.${randomUUID()}.tmp`;
    try {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(temporary, JSON.stringify({ key, code: outputText }), { flag: 'wx', mode: 0o600 });
      renameSync(temporary, slot);
    } catch {
      // Una caché de solo lectura tampoco impide ejecutar las pruebas.
      try { rmSync(temporary, { force: true }); } catch {}
    }
  }
  return outputText;
}

// Compila una vez por archivo. Cada prueba ejecuta la función de nuevo con sus propios
// puentes nativos, de modo que las colas, los listeners y el resto del estado empiezan vacíos.
export function nativeModule<T = Record<string, any>>(path: string) {
  const file = new URL(`../../src/${path}`, import.meta.url);
  const initialize = compileFunction(compiledSource(file, path), ['exports', 'require'], { filename: fileURLToPath(file) });
  return (modules: Record<string, unknown>): T => {
    const exports = {} as T;
    initialize(exports, (id: string) => {
      if (!Object.hasOwn(modules, id)) throw new Error(`Módulo sin doble en ${path}: ${id}`);
      return modules[id];
    });
    return exports;
  };
}
