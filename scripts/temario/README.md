# Revisores del temario

Tres órdenes, desde `app/`. Necesitan Node 22.18 o más nuevo, que ejecuta TypeScript sin compilar.

| Orden | Qué hace |
| --- | --- |
| `npm run temario` | Revisa todo el temario que carga la app. Termina con código 1 si hay errores. Con `-- --todo` no recorta las listas largas. |
| `npm run temario:nivel` | Informe de nivel al acabar cada temporada. Con `-- --faltan 100` lista las palabras más frecuentes que aún no enseña ninguna lección. |
| `npm run temario:test` | Pruebas de los propios revisores y del orden de las lecciones: recorre las 164 como un alumno y comprueba que ningún juego pregunta una palabra antes de su ficha. |

Los errores (❌) hay que arreglarlos. Los avisos (⚠️) se aceptan si tienen sentido.

## Qué comprueba `npm run temario`

1. **Archivos.** Cada archivo de `src/content` que exporta `WORDS_*`, `SENTENCES_*`, `STOPS_*`, `DIALOGUES_*` o `STORIES_*` está importado en `src/content/index.ts`. Las paradas van numeradas p1, p2… y en orden de temporada.
2. **Ids y referencias.** Nada repetido. Cada palabra tiene `th`, `rom`, `es`, `emoji` y `cat`. No hay dos palabras con el mismo thai (salvo homógrafos) ni con la misma traducción, porque los juegos ponen las traducciones como opciones. Todo lo que nombra una lección existe, cada palabra y cada frase salen en alguna lección, y los enlaces de los cuentos y de la carta de Yai apuntan a la palabra correcta.
3. **Paradas y lecciones.** Campos de cada parada, mensaje de la familia y lecciones numeradas `p<n>l<k>` con título y objetivo. En la temporada 2 además: el mes, la misión y la conversación del mes en la última lección. Si una parada o una lección se sale del tamaño habitual, avisa.
4. **Conversaciones y cuentos.** Tres opciones con una o dos correctas, y cada correcta con su respuesta. Cuentos con tres preguntas y con transcripción y traducción en cada palabra.
5. **Tonos y transcripción.** Lee cada sílaba desde la escritura thai (clase de la consonante, marca de tono, sílaba viva o muerta, อักษรนำ, การันต์, ๆ) y comprueba que la transcripción tiene esa inicial, esa vocal, esa final y ese tono. Lo hace en palabras, frases, mensajes, misiones, conversaciones, cuentos y la carta de Yai, con ครับ/ผม y con ค่ะ/คะ/ฉัน. En las frases, cada pieza tiene que transcribirse igual que la palabra que la enseña.
6. **Orden de enseñanza.** Recorre las lecciones en orden, como quien aprende. Las frases, las respuestas correctas y las misiones solo pueden usar palabras ya enseñadas (si no, error). En lo que dice la familia y en sus mensajes, solo avisa.

## Si el revisor se equivoca

Lo que se puede ajustar está en `reglas.mts`, cada cosa con su porqué:

- `LECTURAS_IRREGULARES`: palabras cuyo tono no sale de las reglas de escritura (สามารถ, ภรรยา…).
- `ANTES_DE_TIEMPO`: palabras que aparecen antes de enseñarse a propósito, como Nong hablando deprisa en d1. Si una excepción deja de hacer falta, el revisor avisa para que se borre.
- `HOMOGRAFOS`, `CONOCIDAS_DE_INICIO`, `GRUPOS_DE_LETRAS_ESPECIALES` y los tamaños de cada temporada (`REGLAS`).

Una temporada nueva va en su propio archivo (como `src/content/season2/meses-a.ts`), registrado en `src/content/index.ts`, y usa las reglas de la última temporada definida mientras no tenga las suyas.

## Convenciones que comprueba

- **Transcripción**, tipo Paiboon: vocales largas dobles (aa ii uu ee ɛɛ oo ɔɔ ʉʉ əə) y cortas simples; ก se escribe g y จ, j. El tono va con tilde sobre la vocal: à bajo · â descendente · á alto · ǎ ascendente · sin tilde, medio. Las sílabas de una palabra van unidas con guion (sà-wàt-dii).
- **Frases**: `th` es una lista de piezas y `rom` lleva un trozo por pieza, separados por espacios.
- **Marcadores**: `{P}`, `{PQ}` e `{I}` son la partícula, la partícula de pregunta y el «yo» de quien aprende. La app pone ครับ, ค่ะ o คะ, y ผม o ฉัน.

## Cómo se mide el nivel

- **Palabras frecuentes**: de las N palabras más frecuentes de cada corpus, cuántas se pueden formar con palabras ya enseñadas. Un compuesto enseña sus partes de dos o más letras (โรงพยาบาล enseña พยาบาล). Las letras sueltas no cuentan, porque con ellas se podría «componer» cualquier palabra.
- **Palabras de un texto**: qué parte de todas las palabras del corpus son conocidas, teniendo en cuenta cuántas veces sale cada una.
- **Situaciones de conversación**: las 58 de `lib/funciones.mts` (presentarse, «no entiendo», precios, direcciones, pasado y futuro, opinar…). Una situación está cubierta cuando todas sus expresiones aparecen en alguna lección.
- **Palabras ya enseñadas cuando aparecen**: de todas las palabras de las frases, de lo que dice la familia y de las respuestas correctas, cuántas se habían enseñado ya en ese momento.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `revisar.mts`, `nivel.mts`, `temario.test.mts` | Las tres órdenes. |
| `reglas.mts` | Excepciones y tamaños. |
| `lib/cargar.mts` | Carga el temario como la app (importa `src/content/index.ts`) y lo que exporta cada archivo. |
| `lib/tonos.mts` | Lectura de la escritura thai sílaba a sílaba. |
| `lib/vocabulario.mts` | Segmentación del thai, palabras conocidas y cobertura. |
| `lib/funciones.mts` | Las situaciones de conversación. |
| `datos/` | Listas de frecuencia del thai (CC0). Origen y licencia en [`datos/FUENTES.md`](datos/FUENTES.md). |
