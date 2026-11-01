# Privacidad de Nido

Nido no incorpora analytics, crash reporter, fuentes de red, auto-update,
sincronización ni descarga automática de filtros. La página de inicio solo usa
recursos empaquetados. No inicia proveedores de IA hasta que abres su panel.
Chromium se inicia con servicios de fondo, sincronización, componentes remotos,
predicción y pings desactivados en lo que permiten sus flags. Esto no equivale a
una auditoría completa de cada versión de Chromium ni a anonimato de red.

## Navegación

Las pestañas comparten una sesión **en memoria** (`nido-browsing`, sin `persist:`)
con caché de disco desactivada. localStorage e IndexedDB pueden funcionar durante
la sesión, pero no se conservan tras terminar el proceso. Las cookies de petición
y respuesta se eliminan y `document.cookie` se neutraliza en todos los frames
mediante un preload de sesión. La API Cookie Store tampoco está disponible. El
interruptor opcional permite cookies temporales; cambiarlo limpia el almacenamiento
y recarga pestañas. No se guarda ninguna lista de pestañas ni historial por defecto.

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
service workers y recursos de terceros incluso en segundo plano. Los filtros y
las políticas de cookies no son un cortafuegos que impida todas esas conexiones.
La actualización manual de listas es la única descarga propia de la aplicación.
Las instalaciones de npm y electron-builder también necesitan red durante el
desarrollo y empaquetado, no durante el uso de la página de inicio.
