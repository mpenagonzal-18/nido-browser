# Publicación de Nido v0.1.0

Publicada el 1 de noviembre de 2026 en el repositorio público
[https://github.com/mpenagonzal-18/nido-browser](https://github.com/mpenagonzal-18/nido-browser).

- Tag: `v0.1.0`.
- Commit del código publicado: `29dcc4b2a1d7e07ddaa5f2abf4ea5587631f9a1d`.
- [CI de la publicación](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41331644412): **Success**, comprobaciones y empaquetado en Linux, Windows y macOS.
- [Workflow de release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41331687094): **Success**, duración 3 min 18 s; pruebas, tres construcciones nativas y publicación de los artefactos.
- 57 pruebas Vitest, lint, TypeScript e integración real de Electron con perfiles temporales y reinicios.

## Descargas

| Plataforma          | Instalador                                                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows x64         | [Nido.Setup.0.1.0.exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.0/Nido.Setup.0.1.0.exe)                                                                                                  |
| macOS Apple Silicon | [Nido-0.1.0-arm64.dmg](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.0/Nido-0.1.0-arm64.dmg)                                                                                                  |
| Linux x64           | [AppImage](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.0/Nido-0.1.0.AppImage) / [DEB](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.0/nido-browser_0.1.0_amd64.deb) |

[Release pública con todos los archivos](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v0.1.0).
[Checksums SHA-256](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.0/SHA256SUMS.txt).

Se descargó de la release el instalador Windows y se verificó contra el checksum
producido por el workflow. Tamaño: **123.480.548 bytes**. SHA-256:

```text
c1621fc1aa75a822530065d9c694fcfa595392f134d5029a31c976814696fb98
```

El empaquetado nativo correcto no equivale a validar todas las interacciones de
escritorio. La integración funcional se ejecutó en Linux. Windows/macOS necesitan
revisión gráfica y los accesos a los proveedores de IA dependen de sus servicios.
Los instaladores no están firmados ni notarizados y pueden mostrar avisos del
sistema operativo. No hay actualizador automático en la aplicación.

## Actualización 0.1.1

Publicada el 1 de noviembre de 2026 desde `e90114dc80de31baaa4a3afc8435a4e8fafd46da`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41336757377): Success.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41336759150): Success, 3 min 38 s.
- 59 pruebas, integración con clics reales, login local temporal, aislamiento y caché en memoria.
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.1/Nido.Setup.0.1.1.exe).
- [macOS/Linux y checksums](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v0.1.1).

Instalador Windows descargado y verificado: 123483327 bytes.
SHA-256: `77f0b4ffb7ec3752f5fa5f6d80fdeff8a897538a5f7db7055e5de796e0fcdf3b`.

En X o YouTube, activar Temporal mediante el botón Estricto de la barra permite
los datos propios necesarios sin habilitar cookies de terceros. La selección al
primer clic se corrige directamente. Los inicios de sesión reales y CAPTCHA no
se validaron con cuentas externas: la regresión usa un servidor local.

## Actualización 0.1.2

Publicada el 1 de noviembre de 2026 desde `9ad8d2f2dcec5727187898084a56808db776fa75`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41346285179): Success, 1 min 41 s.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41346286423): Success, 3 min 57 s.
- 60 pruebas unitarias e integración real entre procesos: cookies propias globales,
  cierre de pestañas, navegación entre dominios, reinicio, restauración de localStorage,
  bloqueo de terceros y borrado explícito independiente de la sidebar de IA.
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.2/Nido.Setup.0.1.2.exe).
- [macOS/Linux y checksums](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v0.1.2).

Instalador Windows descargado y verificado: 123483501 bytes.
SHA-256: `5404842476ad9ebe224df59da96693edb69a225f7a81ca6e878c0f59b353f5f7`.

**Cambio de política solicitado:** cookies propias y almacenamiento persistentes
para todos los sitios por defecto. No hace falta activar Temporal por página. Los
datos se conservan en disco entre reinicios, sujetos a la caducidad de cada web.
La preferencia Borrar al salir y el modo estricto quedan disponibles; el botón de
borrado elimina datos de navegación sin borrar la sesión de los asistentes.

## Actualización v0.1.3 — idiomas y pausa de YouTube

Publicada el 2 de noviembre de 2026 en **mpenagonzal-18/nido-browser**, nuevo nombre
del mismo repositorio. Tag `v0.1.3`, commit
`6cae032df696d58d90371239f402a04accf8a88b`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41462610886): **Success**, 1 min 57 s; lint, tipos, 74 pruebas, integración Electron y empaquetado de tres plataformas.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41462613649): **Success**, 9 min 51 s; incluye espera de runner macOS, instaladores nativos y checksums.
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.3/Nido.Setup.0.1.3.exe).
- [Todos los instaladores](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v0.1.3).
- [SHA256SUMS.txt](https://github.com/mpenagonzal-18/nido-browser/releases/download/v0.1.3/SHA256SUMS.txt).

Se descargó el `.exe` público y se verificaron cabecera PE (`MZ`), tamaño
**123.495.062 bytes** y SHA-256 contra el manifiesto de la release:

```text
5b605e0eed001d0be0cb31ba0a3ab9067f40c14f192586cda94a04675728cc10
```

El ejecutable Linux empaquetado también arrancó correctamente desde asar. El smoke
usa el preload/IPC de producción con HTTPS interceptado localmente para verificar
una pausa y una única recarga, sin borrar login. Comprueba traducción inmediata y
persistencia del idioma tras reinicio. No equivale a una prueba de YouTube en vivo
ni de interacción gráfica en Windows/macOS. Instaladores sin firma/notarización.

## v1.0.0 — temas, menús y descargas

Publicada el 3 de noviembre de 2026 en **mpenagonzal-18/nido-browser**. Commit
`a4b3878e6dfb6e0db7473a97fb22b0df79159553`, tag `v1.0.0`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41651184403): **Success**, 1 min 53 s; 79 pruebas, lint, tipos, smoke y tres empaquetados.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41651184087): **Success**, 4 min 2 s; instaladores nativos de Windows, Linux y macOS.
- [Descargas](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.0).
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.0/Nido.Setup.1.0.0.exe).
- [Checksums](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.0/SHA256SUMS.txt).

El instalador Windows se descargó y verificó: **123.503.922 bytes**, cabecera MZ y
SHA-256 idéntico al manifiesto de la release:

```text
0f4360e05361561d2c38b0287400e03e1a5a3e80f87ef6e704043ccac392adb7
```

El ejecutable Linux empaquetado v1.0.0 arrancó y permitió capturar temas/ajustes.
La integración verifica autenticación propia en descargas, pausa/reanudación con
integridad de todos los bytes, cancelación, menús nativos y cierre real de la última
pestaña. Los diálogos interactivos y las interacciones completas de escritorio en
Windows/macOS siguen requiriendo revisión manual. Instaladores sin firma/notarización.

## v1.0.1 — dirección visible tras «Pegar y acceder»

Corrección publicada el 3 de noviembre de 2026, sin reemplazar el tag ni los
instaladores de v1.0.0. Commit `2bf038c4eb5b01c9f022f472bfd07794ce090940`.

- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41652305703): **Success**, 4 min 26 s; checks (1 min 23 s), tres instaladores nativos y publicación.
- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41652300636): comprobaciones correctas (1 min 43 s); el empaquetado adicional de macOS estaba en cola al revisar. La release sí completó los tres empaquetados.
- [Windows .exe recomendado](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.1/Nido.Setup.1.0.1.exe).
- [macOS, Linux y resto de archivos](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.1).
- [Checksums](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.1/SHA256SUMS.txt).

Se reprodujo y corrigió el caso de barra enfocada que mantenía el texto anterior
tras acceder desde el menú. La regresión exige que texto visible y URL de la pestaña
coincidan; el foco vuelve al contenido. Pasan las 79 pruebas, lint, tipos y la
integración completa con descargas autenticadas, reinicios y cierre de última pestaña.

El `.exe` público se descargó y validó como PE (MZ y firma PE), **123.504.158 bytes**,
SHA-256 idéntico al manifiesto:

```text
16c5988004daf66387da7736bebf90576b03f05052bdadbf2bca78292a139617
```

## v1.0.2 — filtrado del reproductor de YouTube

Publicada el 3 de noviembre de 2026. Commit
`d0596c24e806e97558a4b8c8261ccfc9313cc3c9`, tag `v1.0.2`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41668781358): **Success**, 1 min 43 s; 79 pruebas, lint, tipos, integración Electron y tres empaquetados.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41668785431): **Success**, 4 min 8 s; checks, tres instaladores nativos y publicación.
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.2/Nido.Setup.1.0.2.exe).
- [macOS/Linux y otros archivos](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.2).
- [SHA-256](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.2/SHA256SUMS.txt).

El `.exe` público se descargó y verificó contra el manifiesto, con MZ y firma PE:
**123.506.064 bytes**, SHA-256:

```text
87448bc49feecfc6fd961559700658865f09f7bd23b7a6c50c4c20649388973d
```

La prueba de producción verifica datos iniciales, fetch JSON/texto/clone, XHR,
PBJ con prefijo, conservación de streams/subtítulos, CSS y retirada del filtrado al
pausar o excluir. Es una prueba sobre respuestas locales representativas bajo URL
YouTube interceptada; no se ha validado publicidad del servicio en vivo. Formatos
nuevos o publicidad cosida al flujo pueden eludirla. PAUSA permite publicidad de
forma deliberada para continuar. No se afirma bloqueo universal.

## v1.0.3 — ventanas OAuth y ayuda de rechazo Google

Publicada el 4 de noviembre de 2026. Commit
`07cda71dabce1cc9104cc026c3a0903084c04bca`, tag `v1.0.3`.

- [CI](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41814298544): **Success**, 1 min 48 s; 84 pruebas, lint, tipos, integración y tres empaquetados.
- [Release](https://github.com/mpenagonzal-18/nido-browser/actions/runs/41814335240): **Success**, 4 min 21 s; comprobaciones, tres instaladores nativos y publicación.
- [Windows .exe](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.3/Nido.Setup.1.0.3.exe).
- [macOS/Linux y resto de archivos](https://github.com/mpenagonzal-18/nido-browser/releases/tag/v1.0.3).
- [Checksums](https://github.com/mpenagonzal-18/nido-browser/releases/download/v1.0.3/SHA256SUMS.txt).

Se descargó el instalador público y se verificaron tamaño **123.510.199 bytes**,
MZ/firma PE y SHA-256 idéntico al manifiesto:

```text
0a605e2f5978e6332534afd7c5f5cffb194823ff2bbcd8e0c907ba2821d75b94
```

La integración valida un flujo OAuth local con popup, sesión propia, POST y
opener/postMessage; CORS y Node bloqueados aunque la página solicite preferencias
inseguras. Prueba el aviso Google simulado en pestaña y popup, su explicación una
sola vez, el destino externo fijo bajo confirmación y la exclusión de identidad del
historial opcional. No se usaron cuentas Google reales ni se ha demostrado que
Google admita Nido. El rechazo del proveedor puede persistir; la sesión del navegador
del sistema no se transfiere a Nido. No se promete resolver esa restricción ni se
relajan sandbox, TLS o la política de cookies de terceros. Instaladores sin firma.
