## 1. Diagnóstico

- [x] 1.1 Verificar el estado de firma del `.app` construido (`codesign -dvv`) y confirmar que la firma es ad-hoc sin `TeamIdentifier`
- [x] 1.2 Verificar la arquitectura del binario (`lipo -info`) y constatar que es `arm64` puro
- [x] 1.3 Contrastar alternativas de reparto (quitar cuarentena a mano, tap de Homebrew, compilar en cada máquina, web app) y elegir la web app

## 2. Build web parametrizado

- [x] 2.1 Hacer configurable el `base` de Vite mediante `BASE_PATH`, con `/` por defecto para desarrollo y Tauri
- [x] 2.2 Añadir los scripts `build:pages` y `preview:pages` con `BASE_PATH=/roadmaps/`
- [x] 2.3 Verificar que el build web reescribe assets, manifest e iconos bajo `/roadmaps/`

## 3. PWA

- [x] 3.1 Añadir `vite-plugin-pwa` con manifest (nombre, tema, `start_url` y `scope` derivados del `base`) y `registerType: 'autoUpdate'`
- [x] 3.2 Generar los iconos PWA (192, 512, maskable, apple-touch, favicon) en `public/` a partir de los iconos de Tauri
- [x] 3.3 Añadir a `index.html` la meta `theme-color`, las meta de Safari y los enlaces de icono
- [x] 3.4 Excluir el service worker del build de escritorio detectando `TAURI_ENV_PLATFORM`
- [x] 3.5 Verificar en navegador sobre el build real: service worker `activated` con scope `/roadmaps/`, precache poblado, manifest resuelto y `localStorage` persistiendo
- [x] 3.6 Verificar que el build de escritorio sigue saliendo con `base` `/` y sin service worker

## 4. Despliegue

- [x] 4.1 Añadir el workflow de GitHub Pages (test → build con `BASE_PATH` → deploy) en push a `main`
- [x] 4.2 Corregir `.gitignore`, que ignoraba `.github` e impedía subir el workflow
- [x] 4.3 Añadir `src-tauri/gen/` y `src-tauri/target/` a `.prettierignore` para que `npm run format` deje de reformatear JSON generados
- [x] 4.4 Activar en GitHub *Settings → Pages → Source: GitHub Actions* (paso manual del propietario del repositorio)
- [x] 4.5 Verificar el despliegue en `https://jmsoleto.github.io/roadmaps/`: la app carga, el service worker queda `activated` con scope `/roadmaps/` y 11 entradas precacheadas, y el manifest resuelve con `start_url` y `scope` correctos

## 5. Documentación

- [x] 5.1 Documentar en el README la vía de distribución web, la instalación como PWA y los comandos de build/preview
- [x] 5.2 Documentar la tabla de diferencias entre escritorio y web (persistencia, alcance de los datos, distribución)
- [x] 5.3 Advertir en el README de que en web los datos viven en el `localStorage` del navegador y que el backup es vía export/import JSON
