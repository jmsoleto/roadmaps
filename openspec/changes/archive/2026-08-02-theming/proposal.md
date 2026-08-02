## Why

La app solo tiene un aspecto posible: un tema oscuro cableado. `src/app.css:7-19` define nueve tokens de color en `:root`, y a su alrededor conviven **unos 35 literales de color hardcodeados** repartidos por `Gantt.svelte`, `Drawer.svelte`, `MetaView.svelte` y `DragTooltip.svelte`. Esos literales no son descuidos: cada uno codifica una suposición distinta sobre el fondo oscuro.

- Velos blancos (`rgba(255,255,255,0.04)`, `0.012`, `0.15`) que dibujan hover, bandas alternas y separaciones sutiles. Sobre un fondo claro son **literalmente invisibles**.
- Tintes de acento (`rgba(34,211,238,0.09)`, `0.25`) que son `--cyan` diluido a mano y por tanto **no siguen** a `--cyan` si cambia.
- Tinta oscura fija (`color: #0b0d10`) para el texto que va **encima de las barras**, cuyo fondo lo elige el usuario. Hoy funciona por suerte: la paleta actual es toda de colores claros.
- Sombras negras al 40-60 % que en un tema claro son manchas.
- Colores dentro de atributos SVG (`fill="#22D3EE"`, `stroke="rgba(0,0,0,.3)"`), fuera del alcance de CSS.

No hay ninguna preferencia de tema, ni respeto por `prefers-color-scheme`, ni forma de que la app sea usable con necesidades de contraste alto.

Al investigar aparece un segundo hecho que cambia el alcance: **no existe ningún selector de color libre en la aplicación**. Todos los colores de datos salen de `PALETTE` (`src/lib/config.ts:13`) por índice — `PALETTE[rows.length % 10]` al crear fases, `PALETTE[assignees.length % 10]` al crear responsables — y `cycleAssigneeColor` (`src/lib/store/app.svelte.ts:379-386`) hace `PALETTE.indexOf(hex)` para *recuperar* ese índice y avanzarlo. El modelo ya es «slot de paleta»; solo que lo guarda desnormalizado como hexadecimal.

Esa desnormalización esconde un fallo que esta feature destaparía: `indexOf` devuelve `-1` cuando el color no pertenece a `PALETTE`, y `(-1 + 1) % 10` da `0`. En cuanto un tema cambie la paleta, **cada clic en un swatch resetearía silenciosamente al primer color**. Guardar el slot en vez del hexadecimal no arregla el fallo: lo vuelve inexpresable.

## What Changes

- Se introduce un **sistema de temas de dos niveles**. El usuario elige ~8 colores base; los ~30 tokens derivados (hover, velos, tintes, sombras, líneas débiles) se **calculan** a partir de ellos mediante una función pura, y solo se fijan a mano si el usuario los sobrescribe explícitamente en modo avanzado.
- Se añaden **cuatro temas predefinidos inmutables**: claro, oscuro, claro de alto contraste y oscuro de alto contraste. No se pueden editar; crear un tema propio es una acción explícita («nuevo» o «duplicar»).
- El tema incluye **tokens que no son color** (`--line-width`, `--focus-ring`, `--bar-radius`), porque el alto contraste real no es solo cromático: los velos al 1,2 % deben convertirse en líneas sólidas y el foco necesita un anillo visible, no solo un `border-color` como hoy (`Drawer.svelte:306-310`).
- Se añade un **editor de temas** en el drawer lateral, con vista previa en vivo sobre el Gantt real y un **validador de contraste WCAG** que evalúa cada par texto/fondo y avisa cuando un tema propio queda por debajo del umbral.
- El tema incluye una **paleta de barras de 10 slots**, con presets de partida. Cambiar de tema recolorea todos los roadmaps existentes.
- **BREAKING (formato interno):** los colores de fases, items y responsables pasan de hexadecimal a **índice de slot**. `Item.color` / `Phase.color` / `Assignee.color` (`string`) se sustituyen por `colorSlot` (`number`).
- La migración de los datos existentes es **perezosa, en la frontera de carga**: al cargar, un valor que empieza por `#` se convierte al slot más cercano por distancia en oklab, y el siguiente autosave ya escribe slots. **No hace falta migración DDL ni script de datos**: las columnas `phases.color` e `items.color` ya son `TEXT` (`src-tauri/src/db.rs:109,115`). Cubre de una vez los cuatro orígenes de datos antiguos: SQLite existente, `localStorage` del navegador, exports `roadmaps.v1` ya distribuidos y ficheros heredados de `roadmap_tool_6_6_2.html`.
- Los temas propios son **varios, con nombre, exportables e importables** como `.theme.json` (formato `roadmaps.theme.v1`), siguiendo la convención de `portability.ts:16`.
- El tema activo se **espeja en `localStorage` incluso en Tauri**, y un script en línea en `index.html` lo aplica antes del primer frame. SQLite sigue siendo la fuente de verdad; `localStorage` es solo caché de arranque. Sin esto, la lectura asíncrona de la preferencia (`invoke` → SQLite) garantiza un destello oscuro en cada arranque con tema claro.
- El `<meta name="theme-color">` (`index.html:6`) y los colores del manifest PWA (`vite.config.ts:35-36`) se actualizan al cambiar de tema, para que la barra de estado de la PWA instalada acompañe.

**Fuera de alcance (explícito):** tipografías configurables (las familias siguen fijas); densidad o tamaños de fuente por tema; temas por roadmap (el tema es global a la aplicación); sincronización de temas entre dispositivos; importar temas desde formatos de terceros (VS Code, terminal); recolorear items *individualmente* fuera de los 10 slots de la paleta.

## Capabilities

### New Capabilities

- `theming`: selección de tema, cuatro predefinidos inmutables, temas propios con nombre, resolución de tokens en dos niveles, tokens no cromáticos, validación de contraste, editor con vista previa en vivo y aplicación sin destello.

### Modified Capabilities

- `roadmap-editor`: los colores de fases, items y responsables dejan de ser hexadecimales arbitrarios y pasan a ser slots de la paleta del tema activo; el texto sobre las barras deja de tener tinta fija y se calcula por contraste.
- `local-persistence`: se añade la persistencia de preferencias de tema y de los temas propios, y la normalización de color → slot en la frontera de carga.
- `data-portability`: se añade el import/export de temas como documento propio, y el import de roadmaps debe convertir colores hexadecimales heredados a slots.

## Impact

- **Código nuevo:** `src/lib/theme/` (`tokens.ts` con el contrato de tokens, `resolve.ts` con la resolución pura base → derivados → overrides, `contrast.ts` con `inkOn()` y el ratio WCAG, `presets.ts`, `apply.ts`, `theme.svelte.ts`) y `src/lib/components/ThemeEditor.svelte`.
- **Código modificado:** `src/app.css` (los 9 tokens pasan a contrato completo); `Gantt.svelte`, `Drawer.svelte`, `MetaView.svelte`, `DragTooltip.svelte`, `Topbar.svelte` (~35 literales a tokens); `types.ts`, `seed.ts`, `config.ts`, `app.svelte.ts`, `portability.ts` (slots); `storage.ts` (preferencias de tema); `ui.svelte.ts` (nueva variante de drawer); `index.html` y `vite.config.ts` (anti-destello y color de la PWA).
- **Rust:** `src-tauri/src/db.rs` solo necesita el renombrado del campo en las structs de serde (`color` → `color_slot`, con la columna SQL conservando el nombre `color`). Sin cambios de esquema ni de versión.
- **Datos:** los colores de fases, items y responsables se migran solos al cargar. Los exports `roadmaps.v1` anteriores siguen importándose. Un tema propio no viaja dentro del export de un roadmap: es un documento aparte.
- **Tests:** `resolve.test.ts` y `contrast.test.ts` como funciones puras, en la línea de `constraints.test.ts` y `segments.test.ts`. Y `presets.test.ts`, que recorre los cuatro predefinidos, resuelve sus tokens y afirma que cada par texto/fondo cumple su objetivo — AA en claro y oscuro, AAA en los dos de alto contraste, incluyendo `inkOn()` sobre los 10 slots de la paleta. Si alguien retoca un color de un predefinido y rompe la legibilidad, el CI lo detecta.
- **Riesgo principal:** la migración de los ~35 literales es la parte tediosa y la que puede introducir regresiones visuales. El tema oscuro predefinido debe reproducir **exactamente** el aspecto actual, y ese es el criterio de aceptación de la migración.
- **Indivisibilidad:** el cambio no se puede partir en dos entregas. Un estado intermedio con tokens nuevos y datos aún en hexadecimal deja la aplicación incoherente.
- **Verificación:** la implementación se valida entera por la vía web —la que reparte la app desde `web-distribution`—, incluida la migración de datos sobre datos reales. Los cambios de `db.rs` quedan **escritos pero sin compilar**, por no haber toolchain de Rust en la máquina; el detalle y los pasos para saldarlo están al final de `tasks.md`.
