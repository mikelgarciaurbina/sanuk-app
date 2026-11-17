# Recursos editables

`prepare.py` regenera los textos y la guía desde los datos confirmados del lanzamiento. `render-assets.mjs` exporta creativos y logotipos con las ilustraciones y fuentes originales del proyecto. `compose-screenshots.py` compone los PNG de las fichas a partir de las capturas originales en `raw`. Con `--force` vuelve a componer todos los archivos. `catalog.py` construye la revisión visual offline y `validate.py` verifica los tamaños, formatos y límites.

Los SVG de header, search y feature incluyen la ilustración y las fuentes. Las poses vectoriales de Noi están en `noi`. Los PNG conservan el perfil de interfaz capturado en cada dispositivo. No estirar una pantalla para sustituir otra.

## Capturas nativas

`capture-entry.js` es un punto de entrada de pruebas separado. Carga el contenido real, prepara progreso local de demostración y abre una ruta existente. No añade interfaces ficticias. Se usa en una copia temporal del proyecto con `src`, `assets`, `node_modules`, `app.json` y `tsconfig.json`. Expo Router debe trabajar con una copia física de `src` para conservar los nombres relativos de las rutas. El bundle de captura no forma parte de la app de producción.

En iOS se empaquetó el JavaScript actual en una app de simulador con los módulos nativos ya instalados. El identificador aislado es `app.sanuk.reminderqa`, con nombre visible Sanuk. Para las primeras capturas de iPhone y Duo el binario conservaba su nombre interno de QA, que no aparece en esas pantallas. Las de iPad se repitieron con el nombre público. Los estados cerrado y completamente abierto del Duo se seleccionaron desde Device Hub, usando la pantalla 1 para el exterior y la 3 para el interior. La orientación horizontal interior es nativa.

En Android se utilizó Expo Go 58.0.5 oficial en un emulador con API 35. El código de Sanuk y sus componentes son nativos. Los avisos de desarrollo de Expo Go se desactivaron en el punto de entrada de captura, como corresponde al aspecto de producción. La API del emulador de captura es independiente del target SDK del AAB final. Las resoluciones y densidades se registran en los manifiestos.

Los scripts de captura usan rutas locales de herramientas y UDID de este equipo. Adaptarlos a otros equipos antes de ejecutarlos. Para rehacer las capturas con el binario firmado, usar el mismo progreso de demostración en una instalación de pruebas aislada y conservar las rutas y resoluciones del manifiesto.

## Validación

Desde la raíz del repositorio `sanuk-app`

```sh
npm run stores:update
npm run stores:validate
npm run stores:pack
```

Los scripts detectan la raíz de `stores/` y usan las fuentes de `../node_modules`, dentro del proyecto de la app. Las fichas se editan en `sources/prepare.py` antes de ejecutar `stores:update`, que vuelve a escribir los TXT y `listing.json`. Los originales de capturas no se regeneran con estos comandos.

La ficha de App Store se genera en `apple/es-ES/` y `apple/en-US/`. El diccionario `apple_en` de `prepare.py` contiene los textos ingleses. El catálogo muestra ambos idiomas con botones para copiar cada campo y el validador comprueba sus límites. `listing.json` incluye las dos versiones en `appleLocalizations`. La ficha inglesa indica que las lecciones y explicaciones de la app están en español.

Los borradores de respuesta a Guideline 2.1 y el guion para la grabación física están en `review/guideline-2.1-*`. Se mantienen directamente en esos archivos; `stores:update` los conserva y valida que los textos ingleses caben en 4.000 caracteres. Este control de longitud no confirma que ya estén completados el vídeo, los datos de la build o las URLs.

Pillow es necesario para la composición y validación. Sus dependencias están en `sources/requirements.txt`. El render vectorial usa Playwright, Chrome local y sharp. El script busca los módulos instalados o el runtime de Codex del usuario y permite configurar `CODEX_NODE_MODULES` y `CHROME_EXECUTABLE`. Ejecutarlo desde la raíz de la app con `node stores/sources/render-assets.mjs`. Los archivos de licencia de las fuentes están en `brand/licenses`.

La captura Android localiza `adb` en PATH o en `ANDROID_HOME` / `ANDROID_SDK_ROOT`. Se puede indicar su ruta con `ADB` y la del proyecto temporal con `SANUK_CAPTURE_PROJECT`. La captura iOS requiere Xcode y el UDID del simulador.

El ZIP se genera en `stores/releases/`, una carpeta excluida de Git. `pack.py` comprueba su integridad y evita incluir ZIP anteriores dentro del nuevo archivo. Las imágenes, textos, originales y scripts sí se versionan. La carpeta `stores/` se excluye de los archivos enviados a EAS y del lint de la app; tiene su propio validador.

La captura de Android usa los parámetros oficiales de Expo SDK 58 para ocultar los controles de desarrollo. Documentación https://docs.expo.dev/versions/v58.0.0/sdk/dev-client/
