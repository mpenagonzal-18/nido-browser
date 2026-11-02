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
