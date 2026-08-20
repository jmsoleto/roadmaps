## Context

`completitud-de-items` dejó el movimiento explícitamente sin resolver, y la razón está en cómo se monta la marca de la barra. El punto de montaje es un `{#if}` dentro de la fila:

```svelte
{#if isCompleted(v.item)}
  {@render checkMark()}      ← el elemento nace aquí
{:else}
  <button class="grip">⠿</button>
{/if}
```

Y las filas se recorren con `{#each visible as v, i (i)}`, **indexado por posición**. Eso significa que cambiar de roadmap no destruye las filas —Svelte reutiliza los nodos— pero sí conmuta ese `{#if}` en toda fila cuya nueva ocupante difiera en completitud de la anterior. De ahí:

| Acción | ¿monta la marca? | ¿debería animar? |
| --- | --- | --- |
| Abrir la aplicación | sí, todas | no |
| Cambiar de roadmap | las que difieren | no |
| Plegar o desplegar una fase | las que entran | no |
| **Completar un item** | una | **sí** |

Un elemento que aparece no sabe por qué aparece, y `completedDate` vale lo mismo en los cuatro casos. Animar el montaje es por tanto animar tres falsos positivos por cada acierto.

## Goals / Non-Goals

**Goals:**

- Que completar un item se sienta como un acto y no como un salto de estado.
- Poner el movimiento donde el ojo del usuario ya está, y donde de hecho se ve.
- Que ninguna otra interacción —arrancar, cambiar de roadmap, plegar una fase— produzca movimiento.
- Dejar la aplicación con su primera guarda de movimiento reducido.

**Non-Goals:**

- Animar la marca de la barra del Gantt. Ver D1.
- Introducir una señal transitoria compartida entre componentes. Resulta innecesaria; ver D2 y D3.
- Celebrar el descompletado. Ver D6.
- Desplazar la vista para que se vea lo que se anima.
- Añadir movimiento en cualquier otra parte de la aplicación.

## Decisions

### D1 — Se anima el drawer y el porcentaje; la marca de la barra se queda quieta

Los tres sitios candidatos no valen lo mismo, y lo que los separa es si se ven:

```
  ┌──────────────────────────────┬───────────────────┐
  │  parrilla                    │  DRAWER           │
  │                              │                   │
  │  Fase   60% ← visible        │  COMPLETITUD      │
  │   ├─ ▓▓▓▓▓▓▓                 │  [14/08] [Marcar] │ ← se pulsa aquí
  │   ├─ ▓▓▓▓▓▓▓▓▓▓ ← tapada     │                   │
  │   └─ ▓▓▓▓ ← fuera de pantalla│                   │
  └──────────────────────────────┴───────────────────┘
```

El drawer es donde está la mirada en el instante de pulsar. El porcentaje vive en la columna izquierda, que el drawer no tapa, así que sigue a la vista. La barra es la única que puede estar detrás del panel, desplazada fuera del viewport o dentro de una fase plegada — y es justamente la que arrastraba todo el problema de montaje.

Dejarla fuera no es una renuncia: es que el presupuesto de movimiento se gasta donde se percibe.

*Alternativa descartada:* animar también la barra con una señal transitoria (`ui.justCompleted`, fijada por el drawer y leída por la parrilla, con caducidad por temporizador). Es correcta y resiste cualquier montaje, pero paga infraestructura compartida entre dos componentes por un efecto que la mayoría de las veces ocurre donde no se mira. Queda registrada como trabajo futuro por si la marca de la barra se vuelve visible de otra forma.

### D2 — El drawer se resuelve con estado local, sin tocar `ui.svelte.ts`

La sección de completitud del drawer también conmuta un `{#if done}`, así que tiene el mismo problema de montaje: abrir el drawer sobre un item ya completado montaría la marca igual que completarlo.

Pero aquí el problema se cae solo, porque **el drawer es a la vez quien actúa y quien pinta**. Marcar y desmarcar viven en el drawer por decisión anterior (D7 de `completitud-de-items`: la marca de la barra no es interactiva), así que el componente sabe de primera mano que la completitud viene de su propio botón. Basta con recordarlo en estado local:

```
  el botón llama a store.completeItem(...) → true
        │
        └─► justCompleted = item.id      (estado local del componente)
                  │
                  └─► la animación se aplica solo si justCompleted === item.id
```

Nada compartido, nada persistido, nada que caducar por tiempo: cerrar el drawer o moverse a otro item deja de cumplir la condición y la animación no se reproduce, que es exactamente lo correcto.

### D3 — El porcentaje no necesita señal ninguna

Al completar un item, el `<span class="pct">` de su fase **no se desmonta**: solo cambia su contenido de texto. No hay aparición que confundir con una transición, así que no hay nada que identificar.

Un `Tween` de `svelte/motion` sembrado con el valor actual resuelve el caso entero por construcción:

```
  al montar      tween = new Tween(valorActual)   → ya está en destino, no se mueve
  al completar   tween.target = valorNuevo         → cuenta 40 → 41 → … → 60
```

El silencio en el arranque no es una excepción programada, es la consecuencia de sembrarlo bien. `svelte` 5.56.8 trae `Tween` en `svelte/motion`, así que no hay que escribir la interpolación a mano.

Los dígitos ya llevan `font-variant-numeric: tabular-nums`, puesto en su día para que el número no desplazase el nombre de la fase al cambiar de ancho. Es la misma propiedad que impide que un número que cuenta tiemble, así que el trabajo ya estaba hecho sin buscarlo.

### D4 — `{#key v.phase.id}` alrededor del porcentaje, por culpa del `{#each}` indexado

El `{#each}` está indexado por posición, no por id. Al cambiar de roadmap el mismo `<span>` pasa a servir a **otra fase**, y un tween que sobrevive a ese cambio deslizaría del porcentaje de una al de la otra: un número contando entre dos fases que no tienen relación, que es peor que un salto.

Envolverlo en `{#key v.phase.id}` destruye y recrea el bloque cuando la fase cambia de identidad, lo que resiembra el tween en el valor correcto y lo deja quieto. Es la corrección mínima.

*Alternativa descartada:* cambiar la clave del `{#each}` de índice a un id estable de fila. Es lo correcto en abstracto y probablemente convenga algún día, pero toca las dos pasadas de `visible` —la columna de etiquetas y la de pistas— y su comportamiento de reutilización de nodos, para arreglar aquí un caso que `{#key}` cubre en una línea.

### D5 — La marca del drawer pasa de carácter a trazado

Hoy el drawer pinta `<span class="done-mark">✓</span>`: un carácter. Un carácter no se puede dibujar por trazo, así que para animarlo hay que emitirlo como `<path>` SVG y animar `stroke-dashoffset` desde la longitud del trazado hasta cero.

Sale ganando dos veces: es el requisito técnico del efecto, y unifica el drawer con la parrilla, que ya dibuja ese mismo trazado como path —por el motivo que quedó anotado entonces: un `✓` de la fuente monoespaciada es un contorno fino que se deshace a tamaño pequeño.

### D6 — La secuencia revela el coste, y descompletar no la reproduce

El orden importa: primero el hecho, después la consecuencia.

```
   ✓ Completado el  [17/07/2026]              trazo dibujándose      ~220 ms
   frente al plan            7 d de retraso   entra                   +80 ms
   frente a la última previsión    en fecha   entra                  +140 ms
```

Las dos desviaciones son la información que justifica toda la funcionalidad, así que la secuencia las presenta en vez de decorarlas. Los tiempos se quedan en la banda que la aplicación ya usa (sus cuatro transiciones van de 0,1 s a 0,22 s); nada rebota ni se escala.

**Al descompletar la asimetría es deliberada.** El dibujado no se reproduce, porque la sección cambia al otro estado y no hay trazo que dibujar. El porcentaje, en cambio, **sí cuenta hacia abajo**, porque es el mismo tween y suprimirlo sería un caso especial gratuito: contar hacia abajo no celebra nada, solo da continuidad. La cascada puede mover varias fases a la vez y todas cuentan, lo cual es correcto — es literalmente lo que ha pasado.

Hay precedente para esta clase de asimetría: la propagación de dependencias externas se ofrece al resolver y nunca al desmarcar (D3 de `bloqueos-externos`).

### D7 — Movimiento reducido con `prefersReducedMotion`, no con CSS

`svelte/motion` exporta `prefersReducedMotion`, una media query reactiva. Con ella la guarda es una condición en el código —duración cero en el tween, sin dibujado en el drawer— en lugar de un bloque `@media` duplicando reglas en dos hojas de estilo distintas.

Es la primera guarda de este tipo en la aplicación, que hoy no tiene ninguna. Queda como precedente para lo que venga después.

## Risks / Trade-offs

**[La secuencia escalonada puede leerse como lentitud]** → Son ~400 ms de principio a fin y ocurre una vez por item completado, no en un camino repetitivo. Si molesta, lo primero que hay que recortar es el escalonamiento de las desviaciones, no el dibujado del trazo: el escalonamiento es el adorno, el trazo es la señal.

**[El porcentaje cuenta aunque nadie lo esté mirando]** → Es explícitamente lo que se quiere, y el coste es un tween por fase visible. Con el drawer abierto la columna izquierda se ve, así que el caso invisible es menos frecuente de lo que parece.

**[`{#key}` sobre el porcentaje añade un punto de remontaje]** → Es intencionado y es lo que resiembra el tween (D4), pero es una sutileza que no se explica sola: si alguien retira el `{#key}` porque parece redundante, reaparece el número contando entre fases distintas. Merece comentario en el código, no solo aquí.

**[El estado local del drawer se pierde si el componente se destruye]** → Es la conducta deseada —reabrir el drawer no debe animar— pero conviene saber que la animación depende de que el componente siga vivo entre la pulsación y el repintado. Lo está: es el mismo componente el que pinta el estado nuevo.

## Migration Plan

Ninguna. No hay datos, ni formato persistido, ni contrato de exportación implicados: solo comportamiento de interfaz sobre estado que ya existe.

## Open Questions

Ninguna que bloquee. Registradas como trabajo futuro:

- Animar la marca de la barra, con la señal transitoria descrita como alternativa descartada en D1, si alguna vez se vuelve fiablemente visible en el momento de completar.
- Si el porcentaje debería llevarse a la vista cuando queda fuera de pantalla, que es una decisión de navegación y no de movimiento.
- Si conviene cambiar la clave del `{#each}` de la parrilla de índice a id estable (D4), que arreglaría esta clase de problema de raíz para lo que venga.
