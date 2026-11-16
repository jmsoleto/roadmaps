## MODIFIED Requirements

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

### Requirement: Vista por horas

El panel de una aplicación vinculada MUST ofrecer una vista por horas de los últimos 7 días hasta «datos hasta», en la zona del catálogo. Las horas sin dato MUST cortar la línea. Las subidas manuales MUST marcarse en el día que las registra. Los despliegues MUST marcarse en la hora de su `finishedAt`. La vista por horas MUST ofrecer sus valores, y las marcas de despliegue, también como texto accesible.

#### Scenario: Ver una subida de cerca

- **WHEN** el usuario abre la vista por horas de una aplicación con una subida hace 2 días
- **THEN** ve los recuentos de cada hora alrededor de la subida, con la marca en su día

#### Scenario: Ver un despliegue de cerca

- **WHEN** el usuario abre la vista por horas de una aplicación con un despliegue que terminó hace 2 días a las 01:24 UTC
- **THEN** la marca aparece en esa hora, mostrada en la hora local del usuario

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
