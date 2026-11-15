## Context

Health Hub (change archivado `2026-11-13-health-hub`) guarda observaciones diarias en su carpeta (`obs-*`), las alimenta con una bandeja (`entrada-*.json`) y calcula tendencia, salud y comparación con funciones puras sobre `Observacion[]`. `FolderConnection` conecta una carpeta por aplicación, buscando `<carpeta>/<appId>/` con su marcador, y pide permiso de lectura y escritura.

El colector, en otro repo, escribe en su worktree de la rama `data`:

```
data/
├─ index.json                         { formatVersion: 1, apps: { <app>: { name, scope?, metrics: { <métrica>: {
│                                        name, query, effectiveQuery, step, from, to, months } | { removed: true, … } } } },
│                                        dashboards: … (antiguo, se ignora) }
├─ series/<app>/<métrica>/<YYYY-MM>.jsonl   una línea por ejecución: {"run","from","step":3600,"v":[enteros ≥ 0]}
└─ kibana/ , README.md                 se ignoran
```

Hoy todas las series tienen `step` 3600 alineado a la hora en punto UTC, las líneas no se solapan y no hay `null`. Las aplicaciones son `cex-es` (5 métricas, con alcance común) y `mya` (`no-controlados` y `peticiones`). Ver `proposal.md` para el porqué y `specs/` para los requisitos.

## Goals / Non-Goals

**Goals:**

- Que lo que ya calcula Health Hub (tendencia, salud, comparación, panel global) funcione sin cambios con los días que salen de la fuente.
- Que la lectura de la fuente sea una función pura con tests, y que un fichero a medio escribir no tumbe nada.
- Que `lib/folder/` solo crezca en lo mínimo (el modo de lectura) y que las demás aplicaciones no cambien.

**Non-Goals:**

- Fusionar líneas con `step` distinto o solapadas. Eso eran las series antiguas de `dashboards`, y el formato actual garantiza lo contrario. Si llega un `step` distinto de 3600, la métrica se avisa y no se lee.
- Comparación antes/después por horas: la comparación sigue siendo por días.
- Editar el catálogo desde la interfaz.
- Leer la fuente en navegadores sin `showDirectoryPicker` (`webkitdirectory`): Health Hub ya es solo para Chromium.

## Decisions

### D1: La fuente es una segunda conexión, no un participante

```
 Health Hub ─┬─ carpeta propia (FolderConnection, lectura/escritura) ─▶ catálogo, app-*, obs-*, bandeja
             └─ fuente (FuenteConnection, solo lectura) ──────────────▶ index.json + series/
```

`FolderConnection` exige la subcarpeta `<appId>/` con marcador y un participante que pueda volcar datos desde el navegador. La fuente no tiene ninguna de las dos cosas: su raíz es la carpeta elegida y su validez la da `index.json`. Por eso `health/fuente/connection.svelte.ts` es una conexión pequeña y propia. Reutiliza lo que no sabe de aplicaciones:

- `handles.ts`, con la clave `health-fuente`. Ya indexa por una cadena cualquiera, así que no cambia.
- `pickFolder(mode)` y `queryPermission/requestPermission(dir, mode)`, con `mode` opcional y `'readwrite'` por defecto. Es el único cambio en `lib/folder/`.

Estados: `sin-fuente`, `abriendo`, `permiso` (hace falta un gesto), `no-valida` (con motivo) y `lista`. Al arrancar, si hay handle recordado, se consulta el permiso sin pedirlo, igual que en las carpetas.

Alternativa descartada: meter la fuente como participante de `HealthFolder`. Habría que enseñar a `inspectFolder` una carpeta sin marcador y a `dump` a no escribir, que es justo lo contrario de su contrato.

Alternativa descartada: pedir al usuario que enlace `data/` dentro de la carpeta de Health Hub. Mezcla el repo del colector con el de Health Hub, y `readAll` no sigue subcarpetas.

### D2: Leer, una función pura sobre textos

```
leerIndice(texto) → { apps, avisos } | { error }
leerSerie(textos por mes, meta) → { horas: Map<epochHora, n>, huecos, avisos }
```

`fuente/read.ts` solo recibe cadenas. La conexión se encarga de la E/S: lee `index.json` y, por cada métrica activa, `series/<app>/<métrica>/<mes>.jsonl` de sus `months`. Reglas, todas cubiertas por tests:

- Las líneas vacías se ignoran. Una línea que no se puede parsear o que no cumple la forma (`from` ISO con Z, `step` 3600, `v` de enteros ≥ 0) se salta con aviso.
- Las líneas se ordenan por `from` y se expanden a horas. Si una hora aparece dos veces, cosa que el formato no debería producir, se queda la de la línea con `run` más reciente y se avisa. No se suma, porque sumar duplicaría.
- Si el `from` de una línea no coincide con el final de la anterior, se registra un hueco con su rango.
- Un fichero listado que falta genera un aviso.

Así se cumple lo que dice el colector («no hay buckets repetidos que sumar») y la carga no depende de que lo cumpla.

### D3: De horas a días, solo días completos

`fuente/days.ts`: `diasCompletos(horas, zona) → Observacion[]`. Agrupa por día natural en la zona del catálogo con `Intl.DateTimeFormat`, que ya conoce el cambio de hora. Un día cuenta solo si tiene todas sus horas: se calculan desde el inicio de ese día hasta el siguiente, y salen 23, 24 o 25. Cada día completo se convierte en una `Observacion` con `fuente: 'kibana'`, `capturado` igual al día de `to` y sin `estimado`.

Como el desfase de Madrid con UTC siempre es de horas enteras, un día completo es exacto. Por eso no hay estimados.

Alternativa descartada: contar los días parciales como estimados. El primer día de la serie, que empieza a las 20:00Z, tendría 4 horas: sería una cifra baja que la tendencia leería como mejora.

### D4: Mezclar fuente y carpeta en el store, sin escribir

`HealthStore` gana `fuente` (el resultado de la lectura) y una consulta derivada `observacionesDe(id)`:

```
vinculada? ── no ─▶ obs-* de la carpeta (como hoy)
     └─ sí ─▶ días completos de la fuente ∪ obs-* de los días/métricas que la fuente no cubre
```

Todo lo que ya consume `observacionesDe` (tendencia, salud, comparación, `summary`, gráficos) recibe así los días de la fuente sin cambiar. La mezcla vive en `$derived`, nunca en `data`, para que el autoguardado no escriba datos de la fuente en `obs-*`.

`consultas` de una métrica vinculada se toman de `effectiveQuery` y el diálogo no las deja editar. El `app-*.json` no se toca.

La bandeja sigue funcionando para todas las aplicaciones. En una vinculada, una entrada solo cambia los días que la fuente no cubre, por la precedencia de arriba.

### D5: El vínculo y la nota, en `app-*.json`

```json
{ "id": "cex-es", "nombre": "CEX ES", "fuente": "cex-es", "nota": "…", "consultas": {}, "versiones": [] }
```

`fuente` y `nota` son opcionales y solo se escriben si tienen valor, así que los ficheros existentes no cambian de bytes. La lectura rechaza una `fuente` que no sea un id válido. Dos vigiladas con la misma `fuente` se leen igual, pero solo la primera según `order.json` toma los datos, y la otra muestra un aviso. Así un conflicto de git no deja la carpeta ilegible.

«Añadir desde la fuente» crea la vigilada con `idParaNombre(name)` y `fuente: <app>`. Con los nombres actuales salen `cex-es` y `mya`, y coinciden.

Alternativa descartada: vincular por convención, con el id de la vigilada igual al id de la app. Es frágil ante un renombrado en el colector y no se ve en el fichero.

### D6: «Datos hasta» y aviso de captura

`datosHasta(app)` es el `to` más antiguo de sus métricas activas: lo que se puede garantizar de todas. `trends.captura` no cambia de fórmula. Solo cambia el `ultimo` que recibe: en una vinculada es el día de `datosHasta` en la zona del catálogo. Se muestra con fecha y hora en el panel de la aplicación y en la cabecera del panel global.

### D7: Vista por horas y tasa

`chart.ts` gana el periodo `'horas'` (los últimos 7 días hasta `datosHasta`) con puntos por hora, ticks por día y sin media móvil. Las subidas, que solo tienen día, se marcan al inicio de ese día. La tasa por hora y por rango es una función pura en `fuente/rate.ts`: `tasa(errores, peticiones)`, que vale `null` si las peticiones suman 0. La tendencia diaria ya calcula tasa cuando hay peticiones completas. Solo hay que asegurar el caso de peticiones 0, que hoy no tiene test.

### D8: Catálogo inicial con los ids del colector

`metricasIniciales()` pasa a `no-controlados`, `errores-50x`, `errores-404`, `errores-40x` y `peticiones`. Health Hub no reescribe un `catalogo.json` existente: hacerlo sería una normalización sin gesto sobre datos del usuario. La carpeta real, creada con el catálogo anterior y sin observaciones, se corrige a mano (ver Migration Plan).

## Risks / Trade-offs

- **[El colector cambia el formato]** → `formatVersion` y la forma de cada línea se validan. Lo desconocido se avisa y no se lee. El contrato está en los tests de `fuente/read.ts`.
- **[Un 0 por falta de ingesta]** → La fuente no lo distingue y Health Hub tampoco puede. La nota de la aplicación sirve para decirlo, y la tasa no se calcula con peticiones 0.
- **[Cambiar una consulta en el colector cambia el pasado]** → Las líneas no guardan la consulta. Health Hub muestra la consulta efectiva actual, y la nota puede registrar desde cuándo vale.
- **[Leer muchos ficheros al recargar]** → Un fichero por mes y métrica: con 7 métricas son 84 ficheros al año y unos pocos KB cada uno. Leerlos todos al recargar es barato. Si crece, se leerán solo los meses del periodo visible.
- **[Dos permisos que reactivar]** → Tras reiniciar el navegador puede hacer falta un gesto por carpeta. Se ofrecen juntos en la misma pantalla.
- **[Ver datos sin publicar]** → La fuente es el worktree del colector, así que puede tener horas que aún no están en el remoto. Es lo que se busca: la carpeta es local y nada sale de ella.

## Migration Plan

1. Desplegar como siempre a GitHub Pages.
2. En la carpeta real de Health Hub, reemplazar `metricas` de `catalogo.json` por las cinco nuevas. Hoy no tiene observaciones, así que no hay nada que migrar. El README lo indica.
3. Conectar la fuente (`…/customer-health-viewer/data`) y añadir «CEX ES» y «MYA» desde ella.

Para volver atrás basta con revertir el commit. La versión anterior conserva los campos que no conoce (su test «no pierde un campo que no conoce»), así que `fuente` y `nota` sobreviven y vuelven a servir al redesplegar.
