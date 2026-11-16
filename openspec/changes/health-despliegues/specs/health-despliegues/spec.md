## Purpose

Mostrar en Health Hub los despliegues a producción que el colector deja en la carpeta fuente, junto a las métricas de cada aplicación, para correlacionar en el tiempo los cambios en los errores con las subidas reales, incluidos los intentos fallidos y los rollbacks.

## ADDED Requirements

### Requirement: Leer los despliegues de la fuente

Para cada aplicación de la fuente con la clave `deployments` en `index.json`, el sistema MUST leer `deployments/<app>/<YYYY-MM>.jsonl` de todos los meses listados en su `months`, aunque no sean consecutivos. Una aplicación sin la clave `deployments` MUST NOT tener despliegues, y el sistema MUST NOT buscar sus ficheros.

Cada línea no vacía MUST ser un objeto JSON. El despliegue MUST identificarse por su `runId`, nunca por su versión. Si un `runId` tiene varias líneas, MUST quedar la de mayor `collectedAt`, y si empatan, la última del fichero. El número de despliegues MUST ser el de `runId` distintos.

Una línea que no se puede leer, sin `runId` entero positivo, sin `finishedAt` válido, o con un `kind` o un `result` que el sistema no conoce, MUST saltarse y avisarse sin impedir la carga del resto. Un fichero listado que falta MUST avisarse. Los campos que el sistema no conoce MUST ignorarse.

#### Scenario: Un run enriquecido después

- **WHEN** el run 41036559302 tiene una línea con `gdv.status: "pending"` y otra posterior con `gdv.status: "found"`
- **THEN** el sistema muestra un solo despliegue, con el changelog de la GDV

#### Scenario: Dos runs con la misma versión

- **WHEN** dos runs distintos despliegan la versión 0.0.543 con CRQ distinto
- **THEN** el sistema muestra dos despliegues

#### Scenario: Meses con huecos

- **WHEN** `months` es `["2026-04", "2026-10", "2026-11"]`
- **THEN** el sistema lee esos tres ficheros y no busca los meses intermedios

#### Scenario: Una línea a medio escribir

- **WHEN** la última línea de un fichero de despliegues está cortada
- **THEN** el sistema carga los demás despliegues y avisa de que se saltó una línea

### Requirement: Situar un despliegue en el tiempo

El sistema MUST situar cada despliegue en su `finishedAt`. MUST NOT usar `requestedAt`, `startedAt` ni `gdv.deployedAt` para situarlo, ni elegir los ficheros que lee según el periodo visible: un despliegue pedido en un mes y terminado en el siguiente está en el fichero del mes en que se pidió.

En los paneles diarios, el día de un despliegue MUST ser el día de su `finishedAt` en la zona del catálogo. Las horas que se muestran al usuario MUST estar en su zona horaria local.

#### Scenario: Pedido en octubre, desplegado en noviembre

- **WHEN** un run pedido el 30 de octubre termina el 3 de noviembre a las 01:24 UTC y el usuario mira noviembre
- **THEN** el despliegue aparece el 3 de noviembre

#### Scenario: Cerca de medianoche

- **WHEN** un despliegue termina a las 23:30 UTC y la zona del catálogo es Europe/Madrid en invierno
- **THEN** en la vista diaria aparece en el día siguiente

### Requirement: Marcas de despliegue

Cada despliegue de una aplicación vinculada MUST aparecer como marca vertical en todos sus gráficos, y MUST NOT aparecer en los de otra aplicación. La marca de un despliegue MUST distinguirse de la de una subida manual. Se MUST distinguir a simple vista el resultado (éxito, fallo, cancelado) y el tipo (release o rollback), sin depender solo del color.

Por defecto MUST mostrarse todos los despliegues. El sistema MUST ofrecer un filtro que oculte los fallidos y los cancelados en las marcas y en la línea de tiempo. Varios despliegues del mismo día en la vista diaria MUST verse como una sola marca que diga cuántos son y de qué resultado.

El detalle de una marca MUST dar la versión, el resultado, el tipo, la fecha y hora de `finishedAt` y el enlace al run.

#### Scenario: Un fallo y un éxito el mismo día

- **WHEN** el 3 de noviembre hay un release fallido y otro con éxito
- **THEN** la vista diaria muestra una marca de ese día que indica un éxito y un fallo, y la vista por horas muestra las dos marcas en su hora

#### Scenario: Ocultar los fallidos

- **WHEN** el usuario activa el filtro
- **THEN** desaparecen las marcas y las filas de los despliegues fallidos y cancelados, y las de los demás siguen

### Requirement: Línea de tiempo de despliegues

El panel de una aplicación vinculada con despliegues MUST mostrar sus despliegues del periodo visible, del más reciente al más antiguo por `finishedAt`. Cada fila MUST dar la versión, el tipo, el resultado, la fecha y hora de `finishedAt`, el actor y el enlace al run. MAY dar también el CRQ, la ventana planificada, la rama de origen y los componentes.

Un rollback MUST indicar el despliegue que revierte (`rollbackOf`), con un enlace a su fila si está entre los despliegues leídos. Si `rollbackOf` es `null` o no está entre ellos, MUST decir que revierte un despliegue no registrado.

#### Scenario: Rollback enlazado

- **WHEN** el rollback 34290884932 tiene `rollbackOf: 34234378344` y ese release está leído
- **THEN** su fila enlaza con la del release 34234378344

#### Scenario: Rollback sin release

- **WHEN** un rollback tiene `rollbackOf: null`
- **THEN** su fila dice que revierte un despliegue no registrado

### Requirement: Contenido de la GDV

Si `gdv.status` es `found`, la fila del despliegue MUST enlazar a la GDV y ofrecer su título, la release enlazada si la hay y el changelog, plegado por defecto. El changelog MUST conservar sus saltos de línea. Si está truncado, MUST indicarlo. Si `gdv.deployedAt` existe y difiere de `finishedAt`, MAY mostrarse como fecha declarada en Jira, siempre como dato secundario.

Si `gdv.status` es `pending`, `not-found`, `unavailable` o `not-applicable`, el despliegue MUST mostrarse igual, sin changelog, con un texto que diga que no hay contenido de Jira y por qué. Ningún estado de la GDV MUST tratarse como un error de lectura. Un `pending` o un `unavailable`, y un `not-found` de un run que terminó hace menos de 7 días, MUST presentarse como un estado que aún puede cambiar.

#### Scenario: GDV encontrada

- **WHEN** el usuario despliega el changelog de un despliegue con GDV `found`
- **THEN** ve el texto con sus saltos de línea y un enlace a la GDV

#### Scenario: GDV no encontrada aún

- **WHEN** un despliegue terminado hace 2 días tiene GDV `not-found`
- **THEN** su fila dice que aún no se ha encontrado la GDV, sin aviso de error

#### Scenario: Rollback sin GDV

- **WHEN** un rollback tiene GDV `not-applicable`
- **THEN** su fila no ofrece changelog y no muestra ningún aviso

### Requirement: El contenido de Jira es texto no confiable

`gdv.summary`, `gdv.releaseNotes`, `gdv.release.summary` y cualquier otro texto de una línea de despliegue MUST mostrarse como texto literal: MUST NOT interpretarse como HTML, Markdown ni instrucciones. Un enlace (`runUrl`, `gdv.url`) MUST ofrecerse solo si su esquema es `https:`. Si no lo es, MUST mostrarse sin enlace.

#### Scenario: Changelog con etiquetas

- **WHEN** un `releaseNotes` contiene `<img src=x onerror=alert(1)>` y `**negrita**`
- **THEN** el usuario ve esos caracteres tal cual, y no se carga ninguna imagen ni se aplica formato

#### Scenario: Enlace sospechoso

- **WHEN** un `gdv.url` empieza por `javascript:`
- **THEN** la fila muestra la clave de la GDV sin enlace

### Requirement: Último despliegue a producción

Para cada aplicación con despliegues, el sistema MUST mostrar en su panel el último despliegue a producción: el `release` con `result: success` de `finishedAt` más reciente. Si un rollback con éxito es posterior, MUST indicarlo junto a él. Si no hay ningún release con éxito, MUST decirlo.

#### Scenario: Último release con un fallo posterior

- **WHEN** el último release con éxito es la 0.0.543 y después hay un release fallido
- **THEN** el último despliegue a producción es la 0.0.543

### Requirement: Resaltado de un despliegue por horas

En la vista por horas, el sistema MUST comparar, para cada despliegue con éxito y cada métrica de error, las 24 horas anteriores a su `finishedAt` con las 24 posteriores, contadas en horas completas y sin la hora en que termina, con la regla de umbrales de la tendencia, sobre la tasa o el recuento. Un despliegue tras el que alguna métrica sube MUST resaltarse, y su detalle MUST decir qué métricas suben y cuánto.

Si falta alguna hora en cualquiera de las dos ventanas, o la ventana posterior aún no ha terminado, el sistema MUST NOT resaltarlo ni dar un porcentaje: MUST decir que no hay datos suficientes o cuántas horas quedan. El texto MUST describir una coincidencia en el tiempo y MUST NOT afirmar que el despliegue causó el cambio.

#### Scenario: Errores que suben tras un despliegue

- **WHEN** los errores no controlados pasan de 40 en las 24 horas anteriores a 120 en las 24 posteriores
- **THEN** la marca del despliegue se resalta y su detalle dice que los errores no controlados suben un 200 % en las 24 horas siguientes

#### Scenario: Despliegue de hace 5 horas

- **WHEN** un despliegue terminó hace 5 horas
- **THEN** no se resalta y su detalle dice que faltan 19 horas para comparar

### Requirement: Estados vacíos de despliegues

El sistema MUST distinguir y explicar con un texto cada uno de estos casos, sin dibujar marcas ni listas vacías:

- la aplicación vigilada no está vinculada, o su aplicación de la fuente no tiene despliegues;
- la aplicación tiene despliegues, pero ninguno en el periodo visible, con la fecha del más reciente;
- el filtro oculta todos los despliegues del periodo visible.

#### Scenario: Aplicación sin despliegues

- **WHEN** el usuario abre el panel de una aplicación vinculada cuya aplicación de la fuente no tiene la clave `deployments`
- **THEN** el panel dice que no hay despliegues registrados para ella

#### Scenario: Periodo sin despliegues

- **WHEN** el usuario mira los últimos 30 días y el último despliegue fue hace 45
- **THEN** el panel dice que no hay despliegues en el periodo y da la fecha del último
