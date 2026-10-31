## 1. Lo compartido baja a `lib/folder/`

- [x] 1.1 `folder/canonical.ts` con `canon` parametrizado; `api/folder-format.ts` lo usa. Verificar que los tests de `api/folder-format.test.ts` pasan sin cambios. D2
- [x] 1.2 `folder/doc-backend.ts` con `DocBackend`, `DocLoad`, `FolderDocBackend` y `UnavailableDocBackend`; `api/storage.ts` los reexporta. Verificar que la suite de API Hub pasa sin cambios

## 2. Formato y store de Links

- [x] 2.1 `links/folder-format.ts`: marcador, `order.json` y un fichero por área con sus enlaces sin `areaId`. Verificar con tests: determinismo, ida y vuelta (con el `areaId` recuperado), un campo nuevo de un enlace no se pierde, editar un enlace cambia solo su área, ilegible nombrando el fichero, ids duplicados, `order.json` desalineado. D1
- [x] 2.2 `LinksStore`: `ready`, `unavailable`, `source`, `pending`, `saveError`, `useBackend` y un `init` síncrono con `loadNow` y asíncrono en otro caso. Mutaciones rechazadas mientras no esté disponible. Verificar que los tests de `links/` pasan sin cambios y añadir los del camino asíncrono. D3

## 3. Conectar Links

- [x] 3.1 `links/folder.svelte.ts`: la `FolderConnection` de Links con un participante. Verificar con tests: volcado, carpeta con datos, desconectar, permiso pendiente y conceder, ilegible y reintentar
- [x] 3.2 `main.ts`: sin carpeta recordada, `links.init()` síncrono como hoy; con ella, `linksFolder.start()` al lado. Verificar que sin carpeta el primer render ya tiene los enlaces
- [x] 3.3 `LinksApp.svelte`: «Abriendo los enlaces…» y pantalla de no disponible con sus acciones, solo cuando aplica. Registro: `scope`, «⧉ carpeta», crear e importar desactivados mientras no se pueda leer. `hub/folders.ts`: la entrada de Links
- [x] 3.4 Tarjeta de la landing: `AppUnreadable` con carpeta abriendo o sin leer, con `grant` si es el permiso. Verificar con tests de registro
- [x] 3.5 `App.svelte`: el cierre cuenta también las escrituras pendientes de Links

## 4. Cierre

- [x] 4.1 README: Links en la sección de datos, con la contrapartida de la espera
- [x] 4.2 **Punto de verificación** en Chromium: las tres aplicaciones en el mismo repo, cada una en su subcarpeta; Links sin carpeta abre sin estado de carga; con carpeta, recarga, conflicto en un área y desconectar
- [x] 4.3 `npm run check`, `npm run lint`, `npm test` y `npm run build` en verde
