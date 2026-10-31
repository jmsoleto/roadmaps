## 1. El piloto

- [x] 1.1 `hub/types.ts`: una acción de botón puede llevar `pilot: 'ok' | 'alert'`. Verificar que `npm run check` pasa sin tocar las demás acciones
- [x] 1.2 `Topbar.svelte`: con `pilot`, el botón encendido (borde continuo y tinte del acento) y un piloto que parpadea suavemente en `ok` y queda fijo en `--danger` en `alert`, sin parpadeo con `prefers-reduced-motion`. Etiqueta accesible que diga el estado
- [x] 1.3 `hub/registry.ts`: las acciones «⧉ carpeta» de Roadmaps, API Hub y Links Hub declaran `pilot` desde su conexión y la disponibilidad de sus datos. Verificar con tests de registro los tres estados de cada aplicación

## 2. Cierre

- [x] 2.1 **Punto de verificación** en Chromium: el botón en el navegador, conectado, sin permiso y tras desconectar; captura de cada estado; y con movimiento reducido emulado
- [x] 2.2 `npm run check`, `npm run lint`, `npm test` y `npm run build` en verde
