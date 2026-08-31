## Context

Una fila del Gantt no es un elemento: son dos, en dos paneles que solo están sincronizados porque comparten el índice `i` del mismo `{#each}`.

```
   .sidebar (sticky, 250px)        .grid-area (scroll horizontal, miles de px)
┌──────────────────────────┐  ┌────────────────────────────────────────┐
│ ● [item B...........] ✕  │  │          ⠿ ████████                    │  ← i=2
└──────────────────────────┘  └────────────────────────────────────────┘
   .row-label (flujo normal)      .track  (top: i * ROW_H, absoluto)
```

Esa duplicidad manda sobre todo lo demás: cualquier cosa que mueva una fila tiene que mover las dos mitades, o la fila se parte por la mitad a la vista.

El segundo dato de partida es que **la parrilla ya se posiciona por aritmética**:

```svelte
<div class="track" ... style:top="{i * ROW_H}px">   <!-- Gantt.svelte:571-578 -->
```

La posición vertical de la mitad derecha de cada fila ya es una función del índice. Eso es lo que hace que este cambio sea barato: no hay que clonar la barra, ni replicar su geometría con el desplazamiento horizontal vigente, ni montar una capa flotante que la imite.

El tercero es que el eje horizontal está agotado. Los cuatro gestos existentes —`startCreate`, `startMove`, `startResize`, `startMilestoneMove`— cubren cada píxel de la cuadrícula, y todos significan fechas. El eje vertical solo está libre en la barra lateral.

## Goals / Non-Goals

**Goals:**

- Recuperar el orden vertical como algo editable, sin borrar y recrear.
- Que durante el gesto se vea el resultado, no una promesa de resultado.
- Que la regla de contención (un item no sale de su fase) se aprenda arrastrando, sin leerla en ningún sitio.
- Dejar la capacidad escrita en la spec, que es lo que faltó la primera vez.

**Non-Goals:**

- Cruzar de contenedor. Ver D2.
- Desplazamiento automático contra el borde. Ver D7.
- Reordenar roadmaps en la vista "Todos".
- Deshacer, o confirmación antes de soltar.
- Tocar el modelo de datos. El orden ya es la posición en el array.

## Decisions

### D1 — No se clona la fila: se levanta la de verdad

Un "ghost" admite dos construcciones. La primera es clonar: crear un elemento flotante `position: fixed` que imite la fila y seguirlo con el puntero. La segunda es levantar: dejar la fila donde está en el DOM y desplazarla con `transform`, subiéndola de plano y bajándole la opacidad.

Clonar aquí es caro por una razón concreta: la mitad derecha de la fila es una barra colocada a un `left` que depende del desplazamiento horizontal actual, del zoom (`dayW`) y del `startDate` del roadmap, y lleva encima etiqueta, insignia de responsable, contadores de bloqueos, marca de completitud y dos asas. Clonar eso es reconstruir medio componente para una animación.

Levantar no reconstruye nada:

```
.track       →  top ya es aritmético; se le suma el desplazamiento del gesto
.row-label   →  transform: translateY(...)
ambos        →  opacity .8, z-index alto, pointer-events: none
```

Consecuencia benigna: `.gantt-scroll` tiene `overflow: auto`, así que una fila arrastrada más allá del borde se recorta. Es lo deseable —no debe flotar por encima de la barra superior— y sale gratis.

### D2 — Ni los items cruzan de fase ni las fases de roadmap

No es una limitación de esfuerzo. `Item.dependsOn` es **estrictamente intra-fase**: `getMinStart` resuelve predecesores con `itemById(phase, id)` (`constraints.ts:12`, `:20`) y las flechas del Gantt con `v.phase.children.find(...)`. Los dos hacen `if (!dep) continue` ante un id que no encuentran.

```
   Fase A                          Fase A
   ├ item X ──┐                    ├ item X
   └ item Y ←─┘ dependsOn:[X]      Fase B
                        ──move──►  └ item Y  dependsOn:[X]  ← id colgante
                                             la flecha desaparece
                                             la cascada deja de aplicarse
                                             no hay error: silencio
```

Permitir el cruce sin más convertiría un gesto de ordenar en un corruptor silencioso de dependencias. Las salidas serían limpiar `dependsOn` al cruzar —destruir información sin que se pida— o bloquear el arrastre de los items enredados, que es una regla que no se puede ver antes de chocar con ella. Prohibir el cruce entero deja la puerta abierta a resolverlo bien el día que se pida, y hoy no cuesta nada: reordenar y recolocar son necesidades distintas y la primera es la urgente.

La simetría con las fases —que no cruzan de roadmap— es por coherencia del gesto, no por dependencias: una fase que cambia de roadmap cambiaría además de ventana temporal, y eso es mudanza, no orden.

### D3 — La contención es el recorte, no una comprobación

Un item arrastrado se frena al llegar al primero o al último de su fase. La forma de conseguirlo no es detectar la salida y rechazarla, sino calcular el índice de destino ya recortado:

```
toIndex = clamp(fromIndex + round(dy / ROW_H), 0, children.length - 1)
```

Como el índice nunca sale del rango, la fila levantada nunca se dibuja fuera de su fase, y no hace falta ningún estado de "destino inválido", ningún cursor de prohibido, ninguna vuelta atrás al soltar. **La regla y su representación son la misma línea de código.** El puntero sigue subiendo y la fila deja de seguirlo: eso es lo que enseña dónde está el límite.

### D4 — Reordenar no pasa por `commit()`

Las mutaciones de fecha llaman a `commit()`, que ejecuta `enforceConstraints(rm)` antes de guardar. Reordenar llama solo a `scheduleSave()`.

El motivo es que `enforceConstraints` (`constraints.ts:57`) es un **punto fijo iterativo**: repite el barrido de `phase.children` hasta que ningún item viola su `minStart`. No depende del orden del array; solo del grafo `dependsOn`. Permutar `children` no cambia ese grafo ni ninguna fecha, así que la llamada no tendría nada que hacer.

Merece quedar escrito porque la intuición dice lo contrario —parece que reordenar "debería" reordenar la planificación— y el día que alguien añada aquí un `commit()` por precaución estará pagando un barrido completo por operación a cambio de nada.

### D5 — Las filas se colocan por su índice en la lista *que habrá*

El mecanismo que hace uniforme el resto del cambio. Durante el gesto se deriva `previewRows`: la lista que `getVisibleRows` devolvería si la reordenación pendiente ya se hubiera aplicado. Todas las filas se posicionan por su índice en **esa** lista, no en la actual.

```
 item, from=1 → to=3                fase, A (6 filas) → tras B (1 fila)

 antes        durante               antes           durante
 0 ▸ Fase     0 ▸ Fase              0 ▸ Fase A ←    0 ▸ Fase B
 1   item A ← 1   item B  ↑         1    item A1    1 ▸ Fase A ←── levantada
 2   item B   2   item C  ↑         2   + item      2    item A1   ┐ el bloque
 3   item C   3   item A ←levantada 3 ▸ Fase B      3   + item     ┘ ya está allí
 4   item D   4   item D            4 ▸ Fase C      4 ▸ Fase C
 5  + item    5  + item
```

Una sola función alimenta las dos mitades: la parrilla suma su índice a `top`, la barra lateral lo convierte en `translateY`. La fila levantada es la única excepción, y sigue al puntero en píxeles sin encajar en la rejilla.

Lo que esto da gratis: el hueco aparece exactamente donde la fila va a caer, sin dibujar ninguna línea de inserción; y como `top` es animable, que las demás filas se aparten con suavidad es una transición CSS, no código.

### D6 — Se levanta solo la cabecera de la fase, y sus hijos viajan al destino

Con D5, un bloque de fase es coherente aunque solo flote una fila. La cabecera va en la mano; sus items y su fila de "añadir" reciben su índice de previsualización como cualquier otra fila, así que se colocan **ya en el destino**. Lo único que queda por llegar es lo que se está sujetando.

La alternativa era levantar el bloque entero. Se descarta por dos motivos: son *k* elementos moviéndose en dos paneles a la vez, y con una fase larga el bloque levantado tapa media pantalla justo cuando hace falta ver dónde soltarlo.

La variante clásica de esa alternativa —plegar la fase automáticamente al agarrarla y desplegarla al soltar— se descarta también: `visible` cambiaría en el instante de empezar el gesto, con lo que todas las demás filas saltarían bajo el puntero en el peor momento posible, y `expanded` es estado persistido que habría que tocar y restaurar sin que el usuario lo haya pedido.

### D7 — Sin desplazamiento automático, y anotado

Arrastrar contra el borde de `.gantt-scroll` no desplaza la vista. Ninguno de los cuatro arrastres actuales lo hace, así que sería mecánica nueva —temporizador, zona muerta, velocidad, y su interacción con el recorte de D1— por una necesidad que solo aparece con muchas fases.

Queda anotado porque el día que se note se notará de golpe: con un roadmap de treinta fases, mover la primera al final será imposible sin desplazar antes a mano. La salida barata, si llega, es un `requestAnimationFrame` que desplace mientras el puntero esté en la banda de borde; la lógica de D5 no cambia, solo se le suma el desplazamiento acumulado al `dy`.

### D8 — La manija reutiliza el glifo `⠿`, ya presente en las barras

`.grip` ya existe (`Gantt.svelte:622`, `:737`, CSS `:1132`): es el `⠿` de 14px con `cursor: grab` que arrastra una barra **en horizontal** para mover fechas. La manija nueva vive en el canalón de la barra lateral y arrastra **en vertical**.

Dos glifos iguales con dos ejes distintos es una ambigüedad real, y aun así se reutiliza. `⠿` no significa "mueve fechas": significa "agárrame". El eje lo dice el sitio —canalón contra barra— y se aprende con el primer gesto. Introducir un segundo vocabulario de "agárrame" costaría más que la ambigüedad que evita. Lo que sí cambia es el nombre de la clase, `.row-grip`, para que en la hoja de estilos no se confundan.

La colocación copia el patrón que `.row-del` (`:852-870`) ya usa: ancho reservado siempre, `opacity: 0` que pasa a `1` con `:hover` sobre la fila. Sin espacio reservado, la fila saltaría al pasar el ratón. El precio es que el canalón desplaza la cadena `chev → dot → input` unos 18px, y el sangrado de los items (`.row-label.item { padding-left: 28px }`, `:817`) tiene que crecer lo mismo para que los puntos sigan alineados. Dos constantes de la misma hoja.

### D9 — Un item completado conserva la manija

Completar congela un item: sus fechas no cambian ni por arrastre ni por redimensión, y la barra lo anuncia retirando su `.grip` para que el congelamiento se lea antes de descubrirlo (`Gantt.svelte:727-731`).

La manija de reordenar **no** se retira. El orden no es una fecha: mover un item completado dentro de su fase no altera `startDate`, `endDate`, `completedDate`, `endAtCompletion` ni `baselineEnd`, y no dispara ninguna cascada. Congelar también el orden sería confundir "esta obra ya está medida" con "esta línea no se puede mover de sitio en la lista".

Queda por tanto una asimetría deliberada y visible: en la fila de un item completado hay manija en el canalón y no la hay en la barra. Es exactamente el reparto correcto —lo congelado es el eje del tiempo— y conviene que se vea.

### D10 — Las claves por índice sobreviven

`Gantt.svelte:402` y `:571` recorren las filas con `{#each visible as v, i (i)}`, claves posicionales. Reordenar es justo la operación que suele castigarlas: Svelte reutiliza el nodo de cada posición y le cambia los datos debajo.

Aquí no las castiga, por D5. Durante el gesto el `{#each}` **no reordena nada**: `visible` no cambia, solo cambian valores de estilo calculados a partir de `previewRows`. El modelo se toca una sola vez, en la suelta, y ese re-render puntual es el mismo caso que ya cubre el `{#key v.phase.id}` de `:429`, puesto en su día para que el tween del porcentaje no cuente entre dos fases distintas.

Se registra porque la conclusión no es obvia y ahorra una migración: no hace falta pasar a claves de identidad, como sí las usa `MetaView.svelte:114`.

## Risks / Trade-offs

- **El gesto vertical en táctil compite con el desplazamiento de la página.** `.gantt-scroll` desplaza en vertical, y un arrastre desde la manija sería interpretado como desplazamiento. Mitigación: `touch-action: none` sobre la manija. No hay ningún `touch-action` en el fichero hoy, así que es la primera vez que se declara.
- **Sin desplazamiento automático, un roadmap largo hace incómodo mover una fila lejos.** Aceptado y anotado en D7.
- **Sin deshacer, una suelta equivocada se corrige arrastrando de vuelta.** Aceptable porque la operación es exactamente reversible y no destruye nada, a diferencia de borrar, que sí tiene confirmación en dos tiempos.
- **La ambigüedad de los dos `⠿`.** Aceptada en D8.

## Open Questions

Ninguna abierta. Las tres decisiones de forma —manija en el canalón, contención por recorte, cabecera levantada— y las dos de alcance —sin cruce de contenedor, sin desplazamiento automático— quedan fijadas arriba.
