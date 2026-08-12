## Why

Crear un roadmap hoy no pregunta nada: `store.addRoadmap()` fabrica el nombre por el usuario (`Roadmap ${n+1}`), lo inserta y salta directamente a su vista. El nombre es lo único que distingue un roadmap de otro en el selector, en la miga de pan y en las filas de "Todos", así que el flujo actual crea sistemáticamente entidades sin identidad y delega en el usuario recordar que después debe ir a "Todos" a renombrarlas. Quien no lo haga acumula "Roadmap 2", "Roadmap 3", "Roadmap 4" y pierde la capacidad de navegar por nombre, que es justamente la que se construyó con el selector con búsqueda.

Además, nada impide hoy que dos roadmaps se llamen igual. Dos filas idénticas en "Todos" y dos entradas idénticas en el selector destruyen la navegación por nombre incluso para un usuario cuidadoso: el filtro devuelve ambas y no hay forma de saber cuál es cuál.

## What Changes

- El botón **"+ nuevo"** del topbar deja de crear el roadmap al pulsarlo. Abre un **modal** que pide el nombre; el roadmap se crea, se marca como activo y se abre su vista **solo al aceptar**. Cancelar (botón, `Escape` o clic fuera) no crea nada y deja al usuario donde estaba.
- El CTA **"+ crear el primero"** del estado vacío de "Todos" pasa por el mismo modal.
- **El nombre no puede quedar vacío** ni consistir solo en espacios.
- **Dos roadmaps no pueden llamarse igual.** La comparación es insensible a mayúsculas, acentos y espacios: `"Plataforma Q1"`, `"plataforma q1"` y `"PlataformaQ1"` son el mismo nombre a efectos de colisión. El nombre **se guarda tal y como lo escribe el usuario**; la normalización es interna y solo sirve para detectar el choque.
- El campo arranca **vacío**, con el nombre sugerido como `placeholder` en vez de como valor. La sugerencia por contador (`Roadmap ${n+1}`) podría chocar con un roadmap existente y abrir el modal ya inválido.
- Mientras el nombre sea inválido, **el modal no se cierra**: el botón de aceptar queda deshabilitado y bajo el campo se explica el motivo (vacío o ya existe).
- **La unicidad se exige únicamente en el alta.** Renombrar desde la fila de "Todos" e importar un roadmap desde JSON siguen sin comprobarla, y por tanto pueden seguir produciendo nombres repetidos. Es un límite deliberado: el modal existe para evitar el duplicado por descuido al crear, no para blindar el modelo de datos.
- Los datos ya guardados que contengan nombres repetidos **se cargan tal cual**. El arranque no reescribe nombres del usuario.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `roadmap-editor`: el requisito "Gestión de roadmaps desde la vista Todos" declara hoy que el sistema debe permitir crear roadmaps sin decir nada sobre cómo se nombran. Se añade un requisito para el alta con nombre explícito: modal que pide el nombre antes de crear nada, rechazo del nombre vacío, unicidad de nombre bajo comparación insensible a mayúsculas, acentos y espacios, preservación literal del nombre escrito, y el alcance limitado al alta (renombrado e importación quedan fuera de forma explícita).

## Impact

- `src/lib/store/app.svelte.ts`: `addRoadmap()` pasa a recibir el nombre y a informar de si prosperó, en vez de fabricarlo. Se le suma la comprobación de unicidad, apoyada en una clave de comparación reutilizable. `renameRoadmap()` e `importFromText()` no cambian.
- `src/lib/components/Topbar.svelte`: `onclick` de "+ nuevo" pasa de mutar el store a abrir el modal.
- `src/lib/components/MetaView.svelte`: mismo cambio en el CTA "+ crear el primero".
- Componente nuevo para el modal de creación. Es el primer diálogo modal de la app: hasta ahora todo lo flotante son drawers laterales (`ui.svelte.ts` → `DrawerState`) o popovers anclados (`RoadmapSwitcher.svelte`). Hay que fijar overlay, foco inicial, cierre por `Escape` y por clic fuera.
- `src/lib/util/`: función pura nueva para la clave de comparación de nombres (`NFD` + quitar diacríticos + quitar espacios + minúsculas), testeable de forma aislada.
- `src/lib/store/app.svelte.test.ts`: hoy ninguna suite ejerce `addRoadmap()`; se añaden los casos de alta correcta y de rechazo por vacío y por duplicado.
- Sin cambios en el modelo de datos (`AppData`, `Roadmap`), en el formato persistido ni en el de importación/exportación. Un archivo guardado antes de este cambio se abre igual, incluso si contiene nombres repetidos.
