## Context

La aplicación de hoy tiene exactamente un nivel de navegación y lo tiene por escrito. `AppStore.metaView` arranca en `true` con un comentario que dice *"la sesión siempre empieza aquí, nunca dentro de un roadmap"*, y por eso no se persiste: `data.activeId` significa "el último roadmap abierto", no "dónde estoy". Ese diseño es correcto y este cambio **no lo contradice**, lo envuelve: "Todos" sigue siendo el home, pero de Roadmaps, no de la sesión.

```
   HOY                        CON EL HUB
   ───                        ──────────
   ┌ Todos ┐                  ┌ Hub ┐
   └───┬───┘                  └──┬──┘
       │ activeId                ├── Roadmaps ──┬ Todos ┐
   ┌───┴────────┐               │              └───┬───┘
   │ Roadmap X  │               │                  │ activeId
   └────────────┘               │              ┌───┴───────┐
                                │              │ Roadmap X │
                                │              └───────────┘
                                └── Decisions (anunciada, no se entra)
```

Tres restricciones acotan todo lo demás:

1. **No hay servidor ni cuentas.** Todo vive en el `localStorage` de un navegador y un perfil. Cualquier migración de claves es irreversible si falla.
2. **Hay una PWA instalada ahí fuera**, con su nombre, su icono y su `scope` en `/roadmaps/`. El repositorio se llama `roadmaps` y GitHub Pages sirve desde esa base.
3. **El tema es configurable y auditado.** `theming` resuelve tokens y comprueba contraste. Meter color literal en la interfaz es, hoy, ir contra una spec vigente.

El boceto de diseño (`Tech Lead Hub.dc.html`, pantallas `1a`/`1b` y familia de iconos `3a`) es la referencia visual. Es un mock estático con datos falsos: se porta el lenguaje visual, no el marcado.

## Goals / Non-Goals

**Goals:**

- Que añadir la tercera aplicación no obligue a tocar la landing.
- Que la landing responda "¿qué tengo hoy?" con datos **reales y derivados**, no con adornos.
- Que Roadmaps siga abriéndose donde se abre hoy, con un clic más y ni uno más.
- Que la identidad de aplicación (el color de cada app) y la identidad de tema (el acento) puedan convivir sin que la auditoría de contraste se vuelva mentira.
- Que el botón atrás funcione dentro de la PWA instalada.

**Non-Goals:**

- La aplicación Decisions. Aquí solo se anuncia.
- Cualquier campo nuevo en el modelo de datos.
- Que la URL describa el estado interno de una aplicación.
- Prefijar por aplicación las claves de `localStorage`.
- Responsive de móvil más allá de que la rejilla no rompa. El boceto es de 1440px y la aplicación es de escritorio.

## Decisions

### D1 — La familia de iconos `3a`, aceptando que rompe el dock

El boceto ofrecía tres caminos y uno de ellos, `3c`, derivaba del `pwa-512x512.png` actual: conservaba el rombo cian como forma de familia y era, en palabras del propio boceto, *"la única alternativa que no rompe la identidad que ya está en el dock de quien la tenga instalada"*.

Se elige **`3a`**: tile de 46px con `linear-gradient(145deg, from, to)` y la marca calada en tinta oscura. Es la variante que mejor escala a un catálogo largo, porque cada app estrena un par de la paleta y la silueta sigue leyéndose a 18px en el conmutador.

El coste se acepta explícitamente: **quien tenga la PWA instalada verá cambiar nombre e icono**. No hay forma de avisarle —no hay servidor ni canal— y no la hay tampoco de conservar el icono viejo solo para él, porque el manifest es único. Se asume porque el producto cambia de nombre de verdad, y un icono que dice "Roadmaps" en una aplicación que se llama Tech Lead Hub es un problema peor.

*Alternativas descartadas:* `3c` (conserva el rombo, pero la familia se agota rápido: rombo lleno, partido, en contorno… y a la cuarta app no quedan variaciones legibles a 18px); `3b` (misma silueta que `3a` con el degradado en la marca y el tile gris — más sobria, pero el color pesa demasiado poco a tamaño pequeño, que es donde vive el conmutador).

### D2 — La tinta del glifo es un literal oscuro, no `var(--bg)`

En el boceto el glifo va en `#0b0d10`, que resulta ser el `bg` del preset oscuro. Tentador leerlo como "la tinta es el fondo del tema" y escribir `fill: var(--bg)`. **No.** Con un tema claro, `--bg` es claro, y un glifo claro sobre un degradado cian saturado pierde el contraste justo donde el icono tiene que leerse a 18px.

La tinta se fija oscura. Los seis colores de degradado de la paleta son saturados y medios-altos en luminancia: la tinta oscura funciona sobre los tres pares en ambos temas, y el tile ya trae su propio fondo, así que no depende del lienzo.

### D3 — El color de aplicación es fijo; el acento de tema sigue siendo del tema

Dos identidades de color conviven y hay que decir cuál manda dónde:

| | color de aplicación | acento de tema |
| --- | --- | --- |
| Origen | fijo por app, en el registro `HubApp` | `--accent`, lo elige el usuario |
| Dónde | tile del icono, punto de la app | botones primarios, foco, "HOY", marca de la topbar |
| Sigue al tema | no | sí |
| Auditoría de contraste | pares cerrados, se audita una vez | ya cubierta por `theming` |

Que el tile de Roadmaps siga siendo cian con el tema en rojo es lo correcto: la identidad de una aplicación no es una preferencia estética del usuario, es cómo la reconoce. Y como los pares son cerrados y el tile trae su fondo, su contraste se comprueba una sola vez (D2) en lugar de en cada combinación de tema.

La consecuencia para `theming` es que su auditoría deja de poder afirmar que cubre *todo* el color de la interfaz, y tiene que decir qué queda deliberadamente fuera.

### D4 — El contrato `HubApp` es un objeto de datos, no un componente

La tarjeta es un único componente que recibe datos. Lo que una aplicación aporta es esto y solo esto:

```
HubApp {
  id, name, tagline
  icon:   { glyph, from, to }        // familia 3a
  state:  'live' | 'announced' | 'future'
  route:  '#/roadmaps'               // solo si state === 'live'
  summary(): {
    stats:  [Stat, Stat, Stat]       // valor + etiqueta + tono
    list:   { label, rows: Row[] }   // la etiqueta es del app, no literal
    alerts: Alert[]
  }
  actions: { open, create }
}
```

Dos detalles no obvios:

- **La etiqueta de la lista pertenece a la aplicación.** El boceto pone `ABIERTOS RECIENTEMENTE` en Roadmaps y `TOCA HABLARLAS` en Decisions. Si la landing la fijara, la tercera app tendría que fingir que sus tres filas son "recientes".
- **`summary()` es una función, no un objeto.** Se evalúa al pintar la landing, sobre estado reactivo. Si fuera un objeto habría que mantenerlo en sincronía y sería una segunda fuente de verdad de lo que ya deriva el store.

*Alternativa descartada:* que cada app aporte su propio componente de tarjeta. Da libertad total y garantiza que a la cuarta app la rejilla ya no se lea como un sistema. El objetivo es lo contrario: que la restricción sea la que hace que crezca bien.

### D5 — Tres estados en la rejilla, y Decisions no es la tarjeta genérica

Bajo el alcance elegido solo hay una app viva, y era tentador dejar Decisions como la tarjeta punteada de "Próximamente". Se descarta: Decisions **tiene** identidad decidida (violeta→fucsia, glifo de tres nodos enlazados) y anunciarla con nombre es información útil.

Así que la rejilla enseña los tres estados, que es justo lo que valida el contrato:

```
┌ live ──────────┐ ┌ announced ─────┐ ┌ future ────────┐
│ ▨ tile pleno   │ │ ◉ tile al 55%  │ │ ✚ tile al 40%  │
│ nombre+tagline │ │ nombre+tagline │ │ "Próximamente" │
│ 3 cifras       │ │ — sin cifras   │ │ — sin cifras   │
│ lista de 3     │ │ — sin lista    │ │ — sin lista    │
│ [abrir][+nuevo]│ │ píldora        │ │ — sin acciones │
│ borde sólido   │ │ borde punteado │ │ borde punteado │
└────────────────┘ └────────────────┘ └────────────────┘
```

`announced` y `future` se distinguen porque una tiene nombre y la otra no. La genérica se queda porque es la afirmación visual de que caben más, y es el hueco al que llegará la cuarta.

### D6 — Las preferencias de uso viven fuera de `AppData`

La landing pide dos datos que el modelo no tiene: qué roadmaps se abrieron hace poco y cuándo fue el último acceso. La vía obvia es un `lastOpenedAt` en `Roadmap`, y es la mala: `Roadmap` es lo que se exporta, así que el uso local acabaría viajando dentro del fichero JSON de un plan, y `data-portability` tendría que decidir si se importa (absurdo) o se ignora (un campo que existe y no significa nada).

Van por el `Storage` seam como preferencias, que ya existe para esto:

```
roadmaps:pref:recent    → [{ id, at }]  orden de apertura, se poda a los N últimos
roadmaps:pref:lastSeen  → timestamp del arranque anterior
```

Consecuencias que hay que respetar: **el modelo no se toca**, el export no cambia de forma, y un id de `recent` que ya no exista se descarta al leer en lugar de mantenerse sincronizado al borrar un roadmap. `lastSeen` se **lee antes de escribirse** en el arranque, o siempre diría "ahora mismo".

### D7 — Rutas por hash, y solo a nivel de aplicación

`#/` es el hub y `#/roadmaps` es Roadmaps. Nada más fino.

El hash y no el History API porque GitHub Pages no reescribe rutas: `/roadmaps/roadmaps` daría un 404 al recargar. El hash sobrevive a la recarga, al `start_url` de la PWA y a que la base cambie entre dev y Pages.

Y solo a nivel de aplicación porque el nivel siguiente es caro y no aporta: llevar el roadmap abierto a la URL obliga a decidir qué hace un id que ya no existe, a reconciliarlo con `activeId`, y a persistir una ubicación que hoy se decidió a propósito **no** persistir. Se para justo antes de esa frontera.

Un hash desconocido cae al hub. Es la única degradación posible sin inventar estado.

### D8 — Los avisos son reglas derivables, y el aviso de bloqueos se reformula

El boceto pide *"3 dependencias externas sin fecha confirmada"*. `Blocker` es `{ id, name, owner, email }` y `ItemBlocker` es `{ id, blockerId, feature, resolved }`: **no hay ninguna fecha**. Ese aviso no se puede derivar, y darle fecha a los bloqueos es un cambio de `blockers`, no del hub.

La tira se alimenta solo de lo que el modelo ya sabe:

| Aviso | Se deriva de | Tono |
| --- | --- | --- |
| Un roadmap acumula N días de desviación | `baselineEnd` vs. `endAtCompletion` / hoy | grave |
| N items pasados de fecha sin cerrar | `endDate < hoy` y `completedDate === null` | aviso |
| N bloqueos externos sin resolver | `ItemBlocker.resolved === false` | informativo |

Cada aviso nombra su aplicación de origen, que es lo que le da sentido en una tira que un día mezclará fuentes. El contador de la cabecera es el número de avisos, no una cifra aparte.

### D9 — La cabecera dice lo que pasa, no cuántas apps hay

El boceto titula *"Tus dos frentes abiertos"*, que codifica el número de aplicaciones en una frase. Con tres apps miente, y con una —el alcance de este cambio— ya miente.

La cabecera se deriva del estado real: con avisos, cuántas cosas piden atención hoy; sin avisos, que todo va según el plan. El *eyebrow* mantiene la fecha larga del boceto. Escala sin tocarse y dice algo más útil que un recuento de iconos.

### D10 — La topbar no inventa un usuario

El boceto muestra `jmsoleto · local`. **No hay cuentas ni servidor.** Poner un nombre de usuario sugiere una sesión que no existe, y sugerirla en una aplicación cuyos datos se pierden al borrar los del sitio es precisamente el malentendido caro.

Se queda `local` a secas: dice la verdad —los datos están en este navegador— y refuerza lo que el README ya advierte.

## Risks / Trade-offs

- **La PWA instalada cambia de nombre e icono sin avisar** (D1) → No se mitiga; se acepta. Lo que sí se hace es no tocar `scope` ni `start_url` de base, para que la instalación siga siendo *la misma* y no aparezca una segunda entrada duplicada en el dock.
- **La landing añade un clic al recorrido del 100% de uso actual** → Se acepta, y `web-distribution` fija que la PWA instalada abra también en el hub, para que la ubicación de arranque no dependa de por dónde se entre. El peaje es hoy real y con la tercera app deja de serlo. La landing no lo agrava porque carga sin esperar datos: ya están en memoria tras `store.init()`.
- **`summary()` se evalúa en cada pintado y recorre todos los roadmaps** → A la escala real (decenas de roadmaps, cientos de items) es irrelevante, y el cálculo ya lo hacen las funciones de `derive.ts` y `completion.ts`. Si dejara de serlo, se memoiza por `$derived`; no se optimiza antes de tiempo.
- **`recent` puede apuntar a roadmaps borrados** (D6) → Se filtra al leer contra los ids vivos, no al borrar. Menos acoplamiento y ningún estado que mantener en sincronía.
- **Los colores de aplicación quedan fuera de la auditoría de contraste** (D3) → Se auditan una vez, con la tinta fija de D2, y `theming` declara el hueco en lugar de fingir que no existe.
- **La rejilla es de columnas de 420px fijos** → Por debajo de ~900px cae a una columna. Es aceptable: la aplicación es de escritorio y el Gantt lo es todavía más.

## Migration Plan

No hay migración de datos: no se toca ni una clave existente ni un campo del modelo. Las dos preferencias nuevas son aditivas y su ausencia es un estado válido (sin recientes, sin último acceso).

Lo que sí migra es la **identidad de la instalación**, y su orden importa:

1. Iconos nuevos en `public/` conservando los nombres de fichero, para que el service worker los sustituya sin cambiar el manifest más de lo necesario.
2. Manifest, `<title>` e `index.html`.
3. Shell y landing.

`registerType: 'autoUpdate'` hará que la PWA instalada recoja el cambio sola en la siguiente visita. **Rollback:** revertir el commit y volver a desplegar; como no hay estado persistido nuevo que dependa del shell, una versión anterior lee los datos actuales sin tocarlos. Las dos preferencias nuevas quedarían huérfanas en `localStorage`, lo cual es inocuo.

## Open Questions

- **¿Cuántas filas guarda `recent` y cuántas enseña?** El boceto enseña tres. Guardar más permitiría reordenar sin perder historia, pero es estado que nadie ha pedido todavía.
- **¿"Roadmaps Hub" o "Roadmaps"?** El boceto usa el nombre largo en la tarjeta y el corto en el conmutador. Coherente, pero conviene decidir si es deliberado o inercia del mock.
