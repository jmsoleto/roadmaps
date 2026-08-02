## Context

Estado al abrir este cambio: `desktop-foundation` archivado, `Roadmaps.app` y `Roadmaps_0.1.0_aarch64.dmg` construidos en `src-tauri/target/release/bundle/`. Diagnóstico del binario:

```
$ codesign -dvv Roadmaps.app
Format=app bundle with Mach-O thin (arm64)
CodeDirectory ... flags=0x20002(adhoc,linker-signed)
Signature=adhoc
TeamIdentifier=not set

$ lipo -info Roadmaps.app/Contents/MacOS/roadmaps
Non-fat file: ... is architecture: arm64
```

Dos límites, no uno. La firma ad-hoc la pone el linker de Rust automáticamente: basta para ejecutar en local, no para pasar Gatekeeper en una máquina ajena. Y ser `arm64` puro descarta los Mac Intel al margen de la firma.

Punto de partida favorable: `src/lib/store/storage.ts:86` ya elegía backend en tiempo de ejecución (`isTauri() ? new TauriBackend() : new LocalStorageBackend()`), residuo de haber desarrollado el frontend en el navegador antes de añadir Tauri. La ruta web estaba viva y probada, no había que construirla.

## Goals / Non-Goals

**Goals:**

- Que cualquiera del equipo pueda usar la app sin firma, sin instalación y sin pasos manuales contra Gatekeeper.
- Coste cero: ni certificado de Apple ni servidor.
- Cambio mínimo en la aplicación: sin tocar la capa de vista, el modelo ni `tauri.conf.json`.
- Que el build de escritorio siga funcionando exactamente igual que antes.

**Non-Goals:**

- Firmar/notarizar (99 $/año rechazados explícitamente para esta herramienta).
- Binario universal `arm64` + `x86_64`: pendiente y barato (`rustup target add x86_64-apple-darwin` + `--target universal-apple-darwin`), pero no resuelve la cuarentena, así que no cierra este problema.
- Backend de sync: sigue fuera de alcance, igual que en `desktop-foundation`. La web hereda el aislamiento de datos por navegador.
- Paridad de persistencia entre web y escritorio.

## Decisions

### D1 — Web app como vía de distribución, no reemplazo del escritorio

Se consideraron cuatro salidas: (a) repartir el `.dmg` con instrucciones de `xattr`; (b) un tap de Homebrew con `--no-quarantine`; (c) que cada usuario compile; (d) desplegar la web app. Se elige (d): las tres primeras trasladan fricción o requisitos de toolchain a cada usuario, y (a) además normaliza el hábito de saltarse Gatekeeper a mano. El escritorio se conserva para quien quiera SQLite y sepa compilar.

### D2 — GitHub Pages con `base` parametrizado

Pages sirve desde `https://<user>.github.io/roadmaps/`, así que los assets necesitan el prefijo `/roadmaps/`; Tauri y el dev server sirven desde la raíz. Se resuelve con `base: process.env.BASE_PATH ?? '/'` en lugar de `base: './'`: las rutas relativas habrían funcionado para los assets, pero el `scope` y el `start_url` del service worker y del manifest exigen una ruta explícita para registrarse correctamente.

### D3 — Detección del build de escritorio vía `TAURI_ENV_PLATFORM`

El service worker no debe entrar en el `.app`: allí los assets ya son locales y la persistencia va por SQLite, así que una capa de caché solo añadiría rutas de staleness. Hacía falta distinguir ambos builds, que comparten el mismo `npm run build`. Tauri 2 exporta `TAURI_ENV_*` a `beforeBuildCommand`, así que la distinción sale gratis y `tauri.conf.json` queda intacto —preferible a añadir un script `build:desktop` y cambiar la config de Tauri.

### D4 — PWA con `vite-plugin-pwa` en vez de un service worker a mano

Un service worker artesanal habría evitado la dependencia, pero sin manifest de precache el primer arranque offline dependería de qué se hubiera cacheado al vuelo. `vite-plugin-pwa` genera el precache sobre los assets con hash del build (11 entradas), de modo que la app queda offline-ready tras la primera visita. Se usa `registerType: 'autoUpdate'`: no hay flujo de "hay una versión nueva, recarga" y para esta app la actualización silenciosa es preferible.

### D5 — `localStorage` como persistencia web, sin puente automático

En web los datos viven en el `localStorage` de ese navegador y perfil: no se sincronizan entre máquinas y desaparecen si se borran los datos del sitio. Se acepta a sabiendas, coherente con el no-goal de backend. El export/import JSON, ya existente desde `data-portability`, es el puente manual entre navegadores y entre web y escritorio.

## Risks / Trade-offs

- **Fragmentación de datos:** cada navegador es una isla, y ahora hay dos almacenes posibles (SQLite y `localStorage`). Un usuario puede acabar con roadmaps distintos en sitios distintos sin darse cuenta. Mitigación: documentar la diferencia en el README y apoyarse en export/import. Sin resolver de fondo mientras no haya sync.
- **Pérdida de datos por limpieza del navegador:** borrar datos del sitio se lleva los roadmaps, sin la red de seguridad de un fichero en disco. Mitigación: exportar como copia de seguridad.
- **Exposición pública:** Pages publica el código y la interfaz. No hay datos que filtrar, pero deja de ser una herramienta privada.
- **Google Fonts por `@import`** (`src/app.css:5`): sin conexión la app funciona pero cae a fuentes del sistema, rompiendo la paridad visual que `desktop-foundation` fijó como contrato. Auto-hospedar las fuentes en `public/` lo cerraría; queda pendiente.
- **Dependencia de la infraestructura de GitHub:** la disponibilidad de la app pasa a depender de Pages. Aceptado: el fallback es el build local, que sigue existiendo.
