## 1. Leer los despliegues

- [x] 1.1 Añadir a `fuente/fixtures.ts` un índice con `apps.mya.deployments` (meses con hueco), una app `pagos` con `metrics` vacío y `deployments`, una clave desconocida, y textos `.jsonl` con: un run en dos líneas (`pending` → `found`), dos runs con la misma versión, un rollback con `rollbackOf` y otro con `null`, un `failure`, un `cancelled`, una línea cortada, un `kind` desconocido y un `releaseNotes` con `\r\n`, `<img onerror>` y `**`. Verificar que los tests existentes siguen pasando.
- [x] 1.2 En `read.test.ts`, escribir tests de que `leerIndice` conserva `deployments` (con `repo: null` incluido), no descarta una app con `metrics` vacío si tiene despliegues e ignora claves desconocidas. Implementarlo en `leerIndice` (D8). Verificar que los tests pasan.
- [x] 1.3 Escribir `fuente/despliegues.test.ts` con los escenarios de «Leer los despliegues de la fuente»: la última línea gana (también en un empate de `collectedAt`), un despliegue por `runId` aunque se repita la versión, las líneas malas se saltan con un aviso de fichero y línea, un mes que falta se avisa, `gdv` desconocido pasa a `unavailable` y el orden es por `finishedAt` descendente. Implementar `leerDespliegues` (D2). Verificar que los tests pasan.
- [x] 1.4 En `leerFuente`, leer `deployments/<app>/<mes>.jsonl` de todos los `months` y dejar `AppLeida.despliegues` y sus avisos (D1). No leer ningún `README.md` ni ningún mes no listado. Verificar con un test en `connection.svelte.test.ts` que solo se piden las rutas listadas.

## 2. Marcas y comparación

- [x] 2.1 En `trends.test.ts`, escribir tests de `marcasDe`: el día de un despliegue es el de `finishedAt` en la zona del catálogo (escenario «Cerca de medianoche», 23:30 UTC en Europe/Madrid) y el de «Pedido en octubre, desplegado en noviembre». Implementar `Marca` y `marcasDe` (D3). Verificar que los tests pasan.
- [x] 2.2 Convertir `compararVersion` en `compararMarca` (D3). Mantener verdes sus tests actuales y añadir: un despliegue fallido no abre comparación, un fallo dentro de la ventana no cuenta en `otras`, una manual y un despliegue de la misma versión y día cuentan una vez, y un despliegue con `version: null` nunca se deduplica. Verificar que los tests pasan.
- [x] 2.3 Escribir tests de `compararHoras` (D5): subida de 40 a 120 → sube un 200 %, una hora sin dato → `insuficiente`, despliegue de hace 5 horas → `pendiente` con 19 horas, y uso de la tasa cuando hay peticiones. Implementarlo reutilizando `variacionEntre`. Verificar que los tests pasan.
- [x] 2.4 Escribir tests de `ultimoRelease` y de la última versión del panel global (D7): un fallo posterior no cuenta, un rollback posterior se indica y, en un empate de día, gana el despliegue. Implementarlo. Verificar que los tests pasan.

## 3. Texto y enlaces seguros

- [x] 3.1 Escribir tests de `enlaceSeguro`: acepta `https:` y rechaza `javascript:`, `http:`, `data:`, relativas y basura. Implementarlo (D6). Verificar que los tests pasan.
- [x] 3.2 Añadir un test que recorra `src/lib/components/health/**/*.svelte` y falle si alguno contiene `{@html`. Verificar que pasa.

## 4. Vista

- [x] 4.1 Añadir a `healthUi` el filtro «ocultar fallidos y cancelados» como estado de vista, y hacer que `versionSel` acepte ids de marca (`run-…`). Verificar con un test de `ui.svelte.ts` que cambiar el filtro no escribe en ninguna carpeta.
- [x] 4.2 En `MetricChart.svelte`, dibujar las marcas agrupadas por día: trazo continuo para despliegues y discontinuo para manuales, glifo por resultado y tipo, y contador si hay varios (D4). El popup de la marca da versión, resultado, tipo, hora local y enlace al run. Verificar en la aplicación, con `mya`, el escenario «Un fallo y un éxito el mismo día» y que ninguna marca aparece en otra aplicación.
- [x] 4.3 En `HourlyChart.svelte`, poner cada despliegue en su hora, resaltar los que tienen alguna métrica que sube según `compararHoras`, y añadir las marcas al texto accesible. Verificar en la aplicación que la marca del 3 de noviembre cae a las 02:24 hora de Madrid y que el detalle dice qué sube o cuántas horas faltan.
- [x] 4.4 Crear `DeployTimeline.svelte` con las filas de la línea de tiempo del periodo visible, el enlace de rollback a su release o «revierte un despliegue no registrado», el estado de la GDV (con «aún puede cambiar» para `pending`, `unavailable` y `not-found` de menos de 7 días) y el changelog en un `<details>` con `pre-wrap`. Si está truncado, se dice. Verificar en la aplicación los escenarios de «Contenido de la GDV» y que el changelog con `<img onerror>` se ve como texto.
- [x] 4.5 En `AppPanel.svelte`, mostrar el último despliegue a producción, el filtro y `DeployTimeline`, y dejar que una marca de despliegue con éxito abra la comparación (con los avisos de `otras`) y que una fallida solo muestre su detalle. Verificar en la aplicación los escenarios «Seleccionar un despliegue fallido» y «Un fallo dentro de la ventana».
- [x] 4.6 Implementar los estados vacíos de «Estados vacíos de despliegues»: sin despliegues, periodo sin despliegues (con la fecha del último) y filtro que oculta todos. Verificar cada uno en la aplicación con 30 días y con «todo».
- [x] 4.7 En `GlobalPanel.svelte`, mostrar la última versión según D7, con su origen como glifo y texto accesible. Verificar en la aplicación el escenario «Última versión desde un despliegue».
- [x] 4.8 Comprobar que «Añadir desde la fuente» ofrece una aplicación con solo despliegues, y que su panel muestra la línea de tiempo sin ejes vacíos. Verificar con la fixture `pagos` en un test de `store-fuente.svelte.test.ts`.
  - Comprobado en Chromium (Playwright) con una fuente de prueba en el sistema de ficheros privado del navegador (el selector nativo no se automatiza): `mya` con 9 runs (un run enriquecido después, dos runs de la 0.0.543 el mismo día, fallos, un rollback enlazado, otro cancelado sin release, una GDV con `javascript:`, un changelog con `<img onerror>` y una línea cortada), una subida de errores tras el despliegue del 13 de noviembre, y `pagos` solo con despliegues. Visto: marcas agrupadas por día y en su hora, ▲ en el despliegue del 13, detalle de 24 h (+300 % tasa), fallido sin comparación, el aviso de otra subida no cuenta el fallo ni repite la 0.0.543, filtro, los cuatro estados vacíos, último despliegue, última versión del panel global, temas claro y oscuro, y ninguna petición de red aparte de los módulos de Vite.
  - Corregido al verificar: etiquetas de marcas cercanas que se montaban, el periodo «todo» que dejaba fuera un despliegue anterior al primer dato, y textos de estados vacíos.

## 5. Comprobar

- [ ] 5.1 Con la carpeta fuente real conectada, comprobar que `mya` muestra 24 despliegues (18 releases con éxito, 5 fallidos y 1 rollback) y que la GDV aparece en 16. Verificar también, con las herramientas de red del navegador, que no se hace ninguna petición y que ningún fichero de la fuente cambia.
  - Pendiente: no tengo acceso a la carpeta real de la rama `data`. Lo hace el usuario al conectarla.
- [x] 5.2 Recorrer los escenarios de las tres specs con el tema claro y el oscuro, y verificar que los glifos y trazos se distinguen sin color.
- [x] 5.3 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 5.4 Ejecutar `openspec validate health-despliegues --strict` y verificar que pasa.
