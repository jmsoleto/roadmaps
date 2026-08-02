## 1. Fase 0 — Desmontar el HTML

- [x] 1.1 Crear el proyecto base: Svelte + Vite + TypeScript, estructura `src/` y configuración de build
- [x] 1.2 Portar el CSS inline a estilos de componentes Svelte y verificar paridad visual con el HTML original
- [x] 1.3 Portar la lógica a componentes/módulos Svelte + TypeScript tipados (modelo de datos, render, drag, drawer, persistencia) — incluye drag crear/mover/redimensionar, drawer de detalle, flechas de dependencia con cascada de restricciones, gestión de responsables y flujos de añadir; verificado en navegador
- [x] 1.4 Definir los tipos del modelo de datos compartido (Roadmap, Phase, Item, Milestone, Dependency, Assignee)
- [x] 1.5 Configurar tooling de calidad: TypeScript estricto, linter, formateo y un runner de tests

## 2. Fase 1 — Cáscara de escritorio (Tauri)

- [x] 2.1 Añadir Tauri (`src-tauri/`) y arrancar el frontend dentro del webview
- [x] 2.2 Empaquetar un binario de macOS (plataforma prioritaria) y verificar arranque offline
- [x] 2.3 Persistir estado de ventana/sesión (roadmap activo, zoom) entre reinicios
- [x] 2.4 Atar el flush de autosave al ciclo de cierre de la ventana Tauri

## 3. Fase 1 — Persistencia SQLite

- [x] 3.1 Definir el esquema SQLite inicial y el registro de versión de esquema
- [x] 3.2 Implementar el mecanismo de migraciones (aplicar pendientes en orden)
- [x] 3.3 Implementar carga del estado desde SQLite al arranque
- [x] 3.4 Implementar autosave debounced/transaccional contra SQLite con indicador de guardado
- [x] 3.5 Escribir tests de la capa día↔fecha (conversión, snap a laborable, off-by-one)

## 4. Fase 1 — Migración de datos e I/O

- [x] 4.1 Implementar importador del formato heredado (`localStorage`/JSON) con conversión de índices de día → fechas absolutas (base `2026-01-01`)
- [x] 4.2 Implementar export de roadmap a JSON autocontenido
- [x] 4.3 Implementar import de roadmap desde JSON (formato actual y heredado)
- [x] 4.4 Verificar integridad referencial (dependencias, responsables) en round-trip export/import

## 5. Timeline configurable

- [x] 5.1 Añadir `start_date` y `window_days` por roadmap en modelo y esquema
- [x] 5.2 Sustituir el uso de `START_DATE`/`TOTAL_DAYS` hardcodeados por la config del roadmap en toda la capa de vista
- [x] 5.3 Añadir UI para editar fecha de inicio y duración de la ventana
- [x] 5.4 Aplicar valores por defecto sensatos alrededor de la fecha actual para roadmaps sin config

## 6. Paridad y cierre

- [x] 6.1 Verificar cada escenario de `roadmap-editor/spec.md` contra el comportamiento del HTML original (checklist de no-regresión)
- [x] 6.2 Validar paridad visual (Gantt, sprints, meta/portfolio, drawer, badges) frente al HTML de referencia
- [x] 6.3 Documentar en README el arranque, build y empaquetado de la app de escritorio
