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
