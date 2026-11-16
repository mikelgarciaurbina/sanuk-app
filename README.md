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
- **Recordatorio de Noi**: en Pasaporte → Ajustes se puede activar un aviso diario y elegir la hora. Empieza apagado; el permiso se pide al activarlo. La hora queda guardada y se programa en el dispositivo, con un único aviso recurrente que se actualiza al cambiarla y se cancela al desactivarlo o reiniciar el progreso. Al tocar la notificación se abre el camino. En primer plano no interrumpe una lección ni su audio.
- **Detalles**: los 5 tonos tienen 5 colores en toda la app, partícula ครับ/ค่ะ y pronombre según quien aprende, tipografía thai con bucles, voz th-TH con modo «Más lento» y aviso si falta la voz del sistema, barritos de Noi con notas de madera para aciertos y fallos, y vibración.

## Arrancar

```bash
npm install
npx expo start          # i = iOS, a = Android, w = web
npm run typecheck
```

Las librerías nativas (expo-audio, expo-haptics, expo-speech, react-native-svg) vienen en Expo Go; para publicar, `npx eas-cli@latest build`.

## TestFlight

La versión visible es `1.0.0` (`expo.version` en `app.json`). `eas.json` usa `cli.appVersionSource: "remote"` y `build.production.autoIncrement: true`: EAS incrementa el número de build de cada compilación de producción, sin cambiar la versión visible. El perfil `production` genera una app firmada para la tienda; `simulator` genera una app de simulador y no sirve para TestFlight.

El checkout está vinculado a [@gartzia6/sanuk](https://expo.dev/accounts/gartzia6/projects/sanuk), proyecto `579d250c-0428-41af-8c4a-4cf052f1c3fc`. El perfil `production` usa el contador remoto de EAS con `autoIncrement: true`. Consulta su valor con `npx eas-cli@latest build:version:get --platform ios --profile production`. Si necesitas sincronizarlo con una build ya enviada a App Store Connect, ajusta el contador con `npx eas-cli@latest build:version:set --platform ios --profile production` antes de generar la siguiente.

```bash
npm run lint
npm run typecheck
npm run test:layout
npm run test:audio
npm run test:eco
npm run test:reminders
npm run temario:test
npm run build:testflight       # genera la .ipa en EAS; incrementa el número de build
npm run submit:testflight      # selecciona y envía la build a App Store Connect
```

La firma requiere la cuenta Apple Developer del propietario. La primera subida debe identificar la app de App Store Connect (`app.sanuk.thai`) y configurar las credenciales de firma y envío. Guarda su Apple ID numérico como `submit.production.ios.ascAppId` cuando esté confirmado; no se incluye un identificador de ejemplo. Las claves privadas permanecen en EAS o fuera del repositorio.

La configuración incluye permiso de micrófono en español, manifiesto de privacidad con las razones declaradas por las dependencias instaladas, uso de cifrado no exento desactivado y audio de fondo desactivado. La voz grabada y el progreso permanecen en el dispositivo según el código actual. La validación de Apple, la firma y las pruebas nativas en dispositivos siguen siendo pasos separados de compilar los bundles JavaScript.

Los perfiles iOS fijan Xcode 27.2 para incluir el soporte de pantalla completa del iPhone Duo (SDK 27.1 o posterior). La navegación nativa coloca las pestañas según la ventana; `ScreenFrame` reserva los márgenes asimétricos para los controles y mantiene los fondos hasta los bordes. Las rejillas y el mapa se adaptan al ancho local sin reiniciar la partida al plegar. Para revisar cambios, probar cerrado, abierto, girado y el iPhone normal; la web conserva su columna de 520 puntos.

El recordatorio usa `expo-notifications` con `enableRemoteNotifications: false`: es local y no requiere credenciales APNs, un servidor ni obtener un token push. La nueva dependencia nativa y el selector de hora requieren una nueva build para probarse en TestFlight. El dispositivo aplica sus preferencias de notificaciones y modos de concentración; en Android el aviso usa la entrega estándar, sin pedir permiso de alarmas exactas.

## Material de las tiendas

Las fichas de App Store y Google Play, las 48 capturas, los iconos, los logotipos, los creativos y sus originales están en [`stores/`](stores/README.md). El [catálogo visual](stores/index.html) reúne todo el material de publicación.

```bash
npm run stores:update     # regenera textos, composiciones y catálogo; valida el resultado
npm run stores:validate   # comprueba dimensiones, formatos, límites y procedencia
npm run stores:pack       # genera el ZIP en stores/releases/
```

Requieren las dependencias npm de la app y Pillow en Python. Las fichas se mantienen en `stores/sources/prepare.py` y la composición en `stores/sources/compose-screenshots.py`. El material se versiona con la app; los ZIP generados se guardan en `stores/releases/`, excluido de Git. `.easignore` excluye `stores/` del envío a EAS y conserva las reglas de `.gitignore`; mantener ambos archivos sincronizados al cambiar esas reglas.

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
stores/         fichas, capturas, marca, creativos, documentos, originales y catálogo de publicación
```
