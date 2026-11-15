/** En dispositivos nativos la ventana es de borde a borde; la web conserva su presentación móvil. */
export function contentWidth(windowWidth: number, web: boolean) {
  return web ? Math.min(windowWidth, 520) : windowWidth;
}

/** Los márgenes pueden ser asimétricos y cambiar al plegar o rotar. */
export function foregroundWidth(width: number, left: number, right: number) {
  return Math.max(0, width - left - right);
}

export function gridColumns(width: number) {
  return width >= 1000 ? 4 : width >= 720 ? 3 : 2;
}
