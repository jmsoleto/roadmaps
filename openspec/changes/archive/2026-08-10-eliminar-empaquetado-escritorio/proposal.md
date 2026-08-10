## Why

El cambio `web-distribution` publicó la app en GitHub Pages y, al hacerlo, dejó al empaquetado de escritorio sin trabajo que hacer: su propia spec ya reconoce que el binario no está firmado ni notarizado, que macOS lo bloquea por cuarentena fuera de la máquina de compilación y que **la vía soportada para repartir la aplicación es la web app**. Un empaquetado cuyo único usuario posible es quien lo compila no justifica 64 archivos, un toolchain de Rust, dos dependencias npm y una segunda implementación completa de la capa de persistencia.

El coste no es solo de mantenimiento: es de veracidad. `openspec/specs/local-persistence/spec.md` describe hoy un almacén SQLite con esquema versionado y migraciones que, en la única vía de uso real, no existe. La spec promete algo que la aplicación publicada no hace.

## What Changes

- **BREAKING** — Se elimina el empaquetado de escritorio: `src-tauri/` completo (Rust, `Cargo.toml`/`Cargo.lock`, `tauri.conf.json`, capabilities, esquemas generados e iconos nativos), las dependencias `@tauri-apps/api` y `@tauri-apps/cli`, y el script `npm run tauri`.
- **BREAKING** — Se elimina `TauriBackend` y con él el almacén SQLite. `localStorage` deja de ser el fallback de desarrollo y pasa a ser **el** almacén de la aplicación. `createStorage()` deja de decidir en tiempo de ejecución y `isTauri()` desaparece.
- Los datos que existan en la base SQLite de escritorio (`~/Library/Application Support/com.roadmaps.app/roadmaps.db`) quedan **inalcanzables** tras el cambio. El único puente es exportar el JSON antes.
- Se elimina la rama `onCloseRequested` de `App.svelte`. El volcado al cerrar queda a cargo de `beforeunload`, que en esta arquitectura **sí completa la escritura**: `localStorage.setItem` es síncrono y se ejecuta dentro del handler, sin ceder el hilo.
- El service worker deja de ser condicional: desaparece la detección de `TAURI_ENV_PLATFORM` en `vite.config.ts` y la PWA se genera en todos los builds.
- Se reescribe `local-persistence` en clave de navegador y **absorbe** los dos requisitos de `desktop-shell` que no son de escritorio (estado de sesión y guardado al cerrar).
- Se retira `desktop-shell` como capacidad.

**Fuera de alcance (explícito):**

- **Migrar de `localStorage` a IndexedDB.** El almacén hereda la cuota de ~5 MB al ascender de fallback a producto. Para roadmaps JSON sobra de largo; si algún día no, es su propio cambio.
- **Añadir `pagehide` / `visibilitychange`.** `beforeunload` no dispara de forma fiable en Safari iOS ni cuando el navegador descarta la pestaña. Es un agujero real, pero cerrarlo es *añadir* comportamiento, no eliminar; aquí solo se ajusta la spec para que no prometa una garantía que la web no da.
- **Simplificar la copia de arranque del tema.** El script inline de `index.html` seguirá pintando desde `roadmaps:theme:boot`. Su motivación cambia (ya no hay IPC asíncrono que esquivar, solo el arranque del bundle), y eso se corrige en el texto, pero el mecanismo no se toca.
- **El puerto fijo 1420 de Vite.** Se conserva; solo se corrige el comentario que lo justificaba por el shell de Tauri.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `local-persistence`: se sustituye el almacenamiento SQLite con esquema versionado y migraciones por almacenamiento en el navegador; el autosave deja de describirse como transaccional; se retira la migración desde el formato heredado por estar ya cubierta en `data-portability`; y se incorporan, procedentes de `desktop-shell`, la persistencia del estado de sesión y el guardado de cambios pendientes al cerrar, este último acotado a lo que la web garantiza.
- `web-distribution`: se retira el requisito de aislar el service worker del empaquetado de escritorio, y se eliminan las referencias al escritorio en los escenarios de ruta base y de trasvase de datos.
- `data-portability`: el escenario de importar un JSON del formato actual deja de nombrar SQLite como destino de la persistencia.
- `desktop-shell`: se retiran sus tres requisitos. La capacidad queda sin contenido y su fichero de spec se elimina.

## Impact

- **Código eliminado:** `src-tauri/` (64 archivos; 510 líneas de Rust, 4488 de `Cargo.lock`, ~50 iconos nativos). En `src/`: `isTauri()`, `TauriBackend` y `slotsAsText()` de `store/storage.ts` — la mitad del archivo —, y el bloque de cierre de ventana de `App.svelte`.
- **Código modificado:** `vite.config.ts` (PWA incondicional), `index.html` y `store/app.svelte.ts`/`main.ts` (comentarios que describen un almacén SQLite que ya no existe), `RoadmapSwitcher.svelte` y `MetaView.svelte` (el uso de `pointerdown` **se conserva**: no era una peculiaridad de Tauri sino de WebKit, y Safari se comporta igual; solo cambia el comentario).
- **Dependencias:** salen `@tauri-apps/api` y `@tauri-apps/cli`. `dependencies` queda vacío: el proyecto pasa a no tener dependencias de runtime.
- **Requisitos de desarrollo:** dejan de hacer falta Rust y las Xcode Command Line Tools. El proyecto queda como Node + npm.
- **Configuración:** entradas `src-tauri/` en `.gitignore`, `.prettierignore` y `eslint.config.js`.
- **CI:** `.github/workflows/pages.yml` no cambia. `cargo test` desaparece de la batería de calidad; los tests de la capa SQLite se van con ella.
- **Documentación:** el README cambia sustancialmente — stack, requisitos, comandos de desarrollo y build, tabla comparativa escritorio/web, árbol de estructura y ubicación de la base de datos.
- **Datos:** ninguna migración automática. Quien tenga datos solo en el SQLite de escritorio debe exportarlos a JSON **antes** de aplicar el cambio.
