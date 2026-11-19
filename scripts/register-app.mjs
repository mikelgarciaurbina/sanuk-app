import { enableCompileCache, registerHooks } from 'node:module';

// Node invalida la caché cuando cambia el código o la versión del motor.
enableCompileCache();

// Node necesita resolver el alias de Metro y los imports sin extensión de la app.
const SRC = new URL('../src/', import.meta.url);
registerHooks({
  resolve(especificador, contexto, siguiente) {
    const spec = especificador.startsWith('@/') ? new URL(especificador.slice(2), SRC).href : especificador;
    const rutaDeApp = spec.startsWith(SRC.href) || (spec.startsWith('.') && contexto.parentURL?.startsWith(SRC.href));
    let r;
    if (rutaDeApp && !/\.[cm]?[jt]sx?$/.test(spec)) {
      for (const ext of ['.ts', '/index.ts']) {
        try {
          r = siguiente(spec + ext, contexto);
          break;
        } catch {
          // probamos la siguiente forma
        }
      }
    }
    r ??= siguiente(spec, contexto);
    return r.url.startsWith(SRC.href) && r.url.endsWith('.ts') ? { ...r, format: 'module-typescript' } : r;
  },
});
