## Why

El planificador de roadmaps existe hoy como un único archivo HTML (`roadmap_tool_6_6_2.html`, ~2.300 líneas de HTML/CSS/JS vanilla inline) que persiste todo en `localStorage`. Es funcionalmente rico (Gantt, fases, items, milestones, dependencias, sprints, portfolio, responsables, import/export) pero está atado a un solo navegador, no tiene modelo de datos versionado más allá de una función `migrate()` inline, y arrastra parámetros hardcodeados (fecha de inicio `2026-01-01`, ventana fija de 730 días). Para convertirlo en una aplicación seria, mantenible y con persistencia fiable, hay que desmontarlo del HTML y darle una base de escritorio con almacenamiento real.

El público objetivo es **uso propio / equipo pequeño**, **offline-first**, **sin colaboración en tiempo real** (queda fuera de alcance, para más adelante).

## What Changes

- **BREAKING (arquitectura):** el HTML monolítico se sustituye por un proyecto modular con build (**Svelte + Vite + TypeScript**) empaquetado como aplicación de escritorio con **Tauri** (core Rust, binario ligero, offline-first). Distribución **macOS primero**; otras plataformas más adelante.
- **BREAKING (persistencia):** `localStorage` se sustituye por **SQLite** embebido con migraciones versionadas. Se provee una ruta de migración única que importa los datos existentes de `localStorage` (o desde un export JSON) al abrir la app por primera vez.
- El **modelo de datos actual** (roadmap → phase → item, con milestones y dependencias) se formaliza como esquema canónico y contrato de no-regresión.
- Se conserva **toda la funcionalidad de edición existente** sin regresión visual ni de comportamiento (Gantt, drag para crear/mover/redimensionar, drawer de detalle, responsables, sprints, vista meta/portfolio).
- Se elimina el hardcode de timeline: la **fecha de inicio y la ventana temporal pasan a ser configurables** por roadmap.
- **Import/export JSON** se conserva como mecanismo de backup y de intercambio manual (git-friendly) para el equipo pequeño, mientras no exista servidor de sync.

**Fuera de alcance (explícito):** backend/servidor de sync, cuentas de usuario, roles/permisos, colaboración en tiempo real, comentarios, billing, integraciones externas (Jira/Linear). Se documentan como evolución futura pero no se implementan aquí.

## Capabilities

### New Capabilities
- `desktop-shell`: empaquetado y ciclo de vida de la app de escritorio Tauri (ventana, arranque offline, autosave/flush al cerrar, distribución del binario).
- `local-persistence`: almacenamiento en SQLite con esquema versionado y migraciones; carga/guardado del estado; migración única desde `localStorage`/JSON.
- `roadmap-editor`: edición del roadmap en el Gantt (fases, items, milestones, dependencias, drag/resize, drawer de detalle, responsables, sprints, vista meta). Contrato de paridad con el HTML actual.
- `timeline-config`: configuración de la ventana temporal (fecha de inicio y duración) por roadmap, sustituyendo los valores hardcodeados.
- `data-portability`: import/export de roadmaps en JSON como backup e intercambio manual.

### Modified Capabilities
<!-- Ninguna: no existen specs previas en openspec/specs/. Todas son nuevas. -->

## Impact

- **Nuevo proyecto/estructura:** monorepo o carpeta de app con `src/` (frontend TS modular), `src-tauri/` (Rust), config de Vite/Tauri, migraciones SQL.
- **Datos:** formato de persistencia cambia de claves `localStorage` (`roadmaps:*`) a tablas SQLite. Se necesita importador de compatibilidad.
- **Distribución:** pasa de "abrir un .html" a instalar/ejecutar un binario de escritorio (macOS primero, dado el entorno).
- **Dependencias nuevas:** Rust/Tauri toolchain, Vite, TypeScript, driver SQLite (plugin Tauri SQL o `rusqlite`).
- **Sin impacto en:** nada externo; no hay backend ni terceros implicados en este cambio.
