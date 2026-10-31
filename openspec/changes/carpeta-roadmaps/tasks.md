## 1. Spike de permisos

Va primero porque su resultado decide cuánto se va a ver «falta permiso», y eso pesa en los textos de los grupos 7 y 8. No se commitea.

- [ ] 1.1 Página de prueba en el scratchpad, servida con `vite preview`, que elige una carpeta, guarda el handle en IndexedDB y escribe un fichero con `createWritable`. Verificar que escribe en una carpeta normal y en el clon de un repo con `.git`. D11.4
- [ ] 1.2 Medir `queryPermission({ mode: 'readwrite' })` tras recargar, tras cerrar y abrir Chrome, en pestaña y en PWA instalada, y si aparece «permitir en cada visita». Verificar que queda una tabla de resultados apuntada en `design.md`, bajo D11

## 2. El estado de vista sale de los datos

Independiente de la carpeta, y necesario antes de ella: el serializador del grupo 4 no puede tener `activeId` ni `expanded` a mano.

- [ ] 2.1 Separar las preferencias del backend de datos: un `Prefs` sobre `localStorage` con las mismas claves `roadmaps:pref:*`, y `Storage` sin `getPref`/`setPref`. Verificar que `npm run check` pasa y que zoom y anchos se restauran igual (tests existentes del store)
- [ ] 2.2 Sacar `activeId` de `AppData` a la preferencia `active-id`, y `Phase.expanded` a un conjunto de fases plegadas en `collapsed-phases`. Adaptar store, Gantt, seed e import. Verificar con tests del store: plegar sobrevive a reiniciar, una fase nueva nace desplegada, borrar un roadmap activo elige otro. D3
- [ ] 2.3 Subir a preferencias el `activeId` y los `expanded: false` que traigan los datos antiguos del navegador, sin escribir los datos. Verificar con un test que carga un `AppData` antiguo y comprueba el roadmap activo, el plegado y que no hubo `save`. Escenario «Datos guardados con el estado de vista dentro»
- [ ] 2.4 El export de un roadmap deja de llevar `expanded`. Verificar en `portability.test.ts` que el documento exportado no lo contiene y que un documento antiguo que sí lo trae se importa sin error

## 3. Load con tres resultados y arranque sin esperar

- [ ] 3.1 `RoadmapsBackend` con `load(): Promise<LoadOutcome<AppData>>`, `save` y `pending`. `BrowserBackend` lo implementa sobre la clave actual, devolviendo `empty` donde devolvía `null` y con un `pending` siempre falso. Verificar que los tests de `app.svelte.test.ts` pasan sin cambios de comportamiento. D4
- [ ] 3.2 Store: `unavailable` y `source`. Solo se siembra con `source === 'browser'` y `empty`. Mientras `unavailable`, toda mutación se ignora. Verificar con un backend falso que devuelve `unavailable` que no siembra, no guarda y que `addRoadmap` no hace nada
- [ ] 3.3 `RoadmapsApp`: pantallas «Abriendo los roadmaps…» y «Los roadmaps no están disponibles», con la misma presentación que `ApiApp` (título, causa y explicación). Verificar visualmente con el backend falso del 3.2 que se distinguen del estado vacío
- [ ] 3.4 `main.ts`: `await store.init()` solo cuando no hay conexión recordada. Con conexión, se lanza al lado, como Decisions. Verificar que, con una conexión recordada y un backend que no responde, la landing y las demás apps montan. Escenario «Las demás siguen funcionando sin la carpeta de Roadmaps»

## 4. Formato canónico

Puro y sin navegador: todo en vitest.

- [ ] 4.1 Serializador por tipo con orden de campos explícito, `JSON.stringify(…, null, 2) + '\n'`, produciendo el mapa nombre → bytes de D1 (marcador, `order.json`, `assignees.json`, `blockers.json`, `rm-<id>.json`). Verificar con tests: dos estados iguales construidos por caminos distintos (seed, import, `addItem`) dan bytes idénticos. D2
- [ ] 4.2 Lectura inversa: mapa nombre → texto a `AppData` por la cadena de normalizaciones de `init()`, con la lectura tolerante de `order.json` (huérfanos al final por nombre, ids sin fichero ignorados). Verificar con tests de ida y vuelta y de `order.json` desalineado. Escenario «Ida y vuelta»
- [ ] 4.3 Errores de lectura como valor: JSON inválido o forma inesperada devuelve el nombre del fichero. Verificar con un fichero con marcas `<<<<<<<` y con un `assignees.json` sin su array. D8
- [ ] 4.4 Test de diff mínimo: mover la fecha de un item cambia solo su `rm-*.json`, y solo las líneas de ese item. Escenario «Un cambio pequeño es un diff pequeño»
- [ ] 4.5 Marcador: escribir `{ "app": "roadmaps", "format": 1 }` y leerlo distinguiendo `nuestra`, `ajena(app)`, `no-nuestra` y `formato-futuro`. Verificar con tests de cada caso

## 5. El módulo de conexión, genérico

Sin ninguna referencia a Roadmaps: el test lo usa con un id de aplicación inventado.

- [ ] 5.1 `folder/handles.ts`: guardar, leer y borrar el handle por id de aplicación en la base `tech-lead-hub-folders`. Verificar con `fake-indexeddb` que dos ids no se pisan y que la base compartida `tech-lead-hub` no se abre. D5
- [ ] 5.2 `folder/permission.ts`: `query` sin gesto y `request` con gesto, devolviendo `granted | prompt | denied`. Verificar con un handle falso
- [ ] 5.3 `folder/connect.ts`: raíz o subcarpeta marcada, y los tres rechazos, sin escribir nada hasta que se confirme. Verificar con un árbol de directorios falso en memoria: elegir raíz vacía, raíz con `roadmaps/` marcada, la propia subcarpeta, la carpeta de `api` y una `roadmaps/` sin marcador. Escenarios del requisito de la subcarpeta
- [ ] 5.4 **Punto de verificación**: `grep -ri roadmap src/lib/folder/` no devuelve nada fuera de comentarios. Es lo que garantiza que API Hub y Links lo usarán tal cual

## 6. Backend de carpeta

- [ ] 6.1 `FolderBackend.load()`: leer la subcarpeta (si falta, `unavailable` por `carpeta-ausente`), parsear con el grupo 4 y llenar el mapa de último estado. Verificar sobre el árbol falso los casos cargado, vacío (marcada sin roadmaps) e ilegible
- [ ] 6.2 `FolderBackend.save()`: escribir solo lo que difiere, borrar solo los `rm-*.json` conocidos, cola con el último estado y `pending`. Verificar con tests: guardar dos veces no escribe la segunda vez, borrar un roadmap borra solo su fichero, un `README.md` ajeno sobrevive, diez saves seguidos producen como mucho dos escrituras por fichero. D6
- [ ] 6.3 El indicador «guardado ✓» se enciende cuando la cola se vacía. Verificar en el test del store con un backend de escritura lenta

## 7. Conectar y desconectar

- [ ] 7.1 Flujo de conectar a carpeta vacía: crear subcarpeta y marcador, volcar, releer, comparar y solo entonces guardar el handle. Verificar con tests: volcado correcto pasa a `folder` y el navegador queda igual byte a byte; un fallo de verificación forzado deja `browser` sin handle guardado. D7
- [ ] 7.2 Flujo de conectar a carpeta con datos: confirmación que dice qué va a pasar, sin fusión. Verificar con test: dos roadmaps en el navegador y cinco en la carpeta dan cinco en pantalla, la carpeta queda sin cambios y el navegador sigue con dos. Escenario «Clonar el repo de un compañero»
- [ ] 7.3 Desconectar: `flush`, esperar a la cola, borrar el handle y volver a hacer `init()` con `BrowserBackend`, con el mensaje de que lo hecho queda en la carpeta. Verificar con test: lo editado conectado no aparece en el navegador y la carpeta lo conserva
- [ ] 7.4 Arranque con conexión recordada: `granted` carga, y `prompt` deja «falta permiso» con «Conceder» (gesto) y «Desconectar». Verificar con permisos falsos en los tres casos, y que «Conceder» lleva a cargar
- [ ] 7.5 «Reintentar» en no disponible relee la carpeta. Verificar con test: arreglar el fichero roto y reintentar carga
- [ ] 7.6 UI: acciones Conectar y Desconectar en el menú de Roadmaps, el nombre de la carpeta visible en su topbar y, sin la API, la explicación de que hace falta Chrome o Edge en lugar de la acción. Verificar en Chrome con una carpeta real y en Safari que no se ofrece

## 8. Landing y cierre

- [ ] 8.1 `hub/types.ts`: `summary()` puede devolver `{ kind: 'unavailable'; reason; grant? }`, y `AppCard` lo pinta sin cifras, con «Conceder acceso» cuando viene `grant`. Verificar que `npm run check` pasa sin tocar los resúmenes de Decisions, API Hub y Links. D10
- [ ] 8.2 `roadmapsSummaryNow` devuelve `unavailable` con `grant` cuando falta el permiso y sin `grant` cuando la carpeta está ilegible. Verificar con test en `registry.test.ts` y en la landing que conceder desde la tarjeta rellena las cifras sin salir. Escenarios de la tarjeta en `hub-landing`
- [ ] 8.3 `App.svelte`: en `beforeunload` con `source === 'folder'`, `flush()` sin esperar y `preventDefault()` si `pending`. Verificar a mano en Chrome: cerrar justo tras arrastrar pide confirmar, y cerrar con todo escrito no lo pide. D9

## 9. Cierre

- [ ] 9.1 README: sección Datos (los dos modos, qué viaja y qué no, que la app no hace git, el aviso de no editar durante un `git pull`) y la línea de Stack. Verificar leyéndolo contra las specs
- [ ] 9.2 **Punto de verificación** de extremo a extremo en Chrome, sobre un clon real: conectar con datos del navegador, editar, `git diff` legible y mínimo, commit y push a una rama. Un segundo perfil de Chrome clona, conecta, ve los mismos roadmaps con su propio plegado, edita y abre PR. Provocar un conflicto y comprobar la pantalla que nombra el fichero
- [ ] 9.3 `npm run check`, `npm run lint` y `npm run test` en verde
