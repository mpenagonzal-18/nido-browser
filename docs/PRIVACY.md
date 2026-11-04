# Privacidad de Nido

## Política actual (desde 0.1.2)

Por petición del usuario, **las cookies propias y el almacenamiento están activados
para todas las páginas y se conservan entre reinicios**. Ya no es necesario activar
Temporal por cada sitio. Este cambio sustituye el modo estricto por defecto de
0.1.0/0.1.1; sus garantías de borrado automático no describen el modo normal actual.

Nido no incluye telemetría, analytics, crash reporter, sincronización, fuentes de
red ni auto-update. La página de inicio solo usa recursos locales. No descarga
filtros ni abre asistentes de IA automáticamente. Las páginas abiertas pueden
iniciar sus propias peticiones y conexiones de fondo.

## Cookies, sesiones y almacenamiento de navegación

El modo **Conservar entre reinicios**, seleccionado por defecto, usa
`persist:nido-browsing`, separado de la interfaz y de la sidebar. Cookies propias,
Local/Session Storage, IndexedDB, Cache API y caché HTTP funcionan con las reglas de
Chromium. Los datos persistentes se guardan en el perfil local de Nido. Session
Storage y cookies que la web marque como de sesión pueden caducar al finalizar su
contexto; no se modifican las caducidades impuestas por los sitios. Un servicio
puede cerrar sesiones, revocar credenciales o exigir que vuelvas a iniciar sesión.

Cerrar una pestaña, visitar otro dominio o suspender una vista no borra el login de
este perfil. Al salir se fuerzan las escrituras pendientes, sin vaciar cookies ni
almacenamiento persistente. Se conserva únicamente información local: no se envía
ni se sincroniza con Nido ni con una cuenta propia del navegador.

**Las cookies de terceros siguen bloqueadas** en peticiones/respuestas mediante
`webRequest`. La política compara esquema, sufijos públicos y privados, el frame
solicitante y su cadena de ancestros. Los contextos sin procedencia verificable
fallan de forma restrictiva. `document.cookie`, Cookie Store y almacenamiento se
restringen en frames de otro origen; los documentos principales propios pueden
usarlos sin una lista de excepciones. Un dominio visitado directamente es un sitio
propio: el bloqueo de terceros no impide tracking mediante redirecciones de primer
nivel ni elimina cookies de sitios que hayas visitado legítimamente.

En el modo normal no se purgan cookies por el mero hecho de que ya no quede una
pestaña abierta de su dominio; hacerlo rompía la conservación de inicios de sesión.
Los filtros de cabeceras y las guardas de documentos siguen aplicándose antes de
aceptar o enviar cookies. Los borrados de datos son asíncronos.

### Controles globales

En Ajustes → Cookies y datos de todas las páginas:

- **Conservar entre reinicios:** comportamiento normal descrito arriba.
- **Borrar al salir:** cookies y almacenamiento globales en `nido-session`, una
  partición en memoria. Se conservan al cerrar pestañas y se eliminan al cerrar Nido.
- **Privacidad estricta:** perfil en memoria `nido-browsing`, con cookies bloqueadas
  por defecto y Local/Session Storage, IndexedDB y Cache API denegados y limpiados
  cada 15 segundos. Las antiguas excepciones temporales por sitio siguen disponibles
  solo en este modo avanzado; no se requieren para la navegación normal.

Cambiar de modo cambia la sesión utilizada por las vistas. **Elegir otro modo no
borra los datos ya guardados en el perfil permanente.** Para eliminarlos usa
**Borrar cookies y datos de sitios**, que cierra sesiones de navegación y limpia
cookies, almacenamiento, caché y autenticación de los perfiles de navegación. La
sidebar de IA tiene su propio botón y no se borra con este control. Las páginas
recargadas pueden crear nuevas cookies propias después del borrado.

El historial de URLs de Nido sigue desactivado por defecto. Si lo activas se guarda
solo en `userData/history.json`, hasta 5.000 entradas. Los almacenes y la caché de
Chromium pueden contener dominios, recursos y datos de páginas aunque ese historial
esté desactivado. Los ajustes y las rutas de audio/fondo son JSON locales; exportar
ajustes no exporta cookies ni bases de datos de las webs.

## Seguridad y compatibilidad

Las vistas remotas mantienen sandbox, aislamiento de contexto, seguridad web y
Node desactivado en sus páginas. No reciben el puente IPC de la interfaz. Los
preloads aislados se ejecutan también en subframes para aplicar las guardas; las
pruebas verifican que esos frames no tienen `require`, `process` ni la API interna.

Los permisos están denegados por defecto y los tipos admitidos requieren prompt
nativo por sitio. En la sidebar solo se permite solicitar audio para dictado.
Service workers permanecen desactivados en las vistas de navegación, con bloqueo
adicional de las peticiones de sus scripts. Esto puede impedir algunas funciones
sin conexión. Desde 1.0.0 se permiten descargas con diálogo nativo de guardado.

Se envían DNT/GPC (los sitios pueden ignorarlos), se reduce Referer al origen y se
usa UA estándar de Chrome. WebRTC aplica `disable_non_proxied_udp`; no oculta tu IP
pública. No se ignoran errores TLS. Se fuerza HTTPS salvo servicios locales o
puertos explícitos; HTTP muestra aviso. Algunos OAuth, CAPTCHA o controles contra
navegadores embebidos pueden seguir impidiendo el acceso, aunque las cookies estén
activadas. No se copian credenciales del navegador del sistema.

## Bloqueo de banners y vídeo

EasyList y EasyPrivacy se empaquetan localmente. Solo el botón de actualización
manual descarga copias oficiales desde raw.githubusercontent.com, con TLS verificado.
Se bloquean recursos de publicidad/rastreo y se aplica CSS, sin ejecutar scriptlets.
La cosmética inicial puede no cubrir banners añadidos dinámicamente.

Desde 1.0.2 YouTube tiene un filtro propio empaquetado. Su preload con sandbox y
context isolation instala una función limitada en el mundo de la página mediante
`contextBridge.executeInMainWorld`. No expone Node, IPC ni APIs de Nido a la web.
El código elimina `playerAds`, `adPlacements`, `adSlots` y `adBreakHeartbeatParams`
de los objetos iniciales y de JSON/texto de `fetch`/XHR en endpoints YouTube
`/youtubei/v1/player`, `/youtubei/v1/next` y `/watch?pbj=...`. Conserva vídeo,
subtítulos, errores y metadatos HTTP; no inicia ninguna petición adicional. No
intercepta otros endpoints ni respuestas binarias. El recorrido tiene límites de
profundidad, tamaño y nodos. CSS local oculta contenedores publicitarios conocidos,
sin ocultar avisos de enforcement ni controles de reproducción.

El observador del aviso antibloqueo permanece en el mundo aislado y solo examina
superficies conocidas y visibles. El main valida esquema, dominio, frame y emisor.
Si aparece el aviso, se omite el motor para YouTube y sus CDN, se restaura fetch/XHR,
se retira el CSS y se desregistra el preload para documentos nuevos. Se recarga una
vez la pestaña afectada e intenta restaurar posición. La pausa vive en memoria y
permite anuncios deliberadamente para continuar; la barra lo indica. La recarga es
una petición automática derivada de una página abierta por el usuario. No cambia
permisos ni borra cookies/almacenamiento. Reactivar desde la barra recarga la página.

Desactivar **Bloquear anuncios de YouTube (pausar si impide reproducir)** excluye
YouTube por completo. Las exclusiones manuales prevalecen. La sidebar de proveedores
sigue excluida como antes. No se descarga código de filtrado desde Internet; el motor
no ejecuta scriptlets de terceros. El contador solo incluye bloqueos de red, no los
campos del reproductor eliminados. No se ha probado contra YouTube en vivo en este
entorno: cambios del servicio, formatos nuevos o publicidad integrada en el flujo
pueden eludir el filtro. No se promete bloqueo universal ni evitar toda detección.

El idioma de Nido se guarda localmente, sin peticiones de traducción. Cambiarlo no
modifica el idioma, cookies ni almacenamiento de las páginas visitadas.

## Sidebar de IA

Solo los asistentes usan `persist:ai-sidebar`. Es independiente del perfil normal
persistente, de los perfiles en memoria y de las pestañas de navegación. Cada
proveedor tiene una vista conservada al ocultarlo o cambiar de proveedor.

Cookies y almacenamiento se conservan para los dominios de proveedores configurados
y sus subdominios. No se autoriza automáticamente un dominio padre ni dominios
parecidos (`claude.ai.evil.test`). Se filtran Cookie/Set-Cookie hacia dominios ajenos,
se eliminan cookies no autorizadas tras `cookies.changed` y se purgan cookies ajenas
al arrancar. Se bloquean frames de terceros no configurados. Los proveedores pueden
cargar recursos de terceros sin cookies. Comparten la partición de IA entre sí con
el aislamiento de orígenes de Chromium; no hay una sesión distinta para cada proveedor.

Cambiar o retirar proveedores limpia la sesión de IA; el manifiesto local de
dominios detecta también cambios externos del JSON. El botón de borrado de IA cierra
vistas y limpia cookies, almacenamiento, caché y autenticación de esa sesión. Las
barridas de navegación no afectan a los asistentes. Descargar vistas inactivas
puede perder borradores no enviados.

Los asistentes son terceros con políticas propias. Abrirlos envía su tráfico normal
y tu IP; escribirles envía lo que decidas. Nido nunca envía automáticamente contenido,
URL o selecciones de otras páginas. Las acciones del menú contextual solo copian al
portapapeles. Gemini puede fallar por políticas de Google y por necesitar dominios
de autenticación no autorizados. La alternativa es el navegador habitual o una UI
local como Open WebUI; no se garantizan logins de servicios externos.

## Lo que NO se garantiza

- **Anonimato/fingerprinting:** no se uniformizan completamente Canvas, WebGL,
  AudioContext, fuentes, resolución, tiempos ni todas las propiedades del equipo.
- **Tracking por IP o cuentas:** servidores y redes pueden correlacionar peticiones;
  Nido no es una VPN ni Tor. Iniciar sesión identifica al usuario ante esa web.
- **ETag y otros identificadores:** la caché y los servidores pueden conservar
  identificadores en cabeceras, URLs, TLS, respuestas o registros externos. No se
  eliminan todas las cabeceras condicionales; bloquear cookies no evita todo tracking.
- **Borrado forense:** no se controlan swap, backups, volcados, malware ni registros
  del sistema. El cierre abrupto puede saltarse limpiezas. Los errores de borrado se
  registran y no se presentan como éxito. El modo permanente guarda datos en disco
  deliberadamente hasta su expiración o borrado manual.
- **Compatibilidad universal:** los controles antiabuso y políticas de terceros
  pueden rechazar Electron. Las pruebas locales no equivalen a una auditoría ni a
  validar cuentas reales de todos los servicios.

## Descargas y menús (1.0.0)

Las sesiones de navegación y de IA entregan sus descargas al gestor del proceso
principal, conservando sus respectivas reglas de cookies y aislamiento. Un diálogo
nativo pide la ruta; los nombres del servidor se reducen a un nombre base para la
ruta sugerida. Nunca se ejecutan ni abren archivos automáticamente. El IPC de las
acciones valida ID y operación con Zod y solo abre una ruta registrada de un archivo
completado; no acepta rutas arbitrarias desde el renderer.

Nombre, progreso y ruta elegida se guardan solo en memoria. No existe historial de
descargas en disco ni reanudación tras reiniciar. Se limita la lista de entradas
finalizadas para acotar memoria; las activas permanecen visibles. Borrar la lista
no borra archivos. Los archivos descargados y posibles archivos parciales son
escrituras deliberadas en disco, incluso en modo estricto, y no se borran mediante
la limpieza de cookies. Al cerrar se cancelan transferencias activas; la ventana
pide confirmación antes de salir si hay alguna. El sistema o servidor puede limitar
la reanudación y el tratamiento de archivos parciales.

Copiar solo escribe al portapapeles; «Pegar y acceder», abrir/buscar selección y
«Guardar como» son acciones explícitas. No se visita un enlace ni se descarga un
archivo por abrir su menú. Enlaces/imágenes del menú solo admiten HTTP(S). Se mantiene
la acción manual de copiar para la IA, sin enviar contenido a asistentes. Los temas
son CSS local y no descargan imágenes, fuentes ni paquetes de estilos.

## Compatibilidad de autenticación (1.0.3)

Los popups OAuth conservan la sesión de su pestaña y su opener, sin una API Nido ni
Node en el mundo remoto. No se ejecuta un cliente OAuth propio ni se capturan códigos
o tokens: el sitio valida sus propios mensajes y estados. El título nativo muestra
el origen. Los popups se destruyen antes de limpiar los perfiles al salir y una
pestaña con un popup abierto no se suspende. No se guardan entradas propias de
historial para las ventanas emergentes ni para futuras visitas al origen exacto de
cuentas Google; los datos persistentes y caché del perfil normal siguen vigentes.

Se excluye `https://accounts.google.com` del filtrado de anuncios y de cosmética,
incluidos sus recursos, para no romper sus verificaciones. La exclusión no permite
cookies de terceros ni desactiva sandbox, CSP del sitio, aislamiento, CORS o TLS.
No se agregan excepciones para Google a las cookies de la sidebar de IA.

El rechazo de Google puede obedecer a su política sobre navegadores integrados;
no equivale a un error TLS ni se presenta como corregido o certificado por Google.
La ayuda de Nido solo abre el navegador del sistema si el usuario elige hacerlo,
y siempre hacia `https://accounts.google.com/`, ignorando `continue` y parámetros
no confiables. El inicio de sesión externo permanece allí: no se importa, comparte
ni copia a Nido. También hay que abrir la web destino e iniciar el flujo en ese
navegador si se quiere usar allí. No se extraen cookies, credenciales ni perfiles.
