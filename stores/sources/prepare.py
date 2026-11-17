"""Textos y documentación de publicación. Ejecutar desde cualquier directorio."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
def put(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text.strip() + '\n', encoding='utf-8')

title = 'Sanuk · Aprende tailandés'
subtitle = 'Thai, curva a curva'
short = 'Aprende tailandés desde cero con 20 juegos y un viaje por el norte de Tailandia.'
description = '''Tu primera palabra en tailandés puede ser el comienzo de una historia.

Viaja de Chiang Mai a Mae Hong Son con Noi, una pequeña elefanta que te acompaña entre montañas, mercados y farolillos. Al final de las 1.864 curvas hay una familia que quiere conocerte. Y una carta de Yai que irás entendiendo, palabra a palabra.

EMPIEZA DESDE CERO, EN ESPAÑOL
Aprende saludos, vocabulario, frases útiles, tonos y escritura tailandesa con explicaciones en español. Activa la transcripción con tonos cuando necesites apoyo y avanza a tu ritmo.

APRENDE JUGANDO
20 juegos convierten cada práctica en algo distinto. Entrena el oído, reconoce los tonos, une palabras, traza letras, compra en el mercado y participa en conversaciones. En Eco puedes escucharte para comparar tu pronunciación con la referencia.

UN VIAJE QUE CONTINÚA
Recorre 180 lecciones entre la carretera y la vida en el pueblo. Practica cómo pedir comida, presentarte, hablar con la familia y desenvolverte en situaciones cotidianas. Descubre 23 diálogos y 8 relatos que dan contexto a lo que aprendes.

VUELVE A LAS PALABRAS QUE NECESITAS
Repasa vocabulario con repetición espaciada. Guarda sellos en tu pasaporte, enciende farolillos con tu racha y consulta el diario para recordar lo vivido. Puedes activar un recordatorio local a la hora que elijas.

UNA CARTA QUE SE VA ACLARANDO
Al principio, la carta de Yai parece un misterio. A medida que aprendes, sus palabras se vuelven familiares. Tu progreso cambia lo que eres capaz de entender.

Sanuk es completamente gratuita, sin anuncios ni compras integradas. No necesitas crear una cuenta. Tu progreso se guarda en tu dispositivo.

La pronunciación utiliza las voces de tailandés de tu dispositivo. Su disponibilidad depende del sistema y puede requerir descargar una voz. El micrófono es opcional para grabarte en Eco.

Thai, curva a curva.'''
promo = 'Tu primera palabra en tailandés abre un viaje. Aprende desde cero, juega con Noi y descubre una carta que entenderás palabra a palabra.'
keywords = 'thai,tailandes,idiomas,aprender,tonos,alfabeto,vocabulario,viaje,juegos,español'
notes = '''Primera versión de Sanuk.

• Un viaje de Chiang Mai a Mae Hong Son y una nueva etapa en el pueblo.
• 180 lecciones y 20 juegos para aprender tailandés desde el español.
• Práctica de vocabulario, tonos, escritura y conversaciones.
• La carta de Yai, el diario de viaje y tu pasaporte de aprendizaje.'''
for filename, value in {'name':title, 'subtitle':subtitle, 'promotional-text':promo, 'description':description, 'keywords':keywords, 'release-notes':notes}.items():
    put(f'apple/es-ES/{filename}.txt', value)
for filename, value in {'title':title,'short-description':short,'full-description':description,'release-notes':notes}.items():
    put(f'google-play/es-ES/{filename}.txt',value)

apple_en = {
 'name':'Sanuk · Learn Thai',
 'subtitle':'Thai, one curve at a time',
 'promotionalText':'Your first Thai word starts a journey. Play with Noi, learn from scratch with Spanish explanations, and uncover Yai’s letter one word at a time.',
 'keywords':'thai,learn,language,tones,alphabet,vocabulary,games,spanish,thailand,travel',
 'description':'''Your first word in Thai could be the start of a story.

Learn Thai from scratch with lessons and explanations in Spanish.

Travel from Chiang Mai to Mae Hong Son with Noi, a young elephant who guides you through mountains, markets, and lantern-lit evenings. At the end of 1,864 curves, a family is waiting to meet you. And there is a letter from Yai that you will come to understand, one word at a time.

START FROM SCRATCH, WITH SPANISH EXPLANATIONS
Learn greetings, vocabulary, useful phrases, tones, and Thai writing. Turn on tone-marked transliteration whenever you need a little help, and move at your own pace.

LEARN THROUGH PLAY
20 games make every practice session different. Train your ear, recognize tones, match words, trace letters, shop at the market, and take part in conversations. In Eco, record yourself and listen back to compare your pronunciation with the reference.

A JOURNEY THAT KEEPS GOING
Explore 180 lessons on the road and in the village. Practice ordering food, introducing yourself, talking with family, and handling everyday situations. Discover 23 dialogues and 8 stories that give context to what you learn.

REVISIT THE WORDS YOU NEED
Review vocabulary with spaced repetition. Collect stamps in your passport, light lanterns with your learning streak, and revisit your adventures in the travel diary. You can set an optional daily reminder on your device.

A LETTER THAT BECOMES CLEARER
At first, Yai’s letter feels like a mystery. As you learn, its words become familiar. Your progress changes what you can understand.

Sanuk is completely free, with no ads or in-app purchases. No account is needed. Your progress is stored on your device.

Pronunciation uses your device’s Thai voices. Availability depends on your system, and you may need to download a voice. The microphone is optional for recording yourself in Eco.

Thai, one curve at a time.''',
 'releaseNotes':'''Welcome to Sanuk.

• A journey from Chiang Mai to Mae Hong Son, followed by life in the village.
• 180 lessons and 20 games to learn Thai through Spanish.
• Practice vocabulary, tones, writing, and conversations.
• Discover Yai’s letter, the travel diary, and your learning passport.'''
}
for filename, key in {'name':'name','subtitle':'subtitle','promotional-text':'promotionalText','description':'description','keywords':'keywords','release-notes':'releaseNotes'}.items():
    put(f'apple/en-US/{filename}.txt',apple_en[key])
put('apple/en-US/contact-and-urls.txt','''Public developer name
Mikel Garcia

Support email
sanuk@overlayon.com

Website / Marketing URL
https://sanuk.overlayon.com

Support URL
https://sanuk.overlayon.com/soporte

Privacy Policy URL
https://sanuk.overlayon.com/privacidad

Copyright
2026 Mikel Garcia

Price
Free, with no ads or in-app purchases

Store listing locale
English (U.S.) — en-US

Primary app language
Spanish — es-ES. Lessons and explanations are in Spanish.

Category
Education

Bundle identifier
app.sanuk.thai

The website URLs are prepared and await publication by the owner.''')

review = '''Sanuk 1.0 — información para revisión

Desarrollador y contacto
Mikel Garcia
sanuk@overlayon.com
Completar el teléfono de contacto privado en App Store Connect o Play Console.

Acceso
No se necesita cuenta, contraseña ni código de acceso. No hay inicio de sesión, anuncios, suscripciones ni compras integradas. Todo el contenido de aprendizaje es gratuito. La progresión desbloquea actividades al completar lecciones.

Ruta sugerida
1. Completar la bienvenida y elegir la partícula, motivación y meta diaria.
2. En Camino, abrir la primera parada de Chiang Mai y comenzar una lección.
3. En Feria, practicar las actividades disponibles según el progreso.
4. En Pasaporte, consultar los ajustes, la política de privacidad y la ayuda.
5. La carta de Yai y el diario se encuentran en Camino y Pasaporte.

Audio y permisos
La pronunciación usa la síntesis de voz del sistema en tailandés. Se requiere una voz tailandesa disponible en el dispositivo. En Android, la app muestra instrucciones si falta una voz local. El micrófono se solicita al elegir grabarse en Eco, con grabación y análisis locales. Los recordatorios son notificaciones locales opcionales. Ninguno de estos permisos se usa para publicidad o seguimiento.

Datos
El progreso y las preferencias se guardan localmente. No hay servidor de cuentas ni analítica propia. Se puede restablecer el progreso desde Pasaporte. Ver la política para los detalles de las voces del sistema y los correos voluntarios a soporte.

Sitio previsto
https://sanuk.overlayon.com
https://sanuk.overlayon.com/privacidad
https://sanuk.overlayon.com/soporte
Publicar y comprobar estas páginas antes de enviar a revisión.

Dispositivos
App universal para iPhone y iPad, con interfaz adaptable al iPhone Duo abierto y cerrado. Android dispone de diseños para móvil y pantallas amplias.

Capturas promocionales
Las capturas del paquete muestran la app con un progreso de demostración local para enseñar actividades de diferentes etapas. No contienen información personal de usuarios.
'''
put('review/review-notes-es.txt',review)
put('review/review-notes-en.txt','''Sanuk 1.0 — App Review notes

Contact: Mikel Garcia, sanuk@overlayon.com. Enter the private review contact phone number in the console.

The app teaches Thai through Spanish. No account, credentials, payment, ads, subscriptions or in-app purchases are required. All learning content is free. Activities unlock through lesson progress.

Suggested review path: complete onboarding; open the first stop in Camino and start a lesson; explore the available activities in Feria; open Pasaporte for preferences, privacy and support. Yai's letter and the travel diary are available from Camino and Pasaporte.

Thai pronunciation uses the operating system's Thai text-to-speech voices. An installed Thai voice may be necessary. Android offers instructions if a local voice is unavailable. Microphone permission is optional and requested when recording in Eco. Recordings and voice analysis stay on-device. Daily reminders use optional local notifications.

Progress is stored locally and can be reset from Pasaporte. There is no account backend or proprietary analytics. See the privacy policy for system voice providers and voluntary support email.

Website: https://sanuk.overlayon.com
Privacy: https://sanuk.overlayon.com/privacidad
Support: https://sanuk.overlayon.com/soporte
Publish and verify these pages before submission.

Universal iPhone/iPad app with layouts for iPhone Duo open and closed. Promotional screenshots use local demonstration progress to show activities at different stages. No real user's personal data is included.''')

listing = {
 'version':'1.0.0', 'primaryLocale':'es-ES','developer':'Mikel Garcia','supportEmail':'sanuk@overlayon.com',
 'appName':title,'bundleIdentifier':'app.sanuk.thai','androidPackage':'app.sanuk.thai',
 'website':'https://sanuk.overlayon.com','supportUrl':'https://sanuk.overlayon.com/soporte','privacyUrl':'https://sanuk.overlayon.com/privacidad',
 'urlsPublished':False,'price':'free','ads':False,'inAppPurchases':False,'loginRequired':False,
 'applePrimaryCategory':'Education','appleSecondaryCategory':'Games (opcional; Educational)',
 'googleCategory':'Education','googleSuggestedTags':['Language education','Education'],
 'copyright':'2026 Mikel Garcia',
 'metadata':{'name':title,'subtitle':subtitle,'promotionalText':promo,'keywords':keywords,'shortDescription':short,'fullDescription':description,'releaseNotes':notes},
 'appleLocalizations':{
  'es-ES':{'name':title,'subtitle':subtitle,'promotionalText':promo,'description':description,'keywords':keywords,'releaseNotes':notes},
  'en-US':apple_en
 },
 'content':{'lessons':180,'games':20,'words':1402,'sentences':810,'dialogues':23,'stories':8,'stops':27},
 'submissionState':'Preparado localmente; requiere publicar las URLs, crear los binarios firmados y completar los datos privados de las cuentas.'
}
put('listing.json', json.dumps(listing,ensure_ascii=False,indent=2))
put('review/privacy-and-content.md','''# Declaraciones de contenido y privacidad

Propuesta basada en el código de Sanuk 1.0, revisada el 16 de noviembre de 2026. Las respuestas finales deben coincidir con el binario enviado y los servicios que se activen al publicar la web.

## Apple App Privacy

Seleccionar que la app no recopila datos si se mantiene la implementación revisada. El progreso, las grabaciones de Eco y su análisis se procesan localmente. No hay cuentas, publicidad, identificador publicitario, tracking ni analítica propia. El permiso de micrófono no equivale por sí solo a recopilar datos fuera del dispositivo. La política explica las voces del sistema y el correo que el usuario envíe voluntariamente.

URL de privacidad pública y URL de soporte necesarias. Los enlaces están añadidos a Pasaporte. Publicar el sitio antes del envío.

## Google Play Data safety

| Pregunta | Respuesta propuesta |
| --- | --- |
| ¿Recopila o comparte datos de usuario fuera del dispositivo? | No, en la implementación actual |
| ¿Contiene anuncios? | No |
| ¿Permite crear cuentas? | No |
| ¿Hace falta autenticación para acceder? | No, todas las funciones son accesibles sin cuenta |
| ¿Tiene compras integradas? | No |
| ¿Necesita URL de eliminación de cuenta? | No se crean cuentas; indicar que no se ofrecen si el formulario lo pregunta |
| Política de privacidad | https://sanuk.overlayon.com/privacidad |
| Micrófono | Grabación voluntaria de práctica en Eco, procesamiento local |
| Notificaciones | Recordatorio diario local, opcional |

No declarar cifrado en tránsito como sustituto de «no recopila». Completar solo las ramas que muestre el formulario. Las grabaciones locales no se deben declarar como subidas al desarrollador.

## Clasificación por edades y público

Responder los cuestionarios de Apple e IARC como app educativa de idiomas. No incluye apuestas, chat, contenido generado por usuarios, compras, navegación web sin restricciones, violencia realista ni contenido sexual. El tigre y los animales son ilustraciones de juegos. La referencia a pareja y familia forma parte de una historia cotidiana.

La clasificación se calcula en la consola. No marcar una clasificación aprobada de antemano. Público propuesto para la primera publicación, adolescentes a partir de 13 años y adultos, con la selección concreta de tramos según la intención editorial del desarrollador. No se está solicitando la categoría Kids ni el programa Families. Si se decide dirigir la app a menores de 13 años, revisar también los requisitos específicos de esas categorías.

## Otras respuestas

- App gratuita, sin servicios financieros, noticias, salud, VPN, préstamos, criptomonedas ni funciones de gobierno.
- No es una app oficial de una institución tailandesa.
- Derechos de contenido y marca a confirmar por el titular. Se reutilizan los recursos originales del proyecto.
- El ajuste de cifrado de iOS declara que no usa cifrado no exento. Confirmar que el binario final mantiene esta configuración.
- Completar personalmente el estado de comerciante para la UE, identidad, domicilio y verificaciones de cuenta que pidan las plataformas. No se han inventado estos datos.

Referencias oficiales [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/) y [Google User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en).
''')
put('README.md','''# Sanuk 1.0 · paquete de publicación

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
''')

limits = {'appleName':(title,30),'appleSubtitle':(subtitle,30),'applePromo':(promo,170),'appleDescription':(description,4000),'playTitle':(title,30),'playShort':(short,80),'playDescription':(description,4000),'playReleaseNotes':(notes,500)}
checks={k:{'length':len(t),'limit':n,'pass':len(t)<=n} for k,(t,n) in limits.items()}
checks['appleKeywords']={'utf8Bytes':len(keywords.encode()),'limit':100,'pass':len(keywords.encode())<=100}
for field, limit in {'name':30,'subtitle':30,'promotionalText':170,'description':4000,'releaseNotes':4000,'keywords':100}.items():
    value=apple_en[field]
    if field=='keywords':
        checks[f'apple.en-US.{field}']={'utf8Bytes':len(value.encode()),'limit':limit,'pass':len(value.encode())<=limit}
    else:
        checks[f'apple.en-US.{field}']={'length':len(value),'limit':limit,'pass':len(value)<=limit}
put('checks/text-limits.json',json.dumps(checks,ensure_ascii=False,indent=2))
assert all(v['pass'] for v in checks.values()),checks
print('Textos y documentación preparados. Todos los límites de las fichas cumplen.')
