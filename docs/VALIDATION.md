# Validación

## Comprobaciones repetibles

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run smoke
npm run dist -- --linux --publish never
```

El smoke test ejecuta el **build de producción** en Electron con sandbox. Arranca
un servidor HTTP local en tres direcciones loopback (127.0.0.2 para pestañas,
127.0.0.1 para el asistente simulado y 127.0.0.3 para el tracker), usa un perfil temporal y reinicia Electron dos veces.
EasyList excluye cosmética en localhost y 127.0.0.1; la fixture usa 127.0.0.2 para
comprobar una regla real sin modificar filtros ni ignorar sus excepciones.

Comprueba pestañas, navegación, API privilegiada ausente en contenido remoto,
esquemas peligrosos, DNT/GPC/Referer, ausencia de Cookie/Set-Cookie y document.cookie,
bloqueo de red de un banner y ocultación CSS, separación de sesiones, cookies de
proveedores permitidas y de otros dominios rechazadas, enlaces externos de sidebar,
conservación de vista al ocultar, borrado de datos, lectura/reproducción WAV local,
continuidad al cambiar de pestaña, ajustes en disco, ausencia de historial por
defecto y persistencia de una cookie de IA al reiniciar. También prueba la edición de ajustes sin perder cambios de la lista musical y
la limpieza de proveedores retirados mediante una edición externa del JSON. Se
crea una cookie temporal real antes de terminar el primer proceso. Al reiniciar no hay cookies
de navegación ni autoplay. La prueba no usa cuentas ni servicios de IA externos.

Los tests Vitest cubren ajustes y entradas inválidas, parseo URL/búsqueda, cabeceras,
whitelist de proveedores con límites de dominio y excepciones de vídeo. Pruebas con
espías verifican que el motor y las inyecciones no se invocan en los dominios
excluidos, incluso para recursos de terceros de una página YouTube.

## Límites de la ejecución en la nube

Linux headless permite probar reproducción y decodificación, pero este entorno no
tiene salida de audio física ni bus DBus de escritorio. Los avisos ALSA/DBus no
significan que se haya verificado sonido audible. Windows/macOS y los diálogos
nativos interactivos necesitan validación en esas plataformas. Los workflows están
preparados; solo una ejecución en GitHub establece su resultado remoto.

## Revisión manual antes de distribuir

1. `npm run dev` en escritorio: abrir/cerrar/reordenar varias pestañas; probar
   atrás/adelante, inicio, HTTP y los atajos documentados.
2. Ajustar suspensión a 1 minuto; cambiar de pestaña, esperar el umbral más el
   intervalo de 30 segundos y volver. Se restaura URL, no formularios ni navegación.
3. Cambiar acento, tema, fondo local, desenfoque y oscurecimiento; importar/exportar
   y restablecer. Cerrar y abrir; comprobar los valores y los archivos movidos.
4. Reproducir mp3/ogg/wav/flac en el equipo; volumen, orden, bucle, aleatorio,
   lista recordada y continuidad con pestañas/sidebar.
5. Abrir asistentes reales con cuentas de prueba: documentar OAuth/CAPTCHA fallidos
   sin copiar cookies. Ocultar, cambiar, redimensionar a ambos lados y reiniciar.
   Confirmar el prompt de micrófono y que no existe envío automático de contenido.
6. Inspeccionar YouTube: comprobar filtrado de red, pausa al aparecer el aviso,
   una sola recarga y reactivación manual. Con exclusión manual u opción desactivada,
   comprobar que no se consulta el motor ni se instala el detector.
7. Probar los tres perfiles: el normal conserva sesiones al reiniciar; Borrar al
   salir y Estricto usan memoria. Eliminar datos IA y comprobar que el resto del
   navegador no cambia de sesión.
8. Revisar tráfico con herramientas del sistema sin publicar cookies ni cabeceras
   sensibles. Separar red propia de Chromium y red iniciada por las webs abiertas.

## Resultado de validación (1 de noviembre de 2026)

- `npm ci`, instalación oficial de Electron y build: completados.
- ESLint y TypeScript estricto: correctos.
- Vitest: 57 pruebas en 6 archivos, todas correctas.
- Integración Electron: tres arranques con perfil temporal, correcta.
- electron-builder Linux x64: AppImage y DEB generados; no firmados.
- Aplicación Linux empaquetada en asar: arranque real y estado de UI verificados.
- CI remoto y empaquetado nativo Windows/macOS: correctos en v0.1.0; véase [PUBLICATION](PUBLICATION.md).
- Interacción gráfica Windows/macOS y autenticación real de proveedores: sin validar.

Los tiempos observados de UI lista en perfiles de prueba fueron aproximadamente
0,8–1,1 segundos. Son medidas de esta máquina, no benchmarks multiplataforma.

La defensa de almacenamiento se verifica con intentos de escritura por cabecera,
`document.cookie`, Cookie Store, Local/Session Storage, IndexedDB, Cache API y
registro de service workers. Un mundo aislado exclusivo del test runner consulta
los almacenes nativos de Chromium: así un getter bloqueado no puede simular que los
datos están vacíos. El runner siembra datos nativos, espera la barrida de 15 segundos
y comprueba su eliminación. Repite la comprobación tras cerrar una pestaña y volver
al origen. Con cookies propias activadas mantiene otra pestaña legítima del tracker,
lo solicita por fetch e iframe y comprueba ausencia de cookies salientes y nuevas
cookies de terceros. La sidebar conserva solo cookies de proveedores, incluso tras
una inyección nativa de una cookie de tracker. El primer proceso usa el cierre real
y comprueba la sesión vacía en `will-quit`, después de la limpieza de producción.

Se simula también un perfil antiguo con una cookie de tracker persistente después
de cerrar las ventanas de producción. El siguiente arranque debe purgarla antes
de mostrar vistas, manteniendo la cookie de sesión válida del proveedor.

## Regresiones de 0.1.1

- Clics de ratón reales de Electron: primer clic selecciona URL completa, segundo
  coloca cursor, volver de contenido remoto vuelve a seleccionar con un clic.
- Recurso HTTP cacheable solicitado repetidamente y después de una barrida estricta:
  una sola petición al servidor; `isPersistent() === false` y `storagePath === null`.
- Login local con cookie HttpOnly y token localStorage en modo Temporal explícito:
  funciona, sobrevive a recarga y barridas estrictas y no comparte datos con la
  sesión estricta ni permite cookies de terceros. Se conserva mientras quede otra
  pestaña de la regla y se borra al cerrar la última o volver al modo estricto.
- La exclusión completa de YouTube del motor continúa cubierta por las pruebas.

No se utilizó una cuenta real de X ni se midió una carga real de YouTube en esta
máquina: las pruebas reproducen las causas locales de incompatibilidad y pérdida
de caché. Los controles antiabuso y proveedores OAuth externos quedan fuera de esa
verificación. Vitest de 0.1.1: 59 pruebas correctas.

## Persistencia global de 0.1.2

El primer arranque comprueba el nuevo valor predeterminado y selecciona después el
modo estricto para ejecutar todas sus regresiones anteriores. Al final prueba el
modo de sesión y el permanente: login, cierre de pestaña y reapertura, cambio de
dominio y vuelta sin seleccionar excepciones. El cierre real elimina el perfil en
memoria, pero conserva el permanente. Un segundo proceso restaura cookie persistente
y localStorage del mismo origen y prueba terceros bloqueados y borrado explícito
sin afectar a la IA. El tercer proceso verifica que el borrado fue duradero.

Las cookies del fixture de login tienen Max-Age explícito: no se alteran ni garantizan
las caducidades del servidor. Vitest: 60 pruebas. No se probaron cuentas reales externas.

## Idiomas y YouTube (0.1.3)

74 pruebas unitarias correctas, lint y TypeScript. El runner Electron prueba
Español → English en vivo, `html.lang`, persistencia en el segundo proceso y que el
cambio no elimina el login. El detector se prueba en DOM real: ignora texto fuera
de avisos y avisos ocultos, detecta el aviso visible una vez y detiene la observación.

Además, `session.protocol.handle('https')` sirve una fixture local bajo la URL de
YouTube solo durante el test, sin tráfico al servicio. La pestaña usa el preload
sandboxed de producción y su IPC real: el proceso principal activa la pausa, la
página carga exactamente dos veces (inicial + recarga) y conserva las cookies. Esta
prueba no sustituye comprobar anuncios, reproductor y avisos de YouTube en vivo.
Las pruebas unitarias cubren rechazo de iframes, emisores ajenos y payloads inválidos,
prioridad de exclusiones, pausa/reanudación y migración de ajustes antiguos.

## v1.0.0 — temas, menús, descargas y última pestaña

79 pruebas unitarias, lint y tipos correctos. La integración Electron con sandbox
verifica diez tarjetas de tema, cambio real de color en la cabecera, selección y
persistencia de paleta/gradiente tras reinicio. Se generan menús nativos mediante
clics derechos reales en la barra y pestañas: «Pegar y acceder», duplicar y cerrar.
Los menús de enlaces/imágenes y esquemas peligrosos también tienen pruebas unitarias.

Un servidor local entrega 4 MiB con soporte Range. La prueba descarga usando la
sesión real autenticada, verifica la cookie propia, pausa/reanuda desde el IPC de
producción y comprueba todos los bytes del archivo. Comprueba cancelación, indicador
y panel de progreso, confirmación de cierre cancelada y limpieza de registro sin
borrar archivos. Se rechazan IDs inválidos; una prueba aislada del gestor garantiza
que solo se abren rutas de archivos completados conocidos, nunca rutas del IPC.
En otro proceso, el registro está vacío y ajustes/sesiones conservan su estado.
El tercer arranque cierra la única pestaña y comprueba salida real sin ventanas.

El ejecutable Linux v1.0.0 empaquetado en asar arrancó correctamente y se capturó
la interfaz para revisión visual. Las pruebas no automatizan el diálogo de selección
de archivos ni la apertura de aplicaciones externas; se usa una ruta temporal en
el runner para evitar interacción. La interfaz gráfica completa y los diálogos de
Windows/macOS requieren revisión en escritorio.

## Regresión de dirección enfocada (1.0.1)

Una comprobación adicional con foco explícito en la barra reprodujo que «Pegar y
acceder» navegaba pero mantenía el texto anterior hasta desenfocar. La corrección
termina la edición antes de emitir el estado y devuelve el foco a la vista. El test
usa clic derecho real y exige que URL de la pestaña y texto visible coincidan.

## v1.0.2 — filtrado de datos publicitarios del reproductor

La fixture HTTPS local de YouTube usa el preload de producción desde el inicio del
documento. Incluye `ytInitialPlayerResponse`, `ytInitialData`, fetch JSON/texto/clone,
XHR JSON/texto y PBJ con prefijo de seguridad. Se comprueba ausencia de los cuatro
campos publicitarios soportados y conservación exacta de streams y subtítulos.
Un endpoint no relacionado conserva sus anuncios, lo que verifica el ámbito limitado.
El CSS oculta el contenedor de banner, pero permite mostrar el aviso antibloqueo.

La pausa desregistra el preload, retira CSS y recarga una vez: todos los probes vuelven
a devolver la publicidad original y el banner visible. Desactivar el ajuste o añadir
una exclusión manual también conserva los datos originales. El test verifica que no
hay API Nido ni `require` en el mundo de la página y que no se borra la cookie de login.
79 pruebas unitarias, lint y tipos correctos; el smoke completo sigue cubriendo temas,
menús, descargas autenticadas, perfiles, reinicios y cierre de la última pestaña.

**Alcance:** no se reproduce un anuncio real ni se ha validado el servicio YouTube en
vivo: el entorno solo permite destinos de red autorizados y YouTube no está incluido.
Se verifica el mecanismo sobre respuestas representativas; formatos nuevos, respuestas
binarias o publicidad cosida al flujo de vídeo pueden quedar fuera del filtro.

## v1.0.3 — acceso OAuth y rechazo de Google

84 pruebas unitarias, incluyendo límites de dominio, esquemas y preferencias de
popups. La integración abre un popup nativo en un origen loopback distinto desde
el opener real, envía un formulario POST, conserva la cookie propia y devuelve un
mensaje al opener. Comprueba que Node y la API Nido no están disponibles y que CORS
sigue bloqueando lecturas de otro origen aunque la página pida `webSecurity=no`.
Se comprueban título de origen, cierre sin destruir el opener y rechazo de file:.

Una fixture bajo el origen Google interceptado localmente prueba la detección de
su URL de rechazo y la ayuda. El destino externo se captura con un doble de shell:
cancelar no abre nada y confirmar solo abre la URL fija de cuentas Google, nunca
el parámetro `continue` no confiable. No se usaron cuentas Google ni se ha demostrado
que el servidor real acepte Nido. Es compatibilidad de popups, no certificación.

Se estabiliza la comprobación de barridas estrictas: el runner observa que termina
la llamada nativa real de limpieza antes de enumerar IndexedDB/Cache, evitando una
carrera de enumeración concurrente con borrado. No se desactivan guardas ni sandbox.

La fixture también comprueba la ayuda una sola vez en un popup rechazado, incluso
tras recargar, y que las URLs de identidad no se añaden al historial opcional.
