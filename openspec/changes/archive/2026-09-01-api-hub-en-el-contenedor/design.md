## Context

El punto de partida es un PRD (`PRD-api-sketch.md`) y un prototipo funcional de un solo fichero (`api-sketch.html`, 1.120 líneas, sin dependencias) que implementa el P0 completo. El PRD declara como destino *"Vue 3 + Pinia + Dexie.js + Vue Router · sin TypeScript"*, y ese destino no existe: Tech Lead Hub es Svelte 5 con runes, TypeScript estricto, IndexedDB a pelo y **cero dependencias en tiempo de ejecución** — `package.json` no tiene una sola `dependency`.

La buena noticia es que el desajuste es superficial. Los apartados 1 a 6 y 8 a 10 del PRD son requisitos y decisiones de contrato, agnósticos del framework, y se portan tal cual. Lo que se descarta entero es el apartado 7, "Encaje en el TL-Toolkit":

| PRD §7 | Aquí |
| --- | --- |
| Pinia, `stores/apiSketch.js` | Clase con `$state`, exportada como singleton, como `decisions/store.svelte.ts` |
| Dexie.js, tablas `apiProjects` / `apiLibrary` | IndexedDB directo sobre la base `tech-lead-hub`, como `decisions/storage.ts` |
| Vue Router, `/api-sketch/:projectId` | Hash a nivel de aplicación, y `hub-shell` prohíbe bajar de ahí (D4) |
| Composables `use*.js` | Módulos puros en `lib/api/` con su test al lado |
| `.vue` recursivo con `:key` estable | `.svelte` recursivo con `{#each … (node.id)}` |

Y hay un regalo escondido en el cambio de framework. El criterio no funcional del R1 —*"escribir en clave, ejemplo o comentario no debe re-renderizar el árbol"*, que en el prototipo hacía perder el foco en cada tecla— es un problema de Vue. Con runes, `bind:value` sobre `node.description` toca un nodo del DOM y el `{#each}` keyado por identidad no se remonta. En Svelte ese requisito sale casi gratis.

El segundo hecho que manda es el estado del armazón. El README promete que registrar una aplicación no toca la landing ni la tarjeta, y es verdad. Lo que no dice es que sí toca el armazón:

```
  App.svelte                          Topbar.svelte
  ─────────────                       ──────────────
  if (inRoadmaps)   → Toolbar+Gantt   if (inRoadmaps)   → switcher + 3 botones
  else if (inDecisions) → DecisionsApp else if (inDecisions) → spacer + 3 botones
  else              → HubLanding      else              → spacer
                                      … + 2 <input type="file"> ocultos
```

Con dos aplicaciones eso es una condición. Con tres es una cadena en dos archivos, más dos inputs de fichero que ya conviven sin motivo. Es el momento de arreglarlo: la tercera aplicación es la causa y la primera prueba.

## Goals / Non-Goals

**Goals:**

- Que API Hub exista, se pueda entrar en ella, guarde lo suyo y aparezca en el hub como las otras dos.
- Que el armazón deje de nombrar aplicaciones, y que la promesa del README sea cierta también para él.
- Que el documento que se persiste tenga ya su forma definitiva, para que los changes siguientes añadan comportamiento y no migraciones.
- Que Roadmaps y Decisions no cambien en nada de lo que el usuario ve.

**Non-Goals:**

- El árbol de campos, la exportación y los modelos. Son los tres changes siguientes.
- Un contenedor genérico de aplicaciones con carga diferida, registro dinámico o plugins. Se resuelve el problema que hay —tres aplicaciones conocidas en tiempo de compilación—, no el que podría haber.
- Tocar el almacén de Roadmaps o el de Decisions.
- Que la identidad visual de una aplicación pase a ser configurable. Ver D7.

## Decisions

### D1 — Una aplicación registra su pantalla y sus acciones; el armazón no conoce a ninguna

`HubApp` gana tres cosas, y `App.svelte` y `Topbar.svelte` pasan a leerlas:

```
  AppDefinition (datos puros, sin stores)      registry.ts (conoce los stores)
  ├ id, name, tagline, identity, state         ├ summary()   ─┐
  ├ createLabel, route                         ├ open()       │ ya existían
                                               ├ create()     │
                                               ├ openRow()   ─┘
                                               ├ root      : Component     ← nuevo
                                               ├ context   : Component|null ← nuevo
                                               └ actions   : () => Action[] ← nuevo
```

- **`root`** es lo que se pinta al entrar. `App.svelte` queda en `<svelte:component this={app.root} />` sobre la aplicación activa, o la landing si no hay ninguna.
- **`context`** es el segundo nivel del breadcrumb, que ya es un componente propio de la aplicación y no un texto: Roadmaps aporta `RoadmapSwitcher`, API Hub aportará su selector de contrato, Decisions aporta `null`. Cuando es `null` el topbar pone el `spacer` que hoy escribe a mano en su rama.
- **`actions`** es una **función que devuelve datos**, no marcado. Devolver datos y no componentes es lo que mantiene la barra siendo una sola barra: una aplicación dice *qué* acciones tiene, y el topbar decide cómo se ven. Es el mismo argumento por el que la tarjeta de la landing no la dibuja cada aplicación. Y es una función, como `summary`, porque `disabled` depende de estado reactivo —`!store.activeRoadmap`, `decisions.unavailable !== null`— y un objeto fijo sería una segunda fuente de verdad.

Alternativa descartada: que cada aplicación aporte su propio fragmento de topbar como componente. Da libertad total y garantiza que a la tercera la barra deje de leerse como un sistema, que es exactamente el argumento que `hub/types.ts` ya escribe sobre las tarjetas.

### D2 — Importar es una acción con forma propia, no un botón que abre un input suelto

Hoy el topbar tiene dos `<input type="file">` ocultos y una variable de error compartida por los dos flujos de importación. Con la tercera aplicación serían tres inputs. Una acción declara su tipo:

```
  { kind: 'button', label, title?, disabled?, run() }
  { kind: 'file',   label, title?, disabled?, accept, run(text: string) }
```

El topbar mantiene **un solo** input oculto, lo apunta a la acción que se activó, lee el fichero y llama a `run(text)`. El manejo del error —el mensaje efímero que ya existe— se queda en el topbar, que es donde se muestra, en lugar de duplicarse por aplicación.

En este change API Hub no declara ninguna acción de fichero: importar y exportar contratos llega con la biblioteca. Se define ahora porque es lo que permite mudar Roadmaps y Decisions sin dejarles un caso especial.

### D3 — Multiproyecto entra en el primer change, no en la fase 3 del PRD

El PRD pone el multiproyecto en P1 y la fase 3. Ahí tiene sentido: en un prototipo suelto, una API global es un recorte razonable. Aquí no.

El contenedor es multi-documento por construcción. Roadmaps tiene N roadmaps, Decisions tiene N decisiones, y el contrato de la tarjeta pide **una lista corta de elementos** en los que entrar directamente. Una aplicación con una sola API global tendría que llenar esa lista con endpoints, que es otra cosa, y volver a cambiarla cuando llegara el multiproyecto. Peor: obligaría a migrar los contratos que el usuario ya tuviera, que es la migración irreversible que este proyecto lleva evitando desde el principio.

Así que la unidad no es "la API", es **el contrato**, y hay varios desde el primer día. El propio PRD lo admite al justificar el R11: *"El TL-Toolkit gestiona varios dominios; una sola API global es insuficiente"*.

### D4 — El contrato abierto no va a la dirección

El PRD pide `/api-sketch/:projectId`. `hub-shell` lo prohíbe, con la razón escrita en `routes.ts`: GitHub Pages no reescribe rutas, y llevar el documento abierto a la URL obliga a decidir qué hacer con un id que ya no existe y a reconciliarlo con el activo. Roadmaps tiene N roadmaps y ninguno aparece en el hash.

El contrato abierto vive en el store y se persiste con el resto del estado de sesión, exactamente como el roadmap activo. La ruta es `#/api` y nada más.

### D5 — El documento se define entero ahora, aunque solo se edite una parte

`Contract` incluye desde ya `models: Model[]` y `endpoints: Endpoint[]` con su tipo completo, incluido `Node`, aunque este change no ofrezca forma de crear ninguno.

El argumento es el que `decisions/storage.ts` ya escribe sobre el almacén de adjuntos: *"the store is chosen for where it ends up, not where it starts"*. Un documento que empieza siendo `{ info, server }` y crece en el change siguiente es una migración sobre datos reales del usuario. Un documento completo desde el principio es un array vacío.

El nodo se define **plano y serializable**, sin clases, sin métodos y sin referencias circulares. El PRD lo marca como consecuencia arquitectónica de sus R18/R19, y aquí hay una segunda razón: `structuredClone` sobre el documento es lo que hace el guardado.

### D6 — La disciplina del proxy: `$state.snapshot` en los cinco sitios que copian

`$state` envuelve en Proxies profundos. Copiar un nodo reactivo con un spread copia el proxy, y guardar un proxy en IndexedDB revienta el `structuredClone` interno. El repo ya tiene la disciplina —`structuredClone(data)` antes del `put`, `$state.snapshot(...)` antes de exportar— y aquí hay que aplicarla en cinco operaciones concretas, cuatro de ellas en changes posteriores:

| Operación | Change |
| --- | --- |
| Duplicar un contrato | este |
| Duplicar un nodo (R2) | el árbol |
| Extraer un bloque a modelo (R4) | los modelos |
| Expandir una referencia (R4) | los modelos |
| Guardar en la biblioteca e importar de ella (R12) | la biblioteca |

Se anota aquí porque es la trampa número uno del port y porque la primera de las cinco entra ya.

### D7 — La identidad es ámbar→rosa y es fija; el interior sigue al tema

Cuarto par del catálogo: `#FBBF24 → #FB7185`. Contraste contra la tinta del glifo (`#0b0d10`), que es lo que exige `identity.test.ts`: **11.66:1** y **7.23:1**, ambos por encima de AAA.

El par no es un token del tema, y no lo será. `identity.ts` lo argumenta: *"an app's colour is how it is recognised, not an aesthetic preference, so theming the app red must leave the Roadmaps tile cyan"*. Lo que sí va con el tema es todo lo demás dentro de la aplicación: el prototipo trae su propia paleta cableada (`--bg`, `--mut`, `--in`…) y se sustituye por los tokens del contenedor, sin excepciones. La auditoría de `theme/audit.ts` lo cubre.

El glifo son **dos llaves con un punto entre ellas**: la forma de un JSON, calada en tinta oscura como las otras tres, y reconocible a 18 px, que es el tamaño del conmutador. Se distingue de las barras de Roadmaps y del grafo de Decisions sin ambigüedad.

### D8 — Id `api`, nombre "API Hub", ruta `#/api`

El nombre de la tarjeta es "API Hub", así que el id y la ruta van con él. `shortName()` recorta el sufijo `Hub` y deja "API" para el conmutador y el breadcrumb, igual que deja "Roadmaps" y "Decisions".

En la conversación inicial la herramienta se llamó *APIProt*; se descarta como nombre visible pero se deja constancia aquí de que es la misma cosa, por si aparece en notas anteriores.

### D9 — Almacén propio, base `tech-lead-hub` v3, dos almacenes desde el principio

```
  localStorage                    IndexedDB · tech-lead-hub
  ────────────                    ─────────────────────────
  roadmaps:appdata:v1             v2  decisions      (documento)
  roadmaps:pref:*                     attachments    (bytes)
                                  v3  apiContracts   (documento)   ← nuevo
                                      apiLibrary     (biblioteca)  ← nuevo, vacío
```

La subida de versión es aditiva: `onupgradeneeded` ya crea solo los almacenes que faltan, así que los datos de Decisions no se tocan. Una pestaña con la versión anterior abierta produce el `onblocked` que ya está resuelto, con su mensaje.

La biblioteca se crea vacía y sin uso, por el mismo motivo que Decisions creó `attachments` antes de tener adjuntos: crearla después obligaría a subir a v4 con contratos reales guardados.

Y el seam de carga es el de Decisions, no el de Roadmaps: `LoadOutcome` de tres ramas. `store/storage.ts` devuelve `T | null`, donde `null` significa "vacío", y aquí *vacío* y *no disponible* tienen que poder decirse por separado.

### D10 — Carga al lado del arranque, no dentro

`void apiContracts.init()` fuera del `await Promise.all` de `bootstrap`, como Decisions. Un IndexedDB colgado no dispara ningún evento, y esperarlo dejaría sin montar el hub y las otras dos aplicaciones por culpa de un almacén que ninguna usa. Este proyecto ya pagó ese fallo una vez.

### D11 — El punto de color de un contrato es suyo, no su posición

Las filas de la lista corta llevan un distintivo de color. Roadmaps lo resolvió hace dos changes: el slot de paleta es un campo del roadmap y no su índice, porque si no, reordenar o borrar repinta a los demás. Un contrato nace con su slot asignado por `contracts.length % PALETTE_SLOTS` y se lo queda. No se repite el error del que ya se salió.

## Risks / Trade-offs

- **El refactor del armazón es el trozo peligroso.** Toca las dos aplicaciones que funcionan y no debe cambiar nada visible. Mitigación: se hace primero y por separado, con Roadmaps y Decisions mudadas y verificadas **antes** de registrar la tercera. Si la mudanza rompe algo, se ve sin API Hub de por medio.
- **Un change que entrega una aplicación en la que casi no se puede hacer nada.** Crear contratos vacíos no sustituye a nadie. Es deliberado: lo que entrega es el armazón, la persistencia y el sitio donde el árbol se enchufa, y mezclarlo con el editor daría un diff en el que el refactor no se puede revisar.
- **Tipos definidos sin consumidor** (`Node`, `Endpoint`, `Model`). El precio es código que todavía no se ejecuta; la alternativa es migrar datos reales dentro de tres semanas. Ya se eligió lo mismo con los adjuntos y salió bien.
- **`svelte:component` con un componente que viene de un registro** pierde el tipado estricto de props respecto a un `if/else` con componentes literales. Se acota haciendo que los tres componentes raíz no reciban props: leen sus stores, como ya hacen hoy.

## Migration Plan

No hay migración de datos. Nadie tiene contratos guardados y la subida de la base a v3 solo añade almacenes.

Sí hay una mudanza de código, y su orden importa:

1. El contrato de aplicación crece (`root`, `context`, `actions`) sin que nadie lo use todavía.
2. Roadmaps y Decisions se mudan a él y el armazón pierde sus ramas. **Punto de verificación**: nada visible ha cambiado.
3. API Hub se registra sobre el mecanismo ya probado.

## Open Questions

- **La convención de nombres de schema** (`Paginacion` vs `Pagination`, ES vs EN). Es la pregunta 3 del PRD y no bloquea nada aquí, pero cuanto más tarde se pacte, más divergencia habrá que arreglar después.
- **Qué cuenta la tercera cifra a largo plazo.** En este change son modelos, porque es lo que hay. Cuando exista el validador, "contratos con avisos" es mejor cifra que "modelos", y probablemente la desplace: es la única de las tres que señala un problema, y el contrato de la tarjeta espera que alguna pueda hacerlo.
