# Responder a Guideline 2.1 · información adicional

Preparado el 17 de noviembre de 2026 a partir del mensaje de App Review y del código actual de Sanuk. El titular ha confirmado que ha probado la build en un dispositivo físico; todavía falta grabar el vídeo. El modelo, la versión del sistema y el número de build no se han facilitado.

El mensaje no identifica un fallo concreto ni permite saber cuánto ha probado el revisor. Pide una demostración y seis aclaraciones. Los apartados de cuentas, contenido compartido y pagos solo deben demostrarse cuando existen en la app. En Sanuk hay preferencias locales, progreso y monedas de juego; no son cuentas online ni compras.

## Dos cosas pendientes antes del reenvío

1. Grabar la misma build enviada a Apple en un iPhone o iPad físico, con la versión estable actual del sistema que pide el revisor.
2. Publicar las páginas de privacidad y soporte. El 17 de noviembre, las dos URLs configuradas devolvieron HTTP 404. Sus fuentes están preparadas en `sanuk-site/src/pages/privacidad.astro` y `sanuk-site/src/pages/soporte.astro`, y hay copias en `stores/legal/`. Comprobar las rutas exactas sin iniciar sesión después del despliegue.

El vídeo y las URLs son requisitos distintos. Una grabación correcta no corrige una página inexistente.

## Guion del vídeo

Duración orientativa de 5–8 minutos, ajustándola al flujo real. Apple no fija esa duración en su mensaje.

1. Desde la pantalla de inicio del dispositivo, iniciar la grabación de pantalla y tocar el icono de Sanuk. Usar la misma build que aparece en la revisión, instalada desde TestFlight. Apuntar el modelo, el sistema y el número de build que muestra TestFlight.
2. Si aparece la bienvenida, completarla y elegir «Nada de nada» para empezar desde cero. Si ya hay progreso, se puede conservar y enseñar el uso normal; no hace falta borrarlo para grabar. Mostrar qué lección se elige.
3. En Camino, abrir una lección, reproducir la voz tailandesa, responder las actividades y terminarla para que se vean los resultados y el progreso. «Hola y gracias» incluye escucha, Eco y una conversación. Si se muestra Eco, practicar realmente la grabación y reproducción con el permiso correspondiente.
4. Mostrar un juego disponible en Feria. Para una instalación nueva, completar «Hola y gracias» y «Sí, no y no pasa nada» antes de entrar en los juegos libres: necesitan al menos seis palabras presentadas. Si un puesto pide más progreso, su mensaje describe el requisito educativo. No se desbloquea pagando.
5. Mostrar Palabras, la carta de Yai o el diario, y Pasaporte con el progreso y los ajustes. Enseñar el recordatorio si forma parte del recorrido grabado. Abrir privacidad y soporte después de que sus URLs funcionen.
6. Volver al inicio y abrir de nuevo Sanuk para mostrar que se conserva el progreso. Revisar la grabación completa y comprobar que se ve la interacción y se oye la pronunciación.

La evidencia solicitada debe proceder de la app en un dispositivo real. Las capturas promocionales de `stores/` y los simuladores se utilizaron para los recursos de la ficha y no acreditan este requisito.

Si no suena el tailandés, seguir el aviso de voz de la app e instalar una voz tailandesa del sistema antes de grabar. La voz de referencia procede de iOS, no de un chatbot ni de una API de IA remota. Comprobar por separado que el micrófono de Eco funciona; la grabación de pantalla no debe impedir la prueba de esa función.

Apple explica la grabación de pantalla en [esta guía](https://support.apple.com/en-us/102653). Al compartir el vídeo, usar un enlace que el revisor pueda abrir sin iniciar sesión y mantenerlo accesible durante toda la revisión. Probar el enlace en una ventana privada. También se pueden adjuntar archivos en la respuesta de App Review si el formulario admite el archivo elegido.

## Completar los textos en inglés

Estos archivos son **borradores**. Antes de pegarlos en App Store Connect, sustituir todos los campos entre corchetes por datos reales:

- `[RECORDING_URL]` — enlace a la grabación del dispositivo físico.
- `[DEVICE_MODEL]` — modelo utilizado, por ejemplo el nombre que aparece en Ajustes.
- `[OS_VERSION]` — versión exacta de iOS o iPadOS del vídeo.
- `[BUILD_NUMBER]` — número de la misma build enviada a revisión. Confirmar también que la versión visible es 1.0.0.

Usar los borradores después de grabar el recorrido, comprobar las URLs y confirmar que describen la build enviada. El apartado de regiones describe el código actual, sin funciones por país. El titular debe confirmar que los contenidos y recursos incluidos cuentan con los derechos o licencias correspondientes.

No se ha creado un vídeo ni se ha declarado que ya esté adjuntado. Los datos reales se introducen en App Store Connect al completar la respuesta.

## Dónde pegar cada texto

1. En la versión de Sanuk, abrir **App Review Information → Notes** y pegar el contenido completado de `guideline-2.1-notes-en.txt`. Responde uno por uno a los seis puntos del mensaje. Confirmar que el enlace del vídeo y sus datos aparecen en Notes.
2. En el mensaje del rechazo, pulsar **Reply to App Review** y pegar el contenido completado de `guideline-2.1-reply-en.txt`. Este segundo texto se usa después de actualizar Notes. Adjuntar evidencia si corresponde.
3. Guardar los datos y volver a enviar la versión a revisión, como indica Apple. Responder al mensaje no equivale por sí solo a reenviar la app.

Este mensaje no pide una modificación concreta de código. Si solo se completa la información y no hay fallos que corregir, puede utilizarse la misma build para el reenvío. Si las pruebas revelan un error o hace falta cambiar el comportamiento de la app, corregirlo y enviar una build nueva.

Referencias oficiales [responder a App Review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages) y [Guideline 2.1](https://developer.apple.com/app-store/review/guidelines/#app-completeness).
