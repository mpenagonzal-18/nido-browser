# Contribuir

Usa Node.js 24 LTS y el checkout existente; cada tarea en la nube ya está aislada.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run smoke
npm run dev
```

El smoke test arranca Electron real tres veces con un perfil temporal y un servidor
local; en Linux sin DISPLAY usa Ozone headless y conserva el sandbox. No requiere
cuentas ni servicios externos. No desactives el sandbox para solucionar fallos:
configura user namespaces o prueba en un escritorio Linux compatible.

Haz commits Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`). Documenta los
cambios de privacidad. No añadas telemetría, recursos remotos a la UI, actualizaciones
automáticas de listas ni envíos de contenido a asistentes. Todo IPC debe validarse
y comprobar el emisor y el frame. Mantén las exclusiones de vídeo antes de cualquier
llamada al motor. Evita introducir frameworks o procesos permanentes adicionales.

Para revisar un cambio: prueba varias pestañas, suspensión, reproducción local,
sidebar a ambos lados y los escenarios de `docs/VALIDATION.md`. Las credenciales y
cookies reales nunca se incluyen en fixtures, capturas ni issues.
