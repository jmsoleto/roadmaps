## Context

El acoplamiento del frontend con Tauri es mucho menor de lo que sugiere el tamaño de `src-tauri/`. Solo **dos archivos** ejecutan código Tauri:

- `src/lib/store/storage.ts`: `isTauri()` decide el backend, `TauriBackend` habla por IPC con los cuatro comandos de `main.rs` (`load_app_data`, `save_app_data`, `get_pref`, `set_pref`), y `slotsAsText()` existe únicamente porque la columna `color` de SQLite es `TEXT`.
- `src/App.svelte`: importa `@tauri-apps/api/window` bajo `if (isTauri())` para interceptar el cierre de ventana.

Hay otras dos menciones, pero son **comentarios**, no dependencias: `RoadmapSwitcher.svelte:108` y `MetaView.svelte:71` usan `pointerdown` en vez de `blur` porque "en WKWebView los botones no toman foco". Ese comportamiento **no es de Tauri, es de WebKit**: Safari de escritorio hace exactamente lo mismo. El código se queda; lo que estaba mal era la atribución.

Del lado de la persistencia, el `Storage` seam ya aísla la decisión:

```
store/app.svelte.ts ──► interface Storage ──► createStorage()
                                                    │
                                     ┌──────────────┴──────────────┐
                                 TauriBackend            LocalStorageBackend
                                 (IPC → SQLite)             (localStorage)
```

Eliminar la rama izquierda no toca ni una línea de la capa de vista ni del store. Esa es la razón de que este cambio sea tan barato: la abstracción que se introdujo en `desktop-foundation` para poder desarrollar en navegador sin Tauri es exactamente la que ahora permite quitar Tauri sin tocar nada más.

En el lado de las specs el desajuste es mayor que en el código. `local-persistence` está escrita íntegramente sobre SQLite —esquema versionado, migraciones, escrituras transaccionales— y describe algo que, en la única vía de uso real, no existe. Y `desktop-shell` contiene tres requisitos de los cuales **solo el primero es de escritorio**; los otros dos (estado de sesión, guardado al cerrar) describen comportamiento vigente en la web que ninguna otra capacidad cubre.

## Goals / Non-Goals

**Goals:**

- Dejar el repositorio como un proyecto web puro: Node + npm, sin toolchain de Rust ni requisitos de plataforma.
- Que `openspec/specs/` describa lo que la aplicación publicada hace de verdad, ni más ni menos.
- Que ningún requisito vigente se pierda por el camino al retirar una capacidad entera.
- No degradar ningún comportamiento observable de la app web.

**Non-Goals:**

- Cambiar el almacén de `localStorage` a IndexedDB.
- Reforzar el volcado al cerrar con `pagehide` / `visibilitychange`.
- Simplificar o retirar la copia de arranque del tema (`roadmaps:theme:boot`).
- Cambiar el modelo de datos, el formato persistido o el de importación/exportación.

## Decisions

### 1. `createStorage()` deja de ser una decisión de tiempo de ejecución

**Decisión**: eliminar `isTauri()` y `TauriBackend`; `createStorage()` pasa a devolver siempre `LocalStorageBackend`.

**Se conserva la interfaz `Storage` y su asincronía.** Aunque `localStorage` es síncrono y el único backend restante podría exponer métodos síncronos, la interfaz async se mantiene tal cual.

**Por qué**: el seam es lo que hace este cambio trivial, y es lo que hará trivial una futura migración a IndexedDB —que sí es inevitablemente asíncrona— o a un backend remoto. Sincronizar la interfaz obligaría a tocar `store.init()`, `store.flush()`, `theme.init()` y sus tests, todo para revertirlo el día que el almacén crezca. Se elimina la implementación, no la abstracción.

**Alternativa descartada**: colapsar `Storage` y llamar a `localStorage` directamente desde el store. Ahorra un archivo pequeño a cambio de esparcir el conocimiento de las claves de almacenamiento por la capa de estado, y de hacer los tests del store dependientes de un `localStorage` global (hoy inyectan un backend en memoria, ver `app.svelte.test.ts:6`).

### 2. `slotsAsText()` se elimina sin sustituto

**Decisión**: borrar la función. Los `colorSlot` se persisten como números.

**Por qué**: existía por una razón exclusivamente de SQLite —la columna `color` es `TEXT` y precede al sistema de temas, así que el slot viajaba como cadena para no requerir migración de esquema (decisión D4 de `theming`)—. `localStorage` guarda JSON: un número se serializa como número y vuelve como número.

**Compatibilidad hacia atrás**: no hace falta ninguna conversión. `normalizeColors`, en el límite de carga del store, ya acepta tanto slots como valores de color absolutos, y ya toleraba slots en texto procedentes de la base de datos. Un `localStorage` escrito por la versión anterior contiene números; uno importado de un JSON antiguo pasa por `normalizeColors` igual que antes.

### 3. El volcado al cerrar se apoya en que `localStorage` es síncrono

**Decisión**: eliminar la rama `onCloseRequested` y quedarse solo con `beforeunload`.

Esto **no es una degradación** en el escenario que la spec de escritorio protegía. La cadena:

```
beforeunload
  └─► store.flush()            async, pero el cuerpo corre síncrono hasta el primer await
        ├─► clearTimeout(saveTimer)
        └─► storage.save(snapshot)
              └─► localStorage.setItem(...)   ← síncrono, completa antes de ceder el hilo
```

`LocalStorageBackend.save()` no tiene ningún `await` antes del `setItem`, así que la escritura **aterriza dentro del handler**. Con Tauri hacía falta `preventDefault()` + `await flush()` + `destroy()` precisamente porque el IPC sí era realmente asíncrono y el cierre habría ganado la carrera.

**El agujero que sí queda es otro, y no es nuevo**: `beforeunload` no se dispara de forma fiable en Safari iOS ni cuando el navegador descarta la pestaña. Ese agujero existe hoy, en producción, desde que la app se publicó en Pages. Cerrarlo requiere `pagehide` / `visibilitychange`, que es **añadir** comportamiento y queda fuera de alcance. Lo que sí hace este cambio es **dejar de mentir sobre él**: el requisito pasa de "MUST persistir cualquier cambio pendiente antes de cerrarse, sin pérdida de datos" a una formulación acotada al cierre normal de la pestaña o ventana, que es lo que la plataforma garantiza.

### 4. `desktop-shell` se retira entera; sus requisitos vivos se mudan a `local-persistence`

**Decisión**: los tres requisitos de `desktop-shell` van a `## REMOVED Requirements`, y dos de ellos reaparecen —reescritos en clave de navegador— como `## ADDED Requirements` de `local-persistence`.

```
desktop-shell
├── Aplicación de escritorio empaquetada ──────► REMOVED (sin sustituto)
├── Persistencia del estado de ventana y sesión ──┐
└── Guardado seguro al cerrar ───────────────────┐│
                                                 ││
local-persistence                                ││
├── Persistencia del estado de sesión ◄──────────┘│  (reescrito: sin "ventana")
└── Guardado de cambios pendientes al cerrar ◄────┘  (reescrito: acotado a la web)
```

**Por qué a `local-persistence` y no a un capability nuevo**: el roadmap activo y el nivel de zoom son preferencias, y viven en el mismo almacén que el resto; el volcado al cerrar es la garantía terminal del autosave, que ya está en esa capacidad. Crear un `app-lifecycle` para tres escenarios fragmentaría la lectura sin añadir nada.

**El escenario "Arranque offline" no se muda**: `web-distribution` ya tiene "Arranque sin conexión", que dice lo mismo para la vía que sobrevive.

### 5. `local-persistence` se reescribe, no se retira

**Decisión**: la capacidad conserva su nombre y su papel —dónde y cómo viven los datos— y cambia de sustrato.

```
Almacenamiento en SQLite con esquema versionado   ──► MODIFIED → almacén del navegador
Fechas absolutas como formato canónico            ──► intacto (es del modelo, no del almacén)
Autosave transaccional                            ──► MODIFIED → sin "transaccional"
Migración única desde localStorage/JSON           ──► REMOVED (duplicado)
Persistencia del tema y temas propios             ──► intacto
Copia de arranque del tema activo                 ──► MODIFIED → motivación corregida
Normalización de colores a slots al cargar        ──► MODIFIED → sin "sin requerir migración de esquema"
```

Tres matices:

- **"Transaccional" desaparece.** Describía la transacción SQLite de `db::save`. `localStorage.setItem` con el estado completo serializado es atómico por otra vía —una escritura única, todo o nada—, así que la propiedad útil se conserva; el adjetivo, que nombraba un mecanismo inexistente, no.
- **"Migración única desde localStorage/JSON" se retira por duplicado, no por obsoleta.** Con SQLite muerto, "desde localStorage" es circular: el destino *es* localStorage. Lo que quedaba vivo era importar el JSON heredado con índices de día base `2026-01-01`, y eso ya está cubierto íntegro en `data-portability`. Retirarlo elimina una duplicación, no una capacidad: **el comportamiento no cambia**.
- **La copia de arranque del tema se conserva con otra motivación.** Su texto la justifica por "la carga asíncrona de las preferencias", que con `localStorage` deja de ser cierta. Sigue siendo necesaria por otra razón: el script inline de `index.html` corre antes de que el bundle arranque y de que `bootstrap()` monte nada. Se corrige la motivación, no el mecanismo.

### 6. El service worker deja de ser condicional

**Decisión**: eliminar `isTauriBuild` y la detección de `TAURI_ENV_PLATFORM` de `vite.config.ts`; `VitePWA` pasa a estar siempre en `plugins`.

Con ello desaparece el requisito "Aislamiento de la caché en el empaquetado de escritorio" de `web-distribution`: protegía contra registrar un service worker dentro de un shell cuyos assets ya eran locales, y ese shell deja de existir.

`BASE_PATH` **se conserva sin cambios**: sigue haciendo falta para servir desde `/roadmaps/` en Pages y desde `/` en desarrollo y preview. Solo se corrige el escenario de la spec que citaba "el empaquetado de escritorio" como uno de los casos servidos desde la raíz.

### 7. Lo que se conserva a propósito

Tres cosas que parecen residuo de Tauri y no lo son, o cuya limpieza es otro cambio:

- **`pointerdown` en captura** en `RoadmapSwitcher.svelte` y `MetaView.svelte`. Es un comportamiento de WebKit, no de Tauri; Safari de escritorio lo comparte. **Solo cambia el comentario.**
- **El puerto fijo 1420 con `strictPort`.** Se justificaba por "el futuro shell de Tauri apuntando a una URL estable". Ese motivo desaparece, pero cambiar el puerto de desarrollo no aporta nada y rompe marcadores. Se corrige el comentario y se deja.
- **La copia de arranque del tema.** Ver decisión 5.

## Risks / Trade-offs

- **Los datos del SQLite de escritorio quedan inalcanzables.** Es el único efecto irreversible del cambio. El archivo (`~/Library/Application Support/com.roadmaps.app/roadmaps.db`) no se borra, pero deja de existir código capaz de leerlo. → **Mitigación: exportar a JSON antes de aplicar el cambio**, y verificarlo como primera tarea. Si se descubre tarde, el rescate es `git revert` del commit y `npm run tauri dev`, que sigue siendo viable mientras el commit exista en el historial.
- **`localStorage` asciende de fallback de desarrollo a almacén de producto**, heredando su cuota de ~5 MB por origen. → Un roadmap con fases, items y dependencias serializa en el orden de decenas de KB; el margen es de dos órdenes de magnitud. Si algún día se acerca al límite, el `Storage` seam (decisión 1) hace que la migración a IndexedDB no toque el store.
- **Se pierden los tests de Rust** (`db.rs` tiene cuatro, sobre esquema y round-trip). → Se van con el código que probaban; no queda comportamiento sin cubrir. La batería de calidad pasa a ser solo `npm run check && npm run lint && npm run test`.
- **El repositorio pierde la opción de volver al escritorio sin rehacer el trabajo.** → Es el propósito del cambio, y el historial de git conserva `src-tauri/` íntegro. Lo que no se recuperaría "gratis" es un `Cargo.lock` que siga resolviendo dentro de un año.
- **`dependencies` queda vacío.** → No es un riesgo, es un resultado: el proyecto pasa a no tener dependencias de runtime, solo de desarrollo. Conviene dejar la clave presente y vacía en vez de borrarla, para que añadir la primera dependencia futura no parezca un cambio estructural.

## Migration Plan

No hay migración de datos automática. La app web sigue leyendo exactamente las mismas claves de `localStorage` (`roadmaps:appdata:v1`, `roadmaps:pref:*`, `roadmaps:theme:boot`) con el mismo formato, así que **para un usuario de la web publicada el cambio es invisible**: sus roadmaps siguen ahí tras el despliegue.

Orden de aplicación:

1. **Antes de nada**: exportar a JSON cualquier roadmap que exista solo en el SQLite de escritorio.
2. Limpiar el frontend (`storage.ts`, `App.svelte`, `vite.config.ts`) y verificar que `npm run test`, `npm run check` y `npm run build` pasan.
3. Borrar `src-tauri/` y las dependencias, y verificar que el build sigue pasando desde un `node_modules` limpio.
4. Documentación y specs.

**Reversión**: revertir el commit. Nada de lo que la nueva versión escribe en `localStorage` resulta ilegible para la anterior —el formato no cambia—, así que un ida y vuelta no corrompe datos.

## Open Questions

- El agujero de `beforeunload` en Safari iOS y en el descarte de pestañas queda documentado en la spec pero sin cerrar. Cerrarlo con `pagehide` es pequeño (unas líneas en `App.svelte`) y probablemente merezca su propio cambio a continuación de este.
