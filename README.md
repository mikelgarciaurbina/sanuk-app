# Sanuk · สนุก

**Thai, curva a curva.** Una app para aprender thai desde el español, de cero a conversar con la familia, convertida en un viaje.

> En lo alto de Mae Hong Son, donde la niebla se queda a dormir, una familia espera conocerte. Desde Chiang Mai son 1.864 curvas. Yai, la abuela, te ha escrito una carta en thai que todavía no entiendes. Noi, una elefanta exploradora, conoce el camino. Cada palabra que aprendes despeja un poco la niebla.

Expo SDK 58 (React Native 0.88, Expo Router, Reanimated 4) para iOS, Android y web. La web de Sanuk (landing, catálogo de juegos y design system) está en su propio repo, [sanuk-site](https://github.com/mikelgarciaurbina/sanuk-site). El diseño de referencia (onboarding, pantallas núcleo y los 20 juegos) está en el lienzo de diseño del proyecto.

## Qué trae

- **Temporada 1 · La carretera** (de cero a A2): la carretera 1095 sube la montaña; cada lección es una curva (1.864 en total) y cada parada sella el pasaporte. Diez paradas de camino en el orden real de la ruta (Chiang Mai, Warorot, Mae Taeng, la 1095, Pai, el mirador Kiew Lom, la cueva Tham Lod, el puente Su Tong Pae, Mae Hong Son y Ban Rak Thai), cuatro en la casa de teca (familia, cocina, historias y la ceremonia del hilo blanco) y un epílogo en kham mueang que acaba con tu carta de respuesta a Yai: 96 lecciones, 543 palabras, 381 frases, las 44 consonantes y las vocales (largas, cortas y compuestas), 11 conversaciones y 4 cuentos. La primera parada trae el kit para hablar con nativos («no entiendo», «¿puedes repetir?», «más despacio», «¿qué significa?») y a la familia que te espera (ยาย, พ่อ, แม่, น้อง); la segunda, los números hasta 100 para pagar en el mercado.
- **Temporada 2 · Un año en el pueblo** (hacia el B1): prometiste volver, y vuelves con tu pareja para un año entero. Doce lunas de abril a marzo, de Songkran al discurso de despedida, pasando por el mercado, la plantación y la cosecha del arroz, Khao Phansa, las lluvias, Loy Krathong, la escuela y las noticias. 84 lecciones, 859 palabras elegidas entre las más frecuentes del thai, 420 frases, 12 conversaciones y 4 cuentos. Quien ya conversa puede empezar aquí desde el onboarding.
- **En total**: 180 lecciones, 1.402 palabras, 810 frases, 23 conversaciones y 8 cuentos. Cubren el 98 % de las 100 palabras más frecuentes del thai, el 92 % de las 500 más frecuentes y el 86 % de las palabras de un texto corriente.
- **Una historia en cada lección**: todas empiezan con un momento del viaje contado por Noi (dónde estáis, qué pasa y por qué hace falta lo de hoy) y las importantes se cierran con otro. Tu pareja ya está arriba con su familia; Nong, su hermana pequeña, sube contigo. Llegar al pueblo, leer la carta entera y contestarla tienen su propia pantalla.
- **Gramática en un minuto**: 95 tarjetas, cada una donde aparece el patrón por primera vez: la fórmula, la regla en una frase, ejemplos que se oyen al tocarlos y la trampa típica de quien viene del español. Se guardan como chuletas en la pestaña *Palabras*.
- **Leer y escribir de verdad**: hasta la cueva de las letras, todo el thai lleva transcripción; después los juegos la van quitando. Los bloques de sílabas enseñan a montar lo que se oye y a leer lo que se ve (clase de la consonante + sílaba viva o muerta + marca = tono), y cada ficha de palabra explica de dónde sale su tono.
- **Diario del viaje**: cada parada tiene su escenario (el mercado de noche, la cueva, el lago, la casa de teca, la lluvia de septiembre…) y cada lección terminada escribe una página en el diario, con lo que pasó y los mensajes de la familia. Sirve para releer la historia o para ponerse al día si se empezó más arriba.
- **Misiones en la vida real**: cada parada y cada mes traen una frase para decirle de verdad a tu pareja o a su familia, con lo que es fácil que te contesten.
- **La carta de Yai**: el progreso que se ve. Cada palabra aprendida aparece sin niebla en la carta; llega al 100 % en la ceremonia del hilo y, al final, la contestas.
- **20 juegos**, también sueltos en *la feria del templo*, que es de noche y con luces: Parejas, Memoria del templo, Monzón, ¿Sí o บ่?, Noche de farolillos, Oído de elefante, Trompa de tonos, ¿Tigre o camisa?, Eco, Puente de bambú, La palabra perdida, Cestas del mercado, Noi dice, Paga justo, Cena familiar, 1.864 curvas, Cueva de las letras, Une los puntos, Bloques de sílabas y Cuentos de Yai. Cada uno tiene su escenario animado, efectos en cada acierto, niveles en la feria y una racha en forma de llama. Lo que se falla vuelve más tarde en la misma partida, y solo baja en el repaso lo que de verdad no se sabía.
- **Sin castigos**: errores con «ไม่เป็นไร», racha de farolillos protegida por paraguas de Bo Sang, plátanos como recompensa, repaso espaciado en el palabrario.
- **Detalles**: los 5 tonos tienen 5 colores en toda la app, partícula ครับ/ค่ะ y pronombre según quien aprende, tipografía thai con bucles, voz th-TH (también al 60 %) con aviso si el dispositivo no la tiene instalada, sonidos pentatónicos de marimba y vibración.

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
npm run temario         # ids, enlaces, momentos de historia, gramática, tonos sílaba a sílaba y que nada se use antes de enseñarse
npm run temario:nivel   # cuánto thai frecuente se enseña y qué situaciones de conversación cubre
```

Cómo funciona, qué comprueba y dónde se añaden las excepciones: [`scripts/temario/README.md`](scripts/temario/README.md).

## Estructura

```
src/
  app/          pantallas (onboarding, (tabs)/camino·feria·palabras·pasaporte, leccion/[id], juego/[id], carta, diario)
  brand/        tokens del design system y el dibujo de Noi (noi-art.ts, fuente única para la app, la web y el diseño)
  components/   UI (botones con profundidad, fichas, Noi animada por capas, paisaje con niebla, confeti)
  content/      temario: paradas, palabras, frases, gramática (patterns-*), alfabeto, diálogos, cuentos, carta de Yai
    season2/    temporada 2: meses-a (abril–junio), meses-b (julio–septiembre), meses-c (octubre–diciembre), meses-d (enero–marzo)
  games/        los 20 juegos y su registro, el kit de efectos (fx.tsx: partículas, banners, 3D) y los escenarios (Backdrop.tsx)
  lib/          progreso (AsyncStorage), audio, lecciones, utilidades de thai
scripts/        make-sfx.mjs (sonidos), render-noi.mts (SVG de Noi), make-icons.mts (iconos)
  temario/      revisores del temario: revisar.mts, nivel.mts, reglas.mts (excepciones) y listas de frecuencia
```
