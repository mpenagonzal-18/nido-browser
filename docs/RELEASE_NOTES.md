Nido 0.1.2: cookies propias activadas globalmente y sesiones conservadas entre reinicios.

- Ya no es necesario activar Temporal en cada sitio: las cookies propias y el
  almacenamiento se permiten en todas las páginas de forma predeterminada.
- Cerrar pestañas o navegar a otro sitio no borra el login. Las cookies persistentes
  y el almacenamiento se conservan al cerrar y volver a abrir Nido, según la
  caducidad que imponga cada web.
- Cookies de terceros bloqueadas; la sidebar de IA continúa aislada.
- Ajustes globales: Conservar entre reinicios, Borrar al salir o Privacidad estricta.
- Botón para borrar cookies y datos de sitios sin borrar los datos de los asistentes.

**Cambio de privacidad:** el modo normal guarda cookies, datos de las webs y caché
localmente en disco. Sustituye al borrado automático por defecto de 0.1.0/0.1.1.
Cambiar a otro modo no elimina los datos permanentes existentes: usa el botón de
borrado si quieres eliminarlos. No hay telemetría ni sincronización con Nido.

Se verificaron login local, cierre de pestañas, cambio de dominio, reinicio real,
restauración de almacenamiento, bloqueo de terceros y borrado manual. Los servicios
pueden caducar sesiones o bloquear Electron; no se promete evitar CAPTCHA u OAuth.
Instaladores sin firmar ni notarizar. Consulta docs/PRIVACY.md.
