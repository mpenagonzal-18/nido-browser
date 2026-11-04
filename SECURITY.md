# Seguridad

Este es un proyecto inicial, sin auditoría independiente. Actualiza Electron y
revisa las notas de seguridad antes de distribuir una versión. Se da soporte a
la versión más reciente del repositorio.

No publiques secretos, cookies ni pruebas de explotación con datos personales
en issues públicos. Usa la opción **Report a vulnerability** de GitHub cuando el
mantenedor habilite los avisos privados. Si no está disponible, abre un issue sin
detalles sensibles solicitando un canal privado.

Las páginas remotas usan sandbox, aislamiento de contexto, seguridad web y Node
desactivado. No tienen el preload ni la API de la interfaz. Los permisos parten
de denegación; la confirmación es nativa. No se ignoran errores de certificados.
Los esquemas externos y la apertura de archivos desde webs se bloquean.

Electron no garantiza compatibilidad con todos los sistemas antiautomatización,
DRM o flujos OAuth. Los instaladores de ejemplo no están firmados ni notarizados;
una distribución pública de confianza necesita certificados de cada plataforma.

El filtro de YouTube instala código local limitado en el mundo de la página para
retirar campos publicitarios de sus respuestas. Esa función no tiene acceso a Node
ni IPC. El aviso antibloqueo se detecta desde el mundo aislado y el main valida su
emisor/frame/dominio. Las exclusiones y la pausa retiran esa intervención. Las
páginas pueden cambiar o evitar el filtrado de su propio JavaScript; no se considera
una frontera de seguridad ni se garantiza bloquear todos los formatos de publicidad.

Las ventanas OAuth usan preferencias forzadas seguras incluso ante opciones
`window.open` maliciosas, sin preload de la interfaz. Admiten HTTP(S) y about:blank
para el arranque heredado, y deniegan esquemas como file, data y javascript. Las
restricciones de Chromium, HTTPS, CORS y validación de certificados permanecen.
La ventana interna no permite crear ventanas desde su contenido. Los popups muestran
su origen en el título nativo, están acotados y se destruyen antes de limpiar datos.
Google puede rechazar un navegador integrado aunque cumpla estas medidas: no se
falsea una certificación ni se prometen accesos a un proveedor que no lo admita.
