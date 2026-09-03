## Context

Ver `proposal.md — Why` para el motivo. Seis hechos del código mandan sobre el resto.

**El primero: la convención exclusiva no es un descuido, es coherente consigo misma en nueve sitios.** Por eso no se arregla sumando uno en `barGeom` y ya.

```
  barGeom              Gantt:94       (e−s)*dayW        el ancho
  barGeom              MetaView:51    (e−s)*dayW        la copia de la otra vista
  startMove  clamp     Gantt:253      ns ≤ windowDays − duration
  startResize guard    Gantt:281      day = off(start)+1   ← prohíbe el item de un día
  startCreate fudge    Gantt:164      Math.max((hi−lo)*dayW, dayW)
  arrows x1            Gantt:461      off(end)*dayW     el borde derecho de origen
  milestoneLeft        Gantt:96       off*dayW − 15     centrado en la FRONTERA
  arrows ±15           Gantt:461-463  los anclajes del rombo
  clientToDayOffset    drag.ts:19     Math.round        engancha a la frontera
```

Tres de ellos no se arreglan con un `+1`, y son los que dan trabajo:

```
  el item de un día        hoy es IMPOSIBLE. Con pintado exclusivo, inicio == fin
                           sería una barra de cero píxeles, así que el guard lo
                           prohíbe. Con inclusivo pasa a ser el item más corto legal.

  el rombo del hito        off*dayW − 15 lo centra en la línea entre dos columnas.
                           Mientras las barras vivían entre líneas, correcto. En
                           cuanto una barra posee su última columna, el rombo queda
                           medio día a la izquierda de su propia fecha.

  Math.round               engancha a la frontera más cercana. Para MOVER y para
                           CREAR es lo correcto. Para el extremo derecho de un
                           redimensionado inclusivo, no: ahí se quiere la columna
                           que el puntero está señalando.
```

**El segundo: `getSprintSegments` recorta contra la ventana, y ese recorte sirve para pintar pero no para contar.**

```
  segments.ts:73-75
    if (end > 0) segments.push({ start: Math.max(idx, 0), end, num });
                                 └──────┬──────┘         └─┬─┘
                                  recortado por        recortado por
                                  el día 0             windowDays

  roadmap A, ventana desde 2026-06-22   →  S12 visible entero    14 días
  roadmap B, ventana desde 2026-07-06   →  S12 visible a medias   6 días

  contar sobre el recorte = el mismo S12 con dos capacidades distintas
```

**El tercero: el ancla es lunes, así que la capacidad es una constante.** `SPRINT_ANCHOR_DATE = '2026-06-29'` es lunes y `SPRINT_LEN = 14`, de modo que todo sprint empieza en lunes y contiene exactamente **10 días laborables**. No hay que calcular la capacidad por sprint: hay que no recortarla.

**El cuarto: la herencia de responsable no existe hoy en ninguna parte.** El modelo tiene `assigneeId` en `Phase` y en `Item`, pero la rejilla solo pinta el del item (`Gantt.svelte:838` y `:896`) y el drawer solo decide cuál de los dos edita (`Drawer.svelte:68`). No hay un solo sitio donde el de la fase alcance a un item. La regla nace en este cambio, y nace **solo dentro del panel**.

**El quinto: `ui.svelte.ts` se declara «Transient UI state», y su `DrawerState` es una unión — una sola cosa abierta a la vez.** Ya hay un precedente de algo que se salió de la unión a propósito: `newRoadmap` es un campo aparte, con el comentario de por qué («un modal no es un drawer, y puede estar sobre uno abierto»). El foco de sprint es el segundo caso de lo mismo.

**El sexto: `.rows` ya tiene su reparto de capas, y hay un hueco justo donde hace falta.**

```
  z-index 1   .weekend-bg      fondo de fin de semana
  z-index 2   .bar             las barras
  z-index 3   ← libre
  z-index 4   (cabeceras, fuera de .rows)
  z-index 5   .today-line      la marca de HOY con su bandera
```

Un velo tiene que ir **encima** de las barras para atenuarlas, y **debajo** de nada en particular. El 3 está libre y es exactamente el sitio.

## Goals / Non-Goals

**Goals:**

- Que la convención de fechas quede en un solo sitio, en lugar de repetida en nueve.
- Que el cálculo de carga sea puro y se pruebe sin navegador, como `derive.ts` y `completion.ts`.
- Que el mismo sprint valga lo mismo en todos los roadmaps.
- Que el foco sea visual y no un modo: nada deja de poder editarse por estar atenuado.
- Que el foco sobreviva a abrir el detalle de un item, que es cuando más falta hace.
- Que el cambio no toque ni un byte del documento persistido.

**Non-Goals:**

- Unificar la geometría de `Gantt.svelte` y `MetaView.svelte`. Duplican a propósito, con comentario que lo dice. La Parte A obliga a tocar las dos; extraerlas es otro cambio, y este lo deja anotado como la tercera razón concreta.
- Estimaciones de esfuerzo por item, capacidad por persona, ausencias, festivos.
- Sprints en la vista "Todos", que pinta trimestres.
- Extender la herencia fase → item más allá del panel. La rejilla sigue pintando el badge del item y solo el del item.

## Decisions

### D1 — La convención vive en dos funciones, no en nueve expresiones

Todo lo que hoy calcula «dónde termina esto» pasa por dos primitivas, y nada más las duplica:

```
  spanDays(startIso, endIso)   →  off(end) − off(start) + 1      días que ocupa
  endEdgeX(endIso, dayW)       →  (off(end) + 1) * dayW          su borde derecho
```

`barGeom` se escribe con la primera; las flechas y cualquier futuro anclaje al final de una barra, con la segunda. El `+1` deja de estar suelto: está una vez, con el nombre de lo que significa.

Esto importa más de lo que parece porque `MetaView.svelte` tiene su **propia** copia de `barGeom` (`:51`). Con las primitivas compartidas, las dos vistas no pueden desincronizarse aunque sigan teniendo dos funciones.

*Alternativa descartada*: sumar `+1` en cada sitio. Nueve oportunidades de olvidarse de una, y la que se olvide será la de la vista que menos se mira.

### D2 — `clientToDayOffset` gana un modo, no cambia de redondeo

```
  MOVER una barra      round   ← la frontera más cercana. Correcto hoy y mañana:
                               se está eligiendo dónde EMPIEZA algo.
  CREAR arrastrando    round   ← igual.
  EXTREMO IZQUIERDO    round   ← igual: es un inicio.
  EXTREMO DERECHO      floor   ← la columna señalada. Es un fin inclusivo:
                               el día sobre el que está el dedo ES el último día.
```

Un parámetro opcional de modo, con `round` por defecto para que las tres llamadas que no cambian no se toquen.

*Alternativa descartada*: pasar todo a `floor`. Mover una barra empezaría a sentirse medio día tardío en todos los zoom, y crear arrastrando se comería el primer día.

### D3 — El item de un día es legal, y lo que lo separa de un hito es `isMilestone`

El guard de `startResize` pasa de exigir `fin > inicio` a exigir `fin ≥ inicio`. Con eso, inicio y fin en la misma fecha es una barra de un día, no una de cero.

Queda entonces una pareja que comparte fechas: un item de un día y un hito. No se distinguen por sus datos de fecha y no tienen por qué: `isMilestone` es un campo del modelo desde el principio y es el que decide cómo se dibuja y cómo se cuenta. Un item de un día es una barra que aporta un día de carga; un hito es un rombo que aporta cero. La distinción ya estaba, solo que hasta ahora las fechas la reforzaban por accidente.

*Alternativa descartada*: seguir prohibiendo el item de un día. Sería mantener a propósito una restricción cuya única razón de ser era un artefacto del pintado.

### D4 — El rombo se centra sobre su día, y las flechas lo siguen

```
  antes    off*dayW − 15                 centro en la línea entre columnas
  ahora    off*dayW + dayW/2 − 15        centro en la columna del día

  y los anclajes de flecha, que hoy son  off*dayW ± 15,
  pasan a colgar del mismo centro nuevo.
```

Es la consecuencia directa de D1: en cuanto una barra ocupa la columna de su último día, la única posición coherente para un marcador de un día es el centro de su columna. Efecto visible: los rombos se desplazan media columna a la derecha. A zoom 4 px/día son 2 píxeles; a 26, trece.

### D5 — Se cuenta sobre el sprint verdadero; se pinta sobre el recortado

Una función nueva en `segments.ts` devuelve el rango real de un sprint a partir de su número, sin ventana de por medio:

```
  sprintRange(num) →  inicio = SPRINT_ANCHOR_DATE + (num − SPRINT_ANCHOR_NUM) * 14
                      fin    = inicio + 13          (inclusivo, como todo lo demás)

  el cálculo de carga        usa sprintRange(num)      siempre 14 días, 10 laborables
  el velo y la etiqueta      usan getSprintSegments    lo que la ventana deje ver
```

Esto es lo que hace que la selección pueda guardarse como **número** y no como offsets, y lo que hace que S12 valga lo mismo en un roadmap que empieza en enero y en otro que empieza en julio.

*Alternativa descartada*: guardar `{start, end}` en offsets de la ventana activa. Se rompe al cambiar de roadmap, se rompe al cambiar la ventana, y obliga a recalcular la selección cada vez que cambia cualquiera de las dos.

### D6 — `workdaysBetween` es cerrada y en forma cerrada

En `time/timeline.ts`, junto a `isWeekend`, que ya está ahí:

```
  workdaysBetween(a, b)   días de lunes a viernes en [a, b], AMBOS incluidos
                          0 cuando b < a
```

Inclusiva en los dos extremos porque es la convención que este cambio establece, y devolver 0 en vez de un negativo porque «no hay solape» es un caso corriente, no un error: la mayoría de los items de un roadmap no tocan un sprint dado.

En forma cerrada —semanas completas por 5, más el resto— y no iterando día a día. El solape con un sprint nunca pasa de 14 días, así que iterar sería igual de rápido; la forma cerrada se elige porque los casos que fallan son los de los bordes (empezar en sábado, terminar en domingo, un rango de un solo día que cae en festivo semanal) y en forma cerrada esos casos son aritmética que se prueba, no un bucle que se recorre con la cabeza.

### D7 — El foco es un campo propio, con número absoluto, fuera de `DrawerState`

```
  ui.selectedSprint = $state<number | null>(null)     el NÚMERO del sprint
  ui.drawer         = $state<DrawerState>(...)        como estaba
```

Fuera de la unión por la razón que ya justificó a `newRoadmap`: son dos cosas que pueden estar a la vez. Y tienen que poder, porque el caso de uso es exactamente ese —ves que alguien va al 120%, abres su item para mirarlo, y el foco tiene que seguir ahí cuando vuelvas—.

Transitorio: nada de `setPref`, nada en `AppData`. `ui.svelte.ts` se declara transitorio y esto lo es.

**El caso que hay que decidir aquí**: si el sprint elegido no interseca la ventana temporal del nuevo roadmap, el foco **se suelta**. Un velo que cubre la rejilla entera y una etiqueta que no está en ninguna parte no son un foco, son una pantalla rota. Soltar es la única lectura honesta de «ese sprint no sale en este roadmap».

### D8 — Dos velos, encima de las barras, sordos al puntero

```
  <div class="rows">
     ...weekends, grid-lines, bars...                   z-index 1-2
     {#if foco}
       <div class="veil" left=0            width=xSprintIni />   z-index 3
       <div class="veil" left=xSprintFin   width=resto     />    pointer-events: none
     {/if}
     ...today-line...                                    z-index 5 → se atenúa aparte
```

`pointer-events: none` no es una precaución, es el requisito: atenuado no es desactivado, y arrastrar una barra de fuera del sprint tiene que seguir funcionando igual (ver spec, «Foco en un sprint»).

*Alternativa descartada*: bajar la opacidad de cada barra de fuera. No atenúa la rejilla, ni los fines de semana, ni las flechas —o sea, atenúa la mitad de lo que se ve—, y obliga a evaluar la pertenencia al sprint una vez por barra en cada render.

*Alternativa descartada*: `backdrop-filter`. Más caro, con soporte desigual, y no hace falta: lo que se quiere es bajar el tono, no desenfocar.

La marca de HOY va en z-index 5, por encima del velo, así que no se atenúa sola: se le pone su propia clase cuando el sprint elegido no es el actual. Es deliberado que sea así y no que baje al 3 — la bandera de HOY tiene que poder estar por encima del velo cuando el sprint elegido **sí** es el actual.

### D9 — El tono del velo sale del tema, no de un `opacity` a ojo

El velo es el color de fondo del tema con alfa, resuelto por los mismos tokens que el resto, y comprobado en los temas claros además de en los oscuros. `theme/contrast.ts` y `theme/audit.ts` existen precisamente para no decidir esto mirando.

El listón: lo atenuado tiene que **seguir leyéndose**. El resto del roadmap es el contexto que hace útil el foco; un velo que lo borre convierte una vista de planificación en una lista de cinco items sin alrededor.

### D10 — El panel del sprint es lo que el drawer muestra cuando no muestra otra cosa

Hay un sitio para un panel a la derecha, y ahora hay dos candidatos. La regla:

```
  drawer.kind === 'none'  &&  selectedSprint !== null   →  panel del sprint
  drawer.kind !== 'none'                                →  lo de siempre
```

Abrir el detalle de un item **tapa** el panel del sprint; cerrarlo lo devuelve. El velo no se entera de nada de esto: el foco es del sprint, no del panel. Eso es lo que cumple el escenario «Abrir un item desde el panel de carga».

En componente propio, `SprintPanel.svelte`, y no una quinta rama dentro de `Drawer.svelte`, que ya son 1148 líneas repartiendo cuatro paneles.

*Alternativa descartada*: dos paneles apilados a la derecha. Roba la mitad de la rejilla justo cuando el usuario está mirando la rejilla.

### D11 — Un solo cálculo alimenta el panel y el apagado de filas

`model/sprint-load.ts`, puro, al estilo de `derive.ts` y `completion.ts`. Recibe el roadmap, los responsables y el número de sprint; devuelve de una vez el reparto por responsable **y** qué fases e items participan.

Lo segundo no es un extra: el apagado de filas de la columna de nombres necesita exactamente la misma pertenencia que el panel. Calcularla dos veces sería tener dos respuestas posibles a «¿participa esta fila?», y la fila apagada junto al item listado en el panel es un fallo que nadie sabría explicar.

La herencia `item.assigneeId ?? phase.assigneeId` vive aquí y solo aquí (ver Context, cuarto hecho).

### D12 — Lo que la interfaz promete es ocupación, no esfuerzo

El panel se rotula en términos de calendario: «días laborables ocupados», no «carga» a secas ni «capacidad». Es una decisión de diseño con consecuencia técnica: no se añade ningún campo de estimación al modelo, y no se abre la puerta a que el número se lea como algo que la aplicación no sabe.

## Risks / Trade-offs

**Todas las barras existentes crecen un día** → Es el efecto visible y no hay forma de evitarlo si se quiere la convención. Se mitiga con lo que *no* pasa: ninguna fecha cambia, no hay migración, no hay pase de normalización, y exportar un roadmap antes y después produce el mismo documento. Revertir el cambio devuelve el pintado anterior sin tocar datos.

**Son dos cambios en uno** → Acoplados a propósito: no se puede especificar «días laborables de un item dentro de un sprint» mientras la aplicación no tenga decidido qué días ocupa un item. El orden de las tareas los mantiene separables: la Parte A se completa y se verifica sola antes de que empiece la B, así que partir el commit en dos sigue siendo posible hasta el final.

**El panel atribuye trabajo a alguien que la rejilla no muestra** → La herencia fase → item existe solo en el panel (D11), así que el panel puede decir «Ana, 5 días» sobre un item cuya barra no lleva badge de Ana. Es confuso si no se explica. Mitigación: el panel **marca** cuándo un responsable es heredado de la fase, de modo que la diferencia con la rejilla queda dicha en vez de descubierta.

**Un item de un día y un hito se parecen mucho** → Comparten fechas y se distinguen por `isMilestone` (D3). Es la distinción que el modelo siempre ha hecho; lo nuevo es que ya no viene reforzada por las fechas. La barra y el rombo se siguen viendo distintos, que es donde el usuario lo lee.

**El velo puede tapar de más** → Es el riesgo propio de haber elegido la opción contundente. Mitigación en D9: el tono sale del tema y pasa por la comprobación de contraste, en claro y en oscuro, con el listón de que lo atenuado se sigue leyendo.

**Un sprint elegido puede quedarse sin sitio** → Al cambiar de roadmap, o al reconfigurar la ventana temporal, el sprint elegido puede caer fuera. Se suelta el foco (D7). El coste es que la elección se pierde en ese salto concreto; la alternativa —mantenerla invisible— deja la aplicación mostrando un foco que no se ve y que no se puede soltar pinchando.

**`clientToDayOffset` cambia para una de sus cuatro llamadas** → Es una función compartida por gestos que no se comportan igual. El parámetro de modo con `round` por defecto (D2) hace que las tres llamadas que no cambian no se toquen, y que la que cambia lo diga en el sitio de la llamada.

## Migration Plan

No hay migración de datos, y conviene que quede escrito por qué: ningún campo nuevo en `AppData`, ninguna fecha reescrita, ninguna puerta de importación afectada, ningún valor persistido nuevo. Lo que cambia es cómo se interpreta y se pinta lo que ya existe.

Reversión: revertir el cambio. Un documento guardado durante la vigencia de este cambio es indistinguible de uno guardado antes.

## Open Questions

- **¿Hay un estado intermedio entre «cabe» y «no cabe»?** La spec exige avisar cuando alguien supera la capacidad. Si al usarlo se echa de menos un aviso previo —del estilo «va al 90%, queda sin holgura»—, es un umbral más en la misma barra y no cambia ni el cálculo, ni la spec, ni el reparto de tareas.
- **¿El panel debería poder llevar la vista hasta el sprint elegido?** Elegir un sprint que asoma por el borde de la pantalla deja el foco a medias a la vista. Un desplazamiento automático es una línea, pero también es una decisión sobre cuándo mover la vista del usuario sin que la haya movido él, y la aplicación ya tiene reglas escritas sobre eso («Posición temporal inicial de cada vista»). Se puede responder después de verlo funcionando.
