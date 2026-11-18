## Context

Health Hub lee la carpeta del colector como **fuente** de solo lectura (`fuente/connection.svelte.ts`). `leerFuente` lee `index.json` y, por cada métrica activa, sus `series/<app>/<métrica>/<mes>.jsonl`. `fuente/read.ts` convierte esos textos con funciones puras. Las subidas de versión son `VersionSubida { id, version, dia, nota? }` dentro de cada `Vigilada`, guardadas en la carpeta del hub. Las usan:

- `compararVersion` (`trends.ts`): 7 días antes y 7 después, con el aviso de `otras`;
- `MetricChart` y `HourlyChart`: marcas por día;
- `AppPanel`: la lista de versiones y `healthUi.versionSel`;
- `GlobalPanel`: la última versión.

El colector añade ahora a la misma carpeta:

```
data/
├─ index.json        apps.<app>.deployments = { repo|null, count, from, to, months[] }  (opcional)
└─ deployments/<app>/<YYYY-MM>.jsonl   una línea por estado de un run; la última de cada runId gana
                                       el mes es el UTC de requestedAt, no el de finishedAt
```

Hoy solo `mya` tiene despliegues: 24 runs y unas 30 líneas. El formato está en `deployments/README.md` de la rama `data`, que Health Hub no lee. Ver `proposal.md` para el porqué.

## Goals / Non-Goals

**Goals:**

- Que la lectura de despliegues sea una función pura con tests, como `leerSerie`, y que un fichero a medio escribir no tumbe nada.
- Que la comparación, el aviso de «otra subida» y la última versión funcionen igual para una subida manual y para un despliegue, sin duplicar lógica.
- Que ningún texto de Jira llegue al DOM como algo distinto de texto.

**Non-Goals:**

- Escribir despliegues en la carpeta del hub, o convertirlos en `VersionSubida`.
- Leer el historial de un run (sus líneas anteriores). Solo cuenta el estado vigente.
- Mostrar `components` como algo más que una lista de texto.
- Correlación automática más allá de la ventana de 24 h por horas: nada de detección de picos ni de causalidad.

## Decisions

### D1: Leer todos los meses listados, en la misma pasada que las series

`leerFuente` lee `deployments/<app>/<mes>.jsonl` de todos los `months` de la app, junto a sus series, y deja el resultado en `AppLeida.despliegues` y sus avisos en `AppLeida.avisos`.

Se descarta leer solo los meses del periodo visible. El fichero lo decide `requestedAt`, y un run puede terminar días o semanas después, así que acertar con los meses obligaría a adivinar un margen. Además son ficheros pequeños: unas 30 líneas en total. También se descarta leerlos a demanda al abrir el panel, porque el panel global necesita el último release de cada app.

No hay caché. Se releen en cada recarga, igual que las series, y por eso un `pending` que pasa a `found` aparece en la siguiente recarga.

### D2: `fuente/despliegues.ts`, puro sobre textos

```
leerDespliegues(etiqueta, textos: Map<mes, string|null>) → { despliegues: Despliegue[], avisos: string[] }
```

- Por cada línea no vacía: `JSON.parse`, validar y normalizar. Una línea mala se salta con un aviso que da fichero y número de línea.
- Validación mínima: `runId` entero > 0, `kind` ∈ {release, rollback}, `result` ∈ {success, failure, cancelled}, y `finishedAt` como instante válido (se reutiliza `instante()` de `read.ts`). El resto de campos son opcionales: si no son del tipo esperado quedan `null`, porque el README garantiza que están y una línea con un campo raro no debe perder el despliegue entero.
- `gdv` se normaliza a una unión discriminada. `found` lleva su contenido. Cualquier otro estado conocido no lleva nada, y un estado desconocido se trata como `unavailable`, sin aviso.
- Se agrupa por `runId` con un `Map`. Una línea sustituye a la anterior si su `collectedAt` es mayor o igual, así que en un empate gana la última del fichero.
- La salida va ordenada por `finishedAt` descendente.

`Despliegue` guarda los instantes como milisegundos epoch (`number`) y el texto tal cual. No se escapa nada al leer: escapar es cosa de la vista (D6).

### D3: Una marca común para manuales y despliegues

```ts
type Marca =
  | { origen: 'manual'; id: string; version: string; dia: IsoDate; v: VersionSubida }
  | { origen: 'despliegue'; id: `run-${number}`; version: string | null; dia: IsoDate; instante: number; d: Despliegue };

marcasDe(app, despliegues, zona) → Marca[]          // dia del despliegue = finishedAt en la zona del catálogo
abreComparacion(m) = m.origen === 'manual' || m.d.result === 'success'
```

`compararVersion(version: VersionSubida, …)` pasa a `compararMarca(marca: Marca, marcas: Marca[], …)`. La ventana no cambia. `otras` son las marcas que abren comparación, están dentro de la ventana y no son la seleccionada. Después se deduplican: si en `otras` (o en la seleccionada) hay una manual y un despliegue de la misma `version` y el mismo `dia`, cuentan una vez. `healthUi.versionSel` guarda el `id` de la marca: `run-…` no choca con los ids de las manuales.

Se descarta la alternativa de convertir los despliegues en `VersionSubida` sintéticas: se perdería el instante y el resultado, y se podría acabar guardándolas en la carpeta.

También se descarta un segundo `compararDespliegue`: duplicaría la ventana y las reglas de días incompletos.

### D4: Dibujar las marcas

- **Diaria (`MetricChart`)**: se agrupa por día. Una marca por día con despliegues, con un trazo continuo y un glifo según lo que haya ese día: ● éxito, ✕ fallo, ○ cancelado, ↶ rollback. Si son varios, lleva un número. Las manuales mantienen su trazo, que pasa a ser discontinuo. Así se distinguen sin depender del color, como pide la spec.
- **Por horas (`HourlyChart`)**: cada despliegue en su hora, `floor((finishedAt − inicio) / 3600 s)`, porque las horas son UTC alineadas. El detalle lleva la hora local con `Intl.DateTimeFormat` sin `timeZone`.
- El detalle de la marca reutiliza el popup de punto bajo el ratón (commit 9e8824c), con un modo «marca».
- El filtro «ocultar fallidos y cancelados» es estado de vista en `healthUi`, igual que el periodo. No se guarda en ninguna carpeta.

### D5: Resaltado por horas sobre el mapa horario existente

Se añade a `trends.ts` `compararHoras(instante, horas: Map<epochHora, n>, peticiones?, clase)`:

- antes: las 24 horas completas que acaban en la hora en que termina el despliegue, sin contarla;
- después: las 24 siguientes a esa hora;
- si falta alguna hora de cualquiera de las dos ventanas, `insuficiente`; si la ventana posterior pasa de «datos hasta», `pendiente` con las horas que quedan.

La variación usa `variacionEntre` y los umbrales de la tendencia (`sube`). Así no aparece un segundo criterio de qué es subir. Solo se calcula para los despliegues con éxito que caen en la vista por horas, que cubre 7 días. Fuera de ella no se calcula nada.

### D6: El texto de Jira, solo por interpolación

- Los textos se pintan solo con `{texto}` de Svelte. Hay un test que comprueba que ningún componente de `components/health/` usa `{@html}`.
- El changelog va en un `<details>` plegado. `releaseNotes` se normaliza de `\r\n` a `\n` y va en un bloque con `white-space: pre-wrap` y `overflow-wrap: anywhere`.
- Todos los enlaces pasan por `enlaceSeguro(url): string | null`. Esa función solo acepta lo que `new URL()` analiza con `protocol === 'https:'`. Un enlace rechazado pinta la clave o el texto sin `<a>`. Los enlaces llevan `rel="noopener noreferrer"` y `target="_blank"`.

### D7: Último despliegue y «última versión»

`ultimoRelease(despliegues)` = primer `release` con éxito en el orden de D2. En el panel de la app, si hay un rollback con éxito posterior, se indica al lado. En `GlobalPanel`, la última versión pasa a ser `max` por día entre la última `VersionSubida` y `ultimoRelease`. Si hay empate, gana el despliegue porque tiene hora. Se muestra su origen con un glifo y un texto accesible.

### D8: Una app solo con despliegues

`leerIndice` ya no descarta una app con `metrics` vacío si tiene `deployments`. Para «datos hasta», una app sin métricas activas no tiene fecha. El panel muestra la línea de tiempo y el texto de «aplicación sin datos», sin ejes.

## Risks / Trade-offs

- [Muchos despliegues el mismo día saturan la marca diaria] → Se agrupan en una marca con contador (D4). En la vista por horas se ven por separado.
- [El aviso de «otra subida» deduplica por versión y día, y la versión puede ser `null`] → Un despliegue con `version: null` nunca se deduplica: cuenta como subida propia.
- [Leer todos los meses crece con el tiempo] → A un despliegue al día son unas 365 líneas al año, despreciable. Si algún día pesa, se filtra por `from`/`to` del índice, y la spec no cambia.
- [El `not-found` se reintenta 7 días y la interfaz podría darlo por definitivo] → El texto de «aún puede cambiar» depende de `finishedAt` frente a hoy (spec).
- [La resolución por `collectedAt` asume relojes del mismo colector] → Si empatan, decide el orden del fichero, que el README garantiza ascendente.
- [La ventana de 24 h es arbitraria] → Es una constante. Cambiarla no cambia el comportamiento descrito, salvo la cifra de la spec.

## Migration Plan

No hay migración: la carpeta del hub no cambia de formato y las `VersionSubida` existentes se siguen leyendo igual. Sin la clave `deployments`, todo se comporta como hoy. Para deshacer el cambio basta con revertir el código.
