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

La firma utiliza las credenciales del propietario en EAS. El destino de envío está configurado en `submit.production.ios`: app `6834352671` de App Store Connect (`app.sanuk.thai`), confirmado contra los tres envíos anteriores, y equipo `54RSVZ573J`, confirmado contra el perfil de firma. Las claves privadas permanecen en EAS o fuera del repositorio.

La configuración incluye permiso de micrófono en español, manifiesto de privacidad con las razones declaradas por las dependencias instaladas, uso de cifrado no exento desactivado y audio de fondo desactivado. La voz grabada y el progreso permanecen en el dispositivo según el código actual. La validación de Apple, la firma y las pruebas nativas en dispositivos siguen siendo pasos separados de compilar los bundles JavaScript.

El 17 de noviembre se notificó que Eco dibujaba la voz pero no se oía la grabación en un iPhone 16 Pro con iOS 27.2.1 y Sanuk 1.0.0 (3). La [build 4](https://expo.dev/accounts/gartzia6/projects/sanuk/builds/796f25fc-b5b7-4ef4-addf-9048202590be) añadió una reactivación global de audio; el titular confirmó que seguía sin oírse y observó un bloqueo intermitente. La prueba anterior con un WAV generado era insuficiente para validar el recorrido completo.

El código local actual conserva el PCM original para analizar los tonos y prepara una copia de escucha con ganancia limitada y protección de picos. El reproductor nuevo empieza desde cero sin un `seek` innecesario ni la activación global de la build 4. Si el audio no arranca, devuelve el control en cuatro segundos. Mientras se prepara la toma, la interfaz indica «Preparando tu voz…».

Se probó el componente real de Eco con el micrófono nativo en un iPhone 16 Pro simulado con iOS 27.0. El titular grabó «khop khun» y confirmó que oía su voz después de Noi. La toma conservó sus 66.509 muestras a 48 kHz; la copia pasó de RMS 0,0374 a 0,1200 sin recortar picos. La comparación terminó sin errores. Las métricas sin audio personal están en `scripts/qa/eco-native-result-2026-11-17.json`. Sigue pendiente la validación de este código en el iPhone físico con iOS 27.2.1.

Durante la revisión local no se generaron builds de EAS ni envíos a TestFlight. Tras confirmar que oía su voz en el simulador, el titular pidió expresamente crear y enviar la build 5.

[Sanuk 1.0.0 (5)](https://expo.dev/accounts/gartzia6/projects/sanuk/builds/e42e20ce-f182-4cbf-874c-e322c758c5fd) incluye el arreglo validado, del commit `3147622`. Se creó una única compilación de iOS y el [envío a TestFlight](https://expo.dev/accounts/gartzia6/projects/sanuk/submissions/dd363800-b9ef-4184-9db4-f6f379221b30) terminó correctamente. App Store Connect confirmó `VALID` e `IN_BETA_TESTING` el 17 de noviembre de 2026 a las 10:35 (Europe/Madrid). Está disponible para pruebas internas; sigue pendiente comprobar Eco en el iPhone físico. La build 4 conserva el código anterior. No se ha reenviado la app a App Review.

El mismo 17 de noviembre el titular informó de que en el iPhone 16 Pro seguía sin oírse su voz (Noi sí) y de que, a veces, al empezar un ejercicio solo se oía el final de la palabra de Noi. La revisión del código nativo instalado encontró dos causas que el simulador no puede reproducir:

- **La sesión se quedaba en modo de medición.** `AudioStream.start()` pone la sesión en `.record` con `AVAudioSessionModeMeasurement`. Al volver a escuchar, expo-audio 58 llama a `setCategory(_:options:)`, que cambia la categoría y conserva el modo. Una sonda con la sesión real del simulador lo confirmó: `Playback` + `Measurement` después de grabar. La cabecera de Apple indica que ese modo «da un nivel de reproducción más bajo»; afectaba a la toma y a todos los efectos hasta cerrar la app. `restoreAudio()` pasa ahora por `interruptionMode: 'doNotMix'`, el único camino con el que expo-audio fija `mode: .default`, y después recupera la mezcla.
- **La voz del sistema atenúa el resto del audio.** Con `useApplicationAudioSession: false` la síntesis usa una sesión aparte que, según la cabecera de Apple, «mezcla y atenúa el resto del audio». El simulador crea la cola del sintetizador «sin sesión de audio» y por eso no atenúa nada.

Estos cambios se probaron en el iPhone 16 Pro con una compilación local de Xcode instalada por cable (`xcodebuild` en Release con firma automática y `devicectl`), sin gastar builds de EAS:

1. Con el modo restablecido y 700 ms de pausa entre Noi y la toma, el titular oyó su voz por primera vez, pero «muchísimo más baja que la de Noi». Las tomas copiadas del iPhone descartaron el archivo: el PCM original llega a unos −44 dBFS y la copia de escucha queda con la voz a −14/−17 dBFS, igual que la voz thai del sistema (−15/−16 dBFS medidos con `AVSpeechSynthesizer.write`). La diferencia la ponía el sistema al reproducir.
2. Por eso Noi vuelve a hablar por la sesión de la app (`useApplicationAudioSession: true`), la misma de los efectos y de la toma, y esa sesión ya no se cierra: `initAudio()` reproduce una vez `assets/sfx/silence.wav` con `keepAudioSessionActive`, lo único que impide que expo-audio 58 la desactive 100 ms después de cada efecto. Esa desactivación es lo que dejaba muda a Noi cuando compartían sesión antes del 15 de noviembre. La pausa entre Noi y la toma baja a 300 ms. En el iPhone el titular la oyó «bastante mejor, pero un poco más baja» que Noi.
3. La copia de escucha ya no se ajusta por la media del archivo entero, que incluye el silencio de antes y de después de hablar y dejaba la voz entre −14 y −17 dBFS según la toma. `voiceVolume` mide solo los tramos con voz (percentil 95 por tramos de 20 ms, los que quedan a menos de 16 dB), los lleva a un nivel fijo y redondea los picos por debajo de 0,98 en lugar de limitar la ganancia por el pico. Con 0,28 (−11 dBFS) y cinco tomas reales del iPhone, la voz quedaba entre −9,9 y −10,7 dBFS con un 2–4 % de muestras redondeadas, pero el titular la describió como «si se escuchara de muy lejos»: el problema ya no era el volumen.
4. La causa era el micro. `AudioStream` de expo-audio 58 lo abre con `AVAudioSessionModeMeasurement`, sin el procesado de voz del iPhone: la voz llegaba a unos −40 dBFS y, al subirla 30 veces, subía la sala entera. `patches/expo-audio+58.0.12.patch` cambia esa línea a `mode: .default`. Una toma real con el parche llega a −20 dBFS, 20 dB más, y el titular la oyó «muchísimo mejor, casi un poquito por encima de Noi», así que el nivel de la copia de escucha baja de 0,28 a 0,23. Con ese nivel el titular confirmó en el iPhone que su voz y la de Noi suenan igual («Sí, perfecto»).

El parche se aplica con `patch-package` en `postinstall`, y `eas-build-post-install` lo repite antes de compilar en EAS con `--error-on-fail`. `npm run test:eco` falla si el parche falta, si no coincide con la versión instalada de expo-audio o si la librería instalada no lo tiene. Al actualizar expo-audio hay que rehacerlo con `npx patch-package expo-audio` y volver a oír Eco en un iPhone: el simulador no distingue los dos modos del micro.

El corte del principio de Noi no se ha podido reproducir: en el simulador, el motor de voz arranca completo con cualquier separación entre frases. Con la sesión única el titular no lo ha vuelto a señalar durante las pruebas de Eco en el iPhone, pero no se ha comprobado de forma expresa en el resto de ejercicios. No se ha generado ninguna build de EAS con estos cambios: la validación del 17 de noviembre es de la compilación local, y el parche de expo-audio no se ha probado todavía en una build de EAS.

### Repetir la prueba local de Eco

`scripts/qa/eco-native-entry.js` monta el juego real con la palabra de la lección, sus fuentes y proveedores. Observa la captura, los estados y los archivos nativos; no activa el muestreo del reproductor, no fabrica la grabación ni sustituye la entrada del micrófono. Ejecutarlo en una copia temporal del proyecto y una app de simulador con identificador propio y las mismas versiones nativas de `package-lock.json`.

```sh
# En la copia temporal, con src, assets, scripts/qa y node_modules disponibles:
npx expo export:embed --entry-file scripts/qa/eco-native-entry.js --platform ios --dev false --bundle-output /tmp/sanuk-eco-qa-bundle/main.jsbundle --assets-dest /tmp/sanuk-eco-qa-bundle
```

Incorporar ese bundle y sus assets a la app local aislada del simulador. Grabar una frase real, escuchar la secuencia completa, volver a tocar «Comparar» y hacer otra toma. Comprobar también silencio y cancelación. El registro `eco-fullflow-qa.json` y las copias `native-take-*.wav` se guardan en Documents de esa app de prueba para inspección local; no se versionan grabaciones. `scripts/qa/` se excluye de los archivos enviados a EAS. Una señal o un cursor que avanza no sustituyen la comprobación de que se oye la voz.

Los perfiles iOS fijan Xcode 27.2 para incluir el soporte de pantalla completa del iPhone Duo (SDK 27.1 o posterior). La navegación nativa coloca las pestañas según la ventana; `ScreenFrame` reserva los márgenes asimétricos para los controles y mantiene los fondos hasta los bordes. Las rejillas y el mapa se adaptan al ancho local sin reiniciar la partida al plegar. Para revisar cambios, probar cerrado, abierto, girado y el iPhone normal; la web conserva su columna de 520 puntos.

El recordatorio usa `expo-notifications` con `enableRemoteNotifications: false`: es local y no requiere credenciales APNs, un servidor ni obtener un token push. La nueva dependencia nativa y el selector de hora requieren una nueva build para probarse en TestFlight. El dispositivo aplica sus preferencias de notificaciones y modos de concentración; en Android el aviso usa la entrega estándar, sin pedir permiso de alarmas exactas.

## Material de las tiendas

Las fichas de App Store y Google Play, las 48 capturas, los iconos, los logotipos, los creativos y sus originales están en [`stores/`](stores/README.md). App Store incluye textos en español (`es-ES`) e inglés (`en-US`), con las lecciones y explicaciones de la app en español. El [catálogo visual](stores/index.html) reúne todo el material de publicación.

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
