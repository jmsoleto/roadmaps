# health-hub

## Purpose
Conservar la evolución de los errores de varias aplicaciones más allá de la retención de sus logs, para ver si se reducen con el tiempo o crecen tras una subida de versión. Cubre las aplicaciones vigiladas y su vínculo con la fuente del colector (`health-colector`), sus métricas, la consolidación de lo que deja un agente en una bandeja, las reglas de salud y los paneles global y por aplicación.

## Requirements

### Requirement: Aplicaciones vigiladas

El sistema MUST permitir crear, renombrar y eliminar aplicaciones vigiladas sin modificar código. Cada una MUST tener un identificador corto, legible y fijo desde su creación, y un nombre que se puede cambiar. Renombrar MUST NOT cambiar el identificador ni ningún fichero salvo el de esa aplicación.

Eliminar una aplicación vigilada MUST pedir confirmación indicando cuántos datos consolidados se borran con ella.

#### Scenario: Crear una aplicación vigilada

- **WHEN** el usuario crea la aplicación vigilada «Pedidos»
- **THEN** aparece en el panel global sin datos, con identificador `pedidos`, y tiene su propio panel

#### Scenario: Renombrar conserva la identidad

- **WHEN** el usuario renombra «Pedidos» a «Pedidos web»
- **THEN** su identificador y su histórico no cambian

#### Scenario: Eliminar pide confirmación

- **WHEN** el usuario elimina una aplicación vigilada con 180 datos consolidados
- **THEN** el sistema dice que se borrarán esos 180 datos y no borra nada hasta que lo confirme

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

### Requirement: Observaciones diarias

El sistema MUST guardar un valor por aplicación vigilada, métrica y día natural, en la zona horaria del catálogo. Cada observación MUST registrar su fuente, la fecha en que se capturó y si es estimada.

La ausencia de observación MUST significar «no medido», y un valor 0 MUST significar «medido, ninguno». El sistema MUST representar los dos de forma distinta y MUST NOT rellenar un día sin medir.

#### Scenario: Un día sin medir

- **WHEN** falta la observación del 12 de octubre
- **THEN** la línea del gráfico se corta ese día y no baja a cero

#### Scenario: Un día con cero errores

- **WHEN** la observación del 12 de octubre vale 0
- **THEN** la línea pasa por cero ese día

### Requirement: Formato de la bandeja de entrada

El sistema MUST aceptar propuestas de datos como ficheros JSON `entrada-*.json` dejados en la subcarpeta de Health Hub por cualquier agente o a mano. Cada fichero MUST declarar: la versión del formato, la fuente, la fecha de captura, la zona horaria y sus filas. Cada fila MUST declarar aplicación vigilada, métrica, día y valor entero no negativo, y MAY declararse como estimada.

Las fuentes MUST ser `kibana` o `pantallazo`. Toda fila de una entrada de `pantallazo` MUST tratarse como estimada, lo declare o no.

Una entrada que no cumpla el formato MUST quedar rechazada, nombrando el fichero y el motivo. Una entrada rechazada MUST NOT impedir leer ni usar el resto de Health Hub, y MUST NOT borrarse si el usuario no lo pide.

#### Scenario: Entrada mal formada

- **WHEN** la carpeta contiene una `entrada-*.json` que no es JSON válido
- **THEN** los paneles funcionan con normalidad y la bandeja muestra ese fichero como rechazado, con el motivo

#### Scenario: Zona horaria distinta

- **WHEN** una entrada declara una zona horaria distinta de la del catálogo
- **THEN** queda rechazada, porque sus días no serían comparables con los ya guardados

### Requirement: Qué días de una captura son válidos

El sistema MUST rechazar cualquier fila cuyo día sea el de la captura o posterior, porque ese día no ha terminado.

En las filas de fuente `kibana`, el sistema MUST ignorar las de más de 6 días antes de la captura, porque ese día puede estar parcialmente caducado y su recuento saldría bajo. La ventana se MUST calcular desde la fecha de captura de la entrada, no desde la fecha en que se consolida.

Las filas de pantallazo MUST poder tener cualquier fecha anterior a la captura, porque recuperan histórico.

#### Scenario: El día de hoy no entra

- **WHEN** una entrada capturada el 7 de noviembre trae una fila del 7 de noviembre
- **THEN** esa fila se descarta y la bandeja lo indica

#### Scenario: El día del borde no machaca un dato bueno

- **WHEN** una entrada de `kibana` capturada el 8 de noviembre trae una fila del 1 de noviembre, y ya existe un valor mayor para ese día
- **THEN** el valor existente no cambia

#### Scenario: Consolidar días después de capturar

- **WHEN** una entrada de `kibana` capturada el 1 de noviembre se consolida el 7 de noviembre con una fila del 26 de octubre
- **THEN** la fila es válida, porque está dentro de los 6 días anteriores a la captura

#### Scenario: Un pantallazo antiguo

- **WHEN** un pantallazo capturado hoy trae datos de hace tres meses
- **THEN** esas filas son válidas y quedan pendientes de revisión

### Requirement: Consolidación de la bandeja

Solo la aplicación MUST escribir datos consolidados. Consolidar MUST ser idempotente: repetirlo con la misma entrada MUST NOT cambiar ningún fichero consolidado.

Una entrada de `kibana` con todas sus filas exactas y con aplicación y métrica conocidas MUST consolidarse sola al leer la carpeta, y el sistema MUST decir cuántas filas ha consolidado. Cualquier otra entrada válida MUST quedar pendiente de revisión hasta que el usuario la aplique o la descarte.

Cuando dos valores compiten por el mismo día:

- uno exacto MUST reemplazar a uno estimado;
- uno estimado MUST NOT reemplazar a uno exacto;
- entre dos del mismo tipo, MUST ganar el de captura más reciente;
- si son del mismo tipo y el valor es igual, la observación existente MUST quedar intacta, sin cambiar su fecha de captura, para no generar cambios en git.

El sistema MUST borrar una entrada solo después de confirmar la escritura de sus datos. Si el proceso se interrumpe entre medias, la entrada MUST poder consolidarse de nuevo sin efectos.

#### Scenario: Captura exacta

- **WHEN** aparece una entrada de `kibana` válida y el usuario pulsa recargar
- **THEN** sus filas se consolidan, la entrada se borra y el sistema dice cuántas filas entraron

#### Scenario: Pantallazo pendiente

- **WHEN** aparece una entrada de `pantallazo`
- **THEN** no se consolida hasta que el usuario revise sus filas y la aplique

#### Scenario: Aplicación desconocida

- **WHEN** una entrada de `kibana` trae una fila de una aplicación vigilada o métrica que no existe
- **THEN** la entrada completa queda pendiente de revisión, y el sistema no crea ninguna aplicación ni métrica por su cuenta

#### Scenario: El estimado no pisa al exacto

- **WHEN** se aplica un pantallazo con un valor para un día que ya tiene un valor exacto
- **THEN** el valor exacto se conserva y la revisión indica que esa fila se ha ignorado

#### Scenario: Captura repetida

- **WHEN** se consolida una captura con los mismos valores que ya están guardados
- **THEN** ningún fichero de datos consolidados cambia

#### Scenario: Interrupción

- **WHEN** la aplicación se cierra tras escribir los datos y antes de borrar la entrada
- **THEN** la siguiente lectura consolida la entrada sin cambiar ningún dato y la borra

### Requirement: Recargar la carpeta

El sistema MUST ofrecer una acción de recargar que vuelva a leer la carpeta de Health Hub, procese la bandeja y vuelva a leer la fuente si está conectada, sin volver a elegir ninguna carpeta. Así recoge lo que un agente o el colector hayan dejado con Health Hub abierto. Mientras no se recargue, MUST NOT escribir en ningún fichero que no haya cambiado desde la aplicación.

#### Scenario: Un agente deja una captura

- **WHEN** un agente deja una entrada con Health Hub abierto y el usuario pulsa recargar
- **THEN** la entrada se procesa y los paneles reflejan los datos

#### Scenario: El colector añade horas

- **WHEN** el colector añade una línea a una serie con Health Hub abierto y el usuario pulsa recargar
- **THEN** los paneles y «datos hasta» reflejan las horas nuevas sin elegir de nuevo la fuente

### Requirement: Tendencia de una métrica

El sistema MUST calcular la tendencia comparando los 7 días que terminan en el último día con datos de la aplicación vigilada con los 7 días anteriores a ellos. Si falta algún día en cualquiera de las dos ventanas, la tendencia MUST ser «sin datos». Comparar días completos evita que un fin de semana parezca un cambio.

Cuando estén completas las peticiones de ambas ventanas, la comparación MUST hacerse sobre errores por cada 1.000 peticiones; si no, sobre el recuento, indicándolo.

Una métrica **sube** o **baja** cuando la variación es de al menos un 20 % en la clase propia, o de al menos un 50 % en la clase cliente, y el recuento de la ventana cambia en al menos 20. Si no, está **estable**. Pasar de 0 a un valor que cumpla el mínimo absoluto MUST contar como subida, sin porcentaje.

#### Scenario: Cambio pequeño en cifras pequeñas

- **WHEN** una métrica propia pasa de 4 a 8 errores en la semana
- **THEN** está estable, aunque haya subido un 100 %

#### Scenario: Más errores con más tráfico

- **WHEN** los errores y las peticiones se duplican a la vez
- **THEN** la métrica está estable, porque la tasa no ha cambiado

#### Scenario: Falta un día

- **WHEN** falta un día en cualquiera de las dos ventanas
- **THEN** la tendencia de esa métrica es «sin datos», no un porcentaje

### Requirement: Salud de una aplicación vigilada

El sistema MUST derivar un único estado de salud, aplicando la primera regla que se cumpla:

1. **sin datos**: ninguna métrica propia tiene tendencia.
2. **sin captura**: ya se han perdido días, según el aviso de captura.
3. **empeora**: alguna métrica propia sube.
4. **vigilar**: alguna métrica de cliente sube.
5. **mejora**: alguna métrica propia baja.
6. **estable**: en cualquier otro caso.

Cada estado MUST indicarse con texto, no solo con color. Las reglas MUST describirse en la interfaz, para que un estado se pueda explicar. La salud MUST NOT inferir causas.

#### Scenario: Sube un error propio

- **WHEN** los 500 de una aplicación vigilada suben un 40 % con tráfico estable
- **THEN** su estado es «empeora» y se indica qué métrica lo provoca

#### Scenario: Solo sube un error de cliente

- **WHEN** los 403 se duplican y los errores propios están estables
- **THEN** su estado es «vigilar», no «empeora»

### Requirement: Panel global

El sistema MUST abrir Health Hub en un panel global con una fila por aplicación vigilada: nombre, estado de salud, valor y variación de cada métrica de error en 7 días, evolución de la principal métrica propia, última versión y días que quedan de captura. La última versión MUST ser la más reciente entre las subidas manuales y el último release con éxito de la fuente, y MUST indicar si viene de un despliegue o de una subida manual. Las filas MUST ordenarse de peor a mejor: empeora, sin captura, vigilar, sin datos, estable, mejora; dentro de cada estado, por nombre.

El panel MUST incluir un resumen de cuántas aplicaciones hay en cada estado. Pulsar una fila MUST abrir el panel de esa aplicación, y MUST haber una forma de volver.

#### Scenario: Ver todas de un vistazo

- **WHEN** hay una aplicación vigilada que empeora y dos estables
- **THEN** la que empeora aparece primero y el resumen indica una que empeora y dos estables

#### Scenario: Sin aplicaciones vigiladas

- **WHEN** el usuario conecta una carpeta nueva
- **THEN** el panel global explica que falta dar de alta una aplicación y ofrece hacerlo

#### Scenario: Última versión desde un despliegue

- **WHEN** la última subida manual de «MYA» es del 20 de octubre y su último release con éxito terminó el 3 de noviembre
- **THEN** la fila de «MYA» muestra como última versión la del 3 de noviembre, marcada como despliegue

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

### Requirement: Marcas de subida de versión

El sistema MUST permitir registrar, editar y eliminar subidas de versión por aplicación vigilada, con versión, día y una nota opcional. Cada subida MUST aparecer como marca vertical en todos los gráficos de esa aplicación, y MUST NOT aparecer en los de otra. Dos subidas del mismo día MUST verse a la vez.

En una aplicación vinculada con despliegues en la fuente, las subidas manuales MUST convivir con las marcas de despliegue y distinguirse de ellas. El sistema MUST NOT fusionar ni ocultar una subida manual porque coincida con un despliegue, y MUST NOT permitir editar ni eliminar un despliegue.

#### Scenario: Marcar una versión

- **WHEN** el usuario registra la versión 4.2.0 de «Pedidos» el 3 de noviembre
- **THEN** la marca aparece ese día en todos los gráficos de «Pedidos» y en ninguno de «Pagos»

#### Scenario: Subida manual y despliegue de la misma versión

- **WHEN** el usuario registra la 0.0.543 de «MYA» el 3 de noviembre y la fuente tiene un despliegue con éxito de la 0.0.543 ese día
- **THEN** se ven las dos marcas, cada una con su trazo, y solo la manual se puede editar

### Requirement: Comparación antes y después de una subida

Al seleccionar una subida manual o un despliegue con éxito (release o rollback), el sistema MUST comparar por cada métrica los 7 días anteriores con los 7 posteriores, sin contar el día de la subida, que mezcla horas de antes y de después. El día de un despliegue MUST ser el de su `finishedAt` en la zona del catálogo. Usará la tasa o el recuento con la misma regla que la tendencia. Un despliegue fallido o cancelado MUST NOT abrir la comparación.

Si falta algún día, el sistema MUST NOT dar un porcentaje: MUST decir cuántos días faltan o que no hay datos suficientes. Si hay otra subida manual o otro despliegue con éxito de la misma aplicación en alguna de las ventanas, MUST avisar de que el efecto no se puede atribuir a una sola versión. Los despliegues fallidos o cancelados MUST NOT contar para ese aviso. Una subida manual y un despliegue con éxito de la misma versión el mismo día MUST contar como una sola subida. Si la comparación usa valores estimados, MUST indicarlo.

El texto MUST describir una coincidencia en el tiempo y MUST NOT afirmar que la versión causó el cambio.

#### Scenario: Comparación completa

- **WHEN** el usuario selecciona una subida con 7 días completos a cada lado
- **THEN** ve por métrica el valor medio antes y después y la variación

#### Scenario: Subida reciente

- **WHEN** el usuario selecciona una subida de hace 3 días
- **THEN** el sistema dice que quedan días para comparar y no da porcentaje

#### Scenario: Dos subidas cercanas

- **WHEN** hay otra subida 4 días después de la seleccionada
- **THEN** la comparación avisa de que hay otra versión dentro de la ventana

#### Scenario: Un fallo dentro de la ventana

- **WHEN** el usuario selecciona un despliegue con éxito y 2 días después hay un release fallido
- **THEN** la comparación no avisa de otra versión dentro de la ventana

#### Scenario: La misma versión, registrada y desplegada

- **WHEN** el usuario selecciona la subida manual 0.0.543 del 3 de noviembre y hay un despliegue con éxito de la 0.0.543 ese día
- **THEN** la comparación no avisa de otra versión dentro de la ventana

#### Scenario: Seleccionar un despliegue fallido

- **WHEN** el usuario selecciona la marca de un release fallido
- **THEN** ve su detalle, sin comparación

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

El panel de una aplicación vinculada MUST ofrecer una vista por horas de los últimos 7 días hasta «datos hasta», en la zona del catálogo. Las horas sin dato MUST cortar la línea. Las subidas manuales MUST marcarse en el día que las registra. Los despliegues MUST marcarse en la hora de su `finishedAt`. La vista por horas MUST ofrecer sus valores, y las marcas de despliegue, también como texto accesible.

#### Scenario: Ver una subida de cerca

- **WHEN** el usuario abre la vista por horas de una aplicación con una subida hace 2 días
- **THEN** ve los recuentos de cada hora alrededor de la subida, con la marca en su día

#### Scenario: Ver un despliegue de cerca

- **WHEN** el usuario abre la vista por horas de una aplicación con un despliegue que terminó hace 2 días a las 01:24 UTC
- **THEN** la marca aparece en esa hora, mostrada en la hora local del usuario

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
