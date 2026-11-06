# Sanuk · สนุก

**Thai, curva a curva.** Una app para aprender thai desde el español, de cero a conversar con la familia, convertida en un viaje.

> En lo alto de Mae Hong Son, donde la niebla se queda a dormir, una familia espera conocerte. Desde Chiang Mai son 1.864 curvas. Yai, la abuela, te ha escrito una carta en thai que todavía no entiendes. Noi, una elefanta exploradora, conoce el camino. Cada palabra que aprendes despeja un poco la niebla.

Expo SDK 58 (React Native 0.88, Expo Router, Reanimated 4) para iOS, Android y web. La web de Sanuk (landing, catálogo de juegos y design system) está en su propio repo, [sanuk-site](https://github.com/mikelgarciaurbina/sanuk-site). El diseño de referencia (onboarding, pantallas núcleo y los 20 juegos) está en el lienzo de diseño del proyecto.

## Qué trae

- **Temporada 1 · La carretera** (de cero a A1–A2): la carretera 1095 sube la montaña; cada lección es una curva (1.864 en total) y cada parada sella el pasaporte. 14 paradas, de los saludos en Chiang Mai a la ceremonia del hilo blanco, más un epílogo en kham mueang (thai del norte): 80 lecciones, 532 palabras, 246 frases, las 44 consonantes, 7 conversaciones con la familia y 4 cuentos. La primera parada incluye el kit para hablar con nativos: «no entiendo», «¿puedes repetir?», «más despacio», «¿qué significa?» y «¿de dónde eres?».
- **Temporada 2 · Un año en el pueblo** (hacia el B1): doce lunas de abril a marzo, de Songkran al discurso de despedida, pasando por el mercado, la plantación y la cosecha del arroz, Khao Phansa, las lluvias, Loy Krathong, la escuela y las noticias. 84 lecciones, 863 palabras elegidas entre las más frecuentes del thai, 420 frases, 12 conversaciones y 4 cuentos. Cada mes trae una **misión para la vida real** (hablar en thai con tu pareja o tu familia) y una luna para el pasaporte. Quien ya conversa puede empezar aquí desde el onboarding.
- **En total**: 164 lecciones, 1.395 palabras, 666 frases, 19 conversaciones y 8 cuentos. Cubren el 98 % de las 100 palabras más frecuentes del thai, el 92 % de las 500 más frecuentes y el 86 % de las palabras de un texto corriente.
- **La carta de Yai**: el progreso que se ve. Cada palabra aprendida aparece sin niebla en la carta; al 100 % puedes responderle.
- **20 juegos**, también sueltos en *la feria del templo*: Parejas, Memoria del templo, Monzón, ¿Sí o บ่?, Noche de farolillos, Oído de elefante, Trompa de tonos, ¿Tigre o camisa?, Eco, Puente de bambú, La palabra perdida, Cestas del mercado, Noi dice, Paga justo, Cena familiar, 1.864 curvas, Cueva de las letras, Une los puntos, Bloques de sílabas y Cuentos de Yai.
- **Sin castigos**: errores con «ไม่เป็นไร», racha de farolillos protegida por paraguas de Bo Sang, plátanos como recompensa, repaso espaciado en el palabrario.
- **Detalles**: los 5 tonos tienen 5 colores en toda la app, partícula ครับ/ค่ะ y pronombre según quien aprende, tipografía thai con bucles, voz th-TH (también al 60 %), sonidos pentatónicos de marimba y vibración.

## Arrancar

```bash
npm install
npx expo start          # i = iOS, a = Android, w = web
npm run typecheck
```

Las librerías nativas (expo-audio, expo-haptics, expo-speech, react-native-svg) vienen en Expo Go; para publicar, `npx eas-cli@latest build`.

## Revisar el temario

Cada vez que cambies algo en `src/content`, pasa el revisor (Node 22.18 o más nuevo):

```bash
npm run temario         # ids, enlaces, tonos sílaba a sílaba y que nada se use antes de enseñarse
npm run temario:nivel   # cuánto thai frecuente se enseña y qué situaciones de conversación cubre
```

Cómo funciona, qué comprueba y dónde se añaden las excepciones: [`scripts/temario/README.md`](scripts/temario/README.md).

## Estructura

```
src/
  app/          pantallas (onboarding, (tabs)/camino·feria·palabras·pasaporte, leccion/[id], juego/[id], carta)
  brand/        tokens del design system y el dibujo de Noi (noi-art.ts, fuente única para la app, la web y el diseño)
  components/   UI (botones con profundidad, fichas, Noi animada por capas, paisaje con niebla, confeti)
  content/      temario: paradas, palabras, frases, alfabeto, diálogos, cuentos, carta de Yai
    season2/    temporada 2: meses-a (abril–junio), meses-b (julio–septiembre), meses-c (octubre–diciembre), meses-d (enero–marzo)
  games/        los 20 juegos y su registro
  lib/          progreso (AsyncStorage), audio, lecciones, utilidades de thai
scripts/        make-sfx.mjs (sonidos), render-noi.mts (SVG de Noi), make-icons.mts (iconos)
  temario/      revisores del temario: revisar.mts, nivel.mts, reglas.mts (excepciones) y listas de frecuencia
```
