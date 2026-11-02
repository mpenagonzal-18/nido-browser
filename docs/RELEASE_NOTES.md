Nido 0.1.3: idiomas y pausa automática del bloqueo en YouTube.

- Español, English y Del sistema en ajustes, con cambio inmediato y persistencia local.
- Detección de avisos visibles de antibloqueo de YouTube: pausa durante esa ejecución,
  una recarga de la pestaña afectada e intento de conservar la posición del vídeo.
- Indicador PAUSA y reactivación manual desde la barra; exclusiones manuales prioritarias.
- Sin cosmética ni scriptlets en YouTube. Desactivar la opción lo excluye completamente.
- Repositorio renombrado a mpenagonzal-18/nido-browser.

**Cambio respecto a 0.1.2:** YouTube ya no se excluye por defecto; ahora se filtra su
red y se pausa si aparece el aviso reconocido. Se migra únicamente la lista antigua
predeterminada, preservando exclusiones personalizadas. No garantiza eliminar todos
los anuncios ni detectar cambios futuros del servicio. Se probó el detector con DOM
real y avisos locales representativos, no contra YouTube en vivo.

Las cookies y sesiones permanentes siguen activadas por defecto y no se borran al
cambiar idioma ni al pausar el bloqueador. Sin telemetría, actualizaciones automáticas
ni servicios de traducción. Instaladores sin firmar ni notarizar.
