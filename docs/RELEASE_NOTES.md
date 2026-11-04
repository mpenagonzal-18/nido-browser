Nido 1.0.3: compatibilidad de ventanas OAuth y explicación del rechazo de Google.

- Las ventanas de autenticación conservan sesión, opener y postMessage.
- Sandbox, aislamiento, Node desactivado y seguridad web forzados; origen en el
  título, límite de ventanas y protección frente a opciones inseguras de la página.
- Se evita suspender el opener mientras hay un acceso en una ventana emergente.
- El filtro de anuncios omite el origen exacto de cuentas Google para no interrumpir
  sus verificaciones. Las cookies de terceros y la sidebar mantienen sus restricciones.
- Ayuda para la página de rechazo de Google, con alternativa manual en el navegador
  del sistema. No se transfieren sesiones, cookies, contraseñas ni tokens a Nido.

**Límite importante:** Google puede seguir rechazando Electron como navegador
integrado. Esta versión NO promete que «Iniciar sesión con Google» funcione dentro
de Nido. No es un problema que se resuelva desactivando TLS o el sandbox, y no se
falsea una certificación. Si sigue rechazándolo, hay que usar esa web desde un
navegador admitido e iniciar el acceso allí.

Pruebas con un flujo OAuth local y rechazo Google simulado; no se usaron cuentas
Google reales. No se modifica el filtro de vídeo de YouTube de 1.0.2. Instaladores
sin firma ni notarización y sin actualizador automático.
