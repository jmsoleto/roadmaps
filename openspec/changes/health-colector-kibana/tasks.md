## 1. Catálogo y formato de la carpeta

- [x] 1.1 Cambiar `metricasIniciales()` a `no-controlados`, `errores-50x`, `errores-404`, `errores-40x` y `peticiones` con sus clases, y actualizar los tests, los ejemplos y el README que usan los ids antiguos; verificar con `model.test.ts`, `readme-contract.test.ts` y un `grep` sin restos de `'500'`, `'400'` y `'403'` como métricas
- [x] 1.2 Añadir `fuente` y `nota` opcionales a `Vigilada` y a `app-*.json` (solo se escriben con valor, `fuente` validada como id); verificar con tests de ida y vuelta que un fichero sin ellos no cambia de bytes y que una `fuente` inválida lo hace ilegible

## 2. Lectura de la fuente (funciones puras)

- [x] 2.1 Crear `health/fuente/read.ts` con `leerIndice`: `formatVersion`, `apps` con nombre, alcance y métricas, métricas `removed`, y la sección `dashboards` ignorada; verificar con tests del `index.json` real del colector, de una versión 2, de un JSON roto y de una métrica retirada
- [x] 2.2 Añadir `leerSerie`: líneas vacías, líneas rotas o con forma inválida (`step` ≠ 3600, negativos, `null`), orden por `from`, huecos entre líneas, horas repetidas (gana el `run` más reciente, con aviso) y meses que faltan; verificar con un test por regla y con que una línea cortada al final no impide leer las demás
- [x] 2.3 Crear `health/fuente/days.ts` con `diasCompletos(horas, zona)`; verificar con tests de días de 24, 23 y 25 horas en `Europe/Madrid`, del primer día parcial, de un día con una hora sin dato y de que todas las observaciones salen exactas y con `fuente: 'kibana'`
- [x] 2.4 Crear `health/fuente/rate.ts` con la tasa por rango y por hora (`null` si las peticiones suman 0) y `datosHasta` como el `to` más antiguo de las métricas activas; verificar con tests de peticiones 0, de métricas de clase peticiones y de una métrica retirada con `to` antiguo que no cuenta

## 3. Conexión de la fuente

- [x] 3.1 Añadir `mode` opcional (`'readwrite'` por defecto) a `pickFolder`, `queryPermission` y `requestPermission`; verificar que los tests de `lib/folder/` y de las demás aplicaciones siguen en verde sin cambios
- [x] 3.2 Crear `health/fuente/connection.svelte.ts` con los estados `sin-fuente`, `abriendo`, `permiso`, `no-valida` y `lista`, conectar en solo lectura, validar `index.json` en la raíz, recordar con `handles.ts` bajo `health-fuente`, desconectar y recargar; verificar con tests sobre `memory-fs` que elegir `series/` o una carpeta superior no recuerda nada, que desconectar no toca la carpeta de Health Hub y que ninguna operación escribe en la fuente
- [x] 3.3 Conectar el arranque en `main.ts` (handle recordado y consulta del permiso sin pedirlo, sin retrasar el hub); verificar que sin fuente recordada el arranque no espera nada y que con permiso pendiente queda en `permiso`

## 4. Store

- [x] 4.1 Hacer que `HealthStore` lea la fuente y derive `observacionesDe` (días completos de la fuente con precedencia, más `obs-*` de los días que la fuente no cubre), las consultas desde `effectiveQuery` y los avisos de lectura; verificar con tests del store que el autoguardado nunca escribe datos de la fuente y que tendencia, salud y comparación usan los días de la fuente
- [x] 4.2 Añadir vincular, desvincular, «añadir desde la fuente» y editar la nota, y el aviso cuando dos vigiladas comparten `fuente`; verificar con tests que añadir crea solo `app-<id>.json`, que la segunda vigilada con la misma `fuente` no toma datos y que una aplicación de la fuente ya vinculada no se ofrece
- [x] 4.3 Usar `datosHasta` como último día del aviso de captura en las vigiladas vinculadas, y hacer que recargar relea también la fuente; verificar con tests de «datos hasta» de hace 5 días (quedan 2) y de una línea añadida con la app abierta

## 5. Interfaz

- [x] 5.1 Crear la pantalla y el estado de la fuente (conectar, reactivar permiso, carpeta no válida con su mensaje, desconectar y «datos hasta» en la cabecera del panel global), y la acción `⧉ fuente`; verificar en el navegador cada estado
  - Comprobado en Chromium (Playwright) con una fuente y una carpeta de prueba en el sistema de ficheros privado del navegador, porque el selector nativo no se puede automatizar: conectar, rechazar `series/`, añadir CEX ES y MYA, marcar una versión, vista por horas en recuento y tasa, hueco de 3 h, línea cortada, recargar tras añadir horas y temas claro y oscuro. Los ficheros de la fuente no cambiaron, y la carpeta de Health Hub solo tiene marcador, catálogo, orden y los dos `app-*.json`.
- [x] 5.2 Ofrecer en el panel global las aplicaciones de la fuente sin vincular, con «añadir», y en el diálogo de la aplicación vigilada el vínculo y la nota; verificar el teclado y el foco, y que la consulta de una métrica vinculada no se puede editar
- [x] 5.3 Mostrar en el panel de una aplicación vinculada «datos hasta», la nota junto a tasas y tendencias, y los avisos de lectura (huecos, líneas saltadas, meses que faltan, métricas sin catálogo, fuente sin conectar); verificar en el navegador con una fuente de prueba que tenga cada caso
- [x] 5.4 Añadir el periodo «Por horas» a `chart.ts` y `MetricChart` (7 días hasta «datos hasta», ticks por día, sin media móvil, huecos cortados, subidas al inicio del día, tasa por hora y alternativa de texto), usando la skill `dataviz`; verificar con tests puros de `chart.ts` y en el navegador con temas claro y oscuro
  - La vista por horas es un componente propio, `HourlyChart.svelte`, y no una variante de `MetricChart`: no tiene media móvil ni marcas seleccionables, y compartir el componente habría llenado el diario de condiciones. Los dos usan `tramos`, `aislados`, `escalaY` y `pathDe` de `chart.ts`.

## 6. Cierre

- [x] 6.1 Documentar en el README la fuente: qué carpeta elegir, qué se lee y qué se ignora, el vínculo, la nota y la corrección a mano de un `catalogo.json` antiguo; verificar que los ejemplos del README pasan `readme-contract.test.ts`
- [x] 6.2 Ejecutar `npm run lint`, `npm run check`, `npm test` y `npm run build`, y verificar que pasan
- [ ] 6.3 Comprobación manual: en Chrome, con la carpeta real de Health Hub y la fuente `customer-health-viewer/data`, sin editar el catálogo, añadir «CEX ES» y «MYA», ver la vista por horas, recargar tras una ejecución del colector, y verificar con `git status` en el repo del colector que la fuente no cambia, y con `git diff` en el de Health Hub que solo cambian `order.json` y los dos `app-*.json` (`catalogo.json` no se toca)

## 7. El catálogo lo manda el colector

- [x] 7.1 Crear `health/fuente/catalog.ts` con el catálogo efectivo (métricas, ids y nombres de la fuente; clase de `catalogo.json` o de los ids conocidos; métricas propias solo con datos) y usarlo en el store y los paneles, con el nombre de cada aplicación en su panel; verificar con `catalog.test.ts` sobre el `index.json` real del colector (host sustituido, porque el repo es público), con un test del store en el que un `catalogo.json` antiguo no se toca, y con un test de lectura de su `.jsonl` real (una semana y luego una hora, contiguas)
- [x] 7.2 Quitar del README la edición a mano del catálogo y explicar cómo se da clase a una métrica nueva del colector; verificar con `readme-contract.test.ts`

- [x] 7.3 Rechazar la carpeta de datos del colector (la que tiene `index.json` con `formatVersion` y `apps`) al conectar la carpeta propia de Health Hub, que creaba `health/` dentro del worktree del colector, y explicar las dos carpetas en la pantalla sin carpeta; verificar con un test de la conexión que la rechaza sin escribir nada
