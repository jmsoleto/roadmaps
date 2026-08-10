## 1. Rescate de datos (antes de tocar nada)

- [x] 1.1 Comprobar si existe `~/Library/Application Support/com.roadmaps.app/roadmaps.db` y si contiene roadmaps que no estén ya en la aplicación web — **existe (4 KB), pero solo contiene datos de prueba**: 13 roadmaps llamados "Roadmap 1"…"Roadmap 13", de los cuales 12 están vacíos; el único con contenido reproduce el seed de `src/lib/seed.ts` (fases *Descubrimiento*/*Construcción*, items *Research inicial*/*Kickoff*/*MVP*, responsables *Ana* y *Beto*) más cuatro "Nuevo item" sin renombrar. Los IDs llevan timestamps de finales de julio de 2026, la época de `desktop-foundation` y de las pruebas del selector de roadmaps
- [x] 1.2 No procede exportar roadmap por roadmap: no hay nada que trasvasar a la web. En su lugar se conserva una copia de seguridad íntegra en `~/Documents/roadmaps-escritorio-backup-2026-08-09.db` y un volcado legible de todas las tablas en `~/Documents/roadmaps-escritorio-backup-2026-08-09.json`
- [x] 1.3 No procede importar en la web: importar 13 roadmaps de prueba contaminaría los datos reales. El archivo original tampoco se borra en este cambio; simplemente deja de haber código capaz de leerlo

## 2. Desacoplar el frontend

- [x] 2.1 Eliminar `isTauri()`, `TauriBackend` y `slotsAsText()` de `src/lib/store/storage.ts`; dejar `createStorage()` devolviendo siempre `LocalStorageBackend` y conservar la interfaz `Storage` async (design D1)
- [x] 2.2 Actualizar el comentario de cabecera de `storage.ts`: `LocalStorageBackend` deja de ser el fallback de desarrollo y pasa a ser el almacén de la aplicación
- [x] 2.3 Eliminar de `src/App.svelte` el import de `@tauri-apps/api/window` y la rama `onCloseRequested`, dejando solo el `beforeunload`
- [x] 2.4 Eliminar de `vite.config.ts` la constante `isTauriBuild` y la detección de `TAURI_ENV_PLATFORM`; dejar `VitePWA` incondicional, sin tocar `BASE_PATH`
- [x] 2.5 Corregir el comentario del puerto 1420, que se justificaba por el shell de Tauri (el puerto y `strictPort` se conservan)
- [x] 2.6 Verificar que no queda ninguna referencia a Tauri en `src/`: `grep -rn "tauri\|Tauri\|TAURI" src/ index.html`

## 3. Corregir comentarios que atribuían a Tauri lo que es de WebKit

- [x] 3.1 En `RoadmapSwitcher.svelte` y `MetaView.svelte`, reescribir el comentario del `pointerdown` para atribuirlo a WebKit/Safari en vez de a "WKWebView (Tauri en macOS)" — **sin tocar el código**
- [x] 3.2 En `index.html`, reescribir el comentario del script de arranque del tema: la preferencia ya no llega "sobre IPC desde SQLite"; el motivo es que el script corre antes de que arranque el bundle
- [x] 3.3 Corregir los comentarios que describen la persistencia como "SQLite en Tauri, localStorage en el navegador". Alcanzó a más archivos de los previstos: además de `src/main.ts` y `src/lib/store/app.svelte.ts`, a `theme/apply.ts`, `theme/theme.svelte.ts`, `theme/migrate.ts` y las descripciones de `theme/migrate.test.ts` y `store/app.svelte.test.ts`. En `migrate.ts` **solo cambia el comentario**: aceptar un slot en texto sigue siendo necesario para documentos importados, no era una concesión a SQLite

## 4. Eliminar el empaquetado

- [x] 4.1 Borrar el directorio `src-tauri/` completo (64 archivos versionados con `git rm`). Además quedaban en disco **6946 archivos y 2,2 GB** de `src-tauri/target/`, que `git rm` no toca por estar en `.gitignore`; se borran también, porque al quitar la entrada de `.prettierignore` (4.4) prettier intentaba parsear artefactos binarios de Rust y `npm run lint` fallaba
- [x] 4.2 Eliminar de `package.json` las dependencias `@tauri-apps/api` y `@tauri-apps/cli` y el script `tauri`; dejar `dependencies` presente y vacío (design, riesgos)
- [x] 4.3 Regenerar `package-lock.json` con `npm install` y comprobar que desaparecen los paquetes `@tauri-apps/*`
- [x] 4.4 Eliminar las entradas `src-tauri/` de `.gitignore`, `.prettierignore` y `eslint.config.js`

## 5. Verificación

- [x] 5.1 `npm run check` (222 archivos, 0 errores), `npm run lint` (prettier + eslint limpios) y `npm run test` (124 tests, 11 archivos) en verde
- [x] 5.2 Ambos builds completan. El de Pages referencia assets, manifest e iconos bajo `/roadmaps/`, y el `scope`/`start_url` del manifest siguen siendo `/roadmaps/`. Los chunks `core-*.js` y `window-*.js` de `@tauri-apps` desaparecen del bundle
- [x] 5.3 Verificado en Chrome sobre `preview:pages`: service worker `activated` con scope `http://localhost:4173/roadmaps/`, 9 entradas precacheadas, manifest resuelto y app montada
- [x] 5.4 Verificado sembrando un `localStorage` con la forma que escribía la versión anterior: se restauran los dos roadmaps, el `activeId`, el zoom (18px/d) y el tema (claro). Los colores hex pre-theming se normalizan a slots **numéricos** al guardar y el campo `color` heredado desaparece, confirmando que eliminar `slotsAsText()` no rompe nada; las dependencias y los milestones sobreviven intactos
- [x] 5.5 Verificado: con una edición y salida de la página en el mismo bloque síncrono, `localStorage` todavía tenía 3 roadmaps al abandonar y 4 tras recargar. El `beforeunload` salva la edición pendiente sin `onCloseRequested`, tal y como sostiene la decisión D3
- [x] 5.6 `rm -rf node_modules dist && npm ci && npm run build` completa sin Rust ni toolchain nativo instalado en juego

## 6. Specs y documentación

- [x] 6.1 Las deltas no se sincronizaron a mano; las aplicó `openspec archive`. **OpenSpec no contempla retirar una capacidad entera vía deltas**: con los tres requisitos de `desktop-shell` en `## REMOVED`, la spec reconstruida se quedaba sin ninguno y el archivado abortó con `Spec must have at least one requirement` (de forma atómica, sin tocar archivos). Se resolvió apartando la delta de `desktop-shell` para que la herramienta aplicase las otras tres, borrando después `openspec/specs/desktop-shell/` a mano y devolviendo la delta a `specs/desktop-shell/spec.md` de este change archivado, para que el registro del porqué no se pierda
- [x] 6.2 Corregidos a mano los `## Purpose` de `local-persistence` y `web-distribution`, que las deltas no alcanzan. Un barrido de `openspec/specs/` confirma que no quedan más menciones a SQLite, Tauri ni al empaquetado de escritorio; el requisito "Coherencia del tema con la ventana anfitriona" de `theming` se conserva porque su ventana anfitriona es la del navegador/PWA, no la nativa
- [x] 6.3 Actualizar el README: encabezado y stack (deja de ser app de escritorio), requisitos (fuera Rust y Xcode CLT), comandos de desarrollo y build (fuera `npm run tauri`), tabla comparativa escritorio/web (se elimina), árbol de estructura (fuera `src-tauri/`), batería de calidad (fuera `cargo test`) y la nota final sobre la ubicación de la base de datos
- [x] 6.4 Corregir en el README la referencia a `openspec/changes/desktop-foundation/`, que apunta a un change ya archivado
- [x] 6.5 Comprobar que la validación estricta pasa. Nota: el flag correcto es posicional, `openspec validate eliminar-empaquetado-escritorio --strict`; `--change` no existe en este comando
