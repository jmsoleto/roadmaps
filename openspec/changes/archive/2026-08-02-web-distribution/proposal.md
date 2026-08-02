## Why

El cambio `desktop-foundation` dejó la app empaquetada como binario de macOS (`Roadmaps.app`, `.dmg`), pero al intentar repartirla apareció un bloqueo que la spec de `desktop-shell` no contemplaba: **el binario solo es utilizable en la máquina que lo compila**.

El `.app` que produce `tauri build` va firmado **ad-hoc** (`codesign` reporta `Signature=adhoc`, `linker-signed`, `TeamIdentifier=not set`). En la máquina de compilación arranca sin problema, pero cualquier copia que llegue a otro Mac por descarga, AirDrop o `.dmg` recibe el atributo `com.apple.quarantine`, y Gatekeeper la bloquea. Desbloquearla exige que cada usuario ejecute `xattr -dr com.apple.quarantine` a mano o apruebe la app en Ajustes → Privacidad y seguridad; en macOS 15+ el antiguo "clic derecho → Abrir" ya no basta.

La solución oficial —firmar y notarizar con un certificado Developer ID— cuesta **99 $/año**, desproporcionado para una herramienta de uso personal o, como mucho, de un equipo pequeño. Además el binario actual es **`arm64` únicamente**, así que en un Mac Intel no arrancaría ni aun estando firmado.

La observación que desbloquea el problema es que el frontend **ya funcionaba sin Tauri**: `src/lib/store/storage.ts` selecciona backend en tiempo de ejecución (`isTauri() ? TauriBackend : LocalStorageBackend`), de modo que la app entera se sostiene en un navegador sin tocar la capa de vista. Publicarla como web app elimina el problema de raíz: una URL no se firma, no se instala y no pasa por Gatekeeper.

## What Changes

- Se añade la **web app como vía de distribución soportada**, desplegada en GitHub Pages y publicada en cada push a `main` mediante GitHub Actions.
- El build web se sirve como **PWA**: manifest e iconos propios, service worker con precache, instalable como ventana propia y operativa sin conexión tras la primera visita.
- El `base` de Vite pasa a ser **configurable por `BASE_PATH`** (`/` en desarrollo y en Tauri, `/roadmaps/` en Pages), requisito de un sitio servido desde un subdirectorio.
- El **service worker se genera solo en el build web**. El build de escritorio se detecta con `TAURI_ENV_PLATFORM`, variable que Tauri exporta a `beforeBuildCommand`, así que `tauri.conf.json` no cambia.
- La app de escritorio **se conserva**, pero su alcance se reformula: build local para quien tenga el toolchain, no vía de reparto. La spec de `desktop-shell` se corrige para no prometer una distribución que no se sostiene sin notarización.
- Se documentan las **diferencias de persistencia** entre ambas vías: SQLite compartido en escritorio, `localStorage` por navegador y perfil en web, con export/import JSON como puente entre ellas.

**Fuera de alcance (explícito):** firmar o notarizar la app (coste rechazado); binario universal `arm64` + `x86_64`; backend de sincronización que unifique los datos entre navegadores y máquinas; auto-hospedar las fuentes de Google Fonts (hoy la app cae a fuentes del sistema sin conexión).

## Capabilities

### New Capabilities

- `web-distribution`: publicación del frontend como web app / PWA en una URL pública, instalable y operativa sin conexión, sin firma ni instalación.

### Modified Capabilities

- `desktop-shell`: el requisito de distribución se acota a la máquina de compilación y remite a `web-distribution` para el reparto, en vez de prometer un binario instalable por terceros.

## Impact

- **Código:** `vite.config.ts` (base configurable + `vite-plugin-pwa`), `index.html` (meta de tema e iconos), `public/` (iconos PWA derivados de los de Tauri), `package.json` (`build:pages`, `preview:pages`).
- **CI:** nuevo `.github/workflows/pages.yml` (test → build → deploy). Requiere activar una vez *Settings → Pages → Source: GitHub Actions*; si el repositorio es privado, Pages exige plan de pago.
- **Dependencias:** `vite-plugin-pwa` como dependencia de desarrollo (arrastra Workbox).
- **Datos:** ninguno migra. Cada vía mantiene su almacén; el trasvase entre ellas es manual vía export/import JSON.
- **Exposición:** el despliegue en Pages deja la app accesible públicamente. No publica datos —viven en el navegador de cada usuario— pero sí el código y la interfaz.
- **Hallazgos colaterales corregidos:** `.gitignore` ignoraba `.github`, lo que habría impedido subir el workflow; y `prettier --write` reformateaba los JSON generados en `src-tauri/gen/`, ahora en `.prettierignore`.
