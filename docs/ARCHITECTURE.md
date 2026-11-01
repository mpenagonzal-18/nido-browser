# Arquitectura

- `src/shared`: nombre de producto, contratos, esquema Zod, políticas puras.
- `src/main/index.ts`: ventana, pestañas, layout, atajos y despachador IPC.
- `src/main/privacy.ts`: sesiones, permisos, cabeceras y guardas de cookies.
- `src/main/blocking.ts`: ElectronBlocker de Ghostery con un único listener de red
  por sesión, gate de exclusiones previo y CSS sin scriptlets.
- `src/main/sidebar.ts`: vistas por proveedor, sesión persistente aislada,
  navegación externa y descarga opcional.
- `src/main/storage.ts`: JSON local con reemplazo atómico; historial opt-in.
- `src/main/local-files.ts`: diálogos y URLs de capacidad para audio/fondo local.
- `src/preload/index.ts`: solo API de comandos/eventos para la UI interna.
- `src/preload/cookies.ts`: guardia de cookies sin API para contenido remoto.
- `src/renderer`: DOM nativo, música estable fuera de vistas de páginas.
- `src/renderer/newtab`: apariencia y fondo de la página interna.

La UI ocupa 118 px de alto. El main calcula los bounds nativos de cada vista;
no se confía en coordenadas arbitrarias recibidas por IPC. Abrir ajustes oculta
las vistas nativas para que no tapen el panel DOM. Redimensionar la sidebar oculta
temporalmente las vistas y guarda un ancho validado. Cada pestaña remota crea su
renderer Chromium; una pestaña nueva interna no necesita un WebContents adicional.
Las vistas inactivas se destruyen tras el umbral y se recrean con la última URL.
No se restaura el historial de navegación ni formularios tras suspender.

No hay preload Ghostery ni `<webview>`. La API de filtros se integra de forma
explícita para no sobrescribir el listener que elimina Set-Cookie y para garantizar
que las exclusiones de vídeo se comprueban antes de cualquier operación cosmética.
El protocolo `nido:` solo se atiende en la sesión interna, con rutas exactas y
archivos locales autorizados mediante tokens aleatorios. No acepta rutas del URL.
