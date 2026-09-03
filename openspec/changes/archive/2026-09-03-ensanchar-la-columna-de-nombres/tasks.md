## 1. El suelo: que la columna y las cabeceras lleguen abajo

- [x] 1.1 En `Gantt.svelte`, `align-items: flex-start` en `.gantt-scroll` y `min-height: 100%` en `.sidebar` y `.grid-area` (D1). Dejar escrito en el comentario por qué: el estiramiento del flex da a los hijos el alto **visible** del contenedor, y `min-height: auto` no lo impide porque el mínimo automático solo actúa en el eje principal
- [x] 1.2 Lo mismo en `MetaView.svelte`, que clona la estructura. Anotar en el comentario que es la segunda razón concreta para extraer la columna a un componente compartido, sin hacerlo aquí
- [x] 1.3 Comprobar en la aplicación servida, con fases suficientes para pasar de una pantalla, que con el scroll abajo del todo la caja de `.sidebar` y la de `.grid-area` miden lo mismo que `scrollHeight` y no una pantalla
- [x] 1.4 Comprobar los tres síntomas del fallo, uno a uno y con el scroll abajo del todo: la columna sigue delimitada frente a la cuadrícula, la cabecera de meses y la de sprints siguen ancladas arriba, y la banda maciza superior sigue separando las filas de la barra de herramientas
- [x] 1.5 Comprobar el caso contrario, que es el que el estiramiento tapaba: un roadmap con una sola fase y un roadmap sin ninguna quedan delimitados hasta el borde inferior, sin franja sin pintar bajo la última fila. Incluye el caso de menos de cuatro filas, donde `totalHeight` se queda en su mínimo de 200 y la rejilla ya es más alta que la columna por su cuenta
- [x] 1.6 Comprobar lo mismo en la vista "Todos", con roadmaps suficientes para pasar de una pantalla y también con uno solo

- [x] 1.7 `position: sticky` en `.sidebar-head` y `.sidebar-head-spacer` de las dos vistas, con los offsets de `.month-header` y `.sprint-header`, y `background` propio en la primera (D8). Comprobar que con el scroll abajo la banda de la esquina queda alineada con la cabecera de la rejilla y ninguna fila se cuela por debajo de ella

## 2. El ancho como estado

- [x] 2.1 En `store/app.svelte.ts`, `sidebarW` y `metaSidebarW` junto a `dayW` (D2), con el ancho por defecto de hoy como valor inicial. Documentar por qué viven aquí y no en `ui.svelte.ts`, que se declara «Transient UI state»
- [x] 2.2 Hidratarlos en `init()` junto a `getPref('zoom')`, ignorando un valor guardado que no sea un número utilizable, igual que hace el zoom con un nivel desconocido
- [x] 2.3 Un método por vista para fijar el ancho, que aplique el mínimo y el máximo del gesto y escriba con `setPref` (D2, D3). Verificar con tests de store: que recorta por abajo al mínimo, que recorta por arriba a la mitad del ancho dado, que un valor intermedio pasa tal cual, y que los dos anchos son independientes entre sí
- [x] 2.4 Test de hidratación: un almacén con los dos anchos guardados los restaura; un almacén sin ellos arranca en el valor por defecto; un valor corrupto o fuera de rango no rompe el arranque
- [x] 2.5 Verificar que ningún ancho entra en `AppData`: exportar e importar no los menciona ni los altera

## 3. El tirador

- [x] 3.1 En `Gantt.svelte`, `--sidebar-w` en el contenedor de scroll y `.sidebar { width: var(--sidebar-w, 250px) }` (D5). El respaldo es lo que pinta el primer fotograma mientras `init()` resuelve; dejarlo escrito
- [x] 3.2 El tirador: elemento absoluto en el borde derecho de `.sidebar`, de arriba abajo, por encima de las filas, con `cursor: col-resize`, zona de agarre más ancha que la línea visible, y `touch-action: none` (D4). Anotar la razón del `touch-action`, que es la misma que la de `.row-grip`
- [x] 3.3 El gesto sobre `onDrag` de `interactions/drag.ts`: en `move`, fijar el ancho aplicando `clamp(x, mínimo, ventana / 2)` en vivo; en `up`, persistir una sola vez (D2, D3)
- [x] 3.4 Reutilizar `.gantt-scroll.reordering` para el `user-select: none` mientras dura el arrastre, en lugar de estrenar una segunda clase con el mismo cuerpo (D4)
- [x] 3.5 El límite de pintado (D3): al aplicar el ancho, no exceder el ancho de la ventana menos un margen que deje el tirador claramente dentro. Dejar escrito que es un límite físico y no la regla de media pantalla, y que **no** toca el valor guardado
- [x] 3.6 Lo mismo en `MetaView.svelte` con `metaSidebarW`
- [x] 3.7 Comprobar en la aplicación: arrastrar ensancha siguiendo al puntero; pasado el medio de la pantalla se detiene ahí; por debajo del mínimo se detiene ahí; y el tirador se agarra igual de bien con el scroll arriba que abajo del todo

## 4. Leer el nombre entero

- [x] 4.1 `title` con el nombre en la caja de nombre de las filas de fase y de item en `Gantt.svelte` (D7)
- [x] 4.2 Lo mismo en la fila de roadmap de `MetaView.svelte`
- [x] 4.3 Comprobar que un nombre que no cabe se lee entero al dejar el puntero encima, sin pinchar, y que el texto de la ayuda sigue al nombre según se edita

## 5. Lo que no se toca

- [x] 5.1 Comprobar que «ir a hoy» sigue dejando hoy despejado de la columna con la columna estrecha y con la columna a media pantalla, en las dos vistas, **sin haber cambiado la fórmula** (D6)
- [x] 5.2 Actualizar el comentario de `MetaView.svelte:44`, que dice «a 250px sticky sidebar»: pasa a explicar por qué el ancho de la columna se cancela en la cuenta y por qué sumárselo la rompería
- [x] 5.3 Comprobar que reordenar fases e items arrastrando la manija sigue colocando las filas donde debe con la columna ensanchada, y que la fila levantada sigue el puntero igual
- [x] 5.4 Comprobar que arrastrar una barra, estirarla por cualquiera de sus dos extremos y crear una por arrastre siguen cayendo en los mismos días con la columna ensanchada: miden contra el rectángulo de la pista, no contra la columna
- [x] 5.5 Comprobar que reordenar roadmaps en "Todos" y abrir un roadmap desde su fila siguen funcionando con la columna ensanchada

## 6. Verificación

- [x] 6.1 Comprobar el ciclo completo de persistencia: ajustar los dos anchos, recargar la página, y encontrarlos tal cual en cada vista
- [x] 6.2 Comprobar que durante el arrastre no se escribe en el almacén, y que se escribe una sola vez al soltar
- [x] 6.3 Comprobar la trampa de D3: con un ancho guardado mayor que la ventana, la columna se pinta dentro de la ventana, el tirador es alcanzable, arrastrarlo limita a la mitad de la ventana **actual**, y sin tocarlo un ensanchamiento de la ventana devuelve el ancho guardado intacto
- [x] 6.4 Comprobar que el ancho de la vista de roadmap es el mismo al pasar de un roadmap a otro, y que el de "Todos" no cambia por ello
- [x] 6.5 Comprobar que el ancho extra se lo lleva el nombre: el punto de color, el progreso de la fase y el botón de borrar siguen donde estaban respecto a los bordes de la fila
- [x] 6.6 Comprobar con un tema claro además del oscuro, ya que la mitad del fallo era que se perdía el fondo y el borde de la columna
- [x] 6.7 `npm run check`, `npm run lint` y `npm run test` en verde
