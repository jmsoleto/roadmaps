## Why

Health Hub quiere ver si los errores crecen tras una subida, pero hoy las subidas son marcas que alguien registra a mano, con día y sin hora. El colector ya publica en la carpeta fuente todos los despliegues a producción de cada aplicación, con su instante exacto, su resultado (también los fallidos y los rollbacks) y el changelog de su GDV de Jira. Sin leerlos, la correlación entre picos de errores y despliegues depende de que alguien se acuerde de apuntarlos, y se pierde la hora y el contenido de cada subida.

## What Changes

- Health Hub lee de la carpeta fuente, sin escribir nunca en ella y sin red, `apps.<app>.deployments` en `index.json` y los ficheros `deployments/<app>/<YYYY-MM>.jsonl`. El despliegue es el `runId`: la última línea de cada `runId` gana.
- Cada despliegue de una aplicación vinculada aparece como marca sobre sus gráficos, situada por `finishedAt`: en su día (zona del catálogo) en la vista diaria y en su hora en la vista por horas. Se distinguen el resultado (éxito, fallo, cancelado) y el tipo (release o rollback). Un filtro oculta los fallidos y cancelados.
- Las subidas manuales siguen existiendo y conviven con los despliegues, con un trazo distinto.
- La comparación antes/después la abren las subidas manuales y los despliegues con éxito. Los fallidos y cancelados no la abren ni cuentan como «otra subida en la ventana».
- El panel de la aplicación gana una línea de tiempo de despliegues: versión, resultado, fecha, actor, enlace al run, enlace al release que revierte un rollback y el changelog de la GDV, plegado y siempre como texto.
- En la vista por horas, cada despliegue con éxito compara las 24 horas anteriores con las 24 posteriores y se resalta si alguna métrica de error sube.
- El panel global muestra como «última versión» la más reciente entre las subidas manuales y el último release con éxito, e indica de dónde viene.
- Estados vacíos explícitos: aplicación sin despliegues, periodo sin despliegues y GDV sin contenido.

## Capabilities

### New Capabilities

- `health-despliegues`: leer los despliegues de la fuente, resolver cada `runId`, y mostrarlos en marcas, línea de tiempo, resaltado por horas y último despliegue, con el contenido de Jira tratado como texto no confiable.

### Modified Capabilities

- `health-colector`: la fuente de solo lectura deja leer también `deployments/` y la clave `deployments` de cada aplicación. Una aplicación con despliegues y sin métricas es una aplicación de la fuente.
- `health-hub`: las marcas de versión, la comparación antes/después, la vista por horas y la «última versión» del panel global tienen en cuenta los despliegues de la fuente.

## Impact

- Código: `src/lib/health/fuente/` gana la lectura de despliegues (`despliegues.ts`, función pura con tests) y la conexión lee sus ficheros. `trends.ts` compara a partir de una marca común en lugar de `VersionSubida`. Cambian `chart.ts`, `MetricChart.svelte`, `HourlyChart.svelte`, `AppPanel.svelte` y `GlobalPanel.svelte`, y hay un componente nuevo para la línea de tiempo.
- Formato de la carpeta de Health Hub: no cambia. Los despliegues no se copian a ella.
- Sin dependencias nuevas ni llamadas de red. Nada se escribe en la fuente ni en los repositorios de despliegues.
