# Revisión final de privacidad y almacenamiento

Revisión local del 1 de noviembre de 2026. No sustituye una auditoría independiente.

Se revisaron las sesiones y sus listeners compartidos con el bloqueador, preloads,
IPC y esquemas, ciclo de vida de vistas y cierre, persistencia de proveedores,
validación de ajustes, recursos locales, dependencias, empaquetado y workflows.

Problemas corregidos:

- Activar cookies temporales permitía cabeceras de terceros. Ahora se exige un
  contexto propio verificable, con sufijos públicos/privados, esquema y ancestros;
  los contextos sin frame verificable se deniegan.
- Los preloads no se ejecutaban en los iframes de otras páginas. Se habilita su
  ejecución en subframes conservando sandbox y aislamiento y sin exponer Node.
  Se contrastó el comportamiento con las preferencias del renderer en el código
  oficial de Electron 45.2.1; la prueba real verifica que el iframe no recibe
  `require`, `process` ni el puente interno, y que no escribe cookies de terceros.
- Se permitía almacenamiento de documentos durante la sesión y faltaba limpieza
  por pestaña. Ahora sus APIs se deniegan, hay barridas cada 15 segundos y se
  limpian todos los orígenes visitados al cerrar una pestaña.
- Una sesión persistente podía conservar cookies ajenas de un perfil anterior.
  Se purgan antes de crear vistas, sin borrar las cookies autorizadas del proveedor;
  la integración simula y comprueba esa recuperación entre procesos.
- Se confió inicialmente en la destrucción de ventanas antes de limpiar. El cierre
  normal ahora espera al borrado después de destruir los productores remotos.
- Comprobar solo getters de página podía ocultar datos reales. La integración usa
  un mundo aislado del test runner para sembrar e inspeccionar los almacenes nativos.

Evidencia: 57 pruebas Vitest, ESLint, TypeScript estricto e integración Electron de
cookies por cabecera/JS/Cookie Store, almacenamiento, terceros, permisos, exclusiones
de vídeo, limpieza periódica y por origen, cierre real y persistencia selectiva de
la sidebar. Los datos del proveedor se conservan mientras los del navegador se borran.

Límites pendientes: inicios de sesión externos reales, interacción gráfica en
Windows/macOS, sonido físico y firma de instaladores. La CI y el empaquetado remoto
se verificaron al publicar v0.1.0; véase PUBLICATION.md. Las limpiezas son asíncronas y no protegen
contra todas las formas de fingerprinting, identificación por IP/ETag, fallos del
motor o rastros del sistema operativo; véase PRIVACY.md. Las aplicaciones que
requieren almacenamiento u offline pueden dejar de funcionar con esta política.

## Corrección de compatibilidad 0.1.1

Los reportes de login y carga se relacionaron con denegar todo almacenamiento y
vaciar la caché HTTP global cada 15 segundos. Se conserva el modo estricto y se
ofrece una excepción explícita por sitio en otra partición en memoria. Las cookies
de terceros y service workers permanecen bloqueados, la barrida estricta no toca
la sesión autorizada y se limpia al cerrar la última pestaña de la regla. El cambio
de modo y las redirecciones recrean la vista con la sesión correcta. Las pestañas
suspendidas no se recrean por un cambio de regla hasta que vuelvan a activarse.

La barra ahora selecciona la dirección al primer clic y respeta los clics posteriores
para editarla. Se verificó con eventos reales del ratón de Electron, también al
volver del contenido remoto. Se probaron login local, recarga, barrida de almacenamiento,
terceros, último cierre y reutilización real de caché HTTP exclusivamente en memoria.
Lint, tipos, 59 pruebas e integración de tres procesos: correctos. No se usaron
cuentas reales de X ni se midió YouTube remoto; no se promete saltar controles externos.

## Cambio global solicitado en 0.1.2

Se sustituye el modo estricto por defecto por cookies y almacenamiento propios
persistentes para todos los sitios. El usuario confirmó que quiere conservarlos
entre reinicios. Se documenta expresamente que este modo escribe datos en disco y
no cumple las antiguas garantías de navegación efímera. La UI ya no requiere activar
excepciones por cada sitio; conserva modos Borrar al salir y Estricto como opciones.

Se comprobó que cerrar pestañas o cambiar de dominio no borra el login normal,
que el perfil persistente se restaura en un proceso nuevo, que el perfil en memoria
se vacía al salir y que el borrado manual no afecta a los asistentes. Se mantienen
los filtros de terceros y la seguridad de las vistas. Lint, TypeScript y 60 pruebas
unitarias correctos, además de la integración de tres arranques. El test de iframe
espera al estado habilitado del control y limita la espera de mensajes para no
depender del orden de entrega del IPC ni bloquear indefinidamente el runner.

## Revisión de 0.1.3

La solicitud actual sustituye la exclusión predeterminada de YouTube por filtrado
con pausa automática. Solo el preload propio de pestañas puede avisar: no se expone
IPC al sitio y el main valida dominio, frame, emisor y esquema Zod. El detector no
usa texto arbitrario de la página ni avisa más de una vez; la pausa precede a la
recarga y se conserva en memoria. No se inyectan CSS ni scriptlets en YouTube.
Las exclusiones manuales prevalecen; desactivar la opción excluye YouTube entero.

Se conserva el perfil persistente y la sesión de IA aislada. El idioma solo modifica
la UI local. No se añaden dependencias, peticiones de traducción ni telemetría.
74 pruebas unitarias, lint, tipos e integración real de tres arranques correctos.
La fixture HTTPS local también ejercita el preload/IPC de producción y prueba una
única recarga sin borrar login. No se validó YouTube en vivo; no se promete bloquear
todos sus anuncios. Bundle renderer: 26.400 bytes, 9.161 gzip; CSS: 8.781 bytes.

## Revisión de v1.0.0

Las diez paletas y gradientes son constantes CSS sin dependencias ni red. Los campos
nuevos tienen valores predeterminados para conservar perfiles antiguos, imágenes,
acentos y sesiones. La paleta se aplica también a barras y paneles en modo claro y
oscuro. El renderer conserva CSP, sandbox y context isolation.

Los menús reciben parámetros nativos de Electron. Enlaces e imágenes solo abren
HTTP(S); el portapapeles se valida mediante el parser de navegación antes de «Pegar
y acceder». Abrir un menú no navega ni descarga. Las acciones sobre pestañas usan
sus IDs locales y no índices que puedan quedar obsoletos. Se corrigió además una
carrera al cerrar una vista mientras su carga estaba pendiente.

El gestor reemplaza la antigua denegación total de descargas. La ruta se elige en
el diálogo nativo; el nombre sugerido se limita a un basename. El IPC valida ID y
acción y solo abre archivos completados registrados. No abre automáticamente ni
persiste un historial. El listado finalizado está acotado y se cancelan transferencias
al salir. Cancelar el prompt de salida conserva la última pestaña, pues solo se
elimina después de confirmar el cierre. El proceso habitual de limpieza de perfiles
en memoria y escritura de cookies persistentes permanece vigente.

79 pruebas unitarias y el smoke de tres procesos pasan, incluidas descargas con
cookie propia autenticada, pausa/reanudación íntegra, cancelación y cierre real de
la última pestaña. El ejecutable Linux empaquetado arranca. No hay nuevas dependencias.

## v1.0.2 — corrección del bloqueo de YouTube

Se reconoce la carencia anterior: filtrar red y pausar ante un aviso no retira los
datos publicitarios del reproductor. Se añade un filtro empaquetado en su mundo de
página, sin Node/IPC ni fuentes de código remotas. Solo inspecciona globals concretos
y endpoints de YouTube player/next/PBJ, y elimina cuatro nombres de campos conocidos.
No modifica streams, subtítulos ni estado de reproducción; respeta respuestas no
relacionadas, cuerpos binarios, errores, estado y metadatos de fetch/XHR.

Las estructuras se recorren con límites y protección frente a ciclos/getters que
fallen. No se usa eval ni se exponen APIs privilegiadas. La pausa restaura los hooks,
retira CSS y desregistra el preload; las exclusiones evitan instalarlo. La interfaz
explica que PAUSA permite publicidad y que el contador mide solo bloqueos de red.
No se promete bloqueo universal: las pruebas locales no equivalen a YouTube en vivo.

Una ejecución del smoke agotó el tiempo antes de llegar a YouTube. Se añadieron
diagnósticos del último paso/script en el timeout; la reejecución completa pasó,
incluida la fixture PBJ. Se mantienen los límites de tiempo y el sandbox.
