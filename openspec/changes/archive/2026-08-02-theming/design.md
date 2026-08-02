## Context

Estado al abrir este cambio: `desktop-foundation` y `web-distribution` archivados. La aplicación tiene un único aspecto, un tema oscuro cableado en `src/app.css:7-19`:

```css
:root {
  --bg: #0b0d10;    --panel: #13161b;  --panel-2: #181c22;
  --line: #20252c;  --line-strong: #2b323b;
  --text: #e8ecf1;  --muted: #7a828f;
  --cyan: #22d3ee;  --danger: #f87171;
}
```

Nueve tokens, y se usan de verdad: `--cyan` 29 veces, `--line-strong` 26, `--muted` 21, `--panel` 12, `--text` 11, `--line` 9, `--panel-2` 8, `--danger` 7, `--bg` 1. Pero conviven con ~35 literales que los rodean y que no se pueden tematizar sin clasificarlos primero:

| Tipo | Ejemplos | Dónde | Naturaleza real |
| --- | --- | --- | --- |
| Velo claro | `rgba(255,255,255,.04)`, `.012`, `.15` | `Gantt:622,717,786,862`, `MetaView:146,188` | `--text` diluido sobre el fondo |
| Tinte de acento | `rgba(34,211,238,.09)`, `.25`, `.15` | `Gantt:783,886`, `MetaView:185`, `DragTooltip:25` | `--accent` diluido |
| Tinta sobre barra | `#0b0d10` | `Gantt:929,995`, `Drawer:408`, `MetaView:229` | **contraste calculado**, no token |
| Sombra | `rgba(0,0,0,.4/.55/.6)` | `Drawer:229,248`, `Gantt:898,969,981` | opuesto del fondo, diluido |
| Fin de semana | `rgba(120,140,175,.14/.08)` | `Gantt:800-802` | tinte neutro sobre el fondo |
| Texto casi-token | `#cfd3da`, `#c5cbd4`, `#fff` | `Gantt:654,677,682,746` | `--text` / `--text-dim` mal escritos |
| SVG en atributo | `fill="#22D3EE"`, `stroke="rgba(0,0,0,.3)"` | `Gantt:419,521` | token, pero fuera de CSS |

La lectura clave: **la mayoría no son colores elegidos, son colores derivados**. Un hover no es «gris `#1a1e24`», es «el fondo un poco desplazado hacia el texto». Si el editor obliga a fijar a mano el hover, su borde y su sombra, cualquier usuario rompe la coherencia visual en dos minutos.

El segundo hecho decisivo: **no hay ningún selector de color libre en la app**. Todos los colores de datos salen de `PALETTE` (`config.ts:13`) por índice, y `cycleAssigneeColor` (`app.svelte.ts:379-386`) recupera ese índice con `indexOf` para avanzarlo. El modelo ya es de slots, desnormalizado como hexadecimal — con el fallo latente de que `indexOf` devuelve `-1` para colores ajenos a la paleta y `(-1+1)%10 = 0` resetea al slot cero.

## Goals / Non-Goals

**Goals:**

- Que el usuario pueda elegir entre cuatro temas predefinidos y crear los suyos.
- Que crear un tema propio sea **difícil de romper**: eligiendo pocos colores se obtiene una interfaz coherente completa.
- Que el alto contraste sea alto contraste **de verdad**, verificado, no un tema oscuro con más saturación.
- Que el tema oscuro predefinido sea **indistinguible** del aspecto actual.
- Que los temas sobrevivan a la evolución del contrato de tokens: un `.theme.json` exportado hoy debe seguir siendo válido cuando se añadan tokens nuevos.
- Cero migración DDL y cero script de datos.

**Non-Goals:**

- Tipografías, densidades o tamaños configurables. Solo color y tres tokens geométricos.
- Un tema por roadmap. El tema es global a la aplicación.
- Colores de barra libres fuera de los 10 slots.
- Sincronizar temas entre dispositivos.

## Decisions

### D1 — Dos niveles: ~8 colores base, ~30 derivados calculados, overrides dispersos

El contrato de tokens tiene tres capas:

```
BASE (elige el usuario)          bg · surface · text · text-dim
                                 accent · line · danger · ink-light/ink-dark
       │
       │ resolveTheme()  ← función pura
       ▼
DERIVADOS (se calculan)          surface-2 · hover · veil · line-weak
                                 tint-accent · tint-selected · weekend
                                 shadow-soft · shadow-strong · overlay · …
       │
       │ overrides (mapa disperso) machacan lo que el usuario haya tocado
       ▼
TOKENS RESUELTOS  →  :root
```

Regla de propagación, y es la que hay que saber explicar en la interfaz: **un derivado sigue a su base hasta que lo tocas; a partir de ahí queda fijo**, con un botón de reset que lo devuelve al cálculo.

Se descartó la alternativa de ~40 tokens todos explícitos (el usuario elige cada uno). Cumple más literalmente «elegir los colores de cada parte», pero hace el editor inmanejable, garantiza combinaciones ilegibles y —lo decisivo— rompe todos los temas guardados cada vez que se añade un token nuevo.

### D2 — Los derivados se calculan en TypeScript, no con `color-mix()` en CSS

Escribir `--hover: color-mix(in oklab, var(--text) 6%, transparent)` en la hoja de estilos es más corto y el navegador lo recalcula solo. Se descarta igualmente, porque hay un editor:

1. El editor tiene que **mostrar** el swatch derivado. `getComputedStyle()` sobre un `color-mix` no devuelve de forma fiable un color resuelto.
2. El validador de contraste necesita el valor real para poder decir «2,1:1, ilegible».
3. El `.theme.json` exportado queda inspeccionable y diffeable, en vez de lleno de expresiones.

`resolveTheme(base, overrides) → Record<Token, string>` es una función pura que emite literales. Encaja con la cultura del repositorio (`constraints.ts`, `segments.ts`, `timeline.ts` son puras y tienen test al lado) y hace que el motor de temas sea testeable sin navegador. La mezcla se hace en oklab para que los pasos perceptuales sean uniformes en claro y en oscuro.

### D3 — La tinta sobre las barras se calcula, no se declara

`color: #0b0d10` en `Gantt:929,995`, `Drawer:408` y `MetaView:229` va encima de un fondo que elige el usuario (el color del item). Ningún token puede resolverlo, porque el fondo es un dato, no parte del tema.

`inkOn(bg)` calcula la luminancia relativa del fondo y devuelve `--ink-dark` o `--ink-light` del tema activo. Deja de importar qué paleta elija el usuario: la etiqueta siempre es legible. Es también la pieza que permite validar la paleta de barras en los tests de los predefinidos.

### D4 — El color de datos pasa a slot, con migración perezosa en la frontera de carga

`Item.color: string` → `Item.colorSlot: number`. Igual en `Phase` y `Assignee`. El slot indexa `barPalette` del tema activo, así que cambiar de tema recolorea todos los roadmaps.

La migración **no necesita DDL ni script**, porque las columnas ya son `TEXT` (`db.rs:106,109,115`) y el transporte es JSON por serde:

```
store.load() → normalizeColors(data)
    valor empieza por '#'  →  slot = nearest(hex, PALETTE_v1)   [distancia oklab]
    en otro caso           →  slot = parseInt(valor)
El siguiente autosave ya escribe slots.
```

Cubre de un golpe los cuatro orígenes de datos antiguos: SQLite existente, `localStorage` del navegador, exports `roadmaps.v1` ya repartidos y ficheros heredados de `roadmap_tool_6_6_2.html`. En Rust solo cambia el nombre del campo en las structs de serde (`color` → `color_slot`); la columna SQL conserva su nombre `color`.

Efecto colateral: `cycleAssigneeColor` pasa de `indexOf` + módulo a `(slot + 1) % length`. El fallo del `-1` no se arregla — deja de ser expresable.

### D5 — Los predefinidos son inmutables y se auto-verifican

Los cuatro predefinidos viven en el código, no en el almacenamiento, y no se pueden editar. Crear un tema propio es una acción explícita («nuevo» o «duplicar»); no hay bifurcación implícita al tocar un picker. Los cuatro quedan siempre disponibles como refugio si un tema propio resulta ilegible.

`presets.test.ts` recorre cada predefinido, resuelve sus tokens y afirma el ratio de contraste de cada par texto/fondo: **AA (4,5:1)** en claro y oscuro, **AAA (7:1)** en los dos de alto contraste, incluyendo `inkOn(barPalette[i])` sobre los 10 slots. Retocar un color de un predefinido y romper la legibilidad se detecta en CI.

### D6 — El alto contraste necesita tokens que no son color

Los velos al 1,2 % (`Gantt:622,862`) simplemente **desaparecen** en alto contraste: ahí las separaciones tienen que ser líneas sólidas, no tintes. Y el foco hoy es solo un `border-color` (`Drawer:306-310`), insuficiente. Por eso el tema lleva tres tokens geométricos:

- `--line-width` — 1px normal, 2px en alto contraste.
- `--focus-ring` — grosor del `outline` de foco.
- `--bar-radius` — redondeo de las barras; no aporta contraste, pero cuesta lo mismo y diferencia mucho unos temas de otros.

### D7 — Formato de tema tolerante, con los derivados como red de seguridad

```jsonc
{
  "format": "roadmaps.theme.v1",
  "name": "Nocturno cálido",
  "base": { "bg": "#12100e", "surface": "#1a1714", "text": "#f0e9e1", … },
  "barPalette": ["#E8A33D", "#C4623A", …],
  "overrides": { "hover": "#241f1a" }   // opcional
}
```

Regla de importación: **claves desconocidas se ignoran, claves ausentes se derivan**. Nunca falla, degrada. Esta es la ventaja no evidente de D1: un `.theme.json` que solo traiga los colores base produce una interfaz completa, así que los tokens que se añadan en el futuro no invalidan los temas guardados hoy. El nombre del formato sigue la convención de `portability.ts:16` (`roadmaps.v1`).

Un tema **no** viaja dentro del export de un roadmap. Son documentos distintos: el roadmap es contenido, el tema es preferencia de la aplicación.

### D8 — El tema se espeja en `localStorage` incluso en Tauri, para matar el destello

`app.css` cablea hoy un fondo oscuro, y la preferencia se lee de forma asíncrona (`store.load()` → `invoke` → SQLite). Con un tema claro seleccionado, el arranque enseña un fogonazo oscuro **garantizado** en escritorio, y probable en web.

SQLite sigue siendo la fuente de verdad. `localStorage` guarda una copia del tema resuelto, y un script en línea en `index.html` la aplica a `:root` antes del primer frame. Al cargar la preferencia real, si difiere, se corrige — un caso que en la práctica solo ocurre si se editó el tema desde otro perfil.

Al aplicar un tema se actualizan también `<meta name="theme-color">` (`index.html:6`) y los colores del manifest (`vite.config.ts:35-36`), para que la barra de estado de la PWA instalada acompañe.

### D9 — El editor vive en el drawer lateral

`DrawerState` (`ui.svelte.ts:3-6`) ya es una unión discriminada y admite `{ kind: 'theme' }` sin fricción. Como el drawer solo cubre la derecha, el Gantt real queda visible y se recolorea en vivo mientras el usuario arrastra el picker: vista previa WYSIWYG sin construir un panel de muestra. La vista previa se aplica sobre `:root` directamente; cancelar restaura el tema anterior.

## Risks / Trade-offs

- **Regresión visual en la migración de los ~35 literales.** Es la parte tediosa y la más propensa a fallos. Mitigación: el predefinido oscuro debe reproducir exactamente el aspecto actual, y esa equivalencia es el criterio de aceptación de la migración, no un extra.
- **El cambio no se puede partir.** Un estado intermedio con tokens nuevos y datos aún en hexadecimal deja la app incoherente. Va en una sola entrega.
- **Migración perezosa = irreversible en la práctica.** Tras el primer autosave los datos están en slots; volver atrás exigiría el mapeo inverso. Aceptado: el mapeo hex → slot es determinista y la paleta v1 queda registrada en el código como `PALETTE_V1` precisamente para poder deshacerlo si hiciera falta.
- **Pérdida de fidelidad de color en la migración.** Un hexadecimal ajeno a la paleta se acerca al slot más próximo, no se conserva. Solo afecta a datos manipulados a mano o importados de fuera, ya que la app nunca ha generado colores fuera de `PALETTE`.
- **`--accent` hace doble trabajo.** Hoy `--cyan` es a la vez identidad de marca y estado «seleccionado» (29 usos). Un tema que elija un acento apagado debilita la señal de selección. Se acepta: separarlos en dos tokens base sube el coste cognitivo del editor, y el validador de contraste puede avisar.
- **Un tema propio ilegible es posible.** El validador avisa, no bloquea: prohibir combinaciones sería paternalista en una herramienta personal. Los cuatro predefinidos son siempre la vía de escape.
- **El lado de escritorio se entrega sin compilar.** La máquina donde se implementó no tiene toolchain de Rust, así que el renombrado de `color` a `color_slot` en `db.rs` está escrito y revisado pero nunca ha pasado por `cargo`. Se acepta porque la vía de reparto de la app es la PWA (`web-distribution`) y esa ruta queda verificada entera, incluida la migración de datos con el mismo código que usará el escritorio. La deuda y el modo de saldarla quedan anotados al final de `tasks.md`.

## Open Questions

- ¿Cuántas secciones tiene el editor y cómo se presentan los ~30 derivados sin abrumar? (Propuesta de partida: base y paleta visibles, derivados plegados tras «avanzado».)
- ¿Los cuatro predefinidos se anclan al `prefers-color-scheme` y `prefers-contrast` del sistema en el primer arranque, o se arranca siempre en oscuro como hoy?
