## Why

Los enlaces de guardia de un equipo son el caso más claro de algo que tiene que ser de todos: el panel que necesitas a las 4 de la mañana lo dio de alta otra persona. Hoy viven en el `localStorage` de un navegador, y la única forma de compartirlos es exportar e importar área por área.

`carpeta-roadmaps` y `carpeta-api-hub` dejaron lista la conexión a una carpeta. Este change la extiende a Links Hub, la tercera y última aplicación de la iniciativa.

## What Changes

- **Conectar Links Hub a una carpeta**, opcional y por separado de las demás, en su subcarpeta `links/` con el mismo marcador. Sin conectar, Links Hub sigue exactamente como hoy: síncrono y sin estado intermedio.
- **Con carpeta, Links Hub puede esperar.** Es la decisión tomada al explorar la iniciativa: la excepción de `local-persistence` («el almacenamiento MUST ser síncrono») pasa a valer solo sin conectar. Conectado, Links Hub gana los estados «abriendo» y «no disponible», igual que las otras dos aplicaciones, con los mismos botones de conceder acceso, reintentar y desconectar.
- **Un fichero por área**, con sus enlaces dentro y en orden, y un `order.json` con el orden de las áreas. Un enlace no cambia de área, así que el área es la unidad natural, la misma que ya usa la exportación. El formato es el canónico sin listas cerradas que estrenó API Hub, que pasa a vivir en `lib/folder/` para que lo usen los dos.
- **El área abierta y el enlace con el foco** ya eran estado de sesión y no se guardaban: no hay nada que sacar de los datos.
- **La tarjeta de la landing, la topbar, el diálogo de carpeta y el cierre con escrituras pendientes** se comportan como en Roadmaps y API Hub.

Depende de `carpeta-roadmaps` y `carpeta-api-hub`, que deben archivarse antes.

Fuera de alcance:

- Decisions, que queda fuera de la iniciativa.
- Detectar cambios en la carpeta con la app abierta.
- La pregunta abierta sobre la cabecera de la landing.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `folder-persistence`: Links Hub se suma como tercera aplicación conectable, con su estructura y su formato.
- `local-persistence`: la excepción síncrona de Links Hub pasa a valer solo mientras no esté conectado a una carpeta.
- `hub-landing`: la tarjeta de Links Hub con la carpeta sin leer se comporta como las de Roadmaps y API Hub.

## Impact

- `src/lib/folder/`: `canonical.ts` (el JSON canónico sin listas cerradas, sacado de `api/folder-format.ts`) y `doc-backend.ts` (los backends genéricos de documento, sacados de `api/storage.ts`).
- `src/lib/links/storage.ts`, `store.svelte.ts`: el backend del navegador sigue síncrono; el store gana `ready`, `unavailable`, `source`, `pending`, `saveError` y `useBackend`, sin cambiar el arranque sin carpeta.
- Nuevos `src/lib/links/folder-format.ts` y `src/lib/links/folder.svelte.ts`.
- `LinksApp.svelte`, `src/lib/hub/registry.ts`, `src/lib/hub/folders.ts`, `main.ts`, `App.svelte`, `README.md`.
