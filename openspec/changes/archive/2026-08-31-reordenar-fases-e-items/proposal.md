## Why

El orden vertical de las fases de un roadmap y de los items dentro de una fase es información: dice en qué secuencia se lee el plan. Hoy ese orden solo se puede fijar en el momento de crear la fila, porque `addPhase` y `addItem` empujan al final del array y no hay ninguna forma de mover nada después. Quien se equivoca de sitio, o quien reordena el plan al replanificar, no tiene salida más que borrar y volver a crear —perdiendo notas, responsable, dependencias, bloqueos y completitud por el camino.

El HTML original, `roadmap_tool_6_6_2.html`, sí permitía arrastrar filas para reordenarlas. El port a Svelte de `2026-07-31-desktop-foundation` no lo trajo, y tampoco lo registró como hueco: sus tareas 6.1 y 6.2 dieron la paridad por validada, y ninguna spec recogió jamás la capacidad. No es una regresión que se colara después —no hay código que resucitar en la historia del repositorio— sino un agujero de paridad que llevaba abierto desde el primer commit sin que nadie lo hubiera escrito.

Que no esté specificado es precisamente el motivo de que se perdiera. Este change lo cierra y, sobre todo, lo deja dicho.

## What Changes

- **Manija de arrastre en el canalón** de cada fila de la barra lateral, a la izquierda del chevron en las fases y del punto de color en los items. Aparece al pasar el ratón por la fila, con el mismo patrón de espacio reservado y `opacity` que ya usa el botón de borrar, para que la fila no salte.
- **Arrastrar una fase la reordena entre las fases de su roadmap.** Se levanta únicamente la cabecera, que sigue al puntero translúcida; sus items y su fila de "añadir" se desplazan al destino junto con el resto de bloques.
- **Arrastrar un item lo reordena entre los items de su fase.** Al llegar al primero o al último la fila se frena: el puntero puede seguir, la fila no. Es la contención hecha visible.
- **Las filas no arrastradas se apartan en vivo** hacia la posición que van a ocupar, en ambos paneles a la vez —barra lateral y parrilla—, de modo que lo que se ve durante el gesto es ya el resultado.
- **Un item completado se puede reordenar.** La completitud congela fechas, y el orden no es una fecha. Es la única de las cuatro formas de arrastrar una fila que un item congelado conserva.
- **La reordenación se persiste** como cualquier otra edición, por el camino de guardado con retardo que ya existe.

Fuera de alcance, registrado como trabajo futuro:

- **Desplazamiento automático al arrastrar contra el borde** de la zona visible. Ninguno de los cuatro arrastres actuales lo necesita, así que sería mecánica nueva; con pocas fases sobra sin él y con muchas se echará en falta. Decisión explícita de dejarlo para cuando se note.
- **Cruzar de contenedor**: mover un item a otra fase, o una fase a otro roadmap. Ver D2, donde se explica que no es una omisión de esfuerzo sino de corrección.
- **Reordenar roadmaps** en la vista "Todos", que `2026-08-02-navegacion-roadmaps` ya dejó fuera en su día y sigue fuera.
- **Deshacer.** La aplicación no lo tiene en ninguna parte, y una suelta equivocada se corrige arrastrando de vuelta.

No hay cambios de modelo ni de portabilidad: el orden ya vive en la posición dentro de `rows` y `children`, y los JSON exportados ya lo llevan.

## Capabilities

### Modified Capabilities

- `roadmap-editor`: incorpora la reordenación vertical de fases e items como requisito propio, distinto del que describe la edición de fechas por arrastre en la cuadrícula. Uno mueve la fila en el tiempo, el otro en el orden, y son ejes independientes.
- `completion`: precisa que el congelamiento de un item completado alcanza a sus fechas y no a su posición, cerrando la ambigüedad que abre la existencia de un cuarto arrastre.

## Impact

**Interfaz**

- `src/lib/components/Gantt.svelte`: la manija en las filas de la barra lateral, el estado del gesto, el posicionamiento de las filas por índice de previsualización en los dos paneles, y el levantado de la cabecera. Es el grueso del cambio.

**Modelo y store**

- `src/lib/model/derive.ts`: el mapa de bloques y el cálculo del índice de destino, como funciones puras con sus pruebas.
- `src/lib/store/app.svelte.ts`: `movePhase` y `moveItem`, que permutan el array y programan el guardado. No pasan por `commit()`: reordenar no puede violar ninguna restricción de dependencias (ver D4).

**Sin impacto**

- `src/lib/model/types.ts`: ningún campo nuevo. El orden es la posición.
- `src/lib/io/portability.ts`: los arrays ya se exportan e importan en orden.
- `src/lib/model/constraints.ts`: no se toca. D4 explica por qué no hace falta.
- El contrato de tokens de tema y `colorSlot`: el color es identidad, no posición, así que reordenar no recolorea nada.
