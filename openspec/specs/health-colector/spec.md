# health-colector

## Purpose
Leer en Health Hub, sin escribir nunca en ella, la carpeta de datos que deja el colector de Kibana, y convertir sus recuentos horarios en las horas y los días que usan los paneles.

## Requirements

### Requirement: Conectar la fuente

El sistema MUST permitir elegir una segunda carpeta, la fuente, además de la carpeta de Health Hub. La fuente MUST ser la carpeta que contiene `index.json` en su raíz, con `formatVersion` igual a 1. Si no lo es, el sistema MUST decirlo con un mensaje que pida la carpeta que contiene `index.json`, MUST NOT buscar ficheros en otras rutas y MUST NOT recordarla.

El sistema MUST recordar la fuente entre sesiones, pedir solo permiso de lectura y permitir desconectarla. Desconectarla MUST NOT cambiar la carpeta de Health Hub. Si el navegador pide permiso de nuevo, el sistema MUST ofrecer reactivarlo con un gesto, igual que con la carpeta propia.

#### Scenario: Elegir la carpeta correcta

- **WHEN** el usuario elige una carpeta que tiene `index.json` con `formatVersion: 1`
- **THEN** el sistema la recuerda como fuente y muestra sus aplicaciones y la fecha de «datos hasta»

#### Scenario: Elegir una carpeta equivocada

- **WHEN** el usuario elige la subcarpeta `series/`, o una carpeta por encima de la de datos
- **THEN** el sistema pide la carpeta que contiene `index.json` y no recuerda nada

#### Scenario: Formato desconocido

- **WHEN** `index.json` declara `formatVersion: 2`
- **THEN** el sistema dice que la fuente usa un formato que no sabe leer y no muestra sus datos

### Requirement: La fuente es de solo lectura

El sistema MUST NOT crear, modificar ni borrar ningún fichero de la fuente, y MUST NOT leer nada de ella aparte de `index.json` y los ficheros de series listados en él. La sección `dashboards` de `index.json`, la carpeta `kibana/`, `README.md` y las carpetas ocultas MUST ignorarse.

#### Scenario: Usar Health Hub con la fuente conectada

- **WHEN** el usuario conecta la fuente, recarga, cambia de panel y registra una versión
- **THEN** ningún fichero de la fuente cambia

#### Scenario: Series antiguas de dashboards

- **WHEN** `index.json` tiene una sección `dashboards` y existe la carpeta `kibana/`
- **THEN** ninguna de sus series aparece en Health Hub

### Requirement: Aplicaciones y métricas de la fuente

El sistema MUST descubrir las aplicaciones y las métricas de la fuente a partir de `apps` en `index.json`, con el nombre visible de cada aplicación. De cada métrica MUST usar su nombre, su consulta efectiva, su `step`, su `to` y sus meses.

Una métrica marcada como retirada MUST NOT ofrecerse como métrica activa. Una métrica de la fuente cuya clase no se conoce MUST NOT mostrarse y MUST avisarse, sin inventarle clase.

#### Scenario: Métrica retirada

- **WHEN** una métrica de la fuente tiene `removed: true`
- **THEN** no aparece en ningún panel ni en ningún aviso de métrica desconocida

#### Scenario: Métrica sin clase conocida

- **WHEN** la fuente tiene una métrica `errores-429` cuya clase no da ni el catálogo de la carpeta ni el sistema
- **THEN** el sistema avisa de que no tiene clase y no la dibuja

### Requirement: Leer las series

El sistema MUST leer, para cada métrica, los ficheros `series/<app>/<métrica>/<YYYY-MM>.jsonl` de cada mes listado. Cada línea MUST interpretarse como recuentos consecutivos desde su `from` UTC, cada uno de la duración de su `step`. Las líneas MUST ordenarse por `from`.

El sistema MUST ignorar las líneas vacías. Una línea que no se puede leer MUST saltarse y avisarse sin impedir la carga del resto. Un fichero listado que falta MUST avisarse, y sus horas MUST quedar sin dato.

Si el `from` de una línea no coincide con el final de la anterior, las horas entre ambas MUST quedar sin dato y avisarse. Un hueco MUST NOT rellenarse con ceros. Una hora con valor 0 MUST tratarse como medida.

#### Scenario: Una línea a medio escribir

- **WHEN** la última línea de un fichero está cortada porque el colector estaba escribiendo
- **THEN** el sistema carga las demás líneas y avisa de que se saltó una

#### Scenario: El colector se saltó una ejecución

- **WHEN** entre dos líneas faltan tres horas
- **THEN** esas tres horas quedan sin dato, la línea horaria se corta y el sistema avisa del hueco

#### Scenario: Falta un mes

- **WHEN** `index.json` lista el mes `2026-12` de una métrica y su fichero no existe
- **THEN** el sistema avisa del fichero que falta y muestra el resto de meses

### Requirement: Días a partir de horas

El sistema MUST agregar las horas de la fuente a días naturales en la zona del catálogo. Un día MUST contar como medido solo si tiene dato en todas sus horas, contando los días de 23 y de 25 horas del cambio de hora. Un día con alguna hora sin dato MUST quedar sin medir en los paneles diarios, la tendencia, la salud y la comparación.

#### Scenario: El primer día de la serie

- **WHEN** la serie empieza a las 20:00 UTC de un día
- **THEN** ese día no aparece como medido en los paneles diarios, y sí en la vista por horas

#### Scenario: Cambio de hora

- **WHEN** el día del cambio de hora de octubre tiene sus 25 horas
- **THEN** el día cuenta como medido y su valor es la suma de las 25

### Requirement: Datos hasta

El sistema MUST tomar como «datos hasta» de una métrica su `to` en `index.json`, y como «datos hasta» de una aplicación de la fuente el `to` más antiguo de sus métricas activas. MUST NOT deducirlo de la fecha de hoy ni de la fecha de modificación de los ficheros.

#### Scenario: Copia local desfasada

- **WHEN** la última ejecución del colector que contiene la carpeta es de anteayer
- **THEN** el sistema muestra «datos hasta» con la fecha y la hora de anteayer
