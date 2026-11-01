# Publicación de Nido v0.1.0

Publicada el 1 de noviembre de 2026 en el repositorio público
[https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios).

- Tag: `v0.1.0`.
- Commit del código publicado: `29dcc4b2a1d7e07ddaa5f2abf4ea5587631f9a1d`.
- [CI de la publicación](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/actions/runs/41331644412): **Success**, comprobaciones y empaquetado en Linux, Windows y macOS.
- [Workflow de release](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/actions/runs/41331687094): **Success**, duración 3 min 18 s; pruebas, tres construcciones nativas y publicación de los artefactos.
- 57 pruebas Vitest, lint, TypeScript e integración real de Electron con perfiles temporales y reinicios.

## Descargas

| Plataforma          | Instalador                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows x64         | [Nido.Setup.0.1.0.exe](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.0/Nido.Setup.0.1.0.exe)                                                                                                                         |
| macOS Apple Silicon | [Nido-0.1.0-arm64.dmg](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.0/Nido-0.1.0-arm64.dmg)                                                                                                                         |
| Linux x64           | [AppImage](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.0/Nido-0.1.0.AppImage) / [DEB](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.0/nido-browser_0.1.0_amd64.deb) |

[Release pública con todos los archivos](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/tag/v0.1.0).
[Checksums SHA-256](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.0/SHA256SUMS.txt).

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

- [CI](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/actions/runs/41336757377): Success.
- [Release](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/actions/runs/41336759150): Success, 3 min 38 s.
- 59 pruebas, integración con clics reales, login local temporal, aislamiento y caché en memoria.
- [Windows .exe](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/download/v0.1.1/Nido.Setup.0.1.1.exe).
- [macOS/Linux y checksums](https://github.com/mpenagonzal-18/navegador-customizable-sin-anuncios/releases/tag/v0.1.1).

Instalador Windows descargado y verificado: 123483327 bytes.
SHA-256: `77f0b4ffb7ec3752f5fa5f6d80fdeff8a897538a5f7db7055e5de796e0fcdf3b`.

En X o YouTube, activar Temporal mediante el botón Estricto de la barra permite
los datos propios necesarios sin habilitar cookies de terceros. La selección al
primer clic se corrige directamente. Los inicios de sesión reales y CAPTCHA no
se validaron con cuentas externas: la regresión usa un servidor local.
