## Why

Saber dónde están los datos de una aplicación hoy exige leer una etiqueta pequeña al final de la topbar («local» o `repo/roadmaps`). Es fácil editar sin darse cuenta de que lo que se escribe va a un repo compartido, o al revés. El botón «⧉ carpeta» ya está siempre a la vista y es el sitio natural para decirlo de un vistazo.

## What Changes

- **El botón «⧉ carpeta» se enciende** cuando la aplicación está conectada a una carpeta, y vuelve a su aspecto normal cuando guarda en el navegador.
- **Un piloto dentro del botón** refleja el estado de la conexión: parpadea suavemente mientras la carpeta está conectada y se puede usar (también mientras se abre), y se queda fijo en rojo cuando está conectada pero no se puede leer (falta el permiso, una carpeta desaparecida, un fichero con conflicto).
- **Movimiento reducido**: con la preferencia del sistema de reducir el movimiento, el piloto no parpadea; se queda encendido.
- Vale igual para Roadmaps, API Hub y Links Hub: es parte del contrato de las acciones de la topbar, no de cada aplicación.

Se archiva después de `carpeta-roadmaps`, `carpeta-api-hub` y `carpeta-links`, porque añade un requisito a `folder-persistence`.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `folder-persistence`: el botón de carpeta dice si la aplicación está conectada y en qué estado está la conexión.

## Impact

- `src/lib/hub/types.ts`: una acción de botón puede declarar un piloto (`pilot: 'ok' | 'alert'`).
- `src/lib/components/Topbar.svelte`: el botón encendido, el piloto y su animación.
- `src/lib/hub/registry.ts`: las acciones «⧉ carpeta» de las tres aplicaciones declaran su piloto a partir de su conexión y de si sus datos se pueden leer.
