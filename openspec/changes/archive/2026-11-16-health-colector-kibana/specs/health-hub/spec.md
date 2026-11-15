## ADDED Requirements

### Requirement: Vincular una aplicación vigilada a la fuente

El sistema MUST permitir vincular cada aplicación vigilada a una aplicación de la fuente, y desvincularla. El vínculo MUST guardarse en la carpeta de Health Hub. Una aplicación de la fuente MUST NOT estar vinculada a dos aplicaciones vigiladas a la vez.

Las aplicaciones de la fuente que no están vinculadas a ninguna aplicación vigilada MUST ofrecerse para añadirlas con un gesto. Al añadirlas, la nueva aplicación vigilada MUST tomar el nombre visible que da la fuente y quedar vinculada.

En una aplicación vinculada, cada día medido de la fuente MUST prevalecer sobre la observación de la carpeta para la misma métrica. Las observaciones de la carpeta MUST seguir mostrándose en los días que la fuente no tiene medidos. Los datos de la fuente MUST NOT copiarse a la carpeta de Health Hub.

#### Scenario: Añadir desde la fuente

- **WHEN** la fuente tiene la aplicación «CEX ES», que no está vinculada, y el usuario la añade
- **THEN** aparece la aplicación vigilada «CEX ES» vinculada, con las cifras de la fuente, y la carpeta de Health Hub solo gana su fichero de aplicación

#### Scenario: Histórico anterior al colector

- **WHEN** una aplicación vinculada tiene observaciones de la carpeta de octubre y la fuente empieza en noviembre
- **THEN** el gráfico muestra octubre con las observaciones de la carpeta y noviembre con los datos de la fuente

#### Scenario: Fuente sin conectar

- **WHEN** una aplicación vigilada está vinculada y la fuente no está conectada o no se puede leer
- **THEN** su panel lo dice, muestra solo las observaciones de la carpeta y ofrece conectar la fuente

### Requirement: Vista por horas

El panel de una aplicación vinculada MUST ofrecer una vista por horas de los últimos 7 días hasta «datos hasta», en la zona del catálogo. Las horas sin dato MUST cortar la línea. Las subidas de versión MUST marcarse en el día que las registra. La vista por horas MUST ofrecer sus valores también como texto accesible.

#### Scenario: Ver una subida de cerca

- **WHEN** el usuario abre la vista por horas de una aplicación con una subida hace 2 días
- **THEN** ve los recuentos de cada hora alrededor de la subida, con la marca en su día

### Requirement: Tasa de error

Cuando una aplicación tiene la métrica de peticiones, el sistema MUST calcular la tasa de una métrica de error como la suma de sus errores entre la suma de las peticiones de la misma aplicación y el mismo rango. Si las peticiones del rango suman 0, MUST NOT haber tasa, y MUST NOT mostrarse como 0 %. Las métricas de la clase peticiones MUST NOT tener tasa.

En la vista por horas, la tasa MUST calcularse hora a hora con la misma regla.

#### Scenario: Una hora sin peticiones

- **WHEN** las peticiones de una hora valen 0
- **THEN** esa hora no tiene tasa y la línea de tasa se corta en ella

### Requirement: Nota de una aplicación vigilada

El sistema MUST permitir escribir, cambiar y borrar una nota de texto libre por aplicación vigilada, guardada en la carpeta de Health Hub. La nota MUST mostrarse en su panel junto a las tasas y las tendencias, y MUST NOT interpretarse.

#### Scenario: Tasa aproximada

- **WHEN** la aplicación «MYA» tiene la nota «Las peticiones cuentan un log TRACE; la tasa es aproximada»
- **THEN** la nota aparece junto a sus tasas

## MODIFIED Requirements

### Requirement: Catálogo de métricas

El sistema MUST mantener un único catálogo de métricas, común a todas las aplicaciones vigiladas, para que el panel global compare lo mismo en todas. Cada métrica MUST pertenecer a una de estas clases:

- **propia**: fallo de la aplicación; lo que debería tender a cero.
- **cliente**: puede deberse a la aplicación o a quien la llama; importa el cambio brusco más que la cifra.
- **peticiones**: el volumen de tráfico, que sirve de denominador y no es un error.

Una carpeta nueva MUST nacer con estas métricas, cuyos identificadores son los del colector: `no-controlados` y `errores-50x` como propias, `errores-404` y `errores-40x` como cliente, y `peticiones`.

Con la fuente conectada, el catálogo MUST mandarlo la fuente: las métricas, sus identificadores y sus nombres MUST ser los de la fuente, y el sistema MUST NOT exigir editar el catálogo de la carpeta. La clase de cada métrica MUST tomarse del catálogo de la carpeta si la lista, y si no, de las clases que el sistema conoce para las métricas del colector. Una métrica de la fuente sin clase en ninguno de los dos MUST NOT mostrarse y MUST avisarse. Una métrica del catálogo de la carpeta que no está en la fuente MUST mostrarse solo si la carpeta tiene datos de ella. El catálogo de la carpeta MUST NOT reescribirse por esto.

Cada aplicación vigilada MUST poder guardar, por métrica, el texto de la consulta que la define en la fuente de los logs. En una aplicación vinculada, la consulta y el nombre de cada métrica MUST ser los que da la fuente para esa aplicación, y la consulta MUST NOT poder editarse en Health Hub. El sistema MUST NOT interpretar ni ejecutar ninguna consulta.

El sistema MUST NOT mostrar un total que sume varias métricas, porque unas pueden estar contenidas en otras.

#### Scenario: Carpeta nueva

- **WHEN** el usuario conecta Health Hub a una carpeta vacía
- **THEN** el catálogo contiene las cinco métricas iniciales, con los identificadores del colector y su clase

#### Scenario: Carpeta creada antes del colector

- **WHEN** el catálogo de la carpeta tiene `500`, `400` y `403`, sin datos, y se conecta la fuente
- **THEN** los paneles muestran las métricas de la fuente con sus nombres, y `catalogo.json` no cambia

#### Scenario: Métrica nueva en el colector

- **WHEN** la fuente añade la métrica `errores-429`, que no está en el catálogo de la carpeta
- **THEN** el sistema avisa de que no tiene clase y no la dibuja; al añadirla con su clase al catálogo de la carpeta, aparece con el nombre de la fuente

#### Scenario: Consulta y nombre de la fuente

- **WHEN** el usuario ve una métrica de una aplicación vinculada
- **THEN** ve el nombre y la consulta efectiva que da la fuente para esa aplicación, y no puede editar la consulta

#### Scenario: No se suman métricas

- **WHEN** el usuario ve cualquier panel de Health Hub
- **THEN** ninguna cifra es la suma de varias métricas

### Requirement: Recargar la carpeta

El sistema MUST ofrecer una acción de recargar que vuelva a leer la carpeta de Health Hub, procese la bandeja y vuelva a leer la fuente si está conectada, sin volver a elegir ninguna carpeta. Así recoge lo que un agente o el colector hayan dejado con Health Hub abierto. Mientras no se recargue, MUST NOT escribir en ningún fichero que no haya cambiado desde la aplicación.

#### Scenario: Un agente deja una captura

- **WHEN** un agente deja una entrada con Health Hub abierto y el usuario pulsa recargar
- **THEN** la entrada se procesa y los paneles reflejan los datos

#### Scenario: El colector añade horas

- **WHEN** el colector añade una línea a una serie con Health Hub abierto y el usuario pulsa recargar
- **THEN** los paneles y «datos hasta» reflejan las horas nuevas sin elegir de nuevo la fuente

### Requirement: Panel de una aplicación vigilada

El panel de una aplicación vigilada MUST mostrar un gráfico de evolución por métrica, con la línea diaria y una media móvil de 7 días, y un selector de periodo de 30 días, 90 días, 1 año y todo. Si la aplicación está vinculada, el selector MUST ofrecer también la vista por horas. Los errores propios MUST aparecer antes y separados de los de cliente. Las peticiones MUST poder verse pero no destacar.

Un valor estimado MUST distinguirse visualmente de uno exacto. El gráfico MUST ofrecer sus valores también como texto accesible.

Cada métrica MUST mostrar su consulta si la tiene. Si la aplicación está vinculada, el panel MUST mostrar «datos hasta» y los avisos de lectura de la fuente que la afecten.

#### Scenario: Un tramo estimado

- **WHEN** el periodo incluye valores estimados y exactos
- **THEN** se distinguen a simple vista y el detalle de cada punto dice cuál es

#### Scenario: Aplicación sin datos

- **WHEN** una aplicación vigilada no tiene ninguna observación
- **THEN** el panel lo dice y no dibuja ejes vacíos ni ceros

#### Scenario: Aplicación vinculada

- **WHEN** el usuario abre el panel de una aplicación vinculada
- **THEN** ve «datos hasta» con fecha y hora, y puede elegir la vista por horas

### Requirement: Aviso de captura

El sistema MUST calcular para cada aplicación vigilada los días que quedan antes de empezar a perder datos, como el último día con datos, más 7, menos hoy. En una aplicación no vinculada, el último día con datos MUST tener en cuenta las entradas válidas aún pendientes, cuyos datos no se han perdido. En una aplicación vinculada, MUST ser el día de su «datos hasta», aunque ese día aún no esté completo, porque el colector rellena las horas que falten mientras Kibana las conserve.

MUST avisar con tono de advertencia cuando queden 2 días o menos, y con tono de peligro cuando queden 0 o menos. Con menos de 0 MUST decir cuántos días se han perdido. Una aplicación sin ninguna observación ni «datos hasta» MUST NOT generar aviso, porque nadie ha empezado a capturarla.

#### Scenario: Captura al día

- **WHEN** el último día con datos es ayer
- **THEN** quedan 6 días y no hay aviso

#### Scenario: Quedan pocos días

- **WHEN** el último día con datos es de hace 5 días
- **THEN** el sistema avisa de que quedan 2 días

#### Scenario: Datos perdidos

- **WHEN** el último día con datos es de hace 9 días
- **THEN** el sistema avisa de que se han perdido 2 días

#### Scenario: El colector lleva días sin ejecutarse

- **WHEN** una aplicación vinculada tiene «datos hasta» de hace 5 días
- **THEN** el sistema avisa de que quedan 2 días

### Requirement: Los datos no salen de la carpeta

Health Hub MUST NOT realizar ninguna llamada de red con sus datos ni con los de la fuente, ni guardarlos en el almacenamiento del navegador. En el navegador MUST quedar solo la conexión a las carpetas y el estado de vista. El estado de vista MUST NOT escribirse en ninguna carpeta.

#### Scenario: Cambiar de vista

- **WHEN** el usuario cambia de panel, de periodo o selecciona una marca
- **THEN** ningún fichero de ninguna de las dos carpetas cambia

#### Scenario: Desconectar

- **WHEN** el usuario desconecta la carpeta o la fuente
- **THEN** ningún dato de Health Hub ni de la fuente queda en el navegador
