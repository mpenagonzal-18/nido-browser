# Componentes de terceros

El código propio de Nido se distribuye bajo MIT (`LICENSE`).

- Electron/Chromium: MIT y licencias de sus componentes; el empaquetado conserva
  `LICENSE.electron.txt` y `LICENSES.chromium.html`.
- @ghostery/adblocker-electron y el motor de filtros: MPL-2.0. Se utilizan como
  módulos sin modificar; sus archivos LICENSE se distribuyen con las dependencias.
  Fuente: https://github.com/ghostery/adblocker
- Zod: MIT. Fuente: https://github.com/colinhacks/zod
- EasyList/EasyPrivacy: datos de terceros con licencia separada y avisos en
  `assets/lists/NOTICE.md`; se conserva una copia de GPLv3 como opción de distribución.

Los instaladores incluyen dependencias de ejecución. Consulta sus paquetes para
los avisos de dependencias transitivas. Los proveedores de IA no están afiliados
al proyecto; los iconos de la UI son caracteres de texto locales, sin logotipos
ni fuentes descargadas.
