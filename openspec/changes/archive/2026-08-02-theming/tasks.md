## 1. Motor de temas (funciones puras, sin interfaz)

- [x] 1.1 Definir el contrato de tokens en `src/lib/theme/tokens.ts`: lista de tokens base (`bg`, `surface`, `text`, `text-dim`, `accent`, `line`, `danger`, `ink-light`, `ink-dark`), lista de tokens derivados, tokens geométricos (`line-width`, `focus-ring`, `bar-radius`) y los tipos `ThemeBase`, `ThemeOverrides`, `Theme`, `ResolvedTheme`
- [x] 1.2 Implementar utilidades de color en `src/lib/theme/color.ts`: parseo de hexadecimal, conversión sRGB ↔ oklab, mezcla en oklab y distancia perceptual
- [x] 1.3 Implementar `src/lib/theme/contrast.ts`: luminancia relativa, `ratio(a, b)` WCAG, `grade(ratio)` → AA/AAA/fail e `inkOn(bg, theme)`
- [x] 1.4 Escribir `src/lib/theme/contrast.test.ts` con valores conocidos (negro sobre blanco = 21:1, umbrales AA/AAA, `inkOn` en ambos extremos)
- [x] 1.5 Implementar `resolveTheme(base, overrides)` en `src/lib/theme/resolve.ts`: emite literales para todos los tokens, aplicando las fórmulas derivadas y dejando que las sobrescrituras ganen
- [x] 1.6 Escribir `src/lib/theme/resolve.test.ts`: un tema solo con base resuelve todos los tokens; una sobrescritura deja de seguir a su base; el resto de derivados de esa base sí se recalculan; quitar la sobrescritura restaura el valor calculado

## 2. Temas predefinidos

- [x] 2.1 Definir en `src/lib/theme/presets.ts` el predefinido **oscuro**, reproduciendo exactamente los valores actuales de `src/app.css:7-19`
- [x] 2.2 Ajustar las fórmulas de derivación hasta que el predefinido oscuro reproduzca también los ~35 literales actuales (velos, tintes, sombras, fin de semana) con desviación imperceptible
- [x] 2.3 Definir el predefinido **claro**
- [x] 2.4 Definir los predefinidos **claro de alto contraste** y **oscuro de alto contraste**, con `line-width` reforzado y velos convertidos en líneas sólidas
- [x] 2.5 Definir las paletas de barras de partida (incluida `PALETTE_V1`, la actual de `config.ts:13`, como paleta del predefinido oscuro) y asignar una a cada predefinido
- [x] 2.6 Escribir `src/lib/theme/presets.test.ts`: recorre los cuatro predefinidos, resuelve sus tokens y afirma AA en claro/oscuro y AAA en los de alto contraste, para cada par texto/fondo e `inkOn()` sobre los 10 slots de su paleta

## 3. Migración de color a slot

- [x] 3.1 Cambiar en `src/lib/model/types.ts` los campos `color: string` de `Item`, `Phase` y `Assignee` por `colorSlot: number`
- [x] 3.2 Implementar `normalizeColors(data)` en `src/lib/theme/migrate.ts`: valor que empieza por `#` → slot más próximo en `PALETTE_V1` por distancia oklab; en otro caso `parseInt`
- [x] 3.3 Escribir `src/lib/theme/migrate.test.ts`: hexadecimales exactos de `PALETTE_V1` mapean a su índice; un hexadecimal ajeno mapea al más próximo; datos ya normalizados se dejan intactos; idempotencia
- [x] 3.4 Llamar a `normalizeColors` en la frontera de carga de `src/lib/store/app.svelte.ts`, antes de exponer los datos
- [x] 3.5 Actualizar `src/lib/seed.ts` para sembrar slots en vez de hexadecimales
- [x] 3.6 Reescribir `cycleAssigneeColor` (`app.svelte.ts:379-386`) como `(slot + 1) % barPalette.length` y las asignaciones de color al crear fases (`:177`) y responsables (`:364`)
- [x] 3.7 Renombrar el campo en las structs de serde de `src-tauri/src/db.rs` (`color` → `color_slot`, conservando el nombre de columna SQL `color`) y ajustar `INSERT`/`SELECT`
- [x] 3.8 Actualizar `src/lib/io/portability.ts` para convertir colores absolutos a slots al importar, tanto en el formato actual como en el heredado
- [x] 3.9 Actualizar `src/lib/io/portability.test.ts` y añadir un caso de import con colores hexadecimales
- [x] 3.10 Verificar a mano el ciclo completo de migración **en navegador**: abrir con datos previos, comprobar que los colores se conservan y que tras un guardado el almacén contiene solo slots. La verificación equivalente contra SQLite queda aplazada (ver cierre)

## 4. Migración de literales a tokens

- [x] 4.1 Reescribir `src/app.css` para que `:root` declare el contrato completo de tokens, alimentado desde el tema resuelto
- [x] 4.2 Migrar los velos de `Gantt.svelte:622,717,786,862` y `MetaView.svelte:146,188` a `var(--hover)` / `var(--veil)`
- [x] 4.3 Migrar los tintes de acento de `Gantt.svelte:783,886`, `MetaView.svelte:185` y `DragTooltip.svelte:25` a `var(--tint-accent)` / `var(--tint-selected)`
- [x] 4.4 Migrar las sombras de `Drawer.svelte:229,248` y `Gantt.svelte:898,969,981` a los tokens de sombra
- [x] 4.5 Migrar el sombreado de fin de semana de `Gantt.svelte:800-802` a `var(--weekend)`
- [x] 4.6 Migrar los textos casi-token de `Gantt.svelte:654,677,682,746` (`#cfd3da`, `#c5cbd4`, `#fff`) a `var(--text)` / `var(--text-dim)`
- [x] 4.7 Migrar los colores en atributos SVG de `Gantt.svelte:419,521` a `var(--accent)` y al token de sombra correspondiente
- [x] 4.8 Sustituir las cuatro tintas fijas `#0b0d10` de `Gantt.svelte:929,995`, `Drawer.svelte:408` y `MetaView.svelte:229` por `inkOn()` sobre el color de la barra
- [x] 4.9 Aplicar `--line-width`, `--focus-ring` y `--bar-radius` donde corresponda, incluido el foco de `Drawer.svelte:306-310`
- [x] 4.10 Comparar la aplicación con el tema oscuro contra el estado previo al cambio y corregir cualquier desviación visual

## 5. Estado, persistencia y aplicación

- [x] 5.1 Crear `src/lib/theme/theme.svelte.ts` siguiendo el patrón de `ui.svelte.ts`: tema activo, temas propios, selección, creación, duplicado, edición y borrado
- [x] 5.2 Implementar `src/lib/theme/apply.ts`: escribe los tokens resueltos en `:root` y actualiza `<meta name="theme-color">`
- [x] 5.3 Persistir `theme.active` y `theme.custom` mediante `getPref`/`setPref` de `src/lib/store/storage.ts`, sin tocar el esquema SQL
- [x] 5.4 Espejar el tema activo resuelto en `localStorage` en ambos backends, y reconciliar cuando termine la carga del almacén canónico
- [x] 5.5 Añadir el script en línea de arranque a `index.html` que aplica la copia espejada antes del primer fotograma
- [x] 5.6 Ajustar `vite.config.ts:35-36` para que el manifest declare colores coherentes con el predefinido por defecto
- [x] 5.7 Verificar que no hay destello al arrancar con un tema claro **en navegador**; el mecanismo (script en `<head>` + espejo) es el mismo en Tauri, pero allí queda sin ejecutar (ver cierre)

## 6. Editor de temas

- [x] 6.1 Añadir la variante `{ kind: 'theme' }` a `DrawerState` en `src/lib/store/ui.svelte.ts` y su rama en `Drawer.svelte`
- [x] 6.2 Añadir el botón de temas a `Topbar.svelte`, junto a importar y exportar
- [x] 6.3 Construir `src/lib/components/ThemeEditor.svelte`: lista de temas seleccionables, con los predefinidos marcados como no editables
- [x] 6.4 Sección de colores base: los ~8 pickers, con vista previa en vivo aplicada sobre `:root`
- [x] 6.5 Sección de paleta de barras: 10 slots editables y selector de paleta de partida
- [x] 6.6 Sección avanzada plegada: tokens derivados con su valor calculado, edición para sobrescribir y botón de restablecer por token
- [x] 6.7 Panel de contraste: lista de pares texto/fondo con su relación y advertencia de los que no alcanzan el umbral, sin bloquear el guardado
- [x] 6.8 Acciones de nuevo, duplicar, renombrar, eliminar, guardar y cancelar; cancelar restaura la apariencia previa a abrir el editor
- [x] 6.9 Comprobar que eliminar el tema activo deja la aplicación en un predefinido utilizable

## 7. Portabilidad de temas

- [x] 7.1 Implementar `exportTheme` / `parseThemeImport` con el formato `roadmaps.theme.v1` en `src/lib/io/theme-portability.ts`
- [x] 7.2 Aplicar la regla de tolerancia al importar: claves desconocidas se ignoran, claves ausentes se derivan
- [x] 7.3 Escribir `src/lib/io/theme-portability.test.ts`: ciclo exportar → importar; tema solo con base; tema con tokens desconocidos; archivo que no es un tema
- [x] 7.4 Conectar importar y exportar tema en el editor, reutilizando el patrón de descarga y de `<input type="file">` de `Topbar.svelte:7-31`

## 8. Cierre

- [x] 8.1 Ejecutar la batería de tests completa y el linter
- [x] 8.2 Recorrer a mano los cuatro predefinidos comprobando Gantt, vista meta, drawer, tooltip de arrastre y barra superior
- [x] 8.3 Crear un tema propio de principio a fin, exportarlo, borrarlo, reimportarlo y comprobar que queda idéntico
- [x] 8.4 Verificar el build web (`npm run build`). El build de escritorio queda aplazado (ver cierre)

## Aplazado: verificación del lado de escritorio

En la máquina donde se implementó este cambio no hay `cargo` ni `rustc`
(`~/.cargo/bin` vacío), así que **los cambios en `src-tauri/src/db.rs` están
escritos pero sin compilar**. Se asume conscientemente porque la vía de reparto
de la app es la PWA desde `web-distribution`, y esa ruta sí queda verificada de
principio a fin.

El cambio en Rust es el renombrado de campo en tres structs de serde (`color` →
`color_slot`), sus lecturas (`r.get(2)`), sus escrituras (`params![…]`) y los
fixtures de test. La columna SQL conserva el nombre `color` y no hay cambio de
esquema ni de `LATEST_VERSION`.

Verificado en navegador, con el mismo código de migración que usará el escritorio:

- Migración perezosa sobre datos reales previos: los colores se conservaron y,
  tras el primer guardado, el almacén contenía solo slots, sin campo `color` ni
  hexadecimales.
- Arranque sin destello: el script en línea está en `<head>`, el espejo se
  escribe con los valores correctos y al recargar, la app vuelve en su tema.
- Los cuatro predefinidos, el editor, la vista previa en vivo, las
  sobrescrituras con su reset, el aviso de contraste y el ciclo completo de un
  tema propio.
- `npm run build`, `npm run check`, `npm run lint` y 95 tests.

**Para cerrarlo cuando haya toolchain** (`rustup` instalado):

```
cd src-tauri && cargo test     # que compile el renombrado y pasen los tests
npm run tauri dev              # migración contra SQLite y ausencia de destello
npm run tauri build            # build de escritorio
```

El riesgo real es bajo y acotado: si `db.rs` no compilase, el fallo sería un
error de compilación inmediato y localizado, no un problema silencioso en
tiempo de ejecución. Lo que sí conviene mirar con calma en esa pasada es que una
base de datos escrita **antes** de este cambio se lea sin error, ya que sus filas
contienen hexadecimales donde ahora se espera un slot — por eso el campo de Rust
se dejó como `String` en vez de entero.
