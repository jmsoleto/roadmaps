## 1. Modelo y formato de carpeta

- [x] 1.1 Crear `src/lib/health/model.ts` con aplicaciones vigiladas, métricas y sus clases, observaciones y versiones, el catálogo inicial y el identificador a partir del nombre; verificar con tests de los identificadores (acentos, colisiones) y del catálogo
- [x] 1.2 Crear `health/folder-format.ts` (`FileFormat`) con catálogo, orden, `app-*` y `obs-*`, sin reclamar `entrada-*`; verificar con tests de ida y vuelta, bytes deterministas y una observación por línea
- [x] 1.3 Tratar como ilegibles los ficheros que contradicen su nombre, las filas fuera de su mes y los días duplicados; verificar con tests, incluido un conflicto de git

## 2. Bandeja y consolidación

- [x] 2.1 Crear la validación pura de una entrada en `health/inbox.ts` (formato, fuente, fechas, zona, filas); verificar con tests de cada motivo de rechazo
- [x] 2.2 Crear `health/merge.ts` con los días válidos y las reglas de competencia; verificar con tests de cada escenario de la spec, incluida la ventana desde la captura y el dato del borde
- [x] 2.3 Clasificar las entradas (consolidar sola, en revisión, rechazada) según sus filas y series conocidas; verificar con tests de aplicación y métrica desconocidas y de la entrada de pantallazo
- [x] 2.4 Leer la bandeja de la carpeta y borrar cada entrada solo tras confirmar la escritura; verificar con `memory-fs` que una interrupción y una repetición no cambian ningún byte, y que un JSON roto no impide cargar

## 3. Tendencias y salud

- [x] 3.1 Crear `health/trends.ts` con la tendencia por métrica, tasa o recuento, y umbrales como constantes; verificar con tests de cifras pequeñas, más tráfico, 0 a N y días que faltan
- [x] 3.2 Añadir el estado de salud y el orden del panel global; verificar con tests de cada regla y su prioridad
- [x] 3.3 Añadir la comparación antes/después de una subida; verificar con tests del día excluido, días que faltan, otra subida en la ventana y valores estimados
- [x] 3.4 Añadir los días de captura contando las entradas pendientes; verificar con tests de 6, 2, 0 y días perdidos, y de la aplicación sin datos

## 4. Store y conexión

- [x] 4.1 Crear `health/store.svelte.ts` (estados sin carpeta, abriendo, no disponible y listo; crear, renombrar y eliminar aplicaciones vigiladas; versiones; consultas; autoguardado; bandeja); verificar con tests del store sobre `memory-fs`
- [x] 4.2 Crear `health/folder.svelte.ts` con un participante sin navegador (D7); verificar con tests que conectar crea marcador y catálogo, que adoptar y rechazar funcionan, que desconectar deja la carpeta intacta y que el navegador no conserva datos
- [x] 4.3 Añadir la acción de recargar; verificar con un test que recoge una entrada dejada con la app abierta y que no reescribe ficheros sin cambios

## 5. Registro en el hub

- [x] 5.1 Registrar `HEALTH_ID`, nombre, ruta, identidad y glifo en `apps.ts`, `identity.ts` y `AppIcon.svelte`; verificar con `identity.test.ts` y los tests de rutas y registro
- [x] 5.2 Añadir la entrada a `hub/folders.ts` y los textos opcionales de `FolderUi` para quien no vuelca del navegador; verificar que `FolderDialog` no menciona datos del navegador en Health Hub y que las demás aplicaciones no cambian
- [x] 5.3 Añadir `summary`, `actions`, `home`, `openRow` y `scope` en `registry.ts`; verificar con `registry.test.ts` las tres cifras, la lista, los avisos y los tres estados sin cifras
- [x] 5.4 Conectar el arranque en `main.ts` y el volcado en `App.svelte`; verificar que un Health Hub sin carpeta no retrasa el arranque del hub, y que las pruebas siguen en verde

## 6. Interfaz

- [x] 6.1 Crear `health/chart.ts` con escalas, huecos, media móvil y ticks; verificar con tests puros que un hueco corta la línea y que la media exige 7 días
- [x] 6.2 Crear el gráfico de evolución en SVG (usando la skill `dataviz`), con estimados distinguibles, marcas de versión y alternativa de texto; verificar en el navegador con temas claro y oscuro
- [x] 6.3 Crear la pantalla sin carpeta, con y sin soporte del navegador, y usar `StoreUnavailable` para el estado no disponible; verificar en Chrome y con el soporte desactivado
- [x] 6.4 Crear el panel global con resumen, filas ordenadas y sin aplicaciones vigiladas; verificar en el navegador con un conjunto de datos de prueba
- [x] 6.5 Crear el panel de aplicación vigilada con errores propios, de cliente y peticiones, periodos y consultas; verificar que no se muestra ningún total sumado
- [x] 6.6 Crear el diálogo de versión y la comparación antes/después; verificar en el navegador sus tres mensajes: completa, quedan días y otra subida en la ventana
- [x] 6.7 Crear la revisión de la bandeja (filas, ignoradas y motivo; aplicar y descartar); verificar el flujo con una entrada de pantallazo y otra rechazada, escritas a mano
- [x] 6.8 Crear el conmutador global/aplicación del breadcrumb y los diálogos de alta y borrado; verificar el teclado, el foco y la confirmación con el número de datos

## 7. Cierre

- [x] 7.1 Documentar en el README Health Hub, el repo privado y el formato de `entrada-*.json` como contrato con los agentes; verificar que un ejemplo del README consolida al copiarlo a una carpeta real
- [x] 7.2 Probar el flujo de extremo a extremo en Chrome con una carpeta bajo git: conectar, dar de alta, dejar una entrada, recargar, marcar versión; verificar con `git diff` que cada paso solo toca los ficheros esperados
  - Hecho por partes: la interfaz, en Chromium sobre el sistema de ficheros privado del navegador (el selector nativo no se puede automatizar), y los diffs, con el store real sobre una carpeta real con `git`. La prueba conjunta es la tarea 7.4.
- [x] 7.3 Ejecutar `npm run lint`, `npm run check`, `npm test` y `npm run build`, y verificar que pasan
- [x] 7.4 Comprobación manual: en Chrome, conectar con el selector nativo la carpeta de un repo privado, dejar una entrada, recargar, y verificar con `git diff` que solo cambian los ficheros esperados y que el permiso se comporta como en las demás aplicaciones
