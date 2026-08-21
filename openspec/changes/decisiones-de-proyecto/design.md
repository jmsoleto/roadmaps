## Context

Tech Lead Hub tiene un hueco y un contrato esperándolo. `hub-landing` define qué reporta una aplicación —tres cifras, una lista corta con su propia etiqueta, sus avisos— y `hub-shell` define que solo se entra en las vivas. Decisions ya está registrada como anunciada, con su par de degradado y su glifo. Este change la rellena.

Tres restricciones heredadas mandan sobre todo lo demás:

1. **No hay servidor ni cuentas.** Todo vive en el navegador de una persona. Cualquier migración es irreversible si falla.
2. **`localStorage` es un recurso compartido y su fallo es silencioso.** `LocalStorageBackend.save` captura la excepción y hace `console.error`: si se llena la cuota, el autosave deja de funcionar sin avisar. Con Roadmaps solo, la cuota no se acerca; con Decisions y sus futuras capturas dentro, sí.
3. **El seam de almacenamiento ya se escribió para este momento.** Su cabecera dice que sigue siendo asíncrono *"por si los datos superan `localStorage` y se mueven a IndexedDB, que es asíncrono por naturaleza"*.

Y hay un patrón de este repositorio que se aplica entero aquí. `completion` resolvió cómo medir contra un plan que se puede reescribir: congelando el dato en el instante en que deja de poder discutirse (`endAtCompletion`), y prohibiendo el booleano redundante al lado de la fecha (*"la ausencia **es** el estado sin terminar"*). Las decisiones tienen los dos problemas idénticos.

## Goals / Non-Goals

**Goals:**

- Que capturar una decisión en mitad de una reunión cueste una línea de texto.
- Que la traducción de duda técnica a pregunta de negocio quede registrada, no solo su resultado.
- Que la recomendación no se pueda reescribir después de saber la respuesta.
- Que negocio vea el intercambio que está eligiendo, no una lista de opciones equivalentes.
- Que el almacén de Decisions no pueda dañar el de Roadmaps.
- Que la landing acoja la segunda aplicación **sin cambiar una línea**.

**Non-Goals:**

- Adjuntos. Son el change siguiente.
- Cualquier acoplamiento con Roadmaps.
- Puntuación calculada de alternativas.
- Colaboración, comentarios, historial de ediciones o notificaciones.
- Mover Roadmaps a IndexedDB.

## Decisions

### D1 — Decisions estrena almacén, en IndexedDB, y Roadmaps no se mueve

Tres opciones sobre la mesa:

| | migración de datos reales | aislamiento de cuota | un solo backend |
| --- | --- | --- | --- |
| Todo a IndexedDB | **sí, irreversible** | sí | sí |
| Decisions en `localStorage` | no | **no** | sí |
| **Decisions en IndexedDB** | **no** | **sí** | no |

Gana la tercera, y el argumento decisivo no es la capacidad: es que **las cuotas son independientes**. Con los dos almacenes separados, el fallo silencioso de la restricción 2 deja de ser posible por construcción y no por cuidado. Que haya dos backends distintos es el precio, y es exactamente lo que el seam permitía desde el principio.

Queda una objeción legítima: sin adjuntos, las decisiones en texto caben de sobra en `localStorage`, así que IndexedDB parece prematuro. No lo es, y por una razón de secuencia: si este change las guarda en `localStorage`, el siguiente tiene que **migrar decisiones reales que ya habrás creado** — justo el riesgo irreversible que llevamos dos changes evitando. El almacén se elige por dónde va a acabar, no por dónde empieza.

Las claves de Roadmaps siguen intactas (`roadmaps:appdata:v1`, `roadmaps:pref:*`). Prefijarlas por aplicación seguiría sin aportar nada y seguiría costando una migración; se queda como deuda cosmética, igual que en el change del hub.

### D2 — El estado se deriva; no existe campo de estado

```
  question === ''                          →  borrador
  hay question, raisedAt === null          →  preparada
  raisedAt !== null, resolution === null   →  planteada
  resolution !== null                      →  resuelta
  planteada y deadline < hoy               →  caducada
```

Un `estado: 'pendiente'` guardado junto a una `resolution` admite dos combinaciones que no significan nada —resuelta y pendiente, planteada sin fecha de planteamiento— y cada cargador, importador y mutación tendría que defenderse de ambas. Es literalmente el argumento de D2 de `completitud-de-items`, y vale igual aquí.

**Caducada** se deriva y no se guarda por un motivo extra: depende de *hoy*. Guardarla obligaría a un barrido diario que nadie va a ejecutar, y una decisión caducada volvería a estar viva con solo mover su fecha límite, que es el comportamiento correcto.

### D3 — La recomendación se congela al plantear, no al resolver

Si la recomendación se puede editar después de la conversación, no mide nada: quien se equivocó la reescribe y la comparación sale siempre a favor. Es el problema que `endAtCompletion` resolvió en Roadmaps.

El instante correcto es **plantear**, no resolver. Plantear es cuando te mojaste delante de negocio; entre plantear y resolver puede pasar una semana, y editarla en esa ventana sería reescribir lo que dijiste sabiendo por dónde van los tiros.

De ahí salen tres desenlaces, y el tercero es el interesante:

```
  resolution.optionId === recommendation.optionId   →  coincidió
  resolution.optionId es otra opción                →  se decidió otra
  resolution.optionId === null (resuelta a texto)   →  fuera de las opciones
```

El tercero no es un fallo del registro: dice que ninguna de las alternativas que ofreciste era la buena, o sea que el marco estaba mal planteado. Es información sobre quien prepara, no sobre quien decide, y es la más útil de las tres. Se registra igual que `baselineEnd === null` registra "esto se añadió después del plan".

Una decisión puede plantearse **sin** recomendación. Obligar a recomendar produciría recomendaciones de trámite, que contaminan la medida.

### D4 — Dos textos, y el segundo nace propuesto con el primero

`origin` es la duda como nació y `originContext` de dónde salió ("reunión equipo API · 12/08"). `question` es la pregunta en lenguaje de negocio.

El alta rápida escribe siempre en `origin`, porque es el caso mayoritario y porque no se puede preguntar en una reunión de qué tipo es lo que acabas de oír. Al preparar, el campo `question` **aparece rellenado con el texto de origen**, editable. Una decisión que ya nació en lenguaje de negocio se prepara aceptando lo que hay; una técnica se reescribe.

Eso conserva el modelo de dos textos sin cobrar un peaje a la mitad de los casos. Y hace que "traducida" sea observable: `question !== origin` dice que hubo traducción de verdad.

*Alternativa descartada:* preguntar en el alta si lo que escribes es técnico o de negocio. Un campo más en el único sitio donde no puede haber campos de más.

### D5 — Ejes de intercambio cualitativos, cortos y fijos

Cada opción declara, para cada eje, si lo sube, lo deja igual o lo baja, más una nota opcional de una línea.

```
  ┌ opción ────────────────────────┬ coste ┬ plazo ┬ riesgo ┐
  │ Gratis siempre                 │   ↑   │   →   │   ↓    │
  │ Se cobra salvo defecto         │   ↓   │   →   │   ↑    │
  │ Gratis con suscripción         │   →   │   ↑   │   →    │
  └────────────────────────────────┴───────┴───────┴────────┘
```

**Fijos** y no configurables: con un solo usuario, un catálogo de ejes editable es una pantalla de ajustes que nadie abre, y comparar opciones exige que compartan ejes. Añadir un cuarto eje el día que haga falta es una línea.

**Cualitativos** y no puntuados: una matriz de criterios con pesos y total calculado no se rellena en diez segundos y, cuando se rellena, la conversación se va a discutir el número en vez de la decisión. El objetivo no es que la aplicación calcule la respuesta, es que negocio **vea lo que está eligiendo** y por tanto lo asuma.

### D6 — Independiente de Roadmaps, con `project` como texto libre con autocompletado

Sin referencia a roadmaps, y fecha límite tecleada. El puente existe sobre el papel —el `Purpose` de `blockers` ya cita "una decisión pendiente"— pero construirlo antes de haber usado las dos aplicaciones por separado sería acoplar por simetría, no por necesidad. Además, la independencia de los almacenes es parte de lo que hace segura D1.

El autocompletado de `project` sobre los valores ya usados no es un adorno: sin él, el texto libre se fragmenta en *Checkout*, *checkout v3* y *Chckout* en dos semanas y la agrupación deja de servir para nada. Sugiere, no obliga: un proyecto nuevo se escribe entero.

### D7 — La captura rápida crea un borrador y nada más

Un campo, Enter. Sin proyecto, sin responsable, sin fecha, sin impacto. Cualquier campo obligatorio en el alta convierte un gesto de tres segundos en uno de treinta, y lo que no se captura en la reunión no existe.

Un borrador **cuenta** en las cifras del hub y aparece en su propia bandeja. Ver cuántos borradores llevas sin traducir es una medida honesta de deuda; esconderlos hasta que estén completos sería premiar el olvido.

### D8 — Qué aporta Decisions a la landing

Por el contrato de `hub-landing`, sin tocarlo:

| | |
| --- | --- |
| Cifras | decisiones abiertas · sin traducir (borradores) · caducadas |
| Etiqueta de la lista | `TOCA HABLARLAS` |
| Filas | preparadas y planteadas, las más urgentes primero |
| Avisos | caducadas (grave), límite dentro de pocos días (aviso), borradores acumulados (informativo) |

Las cifras cuentan **abiertas** y no el total histórico: el total sube para siempre y deja de decir nada a los tres meses.

## Risks / Trade-offs

- **Dos backends de almacenamiento en la misma aplicación** → Se acepta como el precio del aislamiento de cuotas (D1). El seam los unifica desde el punto de vista del store, y cada aplicación solo conoce el suyo.
- **IndexedDB falla de formas que `localStorage` no**: bloqueo por otra pestaña con una versión anterior, modo privado con almacenamiento restringido, actualización de esquema a medias → El arranque de Decisions tiene que distinguir "no hay datos" de "no se pudo abrir el almacén" y **decirlo**, en lugar de arrancar vacío como si no hubiera nada. Arrancar vacío sobre un almacén que sí tiene datos invita a volver a escribir encima.
- **`raisedAt` es un gesto explícito que se puede olvidar** → Una decisión que se habló pero cuyo botón nadie pulsó se queda en "preparada" y su recomendación sigue editable. No se mitiga con automatismos: inferir el planteamiento de cualquier otra cosa sería congelar la recomendación en un instante que no ocurrió.
- **Los ejes fijos no encajarán en alguna decisión** → Los ejes son opcionales por opción: una alternativa puede no declarar ninguno. Es mejor un hueco que un eje forzado.
- **`project` como texto libre acabará con duplicados pese al autocompletado** → Se acepta. La alternativa, un catálogo de proyectos con su alta y su borrado, es una segunda entidad y una pantalla más para un problema que todavía no existe.

## Migration Plan

No hay migración: no se toca ninguna clave existente. El almacén de Decisions nace vacío en una base de IndexedDB nueva, y su ausencia es un estado válido —primer arranque, sin decisiones.

**Rollback:** revertir y desplegar. Roadmaps sigue leyendo sus claves de `localStorage` intactas. Las decisiones creadas quedarían huérfanas en IndexedDB, recuperables al volver a desplegar, porque nada las borra.

El orden de implementación importa en un punto: el backend nuevo y sus tests van **antes** que cualquier interfaz, para no descubrir un problema de almacenamiento con datos ya escritos por encima.

## Open Questions

- **¿Cuántos ejes?** Se arranca con coste, plazo y riesgo. "Esfuerzo técnico" es candidato, pero se solapa con plazo más de lo que parece y conviene ver decisiones reales antes de añadirlo.
- **¿Se puede descaducar?** Hoy una decisión caducada vuelve a estar viva moviendo su fecha límite, que parece lo correcto, pero borra el rastro de que llegó a vencer. Si esa historia resulta valer, es un campo más y un change propio.
- **¿La resolución fuera de las opciones debería poder convertirse en opción?** Registrarla como alternativa nueva y marcarla resuelta dejaría el catálogo de alternativas completo para quien lo lea después. Añade un gesto en el peor momento, justo cuando quieres cerrar y seguir.
