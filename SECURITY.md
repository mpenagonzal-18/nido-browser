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
