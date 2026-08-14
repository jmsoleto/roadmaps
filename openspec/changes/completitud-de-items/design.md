## Context

La aplicación ya tiene dos conceptos que se rozan con "completar" sin serlo:

| | `dependsOn` | dependencia externa (`blockers`) | completitud (nuevo) |
| --- | --- | --- | --- |
| Qué describe | orden entre items de una fase | por qué el trabajo no puede cerrarse | que el trabajo ya se cerró |
| Efecto sobre fechas | empuja dependientes hacia delante | ninguno | congela las del item |
| Alcance | intra-fase | global, atraviesa roadmaps | por item |

El `Purpose` de `blockers` dice literalmente que una dependencia externa *"solo describe por qué el trabajo no puede cerrarse"*. Es decir, esa capability ya se escribió apuntando a un concepto de cierre que hasta ahora no existía. Este cambio lo crea, y **deliberadamente no las acopla**: ver D3.

El punto de fricción real está en otro sitio. `commit()` llama a `enforceConstraints(rm)` en cada mutación, y esa función existe precisamente para **mover items**. Congelar items dentro de un sistema cuya operación central es empujarlos es la decisión estructural de todo el cambio (D4).

## Goals / Non-Goals

**Goals:**

- Registrar que un item está terminado, cuándo, y que ese registro sobreviva a los arrastres posteriores.
- Que el orden en que se completa refleje el orden en que se planificó depender.
- Medir la desviación de forma que **no se pueda borrar arrastrando la barra**, que es lo que hoy ocurriría con cualquier medida ingenua.
- Distinguir "tardé más de lo que dije" de "cambié lo que decía", que son dos fallos distintos y hoy se confunden.
- Que lo completado se lea de un vistazo sin robarle atención a lo pendiente.

**Non-Goals:**

- Completitud parcial. Un item está completado o no lo está; el porcentaje vive en la fase, derivado del recuento.
- Que las dependencias externas condicionen la completitud (D3).
- Línea base de fechas de inicio, ni de duraciones, ni barra fantasma del plan original. Solo se registra el fin planificado, que es lo que las dos desviaciones necesitan.
- Historial de replanificaciones. Se guarda una línea base y una previsión, no la serie completa de movimientos.
- Deshacer. La aplicación no lo tiene, y este cambio no lo introduce; se compensa con confirmaciones informadas donde se destruyen datos.
- Bloquear la edición no temporal de un item completado: renombrar, reasignar, recolorear, anotar y gestionar sus dependencias externas siguen permitidos. Congelado significa congelado **en el tiempo**.

## Decisions

### D1 — Capability propia, no una ampliación de `roadmap-editor`

La completitud entra como capability `completion` en vez de sumar requisitos a `roadmap-editor`.

El motivo es de forma, no de tamaño: `roadmap-editor` describe **cómo se construye** un roadmap —jerarquía, arrastre, colores, navegación—, y esto describe **cómo se cierra**. Son dos ciclos de vida distintos sobre las mismas entidades. El precedente es exacto: `blockers` también podría haber sido "unos campos más en el item" y se separó por la misma razón.

Además `roadmap-editor` es ya el spec más grande del proyecto, con dieciséis requisitos. Añadirle siete más lo convierte en el sitio donde va lo que no se sabe dónde poner.

`roadmap-editor` sí se modifica, pero solo donde sus requisitos actuales dejan de ser ciertos: la edición por interacción directa y la declaración de dependencias.

### D2 — `completedDate` es la única fuente de verdad, sin booleano acompañante

```ts
completedDate: IsoDate | null   // null ⟺ sin completar
```

Un par `completed: boolean` + `completedDate: IsoDate | null` admite dos estados inválidos —completado sin fecha, y fecha con el booleano a falso— que habría que defender en la carga, en el import y en cada mutación. Con un solo campo esos estados no se pueden escribir.

**La fecha por defecto es hoy y se puede corregir hacia atrás, nunca hacia delante.** La gente marca terminado lo que terminó el jueves pasado; si la fecha fuese siempre `todayIso()`, todo registro tardío nacería torcido y la desviación mediría la pereza del usuario en vez del retraso del trabajo. Hacia delante no se permite porque "lo completaré el mes que viene" no es completitud, es la fecha de fin que ya existe.

### D3 — La regla de orden es `dependsOn`, y las dependencias externas no condicionan

Un item no puede completarse mientras alguno de sus predecesores siga sin completar. Un item con dependencias externas **sin resolver sí puede completarse**.

La segunda mitad parece contradecir el `Purpose` de `blockers`, y es una elección consciente. Una dependencia externa registra que otro equipo te debe algo; en la práctica el trabajo propio se cierra igual, y el registro de la espera sigue siendo útil después. Acoplarlas obligaría a resolver la dependencia externa —un dato sobre otra persona— para poder cerrar el trabajo propio, que es exactamente al revés de cómo se comporta la realidad que `blockers` modela.

Las dos señales conviven en la barra sin pisarse: el rayado dice "esperando algo de fuera", la marca dice "cerrado". Un item puede tener las dos, y esa combinación es informativa.

*Alternativa descartada:* exigir todas las dependencias externas resueltas para completar. Es más puro y produce un modelo más consistente, pero convierte una anotación de seguimiento en una traba burocrática, y el usuario acabaría marcando como resueltas cosas que no lo están solo para poder cerrar su item — que destruye el valor del registro entero.

### D4 — El congelamiento tiene cuatro puertas, y la regla B hace que la cascada nunca choque

Las fechas de un item se pueden mover hoy por cuatro caminos, no por uno:

1. `setItemDates` — arrastre y redimensión desde la parrilla.
2. `toggleMilestone` — convertir a hito colapsa `endDate` sobre `startDate`.
3. `enforceConstraints` — la cascada automática, que corre en cada `commit()`.
4. `addDependency` — no mueve por sí misma, pero introduce una restricción que la cascada aplicará acto seguido.

Las cuatro necesitan guarda. La tercera parecía la difícil: si un predecesor sin completar se arrastra hacia delante, la cascada querría empujar a un dependiente congelado.

**La regla B disuelve ese conflicto por construcción:**

```
  X completado  ⟹  todos sus predecesores completados      (regla B)
                ⟹  todos sus predecesores congelados        (este mismo D4)
                ⟹  minStart(X) no puede volver a subir
                ⟹  la cascada nunca necesita empujar a X
```

La regla B no es entonces solo una norma de producto: es lo que hace que congelar sea coherente. Sin ella habría que elegir entre dejar dependencias violadas en el modelo o impedir que un predecesor se mueva por culpa de un dependiente, y ambas son malas.

La cuarta puerta es la que abre un boquete en ese razonamiento: añadir a un item ya completado una dependencia sobre un item sin completar viola la regla B *retroactivamente* y despierta la cascada sobre una barra congelada. Por eso a un item completado solo se le pueden añadir predecesores que también lo estén.

La guarda vive en el store, no en `enforceConstraints`, salvo la tercera: `enforceConstraints` es pura y trabaja sobre el modelo, así que comprueba `completedDate` directamente y se salta esos items. Es defensa en profundidad, no redundancia: cubre la carga de un documento importado que ya llegue con estados inconsistentes.

### D5 — Línea base explícita por roadmap, refijable, y sin base para lo añadido después

No existe ningún momento automático honesto para capturar el plan. `addItem` lo demuestra:

```ts
label: 'Nuevo item',
start = maxIso(todayIso(), rm.startDate);
end   = addDays(start, 30);        // treinta días porque sí
```

Un item nace en una posición de relleno con nombre de relleno. Capturar la base al crearlo mediría la deriva contra un número inventado, y un número inventado con aspecto de métrica es peor que no tener métrica.

De ahí una acción explícita, **"fijar plan"**, a nivel de roadmap: copia el `endDate` de cada item a su `baselineEnd` y sella la fecha en `Roadmap.baselineDate`. Es refijable, porque los planes se rebasan en la vida real, y refijar se confirma indicando que la deriva acumulada se reinicia.

**Los items creados después de fijar el plan se quedan con `baselineEnd: null`, a propósito.** Lo que parecía una carencia es la mitad que falta de la historia: un item añadido después de comprometer el plan *es*, por definición, alcance que entró después. Los planes no se tuercen solo porque las cosas tarden más; se tuercen porque aparecen cosas nuevas. Mostrarlo como "añadido después del plan" en lugar de fabricarle una base cuenta eso, y sale gratis.

*Alternativa descartada:* capturar la base en la primera edición "real" del item —renombrarlo o moverle las fechas—. Evita la ceremonia de la acción explícita, pero es imposible de explicar en una frase y por tanto imposible de confiar: el usuario nunca sabría contra qué está midiendo.

### D6 — Dos desviaciones, y su diferencia como la métrica que importa

Por cada item completado se derivan dos números en días naturales, con signo (negativo = terminado antes):

```
  línea base            última previsión           completado
  ├───────────┤ ──────────► ├───────────┤ ─────────► ✓
   baselineEnd               endAtCompletion          completedDate

  desviación vs. base      = completedDate − baselineEnd       deriva acumulada
  desviación vs. previsión = completedDate − endAtCompletion   fallo de estimación
  ─────────────────────────────────────────────────────────
  diferencia entre ambas   = replanificación pura
```

La segunda sale casi gratis: basta con congelar el `endDate` vigente en el instante de marcar, en `endAtCompletion`. Y es imprescindible precisamente porque **por sí sola no vale**: quien va tarde arrastra la barra antes de marcar completado y esa desviación sale cero. Es la primera, anclada a una base que el arrastre no toca, la que resiste.

Juntas separan dos fallos que normalmente se confunden. "Se completó quince días tarde respecto al plan, y cero respecto a la última previsión" no dice que se ejecutara mal: dice que se replanificó y luego se cumplió. Un item sin línea base muestra solo la segunda, y así queda claro que su deriva no es que sea cero, es que no existe.

Días naturales y no laborables, porque las fechas del plan también son naturales y "quince días tarde" es lo que se dice en voz alta. `dayIndex` ya los calcula.

### D7 — El asa se convierte en la marca: lo completado se asienta, no brilla

En un roadmap que va bien, la mayoría de las barras acaban completadas. Un tratamiento llamativo —un borde dorado, un color de acento— convertiría el caso normal en un muro de ruido, y gritaría sobre justo lo único que ya no requiere acción. La economía de atención de una parrilla es la contraria: el ojo debe ir a lo pendiente, lo bloqueado y lo que se está torciendo.

Cada barra lleva hoy un asa de arrastre a la izquierda, `.grip`, de 14px y en `--bar-ink`. En un item congelado **esa asa no hace nada**. Se sustituye por una marca de verificación en el mismo sitio y al mismo tamaño:

```
   ┌──┬───────────────────────────┐        ┌──┬───────────────────────────┐
   │⣿⣿│ Migración de datos    12d │   →    │ ✓│ Migración de datos    12d │
   └──┴───────────────────────────┘        └──┴───────────────────────────┘
     asa de arrastre                         la afordancia se transforma
                                             en su propia consecuencia
```

Tres virtudes que un borde no tiene: ocupa exactamente el hueco que deja lo que se ha desactivado, en lugar de añadir un elemento más a una barra que ya lleva asa, etiqueta, badge de responsable, contadores de dependencias externas y dos manejadores; **hace legible el congelamiento** en vez de que se descubra al intentar arrastrar y no pasar nada; y dibujada en `--bar-ink` contrasta por construcción sobre cualquier slot de cualquier tema, sin ampliar el contrato de tokens. Es el mismo argumento que llevó al rayado de dependencias externas a no inventarse un token.

**La marca no es interactiva.** Marcar y desmarcar viven en el drawer, porque desmarcar arrastra una cascada destructiva que necesita confirmación con recuento, y eso no cabe en catorce píxeles donde antes había un botón que se pulsaba sin pensar.

Los hitos no tienen asa: son `<svg><polygon>`. Ahí la marca se dibuja centrada dentro del rombo, con la misma tinta y el mismo trazado, y el `cursor: grab` del rombo desaparece igual. Camino distinto, misma lectura — el mismo desdoblamiento que ya hizo falta para el rayado.

El porcentaje de la fase va junto a su nombre en la columna izquierda, no sobre la barra rollup, que ya carga el rayado atenuado. Y probablemente sea ahí, en un número que sube, donde vive de verdad la sensación de avance: la barra individual solo tiene que decir "hecho" y callarse.

Si este cambio añade movimiento a la transición, es la ocasión de que la aplicación tenga su primera guarda de `prefers-reduced-motion`, porque hoy no tiene ninguna y todo su vocabulario son cuatro transiciones de entre 0,1 s y 0,22 s.

### D8 — El porcentaje de fase cuenta items, no pondera duraciones

`completados / total` sobre los hijos de la fase, redondeado.

Ponderar por duración parece más fiel al esfuerzo, pero **los hitos duran cero días** y desaparecerían de la métrica: una fase cuyo único pendiente fuese el hito de entrega marcaría 100%. Además el recuento es explicable en una frase, y una métrica de avance que hay que explicar en dos no se usa.

Una fase sin items no muestra porcentaje, no muestra 0%. Cero por ciento afirma que no se ha hecho nada de algo; no hay nada.

### D9 — Descompletar en cascada, con recuento en la confirmación

Desmarcar un item desmarca todos sus dependientes transitivos. Es lo que mantiene el invariante de la regla B al ir hacia atrás, y tiene la misma forma que la propagación hacia delante que `enforceConstraints` ya hace con las fechas.

Destruye datos: cada item alcanzado pierde su `completedDate` y su `endAtCompletion`, es decir, su desviación medida. Se reutiliza el patrón de confirmación con recuento del borrado de dependencias externas, por el mismo motivo que allí — sin deshacer en la aplicación, el recuento exacto es la única defensa.

Lo que la cascada **no** toca es `baselineEnd`: la línea base pertenece al plan, no a la completitud.

*Alternativa descartada:* prohibir desmarcar mientras haya dependientes completados. Preserva el invariante igual y no destruye nada, pero obliga al usuario a desmarcar a mano en orden inverso toda la cadena para corregir un error en su primer eslabón, que es la misma cascada hecha a mano y con más ocasiones de equivocarse.

### D10 — Normalización al cargar, sin versionado de esquema

Los documentos ya persistidos no llevan ninguno de los campos nuevos. Se normalizan en la carga —`completedDate`, `endAtCompletion` y `baselineEnd` a `null` en cada item, `baselineDate` a `null` en cada roadmap—, en la misma línea en que `normalizeColors` y `normalizeBlockers` ya adaptan datos anteriores, sin introducir número de versión.

La carga descarta además estados imposibles en vez de propagarlos: un item con `completedDate` cuyos predecesores no lo tengan queda sin completar. Un documento importado puede llegar en ese estado si se editó a mano, y es preferible perder una marca que arrastrar un modelo donde la regla B no se cumple y la cascada de fechas tiene permiso para chocar.

## Risks / Trade-offs

**[La ceremonia de "fijar plan" puede no ejecutarse nunca]** → Si el usuario no fija plan, `baselineEnd` es `null` en todo y solo existe la desviación contra la última previsión, que es la que se autoborra al arrastrar. La feature se degrada a la mitad silenciosamente. Mitigación: cuando un roadmap tiene items completados y ningún plan fijado, la propia sección de completitud lo señala en vez de mostrar un hueco. Es el riesgo principal del cambio.

**[Congelar sin deshacer es una vía de un solo sentido incómoda]** → Marcar completado por error deja un item inmóvil, y corregirlo exige desmarcar, que con dependientes arrastra la cascada. Se acepta porque desmarcar siempre está disponible y la confirmación dice el alcance, pero es la interacción que más conviene vigilar en uso real.

**[La regla B puede resultar demasiado estricta en la práctica]** → El trabajo real a veces se cierra fuera de orden, y `dependsOn` en esta aplicación es intra-fase, así que la restricción solo alcanza a cadenas cortas. Si molesta, la salida es degradar de impedimento a advertencia — pero entonces vuelve el conflicto de D4 entre cascada y congelamiento, y habría que resolverlo de verdad. No es una tuerca que se pueda aflojar sin coste.

**[Cuatro puertas de congelamiento son cuatro sitios donde olvidarse]** → Cualquier mutación futura que escriba fechas de item nace con el bug. La comprobación en `enforceConstraints`, aun siendo redundante con las guardas del store, actúa de red: un item completado que alguien mueva por una vía nueva no será arrastrado además por la cascada.

**[Tres campos nuevos en `Item` y uno en `Roadmap` cruzan cuatro capas]** → Modelo, normalización en carga, export e import, y la rama de formato heredado. Es el mismo recorrido que hizo `blockers`, así que el camino está trillado, pero es donde se acumulan los olvidos.

**[La marca compite por un espacio ya poblado]** → Un item puede estar a la vez completado, rayado por dependencias externas resueltas o pendientes, con badge de responsable y seleccionado. La marca ocupa el hueco del asa en vez de añadirse, que es lo que mantiene el presupuesto constante; pero el rayado de bloqueados sobre una barra completada es una combinación que conviene mirar con ojos reales antes de darla por buena.

## Migration Plan

No hay migración que ejecutar. La normalización en carga (D10) es idempotente y no reescribe nada hasta el primer guardado, que llega por el flujo normal de la aplicación.

Un documento guardado por esta versión y abierto por una anterior conserva sus campos desconocidos o los ignora sin romper, ya que la carga previa no valida campos extra: se vería como un roadmap normal sin nada completado, y sus items volverían a ser arrastrables.

Los roadmaps existentes arrancan sin plan fijado. Fijar el plan sobre un roadmap ya en marcha captura como base las fechas de hoy, no las de su origen; eso es correcto y es lo único posible, pero conviene que el texto de la acción lo diga para que nadie lea la deriva como si midiese desde el principio de los tiempos.

## Open Questions

Ninguna que bloquee la implementación. Registradas como trabajo futuro:

- Porcentaje agregado por roadmap en la vista "Todos", que es probablemente la lectura más útil de toda la feature y la que menos cuesta una vez existe el de fase.
- Relleno de progreso en la barra rollup de la fase, además del número. Colisiona con el rayado atenuado de dependencias externas y necesita mirarse en pantalla.
- Si la línea base debería incluir `startDate` y dibujarse como barra fantasma bajo la actual, que es lo que convertiría la deriva de un número en una imagen.
- Si "fijar plan" debería poder aplicarse a una sola fase, para roadmaps donde unas partes están comprometidas y otras aún se están dibujando.
