# Privacidad de Nido

Nido no incorpora analytics, crash reporter, fuentes de red, auto-update,
sincronización ni descarga automática de filtros. La página de inicio solo usa
recursos empaquetados. No inicia proveedores de IA hasta que abres su panel.
Chromium se inicia con servicios de fondo, sincronización, componentes remotos,
predicción y pings desactivados en lo que permiten sus flags. Esto no equivale a
una auditoría completa de cada versión de Chromium ni a anonimato de red.

## Navegación

Las pestañas comparten una sesión **en memoria** (`nido-browsing`, sin `persist:`)
con caché de red exclusivamente en memoria, sin directorio persistente. Por defecto se eliminan `Cookie` y `Set-Cookie`, se
neutralizan `document.cookie` y Cookie Store y se escucha `session.cookies.changed`:
cualquier cookie que aparezca se elimina mediante la API nativa. Esta eliminación
es asíncrona; no se promete que una cookie nunca exista durante un breve intervalo
en memoria. El filtrado de cabeceras actúa antes de su envío/aceptación.

El interruptor opcional permite **solo cookies propias temporales**. La política de
red compara sitios con esquema y lista de sufijos públicos, incluidos sufijos
privados como `github.io`; no confunde un subdominio con un dominio de otro usuario.
Las peticiones/respuestas de terceros no envían ni aceptan cookies, aunque ese
tercero tenga abierta otra pestaña propia. Los contextos sin origen o frame identificable
se deniegan, y se comprueba también la cadena de ancestros del frame. Los iframes de otro origen no pueden usar `document.cookie` ni Cookie
Store; también se deniegan cookies JS en iframes del mismo sitio pero distinto
origen (una restricción más fuerte). El evento de cookies elimina dominios sin
contexto propio abierto. No aporta por sí solo el contexto que originó una escritura;
por eso no sustituye a los filtros de red ni a las guardas de los documentos.
Cambiar el interruptor limpia la sesión y recarga las pestañas.

En modo estricto, `localStorage`, `sessionStorage`, IndexedDB y Cache API se deniegan en los documentos
de las pestañas con `SecurityError`, incluso cuando se permiten cookies propias.
Los preloads aislados se ejecutan también en subframes, con sandbox, aislamiento y
Node desactivado en el contenido remoto. Se desactivan service workers en esas
vistas, se retira su API de los documentos y se bloquean las peticiones nativas de
sus scripts (`Service-Worker`) como segunda barrera.

Cada **15 segundos** se ejecuta `session.clearStorageData()` en la
sesión estricta de pestañas. La caché HTTP en memoria no se vacía en esa barrida:
esto evita volver a descargar recursos de vídeo y otros recursos reutilizables.
Cache API, IndexedDB y los otros almacenes estrictos sí se limpian. Si el usuario activó cookies propias, la barrida excluye solo
las cookies: los demás almacenes siguen limpiándose. Los preloads conservan
referencias nativas a Local/Session Storage únicamente en su mundo aislado para
limpiarlas con el mismo intervalo; no dependen de los getters alterables de la web.
Al cerrar una pestaña se destruye su vista y se limpian los orígenes visitados,
incluidos subframes y navegaciones anteriores. Como las pestañas comparten sesión,
esto puede cerrar la sesión de otra pestaña del mismo sitio; Chromium también
puede agrupar el borrado de cookies por dominio. La caché de red se vacía completa.
Antes del cierre normal del navegador se destruyen las vistas y se **espera** al
borrado completo de almacenamiento, caché y autenticación de navegación. La sidebar y el modo Temporal
quedan fuera de estas barridas periódicas.

La denegación de APIs y las barridas pueden romper aplicaciones que dependan de
almacenamiento o funcionamiento sin conexión. Código de workers dedicados u otras
superficies de Chromium puede alcanzar almacenamiento entre barridas: estas
medidas son defensa en profundidad, no una prueba de imposibilidad de toda
escritura. El cierre abrupto, un fallo o matar el proceso puede saltarse la limpieza
de cierre; la partición de navegación sigue siendo en memoria. No se guarda una
lista de pestañas ni historial por defecto.

### Compatibilidad temporal por sitio (desde 0.1.1)

El botón **Estricto / Temporal** permite autorizar explícitamente un dominio y sus
subdominios para poder iniciar sesión en aplicaciones que necesitan almacenamiento.
La lista autorizada se guarda en ajustes, vacía por defecto. Las cookies y datos de
la web no se guardan en ese JSON ni se restauran al reiniciar.

Las vistas autorizadas usan otra partición **en memoria**, `nido-compatible`, separada
de la navegación estricta y de `persist:ai-sidebar`. Se permiten cookies propias,
Cookie Store y almacenamiento (Local/Session Storage, IndexedDB, Cache API) en el
documento propio autorizado y frames del mismo origen. Los documentos de terceros
siguen restringidos y sus cookies se filtran en la red. Service workers siguen
desactivados. No se aplica la barrida de 15 segundos al almacenamiento autorizado,
porque borrarlo durante el login rompe tokens y sesiones de las propias aplicaciones.

Las pestañas compatibles comparten esa partición con el aislamiento de orígenes de
Chromium; no es una partición independiente para cada dominio. Cerrar una pestaña
del mismo sitio no borra la sesión de las otras. Se limpian sus orígenes al cerrar
la última pestaña de la regla autorizada, al abandonar ese contexto o volver a
Estricto, y toda la partición al salir. Las pestañas suspendidas siguen contando
como abiertas. Los flujos OAuth que cambian a dominios no autorizados pueden fallar;
no se autorizan nuevos dominios de autenticación de forma automática.

La caché HTTP continúa solo en memoria y se elimina al limpiar un contexto y al
salir, sin vaciarla cada 15 segundos. Esto mejora la reutilización de recursos,
pero no garantiza una velocidad concreta de YouTube ni elimina su tráfico propio.

DNT y GPC se envían como señales (los sitios pueden ignorarlas). Referer se reduce
al origen. Se usa un User-Agent estándar de Chrome, sin marca Electron/Nido.
WebRTC aplica `disable_non_proxied_udp`; esto reduce exposición de interfaces, no
oculta tu IP pública al servidor. No es una VPN ni Tor. Los permisos se deniegan
por defecto y solo los tipos implementados pueden solicitar confirmación por
sitio. No se aceptan errores TLS. HTTP se actualiza a HTTPS salvo localhost y
puertos explícitos; no hay fallback silencioso. Los servicios locales HTTP con
puerto conservan HTTP y muestran aviso. Por ahora no hay gestor de descargas:
las descargas de contenido web están bloqueadas.

El historial, si lo activas, se guarda únicamente en `userData/history.json`
(hasta 5.000 entradas). Desactivarlo detiene futuras entradas; el botón Borrar
historial elimina las anteriores. Ajustes, rutas de archivos seleccionados y
filtros actualizados son datos locales persistentes. La música solo recuerda
rutas al activar Recordar lista; nunca copia los archivos de audio.

No se promete ausencia forense de rastros: el sistema operativo, swap, copias de
seguridad y registros del equipo quedan fuera del control de Nido. Chromium puede
mantener metadatos técnicos de la aplicación, aunque las particiones de navegación
no sean persistentes. Protege y cifra el disco del equipo si lo necesitas.

## Banners y vídeo

Las copias empaquetadas de EasyList y EasyPrivacy bloquean peticiones de publicidad
y rastreo; las reglas CSS ocultan banners. Solo el botón de actualización descarga
listas, desde el repositorio oficial en raw.githubusercontent.com con TLS. Nunca
se ejecutan scriptlets de los filtros. La cosmética se calcula tras cargar el DOM:
algunos banners de aplicaciones dinámicas pueden no tener regla aplicable.
No se bloquean peticiones de tipo `media`. Esto no permite identificar de forma
perfecta anuncios de vídeo que usen scripts/XHR compartidos con otros recursos.

Los dominios youtube.com, youtu.be, googlevideo.com, ytimg.com y
youtube-nocookie.com y sus subdominios están excluidos por defecto. En esas páginas,
incluso sus peticiones a otros dominios evitan el motor completo: no hay CSS,
scriptlets, extracción de DOM ni preload **del bloqueador**. El preload que impide
cookies sigue aplicándose; puede impedir funcionalidades de YouTube por privacidad.
La lista de exclusión es editable. El contador por pestaña solo mide bloqueos de
red y vive en memoria. El botón ◈ desactiva el bloqueo del hostname actual durante
esta ejecución; recarga para retirar CSS ya aplicado.

## Sidebar de IA

Solo la sidebar usa `persist:ai-sidebar`, completamente separada de las pestañas.
Permite cookies para los hostnames configurados y sus subdominios (comprobación
con límite de etiqueta; `claude.ai.evil.test` no está permitido). No extiende el
permiso al dominio padre: `gemini.google.com` no autoriza `google.com`. Cookies
a dominios ajenos se eliminan en peticiones/respuestas y tras cambios de cookie.
Antes de abrir vistas se purgan también cookies ajenas que pudiera contener un
perfil anterior, conservando las cookies de los proveedores actuales.
Los frames de terceros no configurados se bloquean para impedir almacenamiento
local e IndexedDB de esos frames. Los recursos de terceros pueden descargarse sin
cookies. Cada vista puede conservar almacenamiento de su proveedor, como cookies,
localStorage, IndexedDB y service workers. Todos los proveedores configurados
comparten esta partición entre sí, con el aislamiento de orígenes de Chromium;
no hay una partición distinta para cada proveedor.

Un manifiesto local de dominios (`ai-domains.json`) detecta también proveedores
retirados al editar el JSON fuera de la aplicación; sus datos se limpian al arrancar.
Cambiar o retirar un proveedor limpia **toda** la sesión de IA para evitar conservar
dominios que dejan de estar autorizados; puede cerrar las demás sesiones. El botón
Borrar datos cierra las vistas, limpia cookies, almacenamiento, caché y autenticación.
Ocultar la sidebar o seleccionar otro proveedor mantiene las vistas y conversaciones
cargadas. Descargar vistas inactivas es opcional y puede perder borradores no enviados.

Claude, OpenAI/ChatGPT, Google/Gemini, Perplexity y Mistral son servicios de terceros
con políticas propias. Al abrirlos envías tu IP y las peticiones normales de sus
páginas; al escribirles envías el contenido que decidas. Nido nunca transmite
contenido, selección ni URL de una pestaña a un asistente por sí mismo. Las dos
acciones de menú contextual solo escriben en el portapapeles local: pegarlo en un
asistente requiere otra acción tuya. La sidebar permite solicitar **solo audio**
con confirmación nativa explícita para dictado; otros permisos quedan denegados.

La política estricta y los bloqueos de navegadores embebidos pueden impedir OAuth
y CAPTCHA. En particular, Gemini suele depender de accounts.google.com y cookies
.google.com, excluidas deliberadamente. La alternativa más cercana es usar el
navegador habitual para ese servicio o configurar un proveedor local como Open WebUI
(`http://localhost:3000`). Añadir dominios de autenticación conscientemente como
proveedores amplía la lista autorizada, pero no garantiza compatibilidad OAuth;
no se copian cookies del navegador del sistema ni se abre una excepción en las
pestañas normales. Ollama suele ofrecer una API: utiliza una interfaz web local
sobre ella, no su endpoint JSON como si fuera una conversación.

## Peticiones salientes

Nido no tiene tareas propias de red al arrancar. Una vez que navegas o abres un
asistente, esas páginas pueden solicitar imágenes, scripts, APIs, WebSockets,
recursos de terceros incluso en segundo plano. La sidebar puede utilizar service
workers de sus proveedores; las pestañas de navegación los desactivan. Los filtros y
las políticas de cookies no son un cortafuegos que impida todas esas conexiones.
La actualización manual de listas es la única descarga propia de la aplicación.
Las instalaciones de npm y electron-builder también necesitan red durante el
desarrollo y empaquetado, no durante el uso de la página de inicio.

## Lo que estas medidas NO garantizan

- **Fingerprinting:** no se uniformizan ni bloquean completamente Canvas, WebGL,
  AudioContext, fuentes del sistema, resolución, tiempos ni todas las propiedades
  del equipo. Un User-Agent genérico no impide reconocer un dispositivo.
- **Seguimiento por IP:** servidores, proveedores de red y recursos de terceros
  pueden correlacionar conexiones por IP, tiempos o cuentas. Nido no es una VPN,
  no cambia la dirección pública y WebRTC limitado no equivale a anonimato.
- **ETag y otros identificadores:** vaciar la caché reduce su persistencia, pero no
  demuestra ausencia de seguimiento mediante ETag, Last-Modified, URLs, cabeceras,
  TLS, respuestas del servidor o identificadores mantenidos en memoria. No se
  eliminan sistemáticamente todas las cabeceras condicionales. Los servidores
  conservan sus registros aunque se borren los datos locales.
- **Identidad voluntaria:** iniciar sesión, permitir cookies propias, escribir un
  identificador o enviar contenido a una web permite que ese servicio te reconozca.
  DNT y GPC son señales que los sitios pueden ignorar.
- **Borrado forense y fallos:** no se controla swap, copias de seguridad, volcados,
  malware ni registros externos. Las operaciones de borrado pueden fallar o competir
  con actividad nueva; sus errores se registran y no se presentan como éxito.

Las pruebas locales cubren rutas concretas y la versión de Electron fijada, no
constituyen una auditoría independiente ni garantizan todas las versiones futuras.
