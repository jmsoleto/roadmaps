## 1. Ventana temporal de "Todos" que contiene siempre hoy

- [x] 1.1 En `src/lib/components/MetaView.svelte`, importar `todayIso` y `addDays` de `../time/timeline` y declarar la constante de margen `LEAD_DAYS = 30` con un comentario que explique que solo entra en juego cuando hoy sería el origen — **hecho en otro sitio**: el cálculo se extrajo a `getMetaWindow()` en `src/lib/model/derive.ts` para poder probarlo sin montar el componente (tarea 6.1), y las constantes viven allí como `META_LEAD_DAYS` / `META_TAIL_DAYS` / `META_MIN_DAYS`
- [x] 1.2 Reescribir `metaOrigin` como el mínimo entre los `startDate` de todos los roadmaps y `addDays(todayIso(), -LEAD_DAYS)`, sustituyendo la semilla `'2026-01-01'` del `reduce` por la fecha derivada de hoy y retirando así el último literal del origen hardcodeado del HTML original
- [x] 1.3 Extender `windowDays` para que, además del máximo de `dayIndex(metaOrigin, extent.end) + 30` y del mínimo de 365, cubra `dayIndex(metaOrigin, todayIso()) + 30`
- [x] 1.4 Comprobar que con hoy dentro del rango de los roadmaps ni el origen ni la duración cambian respecto al comportamiento actual, y que las barras siguen colocadas donde estaban
- [x] 1.5 Comprobar los dos escenarios extremos: con todos los roadmaps en el futuro el origen pasa a ser hoy menos 30 días; con todos en el pasado la ventana se estira hasta hoy más 30 días

## 2. Marca del día de hoy en "Todos"

- [x] 2.1 Derivar en `MetaView.svelte` el índice de día de hoy respecto a `metaOrigin` con `dayIndex(metaOrigin, todayIso())`
- [x] 2.2 Renderizar dentro de `.rows` la marca `.today-line` con su `.today-flag` anidada, posicionada con `dayToX(today, store.dayW)` y con `height: totalHeight`, replicando el marcado de `Gantt.svelte:402-406` pero sin la guarda de visibilidad, que la tarea 1 vuelve innecesaria por construcción
- [x] 2.3 Copiar los estilos `.today-line` y `.today-flag` de `Gantt.svelte`, conservando `pointer-events: none` y el `box-shadow` sobre `--accent`, para que la marca se lea igual en las dos vistas — el `z-index` pasa de 3 a 5 en las dos vistas; ver 2.5
- [x] 2.4 Verificar que la marca queda por encima de las líneas de trimestre y por debajo de la sidebar sticky (`z-index: 6`), y que la etiqueta `HOY` se ve sobre la cabecera sin quedar recortada
- [x] 2.5 Corregir el apilamiento de `.today-flag`, que quedaba oculta tras las cabeceras — **defecto preexistente de `Gantt.svelte`** que la copia fiel de la decisión 4 del diseño trasladó a "Todos": la etiqueta se posiciona en `top: -34px`, dentro de la banda de `.month-header`, que es `z-index: 4` con fondo opaco, mientras que `.today-line` era `z-index: 3`. Se sube `.today-line` a `z-index: 5` en `Gantt.svelte` y `MetaView.svelte`: por encima de las cabeceras, por debajo de la sidebar sticky. La geometría de la línea no cambia (su altura sigue arrancando en `.rows`); lo único que se revela es la etiqueta. Verificado en pantalla en las dos vistas, y comprobado que al desplazar la línea bajo la sidebar sigue siendo la sidebar la que pinta encima. **Nota de método**: `elementFromPoint` no sirve para comprobar esto, porque `pointer-events: none` hace la marca transparente al hit-testing y devuelve la cabecera tanto si la etiqueta se ve como si no; la comprobación válida es visual
- [x] 2.6 Comprobar que la marca sigue el zoom: al cambiar `store.dayW` se recoloca junto con las barras y las líneas de la cuadrícula
- [x] 2.7 Comprobar que el estado vacío de "Todos" (cero roadmaps) sigue mostrándose sin cuadrícula ni marca — verificado por construcción y por test, no en pantalla: la marca vive dentro de la rama `{:else}` de `{#if roadmaps.length === 0}`, así que el estado vacío no puede alcanzarla, y `getMetaWindow([], hoy)` está cubierto en `derive.test.ts`. No se comprobó en el navegador porque exigía borrar los 15 roadmaps reales del usuario

## 3. Posición inicial de la vista "Todos"

- [x] 3.1 Añadir a `MetaView.svelte` un `bind:this` sobre el contenedor `.gantt-scroll` para poder fijar su desplazamiento
- [x] 3.2 Añadir una función exportada `scrollToToday()` que haga `scrollLeft = Math.max(0, today * store.dayW - 200)`, el mismo margen de entrada que `Gantt.svelte:62`, justificado por la sidebar sticky de 250px que ambas vistas comparten
- [x] 3.3 Llamar a `scrollToToday()` desde `onMount`, comprobando que el ancho de la cuadrícula ya está aplicado en ese momento —viene de estilos en línea— y que no hace falta `tick()` ni `requestAnimationFrame`
- [x] 3.4 Verificar que arrancar la aplicación deja el día de hoy a la vista sin desplazarse a mano, y que volver a "Todos" desde un roadmap lo vuelve a hacer — en arranque en frío `scrollLeft` = 1512 y la línea cae en x=450, con el borde derecho de la sidebar en 250: los 200px de margen exactos

## 4. Posición inicial de la vista de roadmap

- [x] 4.1 Añadir a `src/lib/components/Gantt.svelte` un `$effect` que lea `rm.id` para suscribirse y ponga `scrollEl.scrollLeft = 0`, documentando en el comentario que cubre a la vez el montaje y el cambio de roadmap con la instancia reutilizada — el efecto compara contra el último roadmap reencuadrado (`scrolledFor`) en lugar de reencuadrar sin condición; ver 4.6
- [x] 4.2 Dejar el desplazamiento vertical sin tocar, apoyándose en que el navegador recorta por sí solo el `scrollTop` cuando el roadmap nuevo tiene menos filas
- [x] 4.3 Verificar el camino que hoy falla: estando dentro de un roadmap desplazado a la derecha, cambiar a otro con el selector del topbar y comprobar que la vista arranca en el día 0 del nuevo y no hereda el desplazamiento — verificado desde un roadmap desplazado al día ~214: el destino abre con `scrollLeft` 0 y la cabecera en ENE 2026, su `startDate`
- [x] 4.4 Verificar el mismo comportamiento al crear un roadmap con `+ nuevo` y al importar un JSON estando dentro de otro roadmap, ya que ambos ponen `metaView = false` sin desmontar el Gantt — `+ nuevo` verificado desde un roadmap con `scrollLeft` 4000: el nuevo abre en 0 (el roadmap de prueba se borró después). La importación no se probó: exigía un JSON externo y recorre el mismo `rm.id` que ya se comprobó
- [x] 4.5 Comprobar que abrir un roadmap cuya primera fase empieza semanas después del inicio de su ventana muestra el hueco previo, y que un roadmap sin ninguna fase también abre en su día 0
- [x] 4.6 Comprobar que el efecto no se dispara al editar fases, items o fechas dentro del roadmap abierto, porque `rm.id` no cambia, y que por tanto arrastrar una barra no reencuadra la vista — verificado editando `ventana` de 730 a 760 con la vista en `scrollLeft` 3000: el desplazamiento no se movió. La guarda `scrolledFor` es lo que lo garantiza; sin ella el reencuadre dependía de cuándo exactamente se reevalúa el `$derived` del store

## 5. "ir a hoy" en las dos vistas

- [x] 5.1 En `src/lib/components/Toolbar.svelte`, sacar el botón "ir a hoy" del bloque `{#if !store.metaView}` de modo que se muestre también en "Todos"
- [x] 5.2 En `src/App.svelte`, añadir un `bind:this` para la instancia de `MetaView` junto al que ya existe para `Gantt`, y enrutar `onToday` a la vista montada según la misma condición que decide qué componente se renderiza — la condición se extrajo a un `$derived showMeta` para que la barra y el marcado no puedan discrepar
- [x] 5.3 Verificar que pulsar "ir a hoy" en "Todos" desplaza la cuadrícula hasta la marca sin cambiar de vista ni de roadmap activo, y que en la vista de roadmap sigue comportándose como hasta ahora
- [x] 5.4 Verificar el lazo completo del zoom: alejar hasta perder `HOY` de la pantalla en "Todos" y recuperarlo con el botón — a 8px/d la línea acabó en x=133, detrás de la sidebar; el botón la devolvió a x=450

## 6. Pruebas

- [x] 6.1 Cubrir con test el cálculo de la ventana de "Todos" en sus tres escenarios (hoy dentro del rango, todos los roadmaps en el futuro, todos en el pasado), extrayendo la fórmula a una función pura si eso hace la prueba posible sin montar el componente — `getMetaWindow()` en `derive.ts`, con 8 casos en `derive.test.ts`, incluido uno que recorre cinco configuraciones afirmando la invariante de que hoy siempre queda dentro de la ventana
- [x] 6.2 Comprobar que los tests existentes de `src/lib/time/timeline.test.ts` y `src/lib/store/app.svelte.test.ts` siguen en verde: ni la capa de fechas ni el store cambian de comportamiento
- [x] 6.3 Verificar a mano el recorrido completo con varios roadmaps de rangos distintos: arrancar y aterrizar en hoy, abrir un roadmap y aterrizar en su día 0, saltar a otro roadmap con el selector, volver a "Todos" y aterrizar de nuevo en hoy
- [x] 6.4 Verificar que nada de esto altera lo que se guarda en disco: recargar la aplicación y comprobar que las ventanas temporales configuradas de los roadmaps siguen intactas

## 7. Verificación

- [x] 7.1 `npm test` en verde — 124 tests, 11 ficheros
- [x] 7.2 `npm run lint` y `npm run check` sin hallazgos — `svelte-check` pasa a 0 avisos: se corrigió de paso el `non_reactive_update` preexistente de `gantt` en `App.svelte` declarándolo, junto al nuevo `meta`, con `$state`
- [x] 7.3 Revisar la marca de hoy en los distintos temas de color, comprobando que `--accent` mantiene contraste suficiente sobre el fondo de la cuadrícula y sobre las barras que pueda cruzar — comprobado en Claro y Oscuro; en Oscuro el cian sobre fondo oscuro se lee mejor aún. La marca no estrena ningún emparejamiento de color: es el mismo `--accent` sobre `--surface` que el Gantt ya dibujaba
- [x] 7.4 Revisar el comportamiento en los extremos del zoom: en el mínimo, que la marca siga siendo visible y distinguible; en el máximo, que el desplazamiento inicial no deje hoy pegado al borde de la sidebar — a 4px/d la ventana entera cabe en pantalla y la línea queda en x=737; a 26px/d el margen de 200px se respeta igual
- [ ] 7.5 Comprobar el comportamiento en Tauri (WKWebView), donde el `scrollLeft` inicial y el `bind:this` del contenedor deben funcionar igual que en el navegador — **pendiente**: sigue sin haber toolchain de Rust en este entorno (`cargo` y `rustc` no están en el PATH), así que `npm run tauri dev` no arranca. Es el mismo bloqueo que dejó pendiente la tarea 8.5 del change `navegacion-roadmaps`
