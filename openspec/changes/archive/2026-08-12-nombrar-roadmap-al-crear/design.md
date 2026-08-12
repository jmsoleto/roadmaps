## Context

Tres caminos escriben hoy nombres de roadmap en `AppData`:

```
  Topbar "+ nuevo"          ──▶ store.addRoadmap()   ──▶ push · activeId · metaView=false · save
  MetaView "+ crear el 1º"  ──▶ store.addRoadmap()   ──▶ idem
  Topbar "↓ importar"       ──▶ store.importFromText() ──▶ push (nombre del JSON) · activeId
  MetaView fila <input>     ──▶ store.renameRoadmap(id, value)   ← oninput, por pulsación
```

`addRoadmap()` (`src/lib/store/app.svelte.ts:146`) no recibe nada: fabrica `Roadmap ${n+1}` y ejecuta el alta entera de un tirón. Este cambio parte ese tirón en dos —pedir nombre, luego crear— y añade una regla de unicidad que se exige solo en esa puerta.

La app no tiene ningún diálogo modal. Lo flotante existente son drawers laterales (`ui.svelte.ts` → `DrawerState`, cuatro variantes) y un popover anclado (`RoadmapSwitcher.svelte`). El popover ya resuelve foco al abrir, teclado y cierre por `pointerdown` en captura —este último con un motivo documentado: en WebKit los botones no toman foco al pulsarlos, así que `blur` no serviría.

## Goals / Non-Goals

**Goals:**

- Que crear un roadmap exija nombrarlo, y que no se cree nada hasta que el nombre sea válido.
- Que dos roadmaps no puedan nacer con el mismo nombre bajo una comparación tolerante (mayúsculas, acentos, espacios).
- Que la regla de comparación sea una función pura, testeable al margen de Svelte y reutilizable si mañana el renombrado la necesita.
- Que el nombre visible sea siempre el que el usuario escribió.

**Non-Goals:**

- Comprobar unicidad al renombrar o al importar. Queda explícitamente fuera (ver `specs/roadmap-editor/spec.md`, requisito "Alcance de la unicidad de nombres").
- Reparar o migrar nombres repetidos ya presentes en los datos guardados.
- Cambiar el modelo de datos, el formato persistido o el de importación/exportación.
- Construir un sistema de modales general. Se construye este diálogo; generalizar es trabajo de la segunda vez que haga falta uno.

## Decisions

### La clave de comparación es una función pura fuera del store

`nameKey(s)` en `src/lib/util/` (junto a `id.ts` y `assignees.ts`):

```
  nameKey(s) = s.normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/\s+/g, '')
                .toLowerCase()

  "Diseño de Producto"  ──▶  "disenodeproducto"
  "  Plan  Q1  "        ──▶  "planq1"
```

Fuera del store y fuera del componente: es la única pieza con reglas sutiles (¿la `ñ` cae con `NFD`? sí) y merece sus propios tests sin montar nada. `RoadmapSwitcher.svelte:24-28` ya tiene un `norm()` casi igual para filtrar, pero **no se unifican**: el filtro conserva los espacios a propósito (buscar "plan q" debe funcionar) y son dos reglas con dos motivos distintos que evolucionarán por separado. Se documenta el parecido en ambos sitios para que nadie los "arregle" fusionándolos.

`\p{Diacritic}` con flag `u` ya se usa en el switcher, así que el soporte del entorno está probado en producción.

### El store expone el motivo del rechazo, no solo un booleano

```ts
roadmapNameError(name: string): { kind: 'empty' } | { kind: 'duplicate'; existing: string } | null
addRoadmap(name: string): boolean
```

El diálogo necesita el **motivo** para explicarlo bajo el campo mientras el usuario escribe, y el spec exige nombrar el roadmap con el que choca. El store necesita el **veredicto** para no crear basura si alguien llama a `addRoadmap()` por otra vía. Con dos métodos, uno apoyado en el otro, la regla vive en un solo sitio y el componente no la reimplementa.

Alternativas descartadas: que `addRoadmap` lance (obliga a `try/catch` en la vista para un caso que no es excepcional); que devuelva un resultado discriminado (el llamante ya conoce el motivo, porque lo consultó para pintar el error).

La comprobación de vacío se hace **sobre la clave**, no sobre el texto crudo: `nameKey("   ") === ""` resuelve el caso "solo espacios" sin una segunda regla.

### El estado del diálogo vive en `ui`, aparte de `DrawerState`

Dos componentes lo abren (`Topbar` y `MetaView`), así que el estado no puede ser local de ninguno. Va a `UiStore` como campo propio (`newRoadmap = $state(false)` y sus `open/close`), **no** como una variante más de `DrawerState`: un modal no es un drawer, y puede convivir con un drawer abierto sin cerrarlo. Meterlo en la unión obligaría a cerrar el drawer del tema para pedir un nombre.

### Modal centrado, no popover anclado

El popover del switcher sería más barato y más coherente con lo que ya hay. Se elige modal con overlay porque crear una entidad persistente merece foco exclusivo: es un acto, no una navegación. El coste es un patrón nuevo, y con él las obligaciones de `role="dialog"` + `aria-modal="true"`, foco al campo al abrir, `Escape` para cerrar, clic en el overlay para cerrar, y devolver el foco al botón que lo abrió al cerrarse.

Se reutiliza del switcher el motivo de usar `pointerdown` sobre `blur` si hace falta detectar el exterior, aunque con overlay el clic fuera se captura en el propio overlay y no hace falta escuchar en `window`.

### El campo arranca vacío; la sugerencia es `placeholder`

Prellenar `Roadmap ${n+1}` reintroduce el problema que este cambio resuelve —un nombre que se acepta sin leerlo— y además puede abrir el diálogo ya inválido: con `[Roadmap 1, Roadmap 3]` el contador propone "Roadmap 3", que ya existe. Como `placeholder` orienta sin decidir. No se implementa "buscar el primer `Roadmap N` libre": es complejidad para producir justo el nombre que no queremos que el usuario acepte por inercia.

### El nombre se guarda literal

Consecuencia asumida: `"  Plataforma  "` se almacena con sus espacios de borde y así se ve en el topbar. No se recorta al guardar porque la decisión de producto fue explícita: normalizar solo para comparar. El daño está acotado —la clave impide que dos nombres difieran solo en espacios— y el renombrado desde "Todos" sigue disponible para arreglarlo.

## Risks / Trade-offs

- **La regla ignora todos los espacios, así que bloquea pares legítimos** como "Plan Q1" y "PlanQ1" → Mitigación: el mensaje de error nombra el roadmap con el que choca (exigido por el spec), de modo que el rechazo se lee como "ya tienes este" y no como un error arbitrario.
- **Quitar diacríticos hace colisionar "Año 1" con "Ano 1"** → Aceptado: es la contrapartida directa de la regla pedida, y el caso es marginal frente a la confusión que evita.
- **La unicidad tiene un agujero conocido**: crear "Plataforma" se bloquea, pero crear "Mobile" y renombrarlo a "Plataforma" no → Mitigación: queda escrito como requisito ("Alcance de la unicidad de nombres"), no como omisión, para que una revisión futura lo lea como límite deliberado y decida a conciencia si lo cierra.
- **Primer modal de la app**: si se hace a medias queda un diálogo que atrapa mal el foco o que `Escape` no cierra → Mitigación: la lista de obligaciones está enumerada arriba y cada una tiene su tarea.
- **`addRoadmap()` cambia de firma** y rompe a sus llamantes → Mitigación: son dos en todo el repo (`Topbar.svelte:39` y `MetaView.svelte:92`), ninguna suite los toca hoy, y `svelte-check` los señala.

## Migration Plan

No hay migración de datos: el modelo, el formato persistido y el de importación no cambian. Un archivo guardado antes de este cambio se abre igual, incluso si contiene nombres repetidos. Revertir el cambio no deja datos inservibles, porque lo único que produce es un `Roadmap.name` como los de siempre.

## Open Questions

Ninguna bloqueante. Para más adelante, si el agujero de la unicidad molesta en uso real: extenderla al renombrado exige decidir cuándo se valida, dado que el `<input>` de la fila persiste en cada pulsación y los estados intermedios de un nombre pueden chocar con nombres cortos existentes.
