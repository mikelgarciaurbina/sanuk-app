/** Número con punto de miles a la española (1.864), también en números de 4 cifras. */
export const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
