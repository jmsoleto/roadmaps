## 1. Proxy (Worker)

- [x] 1.1 Crear `workers/festivos-proxy/` con `src/index.ts`, `wrangler.jsonc` (nombre `festivos-proxy`, variable `ALLOWED_ORIGINS` con el origen de GitHub Pages y `http://localhost:5173`) y un README breve de despliegue. Verificar que `npx wrangler deploy --dry-run` termina sin errores
- [x] 1.2 Escribir y probar con Vitest la función pura que valida la ruta (D2): acepta las cuatro rutas con año de cuatro cifras y segmentos `[a-z0-9-]+`, y rechaza `fiscal.json`, `escolar.json`, `todo.json`, `..`, rutas con host o query y años mal formados. Verificar que los tests pasan con `npm run test`
- [x] 1.3 Implementar el handler: solo GET y OPTIONS, 404 sin `fetch` para rutas no permitidas, CORS solo para orígenes permitidos con `Vary: Origin`, caché de un día para respuestas correctas y de una hora para 404 (D3). Verificar con tests del handler que usen un `fetch` simulado: ruta permitida, ruta rechazada sin llamada, origen ajeno sin cabecera y preflight
- [x] 1.4 Asegurar que `npm run lint`, `npm run check` y `npm run build` de la app no se rompen por la carpeta nueva (excluirla de `svelte-check` o darle su `tsconfig` si hace falta). Verificar ejecutando los tres comandos

## 2. Modelo y persistencia

- [x] 2.1 Añadir `Municipality` y `Location.municipality?: Municipality` (opcional, D5) en `model.ts`. Verificar con `npm run check`
- [x] 2.2 `normalize`: leer `municipality`, que se omite si falta o es `null`, y se descarta (o rechaza en estricto) si está mal formado. Verificar con tests nuevos en `normalize.test.ts` (ausente, válido, incompleto, null)
- [x] 2.3 `folder-format`: añadir `municipality` a las claves de `location`. Verificar con un test de ida y vuelta en `folder-format.test.ts` y que una carpeta sin el campo se sigue leyendo
- [x] 2.4 Comprobar que exportar e importar el documento conserva el vínculo (scenario «El vínculo viaja con los datos»). Verificar con un test en `io.test.ts`

## 3. Cliente del API

- [x] 3.1 Crear `src/lib/personas/festivos-api.ts` (D4) con `festivosEnabled`, las tres listas y `fetchHolidays`, con `fetch` inyectable y el resultado `no-publicado` / `fallo`. Verificar con `festivos-api.test.ts` usando como fixtures respuestas reales recortadas: Madrid 2026 da 14 festivos, 404 es `no-publicado`, error de red, 500 y JSON sin `calendar` son `fallo`, se descartan fechas inválidas y se ignoran duplicados
- [x] 3.2 Leer la base de `import.meta.env.VITE_FESTIVOS_PROXY` y declarar el tipo en `vite-env.d.ts`. Verificar con `npm run check` y que, sin la variable, `festivosEnabled` es `false`

## 4. Almacén

- [x] 4.1 Añadir `setLocationMunicipality(id, m | null)` en el almacén. Quitar el vínculo no toca los festivos. Verificar con tests en `store.svelte.test.ts`
- [x] 4.2 Añadir `importHolidays(id, year)` (D6). Verificar con tests: importa en una localidad vacía («14 festivos añadidos»), respeta un festivo ya puesto con su nombre, una segunda importación no añade nada, `no-publicado` y `fallo` dan su mensaje sin cambiar la localidad, y una localidad borrada o desvinculada durante la petición no se toca

## 5. Interfaz

- [x] 5.1 En `CatalogView.svelte`, añadir el vínculo con selects en cascada (con estado de carga y error), la línea del municipio vinculado con «cambiar» y «quitar», el selector de año y el botón «Importar festivos {año}» con «importando…», y la atribución con enlace (D7). Todo oculto si `festivosEnabled` es `false`. Verificar con `npm run check` y `npm run lint`
- [x] 5.2 Probar en el navegador con `npm run dev`, el Worker en local (`npx wrangler dev`) y `VITE_FESTIVOS_PROXY` apuntando a él: vincular Madrid, importar 2026 (13 añadidos y 1 que ya estaba, la Inmaculada de los datos de ejemplo), importar otra vez (14 ya estaban), cortar el Worker (no se pudo importar, sin cambios), y comprobar que sin la variable la pantalla se ve como antes. El caso «no publicado» no se alcanza desde la pantalla, que ofrece el año en curso y el siguiente (2026 y 2027, ambos publicados); queda cubierto por los tests del cliente y del almacén, y el API devuelve 404 para 2028

## 6. Despliegue

- [x] 6.1 En `.github/workflows/pages.yml`, pasar `VITE_FESTIVOS_PROXY: ${{ vars.FESTIVOS_PROXY }}` al paso de build. Verificar que el workflow sigue siendo YAML válido y que el build funciona sin la variable
- [x] 6.2 Desplegar el Worker desde la cuenta del usuario (`npx wrangler login` y `npx wrangler deploy`; pedírselo al usuario), crear la variable de repositorio `FESTIVOS_PROXY` y publicar. Verificar con `curl -H "Origin: <origen de Pages>"` que la ruta de Madrid 2026 devuelve la cabecera CORS y que `fiscal.json` da 404, y después importar desde la app publicada
