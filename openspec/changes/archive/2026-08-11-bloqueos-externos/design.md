## Context

La app ya tiene un concepto llamado "dependencia": `Item.dependsOn`, una lista de ids de items **de la misma fase** que actúa como predecesor de Gantt clásico. Su efecto es sobre las fechas: `enforceConstraints` empuja el inicio del item dependiente (`getMinStart`), `wouldCreateCycle` impide ciclos, y `Gantt.svelte` la dibuja como una flecha bezier entre barras.

Lo que este cambio introduce es una cosa distinta, que en la interfaz se llama **dependencia externa** y en el código `Blocker`. Comparte la palabra "dependencia" con lo anterior sin ser lo mismo, y esa convivencia es una decisión consciente (D1):

| | `dependsOn` (existente) | dependencia externa (nuevo) |
| --- | --- | --- |
| Apunta a | otro item de la misma fase | una entrada del catálogo global |
| Alcance | intra-fase | atraviesa fases y roadmaps |
| Efecto | desplaza fechas | ninguno sobre fechas; describe estado |
| Representación | flecha entre barras | sombreado rayado + badge |
| Ciclos | posibles, se impiden | imposibles por construcción |

El precedente estructural exacto ya existe en el código: `AppData.assignees` es un catálogo global, con drawer propio (`ui.openAssignees()`), acceso desde el Toolbar, borrado con doble confirmación en línea, y export filtrado + `mergeAssignees` en la portabilidad. Este diseño lo replica en lugar de inventar un patrón nuevo, con las desviaciones que se justifican abajo.

## Goals / Non-Goals

**Goals:**

- Registrar qué impide completar un item, con responsable identificable y trazabilidad de lo ya resuelto.
- Que una dependencia externa se defina una vez y se reutilice en cualquier item de cualquier roadmap.
- Que el estado bloqueado sea legible en la parrilla sin abrir nada, y que plegar una fase no lo oculte.
- Reducir el coste de mantener sincronizadas asignaciones que describen la misma espera real, sin que el sistema decida por el usuario.

**Non-Goals:**

- Que una dependencia externa altere fechas, duraciones o el orden de los items. Un item bloqueado conserva sus fechas; la dependencia externa describe, no planifica.
- Dependencias externas a nivel de fase o de roadmap. Solo los items tienen dependencias externas; la fase deriva su aspecto de los hijos.
- Modelar la dependencia externa como entidad de tres niveles con entregable compartido y resolución única (ver D2).
- Señal de dependencia externa en la vista "Todos" y panel transversal de "todo lo pendiente". Ambos quedan como trabajo futuro.
- Notificaciones, fechas de compromiso o seguimiento temporal de la dependencia externa.

## Decisions

### D1 — "Dependencia externa" en la interfaz, `Blocker` en el código

La interfaz dice **dependencia externa**: es el término con el que se habla del asunto fuera de la aplicación, y es más cortés que "bloqueo" para nombrar algo que casi siempre debe otra persona.

El código conserva `Blocker` / `blockers` / `blockerId`. No es incoherencia sino separación deliberada: el identificador corto distingue en un vistazo esta entidad de `dependsOn`, que en el código también es "dependencia", y renombrarlo obligaría a tocar modelo, store, portabilidad y tests para ganar exactamente nada en el producto. El vocabulario de la interfaz y el del código responden a públicos distintos.

**La consecuencia asumida:** el detalle de un item muestra dos secciones que contienen la palabra "dependencia" y hacen cosas opuestas — "Depende de" mueve fechas, "Dependencias externas" explícitamente no. Se compensa con lo que sí distingue: una regla completa y separación vertical entre ambas, formas distintas (un desplegable de items frente a fichas con responsable y casilla de resolución), y dos textos de ayuda que dicen lo contrario el uno del otro. Si en uso resulta insuficiente, lo siguiente es renombrar la sección antigua a "Precedentes" o "Empieza después de", que no toca datos ni código.

*Alternativa descartada:* renombrar `dependsOn` a `predecessors` en modelo y UI para dejar "dependencia" libre. Es lo más limpio conceptualmente, pero toca modelo, store, constraints, drawer, Gantt, portabilidad y el spec ya publicado de `roadmap-editor` para renombrar algo que funciona.

### D2 — `resolved` vive en el enlace item↔dependencia externa, no en un entregable compartido

```
Blocker "Checkout" (catálogo global)
   ├── Item "Pago con tarjeta"  → feature "formulario de compra"  resolved:false
   ├── Item "Pago con PayPal"   → feature "formulario de compra"  resolved:false
   └── Item "Confirmación"      → feature "pasarela 3DS"          resolved:false
```

Cada asignación es un registro independiente con su propio estado. Marcar una no marca las demás.

*Alternativa descartada:* un modelo de tres niveles `Blocker → Entregable → asignaciones`, donde `resolved` cuelga del entregable y una sola marca desbloquea todos los items que lo esperan. Es el modelo conceptualmente correcto y elimina la desincronización por construcción, pero añade una entidad, un selector de dos pasos al asignar y la pregunta de qué hacer cuando un entregable se queda sin asignaciones. El modelo plano cubre el caso dominante —una funcionalidad bloquea un item— y D3 recupera la mayor parte de lo que se pierde en el caso compartido.

### D3 — Deduplicación asistida, ofrecida y nunca automática

La contrapartida de D2 es que la misma espera real puede estar registrada N veces. Se ataca en los dos momentos en que el usuario podría desincronizarla, sin que el sistema escriba nada por su cuenta:

1. **Al asignar**, el campo de funcionalidad se autocompleta con las funcionalidades ya escritas para esa misma dependencia externa, en cualquier item de cualquier roadmap. Empuja hacia el mismo texto sin obligar.
2. **Al marcar resuelta**, si existen otras asignaciones equivalentes sin resolver, aparece bajo el chip una acción explícita que las marca todas. No hace nada hasta que se pulsa.

La clave de equivalencia es `blockerId` + `feature` normalizada (recortada y en minúsculas). El texto original se conserva para mostrarlo; la forma normalizada solo se usa para emparejar. Sin normalizar, dos variantes de mayúsculas serían asuntos distintos y la deduplicación no deduplicaría nada.

**La propagación se ofrece solo al resolver, no al desmarcar.** Desmarcar es corregir un error local; propagar "vuelve a estar bloqueado" a items de otros roadmaps es una acción de más alcance que la que el usuario acaba de pedir. La asimetría es deliberada.

### D4 — Resolver conserva el registro

Una asignación resuelta no se borra: permanece en el detalle del item, marcada como resuelta, para que quede quién bloqueó qué y hasta cuándo. Lo que desaparece es la consecuencia visual: el rayado sale **solo** de las asignaciones sin resolver.

En la parrilla, ese registro se refleja en **dos badges independientes que conviven**: uno con las pendientes y otro con las resueltas. Cada uno aparece solo si su recuento es mayor que cero, así que un item con una de cada muestra las dos.

La alternativa —un único badge que muestra pendientes mientras las haya y resueltas cuando no queden— es más compacta pero esconde justo el caso interesante: un item que espera una cosa y ya ha recibido otra no es lo mismo que uno que solo espera, y desde la barra no habría forma de distinguirlos. El rastro que se conserva en el drawer se conserva también en la parrilla, y con el mismo detalle.

Los iconos se dibujan como paths, no como caracteres: ⚠ y ✓ de la fuente monoespaciada son contornos de trazo fino que a tamaño de badge se deshacen. Como paths llevan su propio peso y aguantan cualquier zoom.

### D5 — La fase hereda el rayado de sus hijos, atenuado

La barra rollup de una fase se raya si algún item hijo tiene una dependencia externa sin resolver, con menos intensidad que la del item. Es un derivado, nunca un dato propio de la fase.

El motivo es que la fase es colapsable: sin esto, plegar una fase haría desaparecer de la parrilla toda evidencia de que algo dentro está bloqueado. Una fase con fechas propias y sin hijos no dibuja rollup y no puede rayarse, lo cual es correcto: sin items no hay dependencias externas.

### D6 — El rayado se dibuja con la tinta que ya existe por barra, sin tokens nuevos

Las barras son `div`s con el color de slot en `background` y `--bar-ink` ya calculado en línea por `inkOn()`. El rayado es un `repeating-linear-gradient` en un pseudo-elemento por encima, en `--bar-ink` a baja opacidad: contrasta por construcción sobre cualquier slot de cualquier tema, claro u oscuro, sin ampliar el contrato de tokens ni tocar `resolveTheme`.

Los hitos no son `div`s sino `<svg><polygon>`, así que necesitan un `<pattern>` declarado en los `<defs>` que el Gantt ya tiene para el marcador de flechas, aplicado como segundo `<polygon>` de relleno sobre el primero. Camino distinto, mismo resultado visual y misma fuente de tinta.

### D7 — Borrar del catálogo es cascada, con recuento en la confirmación

Eliminar una dependencia externa retira sus asignaciones de todos los items de todos los roadmaps. Se reutiliza el patrón de doble confirmación en línea del drawer de responsables, con una diferencia: el control muestra a cuántos items afecta antes de confirmar.

`deleteAssignee` puede permitirse ser silencioso porque solo pone a `null` un campo que se puede volver a rellenar en un desplegable. Aquí se destruye texto escrito a mano —los nombres de funcionalidad— posiblemente en roadmaps que el usuario no tiene abiertos y no está viendo. El recuento es lo que hace que la segunda pulsación sea una decisión informada.

### D8 — El acceso al catálogo es visible también en "Todos"

A diferencia del botón "responsables", que hoy solo aparece dentro de un roadmap, el de dependencias externas está siempre disponible. El catálogo es global y "Todos" es la vista de inicio de la aplicación: es donde tiene sentido dar de alta lo que va a afectar a varios roadmaps.

### D9 — Normalización al cargar, sin versionado de esquema

Los documentos ya persistidos no llevan `blockers` ni en `AppData` ni en los items. Se normalizan a lista vacía en la carga, en la misma línea en que `normalizeColors` ya adapta datos anteriores, sin introducir un número de versión de esquema. Igual en import: un JSON sin dependencias externas importa como roadmap sin dependencias externas, y uno con ellos los fusiona por id como hace `mergeAssignees`.

Las asignaciones cuyo `blockerId` no resuelve contra el catálogo tras importar se descartan en vez de quedar colgando: una asignación sin dependencia externa no tiene ni nombre ni responsable que mostrar, y rayaría una barra sin poder explicar por qué.

## Risks / Trade-offs

**[D2 deja convivir registros duplicados de la misma espera real]** → D3 los combate en los dos momentos de divergencia, pero no los impide. Si en uso real resulta que compartir es la norma y no la excepción, el modelo de tres niveles sigue siendo alcanzable: el par `blockerId` + `feature` normalizada ya es de facto la identidad del entregable, así que la migración es agrupar por esa clave, no rehacer el modelo.

**[El rayado compite con lo que ya hay dentro de la barra]** → La barra de item ya lleva grip, etiqueta, badge de responsable, punto de notas y dos manejadores de redimensión. El rayado va por debajo del contenido y a baja opacidad, y la referencia a la dependencia externa es un badge compacto de recuento, no texto: un nombre de dependencia externa no cabe en barras cortas. El detalle completo vive en el `title` y en el drawer.

**[El borrado en cascada destruye datos fuera de la vista]** → Doble confirmación con recuento (D7). No hay deshacer en la aplicación, así que el recuento es la única defensa; conviene que sea exacto y visible en el propio control, no en un texto adyacente.

**[Dos secciones parecidas en el drawer de item]** → "Depende de" y "Dependencias externas" quedan una sobre otra y ambas muestran chips eliminables. Se distinguen por el texto de ayuda que ya existe bajo la primera ("este item empieza cuando terminen sus dependencias") frente al que describe la segunda, y porque los chips de dependencia externa llevan responsable y casilla de resolución. Si en uso resulta ambiguo, la separación visual entre secciones es lo primero que hay que reforzar.

**[El rayado de la fase puede leerse como dependencia externa propia de la fase]** → Es derivado y atenuado por eso mismo (D5). El `title` de la barra rollup indica cuántos items hijos están bloqueados, para que quede claro de dónde viene.

## Migration Plan

No hay migración de datos que ejecutar: la normalización en carga (D9) es idempotente y no reescribe nada hasta el primer guardado, que ocurre por el flujo normal de la aplicación. Un documento guardado por esta versión y abierto por una anterior conserva sus campos desconocidos o los ignora sin romper, ya que la carga previa no valida campos extra.

## Open Questions

Ninguna que bloquee la implementación. Registradas como trabajo futuro y fuera de alcance:

- Señal de dependencia externa en la barra de roadmap de la vista "Todos".
- Panel transversal que liste, por dependencia externa, qué items la esperan y cuáles ya se resolvieron.
- Si el panel anterior existiese, si el catálogo debería mostrar el estado agregado de cada dependencia externa (todo resuelto / parcialmente / nada).
