# Revisión final de privacidad y almacenamiento

Revisión local del 1 de noviembre de 2026. No sustituye una auditoría independiente.

Se revisaron las sesiones y sus listeners compartidos con el bloqueador, preloads,
IPC y esquemas, ciclo de vida de vistas y cierre, persistencia de proveedores,
validación de ajustes, recursos locales, dependencias, empaquetado y workflows.

Problemas corregidos:

- Activar cookies temporales permitía cabeceras de terceros. Ahora se exige un
  contexto propio verificable, con sufijos públicos/privados, esquema y ancestros;
  los contextos sin frame verificable se deniegan.
- Los preloads no se ejecutaban en los iframes de otras páginas. Se habilita su
  ejecución en subframes conservando sandbox y aislamiento y sin exponer Node.
  Se contrastó el comportamiento con las preferencias del renderer en el código
  oficial de Electron 45.2.1; la prueba real verifica que el iframe no recibe
  `require`, `process` ni el puente interno, y que no escribe cookies de terceros.
- Se permitía almacenamiento de documentos durante la sesión y faltaba limpieza
  por pestaña. Ahora sus APIs se deniegan, hay barridas cada 15 segundos y se
  limpian todos los orígenes visitados al cerrar una pestaña.
- Una sesión persistente podía conservar cookies ajenas de un perfil anterior.
  Se purgan antes de crear vistas, sin borrar las cookies autorizadas del proveedor;
  la integración simula y comprueba esa recuperación entre procesos.
- Se confió inicialmente en la destrucción de ventanas antes de limpiar. El cierre
  normal ahora espera al borrado después de destruir los productores remotos.
- Comprobar solo getters de página podía ocultar datos reales. La integración usa
  un mundo aislado del test runner para sembrar e inspeccionar los almacenes nativos.

Evidencia: 57 pruebas Vitest, ESLint, TypeScript estricto e integración Electron de
cookies por cabecera/JS/Cookie Store, almacenamiento, terceros, permisos, exclusiones
de vídeo, limpieza periódica y por origen, cierre real y persistencia selectiva de
la sidebar. Los datos del proveedor se conservan mientras los del navegador se borran.

Límites pendientes: inicios de sesión externos reales, interacción gráfica en
Windows/macOS, sonido físico y firma de instaladores. La CI y el empaquetado remoto
se verificaron al publicar v0.1.0; véase PUBLICATION.md. Las limpiezas son asíncronas y no protegen
contra todas las formas de fingerprinting, identificación por IP/ETag, fallos del
motor o rastros del sistema operativo; véase PRIVACY.md. Las aplicaciones que
requieren almacenamiento u offline pueden dejar de funcionar con esta política.
