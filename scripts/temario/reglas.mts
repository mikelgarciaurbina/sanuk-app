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
  1: { leccionesPorParada: [3, 9], palabrasPorLeccion: [4, 10], frasesPorLeccion: [0, 6], lineasPorDialogo: [3, 7], paginasPorCuento: [3, 5], meses: false },
  2: { leccionesPorParada: [6, 8], palabrasPorLeccion: [6, 12], frasesPorLeccion: [3, 5], lineasPorDialogo: [4, 6], paginasPorCuento: [3, 5], meses: true },
};

/** Una temporada nueva usa las reglas de la última que las tenga. */
export function reglasDe(temporada: number): ReglasTemporada {
  const definidas = Object.keys(REGLAS).map(Number);
  return REGLAS[temporada] ?? REGLAS[Math.max(...definidas)];
}

/** Grupos de `extra: { kind: 'letras', set }` que no están en LETTER_SETS porque src/lib/lesson.ts los trata aparte. */
export const GRUPOS_DE_LETRAS_ESPECIALES: Record<string, string> = {
  vocales: 'vocales largas: cueva de las letras y bloques de sílabas',
  cortas: 'vocales cortas: cueva de las letras y bloques de sílabas',
  compuestas: 'vocales compuestas (เ◌ีย, เ◌ือ, ◌ัว, เ◌า…): cueva de las letras y bloques de sílabas',
  silabas: 'construir la sílaba que se oye: solo bloques de sílabas',
  reglas: 'leer una sílaba y decir su tono: solo bloques de sílabas',
};

/** Tamaños de los textos de la historia y de la gramática (caracteres). Salirse da un aviso. */
export const TEXTOS = { momento: [40, 260] as Rango, despues: [20, 180] as Rango, regla: [30, 260] as Rango, ejemplosPorPatron: [1, 3] as Rango };

/** Lecciones que se salen a propósito de los tamaños habituales. */
export const TAMANOS_ESPECIALES: Record<string, string> = {
  p1l1: 'primera curva: dos expresiones, de oído, y un saludo de dos turnos',
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
  { en: 'd0', piezas: ['นี่', 'กล้วย', 'ไป', 'กัน', 'เถอะ'], porque: 'primera curva: Noi habla con traducción y quien aprende solo responde con สวัสดี y ขอบคุณ' },
  { en: 'd1', piezas: ['พรุ่งนี้', 'เช้า', 'เรา', 'แม่ฮ่องสอน'], porque: 'Nong habla deprisa a propósito para practicar «no entiendo, más despacio»' },
  { en: 'd1', piezas: ['เถอะ'], porque: 'Nong se despide con «ไปกันเถอะ»; la partícula se enseña en p9l5' },
  { en: 'p1', piezas: ['ลูก'], porque: 'Pho ya te llama ลูก en su primer mensaje: lo acaba de anunciar «¿Quién te espera?» (p1l8); la ficha llega en p11l1' },
  { en: 'p5', piezas: ['ลูก'], porque: 'Mae te llama ลูก, como avisó «¿Quién te espera?» (p1l8); la ficha llega en p11l1' },
  { en: 'd2', piezas: ['ร้าน'], porque: 'Nong cuenta su sueño, abrir un café (ร้านกาแฟ) en el pueblo; ร้าน se enseña en p10l2' },
  { en: 'd8', piezas: ['ลูก', 'จ๊ะ'], porque: 'primera llamada con Mae: habla como hablará en casa. จ๊ะ se enseña en la lección siguiente (p9l5) y ลูก, al llegar (p11l1)' },
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
