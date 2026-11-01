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
- `src/preload/document-policy.ts`: guardas de cookies y almacenamiento sin API
  privilegiada para contenido remoto. `cookies.ts` y `session-cookies.ts` eligen
  modo estricto o cookies propias; el resto del almacenamiento siempre se deniega.
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

Las vistas de navegación habilitan la ejecución de preloads aislados en subframes
mediante `nodeIntegrationInSubFrames`, conservando explícitamente `sandbox: true`,
`contextIsolation: true` y `nodeIntegration: false`. Este flag permite que Electron
cargue las guardas antes de los scripts de cada iframe; no se expone Node al mundo
de la página. La integración verifica `require`, `process` y la API interna ausentes
en un iframe de otro origen. Al actualizar Electron hay que repetir esa prueba y
revisar la interacción entre estas opciones en el renderer sandboxed.

Las limpiezas periódicas, por origen y de cierre se serializan. El cierre se
intercepta antes de destruir la ventana nativa, se cierran las vistas remotas y se
espera a la limpieza; esto evita salir antes de resolver las operaciones asíncronas.

Desde 0.1.1 las excepciones de compatibilidad explícitas se ejecutan en la partición
no persistente `nido-compatible`. La navegación que cambia de regla recrea la vista
con la sesión correcta antes de cargar el destino; las redirecciones tienen el mismo
gate. El preload recibe el dominio autorizado mediante un argumento de proceso
validado y solo permite almacenamiento en documentos propios de ese dominio. Los
contextos de terceros mantienen guardas. El cierre del último contexto reúne los
orígenes visitados por todas las pestañas de la regla antes de limpiar. La caché de
red vive en memoria y no se invalida en las barridas estrictas periódicas.

Desde 0.1.2 `browsingMode` selecciona el perfil global: `persistent` por defecto
(`persist:nido-browsing`), `session` (`nido-session`, en memoria) o `strict` (con
las excepciones por sitio heredadas). Los perfiles globales no cambian de sesión
entre dominios y no se limpian al cerrar pestañas. Al salir se limpia el perfil
`session` y se fuerzan las escrituras del perfil persistente; el control de borrado
explícito limpia todos los perfiles de navegación sin afectar al de IA. El preload
`regular.ts` habilita almacenamiento propio en cualquier origen web, manteniendo
las guardas de frames de otro origen y los filtros de cookies de terceros.
