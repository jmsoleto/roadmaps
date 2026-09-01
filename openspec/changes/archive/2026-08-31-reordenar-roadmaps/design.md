## Context

Tres hechos del código mandan sobre todo lo demás.

**El primero: "Todos" es el caso fácil del gesto.** Lo que en el Gantt costó trabajo aquí no existe.

| | Gantt | "Todos" |
| --- | --- | --- |
| Altura de fila | variable: un bloque de fase son 1 o *n* filas | uniforme: una fila, un roadmap |
| Índice de destino | `dropBlockIndex` sobre `getPhaseBlocks` | `dropIndex` a secas |
| Previsualización | `previewRows` sobre la jerarquía | `moveInArray` sobre un array plano |
| Claves del `{#each}` | por índice (`Gantt.svelte:402`) | **ya por identidad** (`MetaView.svelte:114`) |
| Posición de las pistas | `top: i * ROW_H` | **ya igual** (`MetaView.svelte:178`) |

Las dos cosas que al Gantt hubo que enseñarle, `MetaView` ya las hacía. Y no hay contención que representar: un roadmap no está dentro de nada, así que el recorte de `dropIndex` cae en los extremos de la lista y nunca en un borde interior.

**El segundo: el color de un roadmap es su posición.** No hay campo; el slot se calcula desde el índice, en tres sitios:

```
                     store.data.roadmaps: Roadmap[]
                                  │
                        idx  (la posición)
                                  │
        ┌─────────────────────────┼──────────────────────────┐
        ▼                         ▼                          ▼
  MetaView:26  slot: idx   RoadmapSwitcher:40,48    roadmaps-summary:119
   ├ punto :116             └ punto del trigger :157   └ punto de la tarjeta
   └ barra :186                                            del hub
```

El acoplamiento es deliberado y está escrito: *"The slot is the roadmap's position, as in the 'Todos' view, so the colour on the card is the colour of its bar"* (`roadmaps-summary.ts:117`). Lo que nadie decidió es que reordenar fuera a repintarlo todo.

**El tercero: el gesto no vive en ningún sitio compartible.** `startReorder`, `rowY`, `previewIndex` y el CSS de `.row-grip` / `.held` / `.reordering` están dentro de `Gantt.svelte`. `MetaView` no tiene de dónde importarlos.

## Goals / Non-Goals

**Goals:**

- Que el orden de los roadmaps se pueda fijar, y que sea uno solo para toda la aplicación.
- Que el color de un roadmap deje de depender de dónde está en la lista.
- Que actualizar no cambie ni un color a nadie.
- Que el gesto quede en un sitio, no en dos copias.

**Non-Goals:**

- Elegir el color de un roadmap. Ver D7.
- Desplazamiento automático contra el borde, que sigue fuera desde el change anterior.
- Reordenar la lista de "abiertos recientemente", que se ordena por uso.
- Cambiar el modelo más allá del campo de color. El orden ya es la posición en el array.

## Decisions

### D1 — El orden es el de la aplicación, no el de una vista

El orden vive en `AppData.roadmaps`, y hay dos superficies que recorren ese array tal cual: la vista "Todos" y el desplegable del selector (`RoadmapSwitcher.svelte:44`). Arrastrar en la primera reordena también la segunda, sin escribir una línea para ello.

Esa herencia gratuita es la mitad del valor del cambio. Un orden que solo valiera dentro de "Todos" sería una preferencia de presentación; uno que también ordena el desplegable es el orden de tus proyectos, y se fija desde el único sitio donde se ven todos a la vez.

La tercera superficie, la lista "abiertos recientemente" de la tarjeta del hub, se ordena por uso reciente y no participa. Sí toma de aquí el color, que es otra cosa.

### D2 — `Roadmap` gana su propio `colorSlot`

Es el cambio que hace posible el resto sin efectos colaterales. Hoy el slot se deriva del índice, así que mover una fila repinta todas las que estén en o después de la posición menor de las dos, en las tres superficies del diagrama a la vez.

La alternativa era aceptarlo, y tenía un argumento decente: **borrar ya recolorea hoy**. `deleteRoadmap` (`app.svelte.ts:223`) filtra el array y todo lo que venía detrás cambia de color. O sea que la posición-como-color ya se mueve bajo los pies del usuario, y reordenar solo seguiría la convención existente.

Se descarta porque la convención no es tal, es un defecto que nadie ha mirado. Borrar un roadmap es raro; reordenar va a ser frecuente y deliberado. Hacer algo frecuente con un efecto que hoy solo tiene algo excepcional no es heredar una costumbre: es amplificar un fallo latente hasta volverlo la experiencia normal.

Y el fondo del asunto: **el color de un roadmap es cómo lo reconoces en tres pantallas distintas.** Que cambie porque has movido *otro* roadmap rompe exactamente la función que cumple. `Phase`, `Item` y `Assignee` ya llevan `colorSlot` por esta razón; el roadmap se quedó fuera sin que nadie lo decidiera.

Efecto secundario que se acepta de buen grado: esto arregla también el repintado al borrar, que nadie había pedido arreglar pero que tampoco quería nadie.

### D3 — Se rellena en el borde de carga, no con una migración versionada

No hay sistema de migraciones en este repositorio, y es a propósito. Lo que hay son pases idempotentes que rellenan lo que falta al entrar: `normalizeColors`, `normalizeBlockers` y `normalizeCompletion`, encadenados en `app.svelte.ts:69-70`, con el razonamiento escrito en `normalize.ts:1-17` — el transporte es JSON, así que versionar el formato cuesta más que rellenarlo.

El pase nuevo es el cuarto de esa cadena y hace una sola cosa: a cada roadmap sin `colorSlot`, asignarle su índice. Eso **reproduce exactamente el color que ya tenía**, porque el índice es de donde salía. Al actualizar nadie ve cambiar nada; lo único que ocurre es que el color deja de recalcularse y pasa a estar escrito.

Como los otros tres, es idempotente y no fuerza por sí solo una escritura: la conversión se consolida en el siguiente guardado que ocurra por el uso normal.

### D4 — Por la puerta de importación el slot no puede salir del índice

`portability.ts:99` normaliza el documento entrante reutilizando el pase de carga sobre un envoltorio de un solo roadmap:

```ts
return normalizeCompletion({ roadmaps: [rm] }).roadmaps[0];
```

Un documento trae **un** roadmap, así que su índice es siempre cero. Pasar el pase de D3 por aquí pintaría todo lo importado con el slot 0.

La puerta de importación necesita por tanto su propia regla, y son dos casos:

- **El documento trae `colorSlot`**: se respeta. Es la identidad del roadmap, y quien reimporta su propia exportación debe recuperar su color.
- **El documento no lo trae** (formato heredado, o exportado antes de este cambio): se asigna por la posición de destino, como hace `addRoadmap`.

Que el slot resultante coincida con el de un roadmap que ya estaba no es un error. Con diez posiciones de paleta y más de diez roadmaps, compartir color ya es lo normal, y lo es desde siempre para fases e items.

### D5 — El recorte sigue ahí, aunque nunca muerda por dentro

`dropIndex(from, dy, roadmaps.length)` recorta igual que para los items. La diferencia es qué significa el recorte: allí era la contención dentro de una fase —un borde interior que había que enseñar frenando la fila—, y aquí son los extremos de la lista, que no separan a un roadmap de ningún contenedor porque no hay ninguno.

El frenado visual (`minY` / `maxY`) se conserva de todos modos, y es `0` y `(roadmaps.length - 1) * ROW_H`. No enseña ninguna regla, pero evita que la fila levantada se vaya por encima de la cabecera de la parrilla o por debajo de la última: sigue siendo la respuesta correcta a un puntero que se va lejos.

### D6 — El núcleo reactivo se extrae; el marcado se queda en cada vista

`MetaView` ya duplica hoy el andamiaje de layout del Gantt —`.gantt-scroll`, `.sidebar`, `.row-label`, `.sidebar-head`— así que duplicar también el gesto seguiría la costumbre de la casa. Se rechaza: eso serían dos copias de una **máquina de estados**, no de unas reglas de estilo, y quien toque el frenado o la transición la tercera vez tendrá que acordarse de los dos sitios.

El corte va por donde las dos vistas coinciden de verdad:

```
  se extrae  ──────────────────────────────────────────────
    estado del gesto: from, to, dy, originY, minY, maxY
    el cableado de punteros sobre `onDrag`
    la Y de la fila levantada, ya recortada
    el cálculo del índice de destino para filas uniformes

  se queda en cada vista  ───────────────────────────────
    el mapa de índices de previsualización
      · Gantt      → previewRows sobre la jerarquía
      · "Todos"    → moveInArray sobre el array plano
    el marcado de la fila y a qué llama al soltar
```

El mapa de previsualización **no** se extrae porque es donde las dos vistas difieren de verdad: una tiene jerarquía y bloques, la otra una lista. Forzarlo a un solo sitio pediría un parámetro que reintrodujera la jerarquía en la vista que no la tiene.

Las funciones puras ya están en `derive.ts` desde el change anterior; lo que falta es la porción reactiva. El Gantt sale de esta más limpio de lo que entró.

### D7 — El color de un roadmap sigue sin poder elegirse, y es lo coherente

Tras D2 un roadmap nace con un slot y no hay forma de cambiarlo. Podría parecer una regresión —hoy el usuario puede alterar el color de un roadmap, aunque sea sin querer, borrando otro— pero es justo lo contrario: cambiar el color de A borrando B nunca fue control, era un efecto colateral.

Y el estado resultante es el que ya tienen los demás. Solo `cycleAssigneeColor` (`app.svelte.ts:731`) permite avanzar un slot; una fase y un item nacen con el suyo y se quedan con él para siempre. El roadmap queda exactamente igual.

Esto obliga a corregir de paso el requisito de color por slot de `roadmap-editor`, cuyo escenario dice hoy que *"el usuario avanza el color de una fase, item o responsable"*. De los tres solo el responsable puede. La spec prometía algo que la aplicación nunca ha hecho, y este change la toca de todos modos para meter al roadmap.

## Risks / Trade-offs

- **Un campo nuevo en el modelo es un campo que puede llegar ausente o basura.** Mitigación: el pase de D3 rellena lo ausente por posición, y la puerta de D4 cubre el documento importado. Ambos idempotentes.
- **La extracción de D6 toca `Gantt.svelte`, que acaba de cambiar.** Es refactor sobre código con pruebas recientes y verificación en vivo, no sobre terreno desconocido; y las pruebas puras de `derive.ts` no se mueven. Aun así, la reordenación de fases e items hay que volver a comprobarla al terminar.
- **Sin desplazamiento automático, ahora son dos las vistas incómodas** para mover una fila lejos. Sigue aceptado, y con una lista de roadmaps la presión es menor que con una de fases.
- **Reordenar roadmaps no viaja.** `exportRoadmap` exporta uno solo y `importFromText` hace `push` al final, así que el orden es estado puramente local. No es un problema, pero la spec debe decirlo en vez de dejar que se suponga.

## Open Questions

Ninguna abierta. Las dos decisiones de alcance —el color como campo, y el orden como orden de la aplicación— quedan fijadas en D2 y D1.
