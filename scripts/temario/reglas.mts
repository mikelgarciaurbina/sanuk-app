// Reglas y excepciones del temario que usan los revisores (npm run temario · npm run temario:nivel).
// Si un revisor da un falso error, la solución va aquí, con su porqué, y no escondida en el código.

export type Rango = readonly [min: number, max: number];

export type ReglasTemporada = {
  leccionesPorParada: Rango;
  palabrasPorLeccion: Rango;
  frasesPorLeccion: Rango;
  lineasPorDialogo: Rango;
  paginasPorCuento: Rango;
  /** Paradas que son meses: llevan month, monthTh, misión y la conversación del mes en la última lección. */
  meses: boolean;
};

/** Tamaños de cada temporada. Salirse del rango da un aviso, no un error. */
export const REGLAS: Record<number, ReglasTemporada> = {
  1: { leccionesPorParada: [3, 7], palabrasPorLeccion: [5, 11], frasesPorLeccion: [0, 6], lineasPorDialogo: [3, 7], paginasPorCuento: [3, 5], meses: false },
  2: { leccionesPorParada: [6, 8], palabrasPorLeccion: [6, 12], frasesPorLeccion: [3, 5], lineasPorDialogo: [4, 6], paginasPorCuento: [3, 5], meses: true },
};

/** Una temporada nueva usa las reglas de la última que las tenga. */
export function reglasDe(temporada: number): ReglasTemporada {
  const definidas = Object.keys(REGLAS).map(Number);
  return REGLAS[temporada] ?? REGLAS[Math.max(...definidas)];
}

/** Grupos de `extra: { kind: 'letras', set }` que no están en LETTER_SETS porque src/lib/lesson.ts los trata aparte. */
export const GRUPOS_DE_LETRAS_ESPECIALES: Record<string, string> = {
  vocales: 'juego de sílabas y cueva de las letras',
  silabas: 'solo el juego de sílabas',
};

/** Lo que se sabe antes de la primera lección. */
export const CONOCIDAS_DE_INICIO: Record<string, string> = {
  ครับ: 'partícula {P} y {PQ} de quien habla en masculino',
  ค่ะ: 'partícula {P} de quien habla en femenino',
  คะ: 'partícula {PQ} de quien habla en femenino',
  ผม: '«yo» {I} en masculino',
  ฉัน: '«yo» {I} en femenino',
  สวัสดี: 'se aprende en el onboarding',
  น้อย: 'Noi, la mascota',
  จองคำ: 'el templo de Chong Kham',
};

/** Palabras que se escriben igual y significan otra cosa: pueden tener dos entradas. */
export const HOMOGRAFOS: Record<string, string> = {
  ไหม: 'pregunta de sí o no · seda',
  ถูก: 'barato · pasiva de algo malo',
  ตา: 'ojo · abuelo materno',
  เลย: 'del todo · así que',
};

/**
 * Palabras que aparecen antes de enseñarse, a propósito. `en` es el id de una frase o de un diálogo.
 * En frases y respuestas correctas son errores; en lo que dice la familia, avisos.
 * Si una excepción deja de hacer falta, el revisor avisa para que se borre.
 */
export const ANTES_DE_TIEMPO: { en: string; piezas: string[]; porque: string }[] = [
  { en: 'd1', piezas: ['พรุ่งนี้', 'เช้า', 'เรา', 'แม่ฮ่องสอน'], porque: 'Nong habla deprisa a propósito para practicar «no entiendo, más despacio»' },
  { en: 'd1', piezas: ['เถอะ'], porque: 'Nong se despide con «ไปกันเถอะ»; la partícula se enseña en p9l4' },
  { en: 'b140', piezas: ['เอ๋ย'], porque: 'la llamada ritual al khwan de la ceremonia del hilo blanco' },
  { en: 'd6', piezas: ['เอ๋ย'], porque: 'la misma llamada al khwan, en boca de Yai' },
];

/**
 * Lecturas irregulares: el tono de cada sílaba no sale de las reglas de escritura (L bajo · M medio · H alto ·
 * F descendente · R ascendente). Solo palabras de diccionario; si dudas, mejor cambiar la frase.
 */
export const LECTURAS_IRREGULARES: Record<string, string> = {
  // temporada 1
  ก็: 'F', บ่: 'L', ภรรยา: 'MHM', พฤหัสบดี: 'HHLLMM', จัตวา: 'LLM', สุขภาพ: 'LLF', ชาติ: 'F', ภูมิ: 'M',
  สิญจน์: 'R', เสมอ: 'LR', โทรศัพท์: 'MHL', โทร: 'M', ไทย: 'M', จันทร์: 'M', ญาติ: 'F', เหตุ: 'L', กรุณา: 'LHM',
  อนุญาต: 'LHF', ขโมย: 'LM',
  // temporada 2
  พรรษา: 'MR', บาตร: 'L', สมาธิ: 'LMH', สามเณร: 'RHM', ธรรมดา: 'MHM', ธรรมชาติ: 'MHF', ธรรม: 'M', กรรม: 'M',
  ศีรษะ: 'RL', เจริญ: 'LM', ปกติ: 'LLL', สามารถ: 'RF', ประโยชน์: 'LL', พัฒนา: 'HHM', ปฏิบัติ: 'LLL', รัฐบาล: 'HLM',
  บริเวณ: 'MHM', เสนอ: 'LR', บริษัท: 'MHL', กิจกรรม: 'LLM', สมัคร: 'LL', อนุรักษ์: 'LHH', เกียรติ: 'L', แสดง: 'LM',
  สำเร็จ: 'RL', วัฒนธรรม: 'HHHM', บริการ: 'MHM', อังกฤษ: 'ML', เฉพาะ: 'LH', สมาชิก: 'LMH',
};
