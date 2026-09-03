## Why

La columna de la izquierda mide 250px y no hay forma de cambiarlo. A veces se queda corta: el nombre de una fase que no cabe se corta en seco, sin puntos suspensivos y sin ayuda al pasar por encima, y la única manera de leerlo entero es pinchar dentro de la caja y recorrerlo con el cursor. Leer un nombre no debería costar un clic.

Y hay un fallo debajo que hay que arreglar antes, porque el tirador necesita justo lo que está roto. Con bastantes fases —a partir de una pantalla de scroll— la columna deja de estar delimitada y las cabeceras de meses y sprints desaparecen. Las filas siguen ahí y todo sigue funcionando, pero se pierde la línea que separa la columna de la cuadrícula y se pierde la referencia temporal justo cuando más se necesita: mirando el final de un plan largo.

Es un solo fallo con tres caras, y su causa está en cómo el contenedor dimensiona sus dos columnas; el mecanismo y las medidas, en `design.md`. La misma estructura está clonada en la vista "Todos".

## What Changes

- **La columna se redimensiona con un tirador** en su borde derecho, arrastrando con el puntero. Es el gesto que la aplicación ya usa para todo lo demás que se estira.
- **El máximo es la mitad de la pantalla, y solo se aplica mientras se arrastra.** No se recorta un ancho ya fijado porque la ventana cambie de tamaño: si vuelves al monitor grande, tu ancho sigue ahí.
- **Con una excepción física: el tirador nunca queda fuera de alcance.** Al pintar, el ancho se limita al de la ventana. La columna es `sticky` a la izquierda, así que un ancho mayor que la ventana dejaría el tirador permanentemente inaccesible —el caso real es desenchufar un monitor de 2560 después de haber arrastrado hasta 1280—. El valor guardado no se toca: es un límite de pintado, no un recorte.
- **El mínimo es el ancho de hoy, 250px.**
- **Dos anchos independientes, uno por vista**: el de "Todos" y el de los roadmaps. Son dos listas distintas —nombres de roadmap frente a nombres de fase e item— y no tienen por qué querer el mismo sitio.
- **Los dos anchos se recuerdan entre sesiones**, junto al zoom y por el mismo camino.
- **El nombre entero se puede leer al pasar por encima**, sin ensanchar y sin pinchar. Es la otra mitad de la respuesta: el tirador resuelve el caso permanente, la ayuda emergente resuelve el nombre suelto que se pasa de largo.
- **La columna queda delimitada y las cabeceras temporales visibles a cualquier profundidad de scroll**, en las dos vistas. Es el arreglo del fallo, y es requisito del tirador: el tirador se agarra al borde derecho de la columna a lo alto de todo, y hoy ese borde solo existe durante la primera pantalla.

Fuera de alcance, registrado como trabajo futuro:

- **Redimensionar a teclado.** Un `role="separator"` con flechas sería la forma completa de ofrecerlo, y la aplicación tiene política de foco visible. Se deja fuera porque el ancho de una columna no bloquea ninguna tarea: quien no puede arrastrar sigue pudiendo leer el nombre entero con la ayuda emergente, que es lo que el tirador venía a resolver.
- **Recordar el ancho por roadmap.** Se ha decidido explícitamente que sea uno para todos los roadmaps y otro para "Todos". Un ancho por roadmap además viajaría en la exportación, y la anchura de una columna no es parte de un plan.
- **Doble clic para volver a 250.** Barato de añadir si al usarlo se echa de menos; hoy es una convención que esta aplicación no tiene en ningún otro sitio.
- **Truncar con puntos suspensivos.** La caja del nombre es un `<input>`, donde el recorte con elipsis no se comporta igual en todos los navegadores. La ayuda emergente cubre la necesidad sin depender de eso.

## Capabilities

### Modified Capabilities

- `roadmap-editor`: gana el ancho de la columna como algo que el usuario decide —con su tirador, sus dos límites y su ámbito por vista— y gana la promesa de que la columna y las cabeceras temporales se sostienen por debajo de la primera pantalla de scroll. Obliga además a matizar «Cabeceras temporales de sprints y trimestres», que hoy promete que la cabecera *se muestra* sin decir hasta dónde: este cambio fija que se mantiene a la vista por hondo que se baje.
- `local-persistence`: el requisito «Persistencia del estado de sesión» ya cubre «las preferencias de vista (p. ej. el nivel de zoom)»; los dos anchos entran ahí como preferencias de pleno derecho, y hay que decir que son dos y que no viajan en la exportación.

## Impact

**Estado y persistencia**

- `src/lib/store/app.svelte.ts`: dos campos nuevos, `sidebarW` y `metaSidebarW`, hermanos de `dayW`; se hidratan en `init()` junto a la preferencia `zoom` y se escriben con `setPref`. No van en `AppData`, así que no tocan la importación/exportación ni ninguna normalización.
- `src/lib/store/storage.ts`: sin cambios. `getPref`/`setPref` ya es exactamente esta costura.
- `src/lib/store/ui.svelte.ts`: **no** es el sitio. Se declara a sí mismo «Transient UI state», y un ancho persistido no lo es.

**Interfaz**

- `src/lib/components/Gantt.svelte`: el arreglo del estiramiento en `.gantt-scroll`, el ancho de `.sidebar` pasado a variable, el tirador, y el `title` de la caja de nombre en las filas de fase y de item.
- `src/lib/components/MetaView.svelte`: lo mismo sobre su copia de la estructura, con su propio ancho y el `title` en el nombre del roadmap.
- `src/lib/interactions/`: el gesto se apoya en `onDrag` de `drag.ts`, que ya envuelve la pareja `pointermove`/`pointerup` en window para el reordenado y para los manejadores de las barras.

**Se lo lleva gratis**

- «Ir a hoy» no necesita ni una línea. La columna es `sticky` pero está **en flujo**, así que la rejilla empieza en `sidebarW` y el despeje sale de la propia cuenta: `sidebarW + today*dayW − (today*dayW − 200) = sidebarW + 200`. El ancho se cancela solo, y hoy sigue cayendo 200px despejado de la columna mida esta lo que mida. Lo único que caduca es el comentario de `MetaView.svelte:44`, que dice «a 250px sticky sidebar».
- El reordenado vertical, los arrastres de barras y los manejadores de extremo miden contra el rectángulo de la pista, no contra un desplazamiento de la columna: ninguna cuenta cambia.

**Sin impacto**

- El documento persistido, la exportación y la importación: no hay campo nuevo en `AppData`.
- Los temas. `--row-h` está en `app.css` bajo «Layout constants, not part of any theme», y el ancho de la columna es exactamente esa clase de constante: no se ofrece en el editor de temas ni viaja en un tema exportado.
