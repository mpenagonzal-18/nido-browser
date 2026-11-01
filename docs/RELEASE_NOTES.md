Nido 0.1.1: correcciones de inicio de sesión, carga y barra de direcciones.

- Compatibilidad Temporal por sitio: permite cookies propias y almacenamiento en
  memoria para sitios como X o YouTube. Se activa pulsando Estricto en la barra y
  se limpia al cerrar la última pestaña del sitio. El modo estricto sigue por defecto
  y las cookies de terceros siguen bloqueadas.
- La caché HTTP se reutiliza en memoria, sin vaciarla cada 15 segundos. La limpieza
  periódica de almacenamiento estricto continúa y no rompe los logins autorizados.
- El primer clic en la barra selecciona la dirección completa; los siguientes
  permiten colocar el cursor y Ctrl/Cmd+L sigue funcionando.

La integración prueba login local, conservación y limpieza de datos, caché y clics
reales. No garantiza los CAPTCHA ni inicios OAuth externos de X/Google; no se probaron
cuentas reales de esos servicios. Se mantienen las exclusiones de vídeo del bloqueador.

Instaladores sin firmar ni notarizar. Consulta docs/PRIVACY.md antes de activar la
compatibilidad temporal. Las preferencias existentes se conservan al actualizar.
