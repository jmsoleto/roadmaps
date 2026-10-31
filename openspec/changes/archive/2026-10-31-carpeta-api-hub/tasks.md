## 1. Lo genérico sale de Roadmaps

Va primero y se cierra sin que Roadmaps cambie: es la base de los tres backends de API Hub.

- [x] 1.1 `folder/file-sync.ts`: `FileFormat<T>` y `FileSync<T>` con lectura, bytes conocidos, escritura de lo que difiere, borrado de lo conocido y `deletable`, cola con el último estado y traducción de errores. Tests con un formato inventado: dos `FileSync` sobre la misma carpeta no se ven los ficheros, el marcador no se borra nunca y un fichero ajeno no se toca. D2
- [x] 1.2 `store/folder-backend.ts` pasa a ser `FileSync` con el formato de Roadmaps. Verificar que `folder-backend.test.ts` pasa sin cambiar ningún test
- [x] 1.3 `folder/connection.svelte.ts`: `FolderConnection` con participantes, a partir de `roadmaps-folder.svelte.ts`. Roadmaps pasa a ser una conexión con un participante. Verificar que `roadmaps-folder.svelte.test.ts` pasa sin cambiar ningún test, salvo las importaciones. D3
- [x] 1.4 `FolderDialog.svelte` recibe la conexión y el nombre de la aplicación en lugar de importar `roadmapsFolder`; `ui.folder` dice qué aplicación lo abrió. Verificar en el navegador que el diálogo de Roadmaps se ve y funciona igual
- [x] 1.5 **Punto de verificación**: `npm run check`, `npm run lint` y `npm test` en verde, y `grep -rni roadmap src/lib/folder/` solo en comentarios

## 2. El estado de vista de API Hub sale de los documentos

- [x] 2.1 Comprobar que los ids de nodo no se repiten entre contratos y biblioteca, en especial al traer un modelo de la biblioteca a un contrato (`library/bring.ts`). Si se repiten, la clave del plegado pasa a ser `documento:id`; apuntarlo en el design. D4
- [x] 2.2 `api/view-state.ts`: subir `openId`, `Contract.view` y `ApiNode.open: false` de documentos antiguos, en el sitio e idempotente, con tests como los de `store/view-state.ts`
- [x] 2.3 Sacar los tres campos de los tipos persistidos y llevar el store y los componentes del árbol a las preferencias `api:open-id`, `api:views` y `api:collapsed-nodes`. Verificar con tests del store: plegar un nodo sobrevive a reiniciar y no guarda el documento, un nodo nuevo nace abierto, el contrato abierto y su vista se recuerdan
- [x] 2.4 Export e import de contrato y de biblioteca sin estado de vista. Verificar que un documento exportado no lo lleva y que uno antiguo que sí lo lleva se importa sin error y sin cambiar las preferencias
- [x] 2.5 **Punto de verificación** en el navegador: plegar y desplegar campos en contratos y en modelos de la biblioteca, arrastrar, editar y recargar. Todo debe comportarse igual que antes

## 3. Formato de API Hub

- [x] 3.1 `api/folder-format.ts`: los tres `FileFormat` (contratos con `order.json`, entradas de la biblioteca, catálogo de fuentes) con orden de campos explícito para `Contract`, `ApiEndpoint`, `ApiModel`, `ApiNode`, `MockSettings`, `LibraryEntry` y `ValueSource`. Verificar con tests: determinismo con las claves al revés, ida y vuelta de cada documento, un cambio en un campo es un diff de una línea en un solo fichero. D1
- [x] 3.2 Lectura de cada documento: ilegible nombrando el fichero, ids duplicados, `order.json` desalineado (huérfanos al final, ids sin fichero ignorados) y la biblioteca ordenada por nombre. Verificar con tests de cada caso

## 4. Backends y stores

- [x] 4.1 `api/storage.ts`: los tres backends de carpeta sobre `FileSync` y los de IndexedDB con `source`, `pending` y `settled`. Verificar que los tests de `storage` siguen pasando
- [x] 4.2 Los tres stores ganan `useBackend`, `source`, `saveError` y `why` en `unavailable`. Con carpeta, un guardado fallido es `saveError` y no `unavailable`; con IndexedDB sigue como hoy. Verificar con un test de cada camino. D5
- [x] 4.3 Los tres stores no se siembran ni escriben mientras no estén disponibles. Verificar con backends que devuelven `unavailable`

## 5. Conectar API Hub

- [x] 5.1 `api/folder.svelte.ts`: la `FolderConnection` de API Hub con sus tres participantes. Verificar con tests sobre la carpeta en memoria: volcado verificado de los tres; un fallo en uno deja los tres en el navegador; una carpeta con datos manda sin fusionar; desconectar vuelve a IndexedDB intacto; la carpeta `roadmaps` se rechaza nombrando Roadmaps
- [x] 5.2 Arranque con conexión recordada: una consulta de permiso para los tres, «falta permiso» en los tres, y conceder una vez abre los tres. Una biblioteca ilegible no impide usar los contratos. Verificar con tests
- [x] 5.3 `main.ts`: API Hub arranca por su conexión, al lado del arranque como hasta ahora. Verificar que con una conexión recordada que no responde montan la landing y las demás aplicaciones. D6
- [x] 5.4 Topbar y registro: `scope` de API Hub, acción «⧉ carpeta» siempre activa y acciones de crear e importar desactivadas mientras los contratos no estén disponibles. `ApiApp.svelte` y el panel de la biblioteca: botones de reintentar, conceder acceso y desconectar en sus pantallas de no disponible
- [x] 5.5 Tarjeta de la landing: `AppUnreadable` cuando los contratos están abriéndose o sin leer, con `grant` si es por permiso. Verificar con tests de registro como los de Roadmaps, y que una biblioteca ilegible deja las cifras
- [x] 5.6 `App.svelte`: el cierre pide confirmación si cualquiera de los tres tiene escrituras pendientes en la carpeta. Verificar con el `beforeunload` sintético, limpio y con algo pendiente

## 6. Cierre

- [x] 6.1 README: API Hub en la sección de datos, con su estructura de carpeta. Verificar leyéndolo contra las specs
- [x] 6.2 **Punto de verificación** de extremo a extremo en Chromium: Roadmaps y API Hub conectados a la raíz del mismo repo, editar en los dos, comprobar que cada uno solo toca su subcarpeta, conflicto en la biblioteca con los contratos usables, desconectar uno sin afectar al otro
- [x] 6.3 `npm run check`, `npm run lint`, `npm test` y `npm run build` en verde
