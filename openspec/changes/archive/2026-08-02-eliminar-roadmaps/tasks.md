## 1. Pestaña con control de borrado

- [x] 1.1 En `src/lib/components/Topbar.svelte`, convertir cada pestaña de roadmap de `<button class="tab">` a `<div class="tab">` con dos hijos: `<button class="tab-name">` (conserva el nombre y `store.setActive(rm.id)`) y `<button class="tab-del">`, manteniendo la clase `active` y la key `(rm.id)` en el `{#each}`
- [x] 1.2 Mover a `.tab` los estilos de contenedor que hoy tiene el botón (fondo, borde, radio, altura, `flex-shrink`) y dejar en `.tab-name` los de texto (fuente mono, tamaño, color, `white-space: nowrap`), comprobando que la pestaña `meta`, que sigue siendo un botón suelto, no cambia de aspecto
- [x] 1.3 Estilar `.tab-del` a imagen de `.row-del` en `Gantt.svelte`: oculta salvo `:hover` del `.tab` o confirmación pendiente, y en estado `.confirm` fondo `--danger`, tinta `--ink-on-danger`, 9px mono y peso 600

## 2. Doble confirmación

- [x] 2.1 Añadir `let confirmDel = $state<string | null>(null)` y una función `delRoadmap(id)` que arme la confirmación en la primera pulsación y solo borre en la segunda, replicando el patrón de `Gantt.svelte`
- [x] 2.2 Hacer que el texto del aspa sea `borrar?` cuando `confirmDel === rm.id` y `✕` en el resto, con `class:confirm` y un `title` que anticipe la acción
- [x] 2.3 Detener la propagación del evento en `.tab-del` para que pedir confirmación no active esa pestaña — resuelto estructuralmente: `.tab-name` y `.tab-del` son hermanos dentro de un `<div>` sin manejador, así que no existe ruta de propagación hacia `setActive` y un `stopPropagation` sería código muerto
- [x] 2.4 Añadir un `$effect` que, mientras `confirmDel` no sea `null`, registre en `window` un listener de `pointerdown` en captura que descarte la confirmación salvo si el evento nace dentro del botón pendiente, y lo retire al limpiarse

## 3. Estado coherente tras el borrado

- [x] 3.1 En la segunda pulsación llamar a `store.deleteRoadmap(id)` y, si `ui.drawer.kind === 'detail'`, a `ui.closeDrawer()`
- [x] 3.2 Verificar en la app que borrar el roadmap activo salta a otro roadmap existente y que borrar el último deja el estado vacío "no hay roadmaps", desde el que "+ nuevo" vuelve a funcionar
- [x] 3.3 Verificar que el borrado se persiste: recargar la app y comprobar que el roadmap eliminado no reaparece

## 4. Pruebas

- [x] 4.1 Intentar un test unitario de `deleteRoadmap` en `src/lib/store/app.svelte.test.ts` con un `Storage` de prueba, cubriendo borrar un roadmap inactivo, borrar el activo (reasigna `activeId`) y borrar el último (`activeId` a `null`); si el entorno `node` de vitest no compila las runas de `.svelte.ts`, dejarlo fuera y anotarlo en el resumen en lugar de reconfigurar el runner
- [x] 4.2 Comprobar a mano los escenarios del spec que no cubre un test unitario: la primera pulsación no borra, pulsar el aspa de otra pestaña desarma la anterior, pulsar fuera cancela y pedir confirmación no cambia el roadmap activo

## 5. Verificación

- [x] 5.1 `npm test` en verde
- [x] 5.2 `npm run lint` y `npm run check` sin hallazgos
- [x] 5.3 Revisar la fila de pestañas con varios roadmaps y nombres largos: el aspa no desplaza el texto al aparecer ni rompe el scroll horizontal de `.tabs`
