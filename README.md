# ◒ Nido

Un navegador personal de escritorio con privacidad configurable, una página de inicio
tranquila y asistentes de IA en una sesión separada. Electron **45.2.1** +
TypeScript + DOM nativo; sin framework de UI ni servicios propios.

![Página de inicio de Nido](assets/nido-preview.png)

**Versión publicada:** [v1.0.1](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.1) ·
[Instalador Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.1/Nido.Setup.1.0.1.exe) ·
[macOS / Linux y checksums](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.1).

> Proyecto inicial funcional. La interacción gráfica en Windows/macOS y los inicios de
> sesión de proveedores necesitan revisión en sus plataformas. No es un navegador
> auditado ni un sustituto de Tor. Captura de la interfaz ejecutada en Linux headless;
> capturas específicas de Windows/macOS y sidebar: pendientes.

## Cookies y login: cambio de 0.1.2

Las cookies propias y los datos de las páginas están **activados globalmente** y se
**conservan entre reinicios**. No hay que activar Temporal por sitio. Cerrar una
pestaña o visitar otro dominio tampoco borra el login. Las cookies de terceros
siguen bloqueadas y la sesión de IA permanece separada.

Los datos de navegación ahora se guardan en este equipo. En Ajustes puedes elegir
**Conservar entre reinicios**, **Borrar al salir** o **Privacidad estricta**, y usar
**Borrar cookies y datos de sitios** para cerrar sesiones y eliminar lo guardado.
Cambiar de modo no borra automáticamente el perfil permanente anterior. Los sitios
pueden imponer su propia caducidad o volver a pedir autenticación.

Se mantienen la caché de red para evitar descargas repetidas y la selección de la
URL completa al primer clic. El historial propio de Nido sigue desactivado y no
hay telemetría ni sincronización. Consulta [PRIVACY](docs/PRIVACY.md): las garantías
del antiguo modo estricto no son las del nuevo modo normal.

## Empezar

Requisitos: Node.js **24 LTS**, npm, Git y un sistema compatible con Electron 45.
Para el uso normal se necesita un escritorio gráfico. Linux requiere bibliotecas
GTK/NSS/ALSA y soporte de sandbox/user namespaces. No ejecutes Nido como root ni
uses `--no-sandbox` para resolver errores de instalación.

```sh
git clone https://github.com/mpenagonzal-18/nido-browser.git
cd nido-browser
npm install
npm run dev
```

`dev` compila y abre Electron; reinícialo tras cambios de código. `npm ci` reproduce
las versiones del lockfile. Electron 45 descarga su binario oficial al primer uso
si aún no está presente; en entornos Node 24 con proxy HTTP puede ser necesario
`NODE_USE_ENV_PROXY=1` (sin desactivar TLS). No se necesita ninguna API key.

| Comando             | Resultado                                    |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Build y ventana de escritorio                |
| `npm run build`     | Main, preloads y renderer en `dist/`         |
| `npm run lint`      | ESLint                                       |
| `npm run typecheck` | TypeScript estricto                          |
| `npm test`          | Vitest, sin cuentas ni red                   |
| `npm run smoke`     | Integración real, tres arranques de Electron |
| `npm run format`    | Prettier                                     |
| `npm run dist`      | Instaladores en `release/`                   |

## Navegación y memoria

- Abrir, cerrar, cambiar y arrastrar pestañas para reordenarlas; atrás, adelante,
  recargar e inicio. Una dirección sin protocolo usa HTTPS; el texto se busca.
- DuckDuckGo por defecto; Brave Search, Startpage o endpoint SearXNG configurable.
- Las pestañas inactivas se descargan tras 10 minutos por defecto (configurable,
  revisión cada 30 s). Volver recarga la última URL; no conserva formularios ni
  historial atrás/adelante de la vista suspendida.
- La página nueva se dibuja en la UI existente; no crea un renderer extra. La IA
  se crea bajo demanda. La música sigue en la UI al suspender o cambiar vistas.

| Atajo                             | Acción                     |
| --------------------------------- | -------------------------- |
| Ctrl/Cmd+T                        | Nueva pestaña              |
| Ctrl/Cmd+W                        | Cerrar pestaña             |
| Ctrl/Cmd+L                        | Seleccionar dirección      |
| Ctrl/Cmd+R                        | Recargar                   |
| Ctrl/Cmd+J                        | Gestor de descargas        |
| Ctrl/Cmd+Tab / Ctrl/Cmd+Shift+Tab | Pestaña siguiente/anterior |
| Ctrl/Cmd+Shift+A                  | Mostrar/ocultar IA         |

Bundle renderer medido con esbuild: **33,21 kB JS** (11,44 kB gzip), más unos
**10,00 kB CSS**. El main propio ronda 83 kB; Ghostery y Zod se conservan como módulos
de ejecución. El preload específico de YouTube ocupa unos 9,64 kB adicionales. Estas cifras **no** son el tamaño de Electron ni el consumo RAM:
Chromium domina el instalador y cada página remota usa procesos propios. La UI estuvo
lista en aproximadamente **1,0–1,2 s** en esta máquina Linux headless con perfil de
prueba; no es una garantía ni una medida de arranque en frío de otras plataformas.

## Temas y personalización

En **Ajustes → Color y fondo** hay diez temas: Bosque, Océano, Atardecer, Aurora,
Lavanda, Rosa, Brasa, Medianoche, Dunas y Ártico. Cada tarjeta aplica su gradiente y
la paleta de barras/paneles; el selector **Paleta de la interfaz** permite combinar
esa paleta con una imagen local o un color sólido. **Gradiente personalizado**
recupera la mezcla de tu acento y color del fondo. Se mantienen los modos claro,
oscuro y automático, el desenfoque, oscurecimiento y vista previa inmediata.
Todo se guarda localmente y se incluye al exportar/importar ajustes. La actualización
conserva imágenes y colores existentes.

## Clic derecho y pestañas

- En enlaces: abrir en pestaña nueva en segundo plano, copiar dirección y guardar como.
- En imágenes HTTP(S): abrir en pestaña nueva, copiar dirección y guardar como.
- En texto: copiar y abrir/buscar la selección; en campos editables, deshacer,
  rehacer, cortar, copiar, pegar y seleccionar todo según el contexto.
- En la barra de direcciones y el buscador de inicio: **Pegar y acceder**, que
  navega o busca usando el buscador configurado. Los esquemas peligrosos se rechazan.
- En pestañas: nueva, duplicar, cerrar y cerrar las demás. Cerrar la última pestaña
  cierra Nido, también con Ctrl/Cmd+W. Las sesiones permanentes se conservan.

## Gestor de descargas

El botón **↓** o **Ctrl/Cmd+J** abre el panel. Muestra progreso y permite pausar,
reanudar si el servidor lo admite, cancelar, abrir un archivo completado o mostrarlo
en su carpeta. Enlaces, adjuntos y descargas de la sidebar usan el diálogo nativo
para elegir dónde guardar. Nunca se abren archivos automáticamente.

**Limpiar terminadas** solo borra filas del panel, no archivos. El registro vive en
memoria (hasta 100 entradas finalizadas, además de las activas) y desaparece al salir;
los archivos guardados permanecen. No hay reanudación entre reinicios. Si cierras
Nido con descargas activas, pide confirmar su cancelación; cancelar el cierre deja
la pestaña y la ventana abiertas. Escape cierra el panel sin detener las descargas.

## Privacidad y bloqueo

Sin telemetría, auto-update, crash reporter ni fuentes externas. La página de inicio
no hace peticiones de red. Las páginas que abres pueden hacer peticiones y mantener
conexiones de fondo. Nido no promete que todas las conexiones posteriores correspondan
a un clic individual: son las propias webs las que cargan sus recursos.

La navegación normal usa una sesión persistente local con cookies propias y
almacenamiento habilitados globalmente. El modo Borrar al salir usa otra sesión
en memoria; el modo estricto mantiene las restricciones originales como opción.
Los terceros se filtran en cabeceras y documentos, se envía DNT/GPC, se recorta
Referer y se limita WebRTC. Los permisos requieren confirmación por sitio y el
historial opcional es un JSON exclusivamente local. Las descargas se guardan solo
tras elegir una ruta en el diálogo nativo; su registro es temporal.

EasyList + EasyPrivacy se empaquetan localmente. La actualización requiere pulsar
**Actualizar listas manualmente**. Se bloquean anuncios/rastreadores de red y banners
por CSS; no se ejecutan scriptlets de las listas. El contador ◈ es por pestaña, solo en memoria;
pulsarlo desactiva/reactiva el bloqueo del sitio actual para esta ejecución.

**YouTube (desde 1.0.2):** además de filtrar peticiones, Nido elimina los campos
publicitarios conocidos (`playerAds`, `adPlacements`, `adSlots` y
`adBreakHeartbeatParams`) de los datos iniciales del reproductor y de las respuestas
JSON/texto de sus endpoints `player`/`next` mediante fetch y XHR. Incluye CSS para
banners identificados. Este filtro propio está empaquetado con Nido; no se descarga
ni ejecuta código de listas de terceros. No cambia los datos de vídeo ni subtítulos.

Si YouTube muestra su aviso antibloqueo, se pausa todo el bloqueo de YouTube durante
esa ejecución y se recarga una vez, intentando conservar la posición. **PAUSA significa
que se permiten anuncios** para poder continuar; pulsa el botón para reintentarlo.
No borra cookies ni cierra sesiones. El contador solo suma peticiones bloqueadas,
no los campos publicitarios eliminados, así que cero no implica que el filtro esté apagado.

En ajustes, **Bloquear anuncios de YouTube (pausar si impide reproducir)** activa
este comportamiento; desactivarlo excluye YouTube completamente. Las exclusiones
manuales prevalecen y evitan filtros e inyecciones. Fuera de YouTube no se bloquea
el tipo de recurso `media`.

**Límites:** se prueba con fixtures locales bajo HTTPS interceptado, usando el preload
real. Este entorno no permite validar YouTube en vivo. No se garantiza eliminar todos
los anuncios: formatos nuevos, respuestas binarias y anuncios cosidos al propio flujo
de vídeo pueden quedar fuera. La pausa de compatibilidad permite anuncios deliberadamente.

## Idiomas

En **Ajustes → Idioma de la interfaz**, elige **Español**, **English** o **Del sistema**
(español para sistemas `es-*`; inglés para el resto). El cambio es inmediato y se
guarda en el JSON local, también al exportar/importar ajustes. Traduce la interfaz,
los controles y los diálogos propios de Nido, sin descargas ni servicios remotos.
Las páginas web, los nombres personalizados y los mensajes de terceros conservan
su idioma. El español se mantiene como idioma inicial en perfiles existentes.

Consulta [PRIVACY](docs/PRIVACY.md) para almacenamiento, terceros, límites de red y
rastros del sistema operativo; [SECURITY](SECURITY.md) para el modelo de seguridad.

## Sidebar de IA

Claude, ChatGPT, Gemini, Perplexity y Mistral Le Chat vienen preconfigurados con
iconos locales. Abre **✦ IA**, selecciona proveedor y arrastra el borde del panel;
también puedes usar las flechas con el separador enfocado. Ajustes permite cambiar
lado/ancho, añadir nombre+URL+icono, quitar y reordenar proveedores, y descargar
vistas tras un tiempo sin uso (0 = conservar). Open WebUI puede añadirse con
`http://localhost:3000`; para Ollama utiliza una UI web local.

Cada proveedor tiene su `WebContentsView`, conservada al cambiar u ocultar. Comparten
**solo entre los asistentes** `persist:ai-sidebar`; las pestañas normales nunca la
usan. Sus cookies/almacenamiento persisten solo para los dominios configurados y
sus subdominios, sin autorizar automáticamente dominios padres. Los frames de terceros
no configurados se bloquean. Los enlaces fuera del proveedor abren una pestaña normal.
El botón **Borrar datos de la sidebar de IA** limpia esa sesión; cambiar o retirar
un proveedor también la limpia completa para no conservar dominios retirados.

Se usa el User-Agent estándar de Chrome. Aun así, **Google puede bloquear Gemini**
por tratarse de Electron y porque su OAuth requiere dominios/cookies ajenos al host
configurado. No se garantiza ningún inicio de sesión ni se simula compatibilidad.
La alternativa es ese servicio en el navegador habitual o una UI local como Open
WebUI. Las vistas no comparten cookies con el navegador del sistema.

El menú contextual ofrece **Copiar texto seleccionado para la IA** y **Copiar URL de
la página actual**: solo copian al portapapeles. Nido nunca envía contenido a ningún
asistente automáticamente. Los servicios de IA tienen sus propias políticas de
privacidad. El dictado puede pedir micrófono con confirmación explícita.

## Personalizar

En ⚙: acento y tema claro/oscuro/automático, fondo sólido/degradado/imagen local con
desenfoque y oscurecimiento. Los cambios se ven al instante y se guardan en
`userData/settings.json`. Hay vista previa, restablecer e importar/exportar JSON.
Los archivos no se suben; el JSON puede contener rutas locales, pero no cookies.

En ♫ selecciona mp3, ogg, wav o flac locales. Controles de reproducción/pausa,
anterior/siguiente, volumen, bucle de lista y aleatorio. Activa **Recordar lista**
para recuperar las rutas tras reiniciar; nunca comienza a sonar automáticamente.
Los archivos movidos o borrados deberán volver a seleccionarse.

Para renombrar el navegador cambia `APP_NAME` en `src/shared/config.ts`. Para los
instaladores ajusta también `build.productName`, `build.appId` y los metadatos de
`package.json` (identidad del producto, no lógica de navegación).

## Empaquetar y publicar

```sh
npm run dist
```

En el host correspondiente genera NSIS (.exe), DMG/ZIP o AppImage/DEB. Los workflows
[CI](.github/workflows/ci.yml) comprueban lint, tipos, pruebas, build e integración,
y empaquetado en tres sistemas. [Release](.github/workflows/release.yml) genera
instaladores al publicar un tag `v*` y publica la release con todos los instaladores y sus checksums, después de
superar los controles y construir en las tres plataformas.
Configura firma y notarización antes de una distribución pública de confianza.
Los artefactos de ejemplo no están firmados.

El repositorio local ya tiene `main` y commits por fase. Si vas a crear otro repo:

```sh
gh repo create TU_USUARIO/nido --public --source=. --push
```

Si Git indica que `origin` ya existe, crea el nuevo repositorio sin `--source`,
configura su URL con `git remote set-url origin https://github.com/TU_USUARIO/nido.git`
y ejecuta `git push -u origin main`. Para el repositorio original ya conectado:

```sh
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

Alternativa manual: crea un repositorio vacío en GitHub, copia su URL, configura
`origin` (con `git remote add origin URL` si falta, o `set-url` si existe) y haz
`git push -u origin main`. La versión **v1.0.1** ya está publicada. Consulta [la evidencia de publicación](docs/PUBLICATION.md).

[Arquitectura](docs/ARCHITECTURE.md) · [Validación y límites](docs/VALIDATION.md) ·
[Contribuir](CONTRIBUTING.md) · [Licencias de terceros](docs/THIRD_PARTY.md)

Código propio MIT. Las listas y dependencias conservan sus licencias originales.
