## 1. El contrato de aplicación crece

- [x] 1.1 `hub/types.ts`: `HubApp` gana `root` (componente de pantalla), `context` (componente del segundo nivel del breadcrumb, `null` cuando la aplicación no lo tiene) y `actions` (función que devuelve datos, no marcado) — D1
- [x] 1.2 Tipo `AppAction` con sus dos formas: `button` con `run()`, y `file` con `accept` y `run(text)` — D2. Ambas con `label`, `title?` y `disabled?`
- [x] 1.3 `actions` es una función y no un objeto, por el mismo motivo que `summary`: `disabled` lee estado reactivo y un objeto fijo sería una segunda fuente de verdad
- [x] 1.4 Corrección sobre lo planificado: el check **no** puede estar verde aquí. Añadir campos obligatorios a `HubApp` rompe `compose` hasta que el registro los aporta, así que la puerta verde es el final de la sección 2 y no el de esta

## 2. Mudar el armazón, sin cambiar nada visible

- [x] 2.1 `registry.ts`: Roadmaps declara `root` (su `Toolbar` + `Gantt`/`MetaView`), `context` (`RoadmapSwitcher`) y sus tres acciones — nuevo, importar (fichero), exportar
- [x] 2.2 Roadmaps necesita un componente raíz propio: hoy su `Toolbar`, la elección entre `Gantt` y `MetaView` y las referencias para "ir a hoy" viven en `App.svelte`. Se extraen a `components/RoadmapsApp.svelte`, que es lo que registra
- [x] 2.3 `registry.ts`: Decisions declara `root` (`DecisionsApp`), `context: null` y sus tres acciones, con el `disabled` que ya tienen hoy contra `decisions.unavailable`
- [x] 2.4 `App.svelte` deja de nombrar aplicaciones: pinta el `root` de la aplicación activa, o `HubLanding` si no hay ninguna. Los diálogos montados una sola vez —`NewRoadmapDialog`, `QuickCapture`, `Drawer`, `DragTooltip`— se quedan donde están: no pertenecen a la rama de ninguna aplicación
- [x] 2.5 `Topbar.svelte` deja de nombrar aplicaciones: marca, conmutador, `context` de la aplicación (o el `spacer` cuando es `null`), sus acciones, y las del contenedor
- [x] 2.6 Un único `<input type="file">` oculto en el topbar, apuntado a la acción activada; los dos actuales desaparecen. El mensaje de error efímero se queda en el topbar y deja de duplicarse — D2
- [x] 2.7 Los componentes raíz no reciben props: leen sus stores, para que el registro no necesite tiparlas — riesgo anotado en el design
- [x] 2.8 **Punto de verificación**: Roadmaps y Decisions se ven y se comportan exactamente igual que antes. Crear, importar y exportar en las dos; el tema desde las tres pantallas; el breadcrumb; el conmutador. Nada de esto debe haber cambiado

## 3. Identidad de la tercera aplicación

- [x] 3.1 `identity.ts`: cuarto par `#FBBF24 → #FB7185` y cuarto valor de `AppGlyph` — D7
- [x] 3.2 `AppIcon.svelte`: el glifo de las dos llaves con el punto entre ellas, calado en `GLYPH_INK`. Comprobarlo a 18 px, que es donde se rompe
- [x] 3.3 `identity.test.ts` cubre el par nuevo solo, al recorrer `IDENTITY_CATALOG`: contraste ≥ AA contra la tinta y par no repetido. Verificado: 11.66:1 y 7.23:1
- [x] 3.4 `apps.ts`: definición de API Hub — id `api`, nombre "API Hub", tagline, `createLabel`, ruta `#/api`, estado vivo — D8. Sigue sin importar ningún store
- [x] 3.5 Comprobar que `shortName()` da "API" y que `parseHash` resuelve `#/api`

## 4. El documento y su almacén

- [x] 4.1 `api/model/types.ts`: `Contract`, `Endpoint`, `Model` y `Node`, planos y serializables, sin clases ni métodos — D5. `Node` y compañía se definen enteros aunque este change no los cree
- [x] 4.2 `ApiData` con `contracts: Contract[]` y el contrato abierto, como `AppData` con `roadmaps` y el activo
- [x] 4.3 `api/model/normalize.ts`: lo que entra se normaliza, idempotente y sin forzar escritura, como los cuatro normalizadores de Roadmaps
- [x] 4.4 `api/storage.ts`: base `tech-lead-hub` a v3 con `apiContracts` y `apiLibrary` — D9. Reutilizar `openDatabase` de Decisions en lugar de duplicar el timeout, el `onblocked` y el promisificador
- [x] 4.5 El seam devuelve `LoadOutcome` de tres ramas, no `T | null` — D9. **Decidido: se comparte.** `LoadOutcome<T>` pasa a ser genérico y vive con la conexión en `store/indexeddb.ts`; `decisions/storage.ts` lo reexporta para no tocar sus tests
- [x] 4.6 `api/store.svelte.ts`: documento en `$state`, mutaciones por métodos, guardado con debounce, `unavailable` que bloquea toda mutación, `justSaved`, `ready`
- [x] 4.7 `structuredClone` del snapshot antes del `put`, nunca del proxy — D6. **Corrección:** el clon del seam no desenvuelve un proxy, lo rechaza; el que protege es el `$state.snapshot` del store. Fijado con un test que exige el rechazo, para que la razón no se pierda
- [x] 4.8 `main.ts`: `void apiContracts.init()` **fuera** del `await Promise.all` — D10
- [x] 4.9 `App.svelte`: el `beforeunload` que hoy vuelca Roadmaps tiene que volcar también los cambios pendientes de la aplicación nueva
- [x] 4.10 Pruebas del almacén con `fake-indexeddb`: primer arranque vacío, documento ilegible que se trata como vacío, almacén que no abre, y que subir a v3 no toca los datos de Decisions

## 5. Contratos: alta, copia, borrado y orden

- [x] 5.1 `addContract`: título, y `colorSlot` por `contracts.length % PALETTE_SLOTS` — D11
- [x] 5.2 `duplicateContract`: copia independiente con identificadores nuevos en todo el árbol, sobre el snapshot y no sobre el proxy — D6
- [x] 5.3 `renameContract`, `deleteContract` con confirmación, y `moveContract` para el orden
- [x] 5.4 Borrar el contrato abierto deja la aplicación en su inicio, sin ninguno a medio abrir
- [x] 5.5 Títulos duplicados permitidos: es un nombre para reconocer, no una clave
- [x] 5.6 `api/ui.svelte.ts`: el estado de interfaz que no se persiste
- [x] 5.7 Pruebas del store: alta con su slot, duplicado independiente en los dos sentidos, borrado del abierto, orden, y que con `unavailable` puesto ninguna mutación pasa

## 6. La pantalla

- [x] 6.1 `components/api/ApiApp.svelte`: inicio con la lista de contratos y su estado vacío que ofrece crear el primero
- [x] 6.2 `components/api/ContractSwitcher.svelte`: el segundo nivel del breadcrumb, con ancho independiente del número de contratos, siguiendo a `RoadmapSwitcher`
- [x] 6.3 Los datos de la API —título, versión, descripción, servidor base— editables, sin ninguno obligatorio
- [x] 6.4 Registrar `root`, `context` y las acciones de API Hub en `registry.ts`. En este change no declara ninguna acción de fichero
- [x] 6.5 Entrar en la aplicación lleva a su inicio; el gancho de entrada se registra en `initHub` como los otros dos. **Corrección de spec:** el inicio de API Hub es el contrato en el que se estaba, no la lista. La spec se contradecía —«entrar muestra la lista» contra «vuelve abierto el que estaba»— y `hub-shell` deja que cada aplicación defina el suyo. El gancho solo limpia la interfaz transitoria
- [x] 6.6 Todo con tokens del tema. Ni un color de la paleta del prototipo — D7

## 7. La tarjeta en el hub

- [x] 7.1 `api/summary.ts`: cifras (contratos, endpoints, modelos), lista corta de contratos abiertos recientemente con su versión al final, y ningún aviso todavía
- [x] 7.2 El color de cada fila sale del `colorSlot` del contrato, no de su posición — D11
- [x] 7.3 Generalizar `usage.svelte.ts` para que registre aperturas por aplicación: `usage.ts` ya es genérico, el cableado no
- [x] 7.4 `openRow` abre ese contrato saltándose el inicio de la aplicación, con el mismo orden que Roadmaps y Decisions: entrar primero, nombrar después
- [x] 7.5 `create` entra con el alta de contrato ya iniciada
- [x] 7.6 Pruebas del resumen: cifras a cero sin contratos, orden por apertura reciente, y que un contrato borrado desaparece de la lista

## 8. Verificación

- [x] 8.1 Que Roadmaps y Decisions siguen exactamente igual tras el refactor: sus acciones, sus diálogos, sus breadcrumbs, el "ir a hoy" del Gantt y de "Todos"
- [x] 8.2 Verificado a nivel de unidad en `registry.test.ts` —cada acción de fichero declara su `accept` y su `run` lanza ante un documento ilegible, que es lo que el topbar convierte en el mensaje— más los tests de los dos parsers. **No verificado de extremo a extremo**: el selector nativo de ficheros bloquea la automatización del navegador y no se puede accionar desde aquí
- [x] 8.3 Que se entra en API Hub desde la tarjeta, desde el conmutador y recargando en `#/api`
- [x] 8.4 Que el glifo se reconoce a 18 px en el conmutador y a 46 px en la tarjeta
- [x] 8.5 Que cambiar de tema cambia el interior de API Hub y no su icono
- [x] 8.6 Que los contratos sobreviven a cerrar el navegador, y que vuelve abierto el que estaba
- [x] 8.7 Comprobado que un cambio sobrevive a recargar. **No forzado**: la ventana por debajo del agrupamiento de 250 ms no se puede provocar desde la automatización; el `flush` sí está cubierto por test
- [x] 8.8 Que con el almacén de API Hub caído el hub, Roadmaps y Decisions funcionan, y API Hub dice que no está disponible en vez de enseñar la lista vacía
- [x] 8.9 Cubierto por test con la apertura inyectada —rechazo y `unavailable` en vez de lista vacía—, que es el mismo camino que recorre un `onblocked` real. Dos pestañas con versiones distintas de la base no son reproducibles desde aquí
- [x] 8.10 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 8.11 Actualizar el README: la tabla de aplicaciones —que además dice que Decisions está "anunciada" cuando lleva viva desde hace changes—, y cómo se registra una aplicación ahora que también aporta su pantalla
