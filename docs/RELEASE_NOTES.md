Nido 1.0.2: filtrado del reproductor de YouTube, además del bloqueo de red.

La versión anterior solo filtraba peticiones y pausaba ante el aviso antibloqueo;
no retiraba los datos publicitarios del reproductor. Esta versión añade un filtro
local de sus objetos iniciales y respuestas fetch/XHR, junto con CSS de banners.
Conserva streams de vídeo, subtítulos, sesiones y configuración.

- Pausa automática y exclusiones desactivan también el nuevo filtro y su CSS.
- La barra aclara que PAUSA permite anuncios; el contador solo mide bloqueos de red.
- El ajuste se llama «Bloquear anuncios de YouTube (pausar si impide reproducir)».
- Sin dependencias ni peticiones de red adicionales; no se descargan scripts de terceros.

Pruebas con Electron real y HTTPS local: arranque, fetch JSON/texto/clone, XHR JSON/texto,
endpoints no relacionados intactos, banners, pausa y exclusiones. No se ha podido
validar YouTube en vivo desde este entorno. No se garantiza bloquear todos los anuncios,
especialmente nuevos formatos o publicidad integrada en el propio flujo de vídeo.
La pausa permite anuncios deliberadamente cuando YouTube bloquea la reproducción.
Instaladores sin firma ni notarización.
