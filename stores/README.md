# Sanuk 1.0 · paquete de publicación

Preparado el 16 de noviembre de 2026 para Mikel Garcia. Idioma principal de la app español de España. Fichas de App Store en español e inglés de Estados Unidos. App completamente gratuita. Soporte sanuk@overlayon.com.

Abrir `index.html` para revisar imágenes y textos. Los archivos TXT se pueden copiar directamente a los campos de las consolas. `listing.json` reúne los datos de la ficha. El ZIP conserva esta misma estructura.

## Mantener este material en el repositorio

Esta carpeta `stores/` forma parte de `sanuk-app`, junto a `src/` y `assets/`. Se versionan las fichas, las 48 capturas, los originales, los logotipos, los documentos y los scripts. Las copias legales sirven como referencia; el código de la web que se publica sigue en el repositorio `sanuk-site`.

Desde la raíz de la app, con las dependencias npm instaladas y Pillow disponible en Python, ejecutar

```sh
npm run stores:update
npm run stores:validate
npm run stores:pack
```

`stores:update` regenera textos, compone las capturas que han cambiado, reconstruye el catálogo y valida el resultado. Para modificar las fichas, editar `stores/sources/prepare.py`, que es su fuente. Los titulares y la composición están en `stores/sources/compose-screenshots.py`; el arte vectorial, en `stores/sources/render-assets.mjs`. Para recomponer todos los PNG, usar `python3 stores/sources/compose-screenshots.py --force`.

`stores:pack` valida el material y crea `stores/releases/Sanuk-<versión>-App-Store-Google-Play.zip`. Los ZIP se excluyen de Git y se pueden regenerar desde los originales versionados. `stores/` también se excluye del envío a EAS mediante `.easignore`. Al modificar `.gitignore`, mantener sus reglas también en `.easignore`, que EAS utiliza en su lugar.

Las herramientas de captura necesitan simuladores y un proyecto de pruebas separado. `stores:update` no inicia simuladores ni sustituye las capturas originales. Consultar `sources/README.md` para las dependencias gráficas y el procedimiento de captura.

## Dónde va cada archivo

| Carpeta | Destino |
| --- | --- |
| apple/es-ES | Nombre, subtítulo, texto promocional, descripción, palabras clave y novedades |
| apple/en-US | Ficha de App Store en inglés, incluidos contacto y URLs |
| apple/iphone | Capturas del grupo iPhone mediano con Dynamic Island, 1206 × 2622 |
| apple/iphone-duo-outer | Capturas de iPhone Duo cerrado, 1398 × 2034 |
| apple/iphone-duo-inner | Capturas de iPhone Duo abierto en horizontal, 2853 × 2007 |
| apple/ipad-13 | Capturas de iPad de 13 pulgadas, 2048 × 2732 |
| apple/creative | Header 3840 × 1646 y Search Results 3840 × 2560 |
| google-play/es-ES | Título, descripción breve, descripción completa y novedades |
| google-play/phone | Capturas Android de teléfono, 1080 × 1920 |
| google-play/tablet-7 | Capturas Android de tablet de 7 pulgadas, 1080 × 1920 |
| google-play/tablet-10 | Capturas Android de tablet de 10 pulgadas, 1440 × 2560 |
| google-play/feature-graphic.png | Gráfico de funciones de Google Play, 1024 × 500 |
| brand | Iconos para tiendas, logotipos vectoriales y PNG, colores y tipografía |
| legal | Copia de las páginas de privacidad y soporte preparadas para el sitio |
| review | Notas de revisión, declaraciones propuestas y tareas de envío |
| sources | Recursos editables y capturas originales con su procedencia |
| checks | Verificación de dimensiones, modos de color, longitud de textos e integridad |

Las imágenes de Apple son RGB sin transparencia. El icono Android es PNG de 32 bits. Conservar el orden numérico de las capturas. El icono iOS se incorpora al binario desde el proyecto, no se añade como captura de pantalla.

## Antes del envío

1. Publicar el sitio en https://sanuk.overlayon.com y comprobar desde fuera que `/privacidad` y `/soporte` responden sin contraseña. El código del sitio incluye ambas páginas, el pie de navegación y el dominio canónico. En Pasaporte se han añadido los enlaces.
2. Confirmar que el buzón sanuk@overlayon.com recibe correo.
3. Completar identidad, acuerdos de cuenta, estado de comerciante para la UE y contacto privado de revisión, incluido el teléfono. Estos datos pertenecen al titular de las cuentas.
4. Crear las fichas `app.sanuk.thai` en las cuentas correspondientes. En Apple, elegir SKU estable, por ejemplo `sanuk-ios-1`, idioma principal es-ES y disponibilidad gratuita. Añadir la localización English (U.S.), en-US, con los textos de `apple/en-US`. En Google Play, crear una app gratuita en Educación y declarar que no contiene anuncios.
5. Generar los binarios de producción firmados con la configuración actual y las credenciales del titular. No se han creado ni subido binarios de tienda en este paquete.
6. Probar esos binarios mediante TestFlight y la prueba interna/cerrada de Play, en especial audio tailandés, micrófono opcional, recordatorios, persistencia del progreso y adaptación de pantalla.
7. Copiar los textos, subir los recursos de cada grupo y revisar las declaraciones propuestas de `review/privacy-and-content.md` contra el binario final.
8. Elegir territorios, contestar los cuestionarios de clasificación y enviar a revisión desde las cuentas.

## Responder al requerimiento de información de Apple

La [guía de Guideline 2.1](review/guideline-2.1-pasos-es.md) explica cómo completar el requerimiento recibido el 17 de noviembre de 2026. Incluye el guion de la grabación en un dispositivo físico y los pasos para actualizar Notes y reenviar la versión.

Los archivos `review/guideline-2.1-notes-en.txt` y `review/guideline-2.1-reply-en.txt` son borradores en inglés para cada campo de App Store Connect. Sustituir los campos entre corchetes por el vídeo y los datos reales de la build antes de usarlos. El registro `review/urls-check-2026-11-17.json` recoge la comprobación de las URLs en esa fecha; volver a comprobarlas tras publicar las páginas.

## Compilación y envío

Desde la carpeta `app`, que usa npm. EAS solicitará credenciales y decisiones de cuenta cuando sean necesarias.

```sh
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

El perfil `production` ya es de distribución store con incremento de compilación. Android debe producir un AAB firmado. La primera subida a Play Console puede hacerse manualmente en la pista interna; no se ha configurado una cuenta de servicio ni `submit.production.android`. El envío de iOS requiere la app correspondiente en App Store Connect. Los comandos de envío transmiten el binario y se ejecutan cuando se decida realizar la subida.

## Requisitos vigentes comprobados

Apple admite un único grupo obligatorio de iPhone mediano con Dynamic Island y un grupo de iPad de 13 pulgadas si la app es compatible con iPad. Se entregan además ambos estados del Duo. La exigencia de capturas Duo para entregas con iOS 27.1 empieza en abril de 2027, según la documentación consultada. Se incluyen ahora por petición del titular. [Especificaciones de capturas de Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).

Header y Search Results son recursos creativos de App Store Connect, independientes de las capturas de la ficha. Se incluyen versiones y plantillas con guías de área segura. Las guías son para revisión y no se suben. [Especificaciones creativas de Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications/).

Google Play exige icono de 512 × 512 y gráfico de funciones de 1024 × 500. Se entregan ocho capturas de teléfono y cuatro para cada grupo de tablet, con texto alternativo. [Requisitos de recursos de Google Play](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

Para nuevas apps, comprobar que el AAB final apunta a Android 16, API 36, o superior. Es el requisito vigente desde el 31 de agosto de 2026. Verificarlo en el AAB/Play Console; no basta la versión de Expo. [Target API de Google Play](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-en).

Si la cuenta personal de Google Play se creó después del 13 de noviembre de 2023, puede aplicar la prueba cerrada con al menos 12 personas inscritas durante 14 días continuos antes de solicitar acceso a producción. Comprobarlo en la cuenta. [Requisitos de prueba para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB).

## Procedencia y edición

Los recursos gráficos se derivan del sistema visual original de Sanuk y del personaje Noi. Las pantallas se capturan de la interfaz real con un progreso local de demostración. Consultar `sources/capture-manifest.json` para los dispositivos, escenas y rutas. Los originales de las pantallas se conservan en `sources/raw`. No se ha usado una pantalla de iPhone ampliada como sustituto de la interfaz del Duo, iPad o Android.

Las capturas son material promocional. La validación de dimensiones del paquete no sustituye la prueba del binario firmado. Las URLs previstas deben publicarse antes del envío. Las fichas de App Store están en español e inglés; la de Google Play está en español. La descripción inglesa indica que las lecciones y explicaciones de la app están en español. Las capturas conservan el idioma de la interfaz de la app.
