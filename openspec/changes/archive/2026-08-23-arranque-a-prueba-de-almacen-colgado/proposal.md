## Why

Registro retroactivo: esto se implementó directamente sobre el código al verificar el despliegue, sin pasar por el flujo, y queda escrito para que `openspec/specs/` diga la verdad.

Al abrir la aplicación desplegada, **arrancaba en blanco**. Sin errores en consola, porque no fallaba: se quedaba colgada. La petición de apertura de IndexedDB no disparaba **ningún** evento —ni éxito, ni error, ni el `blocked` que la propia interfaz define— y el arranque esperaba esa respuesta sin límite, así que no se montaba nada.

Lo grave no es que Decisions no abriera. Es que se llevó por delante el hub y Roadmaps, que no usan ese almacén, contradiciendo lo que `local-persistence` ya promete: *"Roadmaps y la landing del hub siguen funcionando con normalidad"*.

El estado encallado apareció durante la verificación, tras dejar abierta una conexión a la versión anterior. Pero la condición es real y no de laboratorio: una subida de versión de esquema con otra pestaña abierta es exactamente lo que produce un despliegue.

## What Changes

- **La apertura del almacén tiene un límite.** Pasado, se rinde diciendo qué ocurre en lugar de esperar indefinidamente. `blocked` cubre lo que IndexedDB sí reporta; el silencio absoluto no lo cubría nadie.
- **Decisions deja de bloquear el arranque.** Se inicializa al lado, no dentro: su estado ya era reactivo, así que la landing rellena sus cifras cuando llega la respuesta.
- **Mientras el almacén responde, la aplicación dice que no lo sabe todavía**, en lugar de enseñar una lista vacía. Una lista vacía sobre un almacén que aún contesta es el mismo error que sobre uno que ha fallado.

## Capabilities

### Modified Capabilities

- `local-persistence`: la distinción entre almacén vacío y no disponible se extiende al que no contesta, y se hace explícito que ninguna aplicación puede impedir arrancar a las demás.

## Impact

- `src/lib/decisions/storage.ts`: límite de espera en la apertura.
- `src/main.ts`: Decisions se inicializa fuera del arranque.
- `src/lib/components/decisions/DecisionsApp.svelte`: estado de "abriendo" distinto del de vacío.
