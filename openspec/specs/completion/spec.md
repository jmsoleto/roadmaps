# completion

## Purpose

Completitud de los items: marcarlos como terminados con su fecha, el orden que las dependencias imponen para hacerlo, el congelamiento temporal de lo ya cerrado, la línea base contra la que se mide la desviación, y cómo todo ello se lee en la parrilla del Gantt.

Cubre tres cosas que se sostienen entre sí. **La regla de orden**: un item no se completa mientras un predecesor (`dependsOn`, ver `roadmap-editor`) siga abierto. **El congelamiento**: lo completado no cambia de fechas por ninguna vía. Y la primera es lo que hace coherente la segunda — si los predecesores de un completado están completados, y por tanto congelados, el desplazamiento automático de dependencias nunca necesita empujarlo.

**Las dos desviaciones** son la tercera. Una contra la línea base del plan comprometido, otra contra el fin previsto que el item tenía al cerrarse. La segunda sola no mide nada útil, porque quien va tarde arrastra la barra antes de marcar y sale cero; la diferencia entre ambas es exactamente cuánto se movió el plan, que es lo que separa ejecutar mal de planificar mal.

Distinto de `blockers`, que registra lo que se espera de fuera: una dependencia externa sin resolver **no** impide completar un item. La regla de orden se establece sobre el trabajo propio, no sobre lo que deben terceros.

## Requirements
### Requirement: Marcar y desmarcar un item como completado

El sistema MUST permitir marcar un item como completado y volver a desmarcarlo. Un item recién creado MUST nacer sin completar.

El estado de completitud MUST estar representado por una única fecha de completitud, cuya ausencia significa "sin completar": el sistema MUST NOT admitir un item completado sin fecha ni una fecha de completitud en un item sin completar.

La fecha de completitud MUST proponerse por defecto como el día de hoy y MUST poder corregirse a un día anterior, porque el trabajo se marca terminado después de terminarlo. El sistema MUST NOT aceptar una fecha de completitud posterior al día de hoy.

Marcar y desmarcar MUST estar disponibles en el detalle del item, no en su barra de la parrilla, porque desmarcar arrastra consecuencias que necesitan confirmación.

#### Scenario: Marcar un item como completado

- **WHEN** el usuario marca como completado un item cuyos predecesores están todos completados
- **THEN** el sistema registra la fecha de completitud propuesta y el item pasa a estar completado

#### Scenario: Un item nuevo nace sin completar

- **WHEN** el usuario crea un item o un hito, por cualquiera de las vías de alta
- **THEN** el sistema lo crea sin completar y sin fecha de completitud

#### Scenario: Corregir la fecha de completitud hacia atrás

- **WHEN** el usuario marca como completado un item y fija como fecha de completitud un día anterior a hoy
- **THEN** el sistema registra esa fecha y calcula las desviaciones a partir de ella

#### Scenario: Fecha de completitud en el futuro

- **WHEN** el usuario intenta fijar como fecha de completitud un día posterior a hoy
- **THEN** el sistema no la acepta y el item conserva el estado que tuviera

#### Scenario: Desmarcar un item sin dependientes completados

- **WHEN** el usuario desmarca un item completado que no tiene dependientes completados
- **THEN** el sistema retira su fecha de completitud y el item vuelve a estar sin completar y a ser editable en el tiempo

### Requirement: Las dependencias imponen el orden en que se completa

El sistema MUST impedir que un item se marque como completado mientras alguno de los items de los que depende (`dependsOn`) siga sin completar, e indicar cuáles son los que faltan.

Un item sin dependencias MUST poder completarse siempre. Esta regla MUST aplicarse igual a los items con duración y a los hitos.

Las dependencias externas (`blockers`) MUST NOT condicionar la completitud: un item con dependencias externas sin resolver MUST poder marcarse como completado. La regla de orden se establece sobre `dependsOn`, que describe el trabajo propio, y no sobre lo que se espera de terceros.

#### Scenario: Completar un item con predecesores pendientes

- **WHEN** el usuario intenta marcar como completado un item que depende de otro que no está completado
- **THEN** el sistema no lo completa e indica qué predecesores faltan por completar

#### Scenario: Completar un item cuyos predecesores están completados

- **WHEN** el usuario marca como completado un item cuyos predecesores están todos completados
- **THEN** el sistema lo completa

#### Scenario: Completar un item sin dependencias

- **WHEN** el usuario marca como completado un item que no depende de ningún otro
- **THEN** el sistema lo completa

#### Scenario: Completar un item con dependencias externas sin resolver

- **WHEN** el usuario marca como completado un item que tiene dependencias externas sin resolver y cuyos predecesores están completados
- **THEN** el sistema lo completa y conserva intactas sus dependencias externas y su estado de resolución

#### Scenario: Declarar una dependencia nueva sobre un item completado

- **WHEN** el usuario intenta declarar en un item completado una dependencia respecto a un item que no está completado
- **THEN** el sistema no la añade, para no dejar el item completado con un predecesor pendiente

### Requirement: Descompletar arrastra a los dependientes

El sistema MUST desmarcar en cascada, al desmarcar un item completado, todos los items que dependen de él directa o indirectamente y estén completados, porque un item completado no puede quedar con un predecesor sin completar.

Antes de ejecutar la cascada el sistema MUST confirmarla indicando a cuántos items afecta, ya que cada item alcanzado pierde su fecha de completitud y con ella su desviación medida, y la aplicación no ofrece deshacer.

La cascada MUST retirar de cada item alcanzado su fecha de completitud y el fin previsto que guardó al completarse, y MUST NOT alterar su línea base, que pertenece al plan y no a la completitud.

#### Scenario: Desmarcar un item con dependientes completados

- **WHEN** el usuario desmarca un item completado del que depende otro item también completado
- **THEN** el sistema desmarca ambos y los dos vuelven a ser editables en el tiempo

#### Scenario: Confirmación con el alcance de la cascada

- **WHEN** el usuario pide desmarcar un item completado del que dependen, directa o indirectamente, otros items completados
- **THEN** el sistema pide confirmación indicando a cuántos items afecta antes de desmarcar ninguno

#### Scenario: Cancelar la cascada

- **WHEN** el usuario no confirma la cascada
- **THEN** el sistema no desmarca ningún item y todos conservan su fecha de completitud

#### Scenario: La cascada respeta la línea base

- **WHEN** el sistema desmarca en cascada items que tenían línea base
- **THEN** cada item conserva su línea base y pierde solo su fecha de completitud y su fin previsto al completarse

### Requirement: Los items completados quedan congelados en el tiempo

El sistema MUST impedir que las fechas de un item completado cambien por ninguna vía: ni arrastrando ni redimensionando su barra, ni convirtiéndolo en hito o dejando de serlo, ni por el desplazamiento automático que aplican las dependencias.

El congelamiento MUST alcanzar solo a las fechas. El usuario MUST poder seguir renombrando el item, cambiando su responsable, su color y sus notas, y gestionando sus dependencias externas.

El sistema MUST hacer visible el congelamiento en la propia barra retirando el asa de arrastre, de modo que no se descubra al intentar arrastrar y no ocurrir nada.

#### Scenario: Arrastrar un item completado

- **WHEN** el usuario arrastra la barra de un item completado
- **THEN** el sistema no altera sus fechas

#### Scenario: Redimensionar un item completado

- **WHEN** el usuario arrastra un borde de la barra de un item completado
- **THEN** el sistema no altera sus fechas

#### Scenario: Convertir en hito un item completado

- **WHEN** el usuario intenta convertir en hito un item completado, o convertir en item con duración un hito completado
- **THEN** el sistema no lo hace y las fechas del item quedan como estaban

#### Scenario: El desplazamiento automático no mueve lo completado

- **WHEN** el desplazamiento automático de dependencias se aplica sobre un roadmap que contiene items completados
- **THEN** el sistema no desplaza las fechas de ningún item completado

#### Scenario: Editar lo que no son fechas de un item completado

- **WHEN** el usuario renombra un item completado, le cambia el responsable, el color o las notas, o le asigna una dependencia externa
- **THEN** el sistema aplica el cambio con normalidad

### Requirement: Línea base del plan de un roadmap

El sistema MUST ofrecer, por roadmap, una acción explícita de fijar el plan que copie el fin planificado de cada uno de sus items a la línea base de ese item y registre la fecha en que se fijó.

La acción MUST poder repetirse, y al repetirla el sistema MUST advertir de que la desviación acumulada que se venía midiendo se reinicia.

Los items creados después de fijar el plan MUST quedarse sin línea base, y el sistema MUST señalarlos como añadidos después del plan en lugar de atribuirles una: un item que no estaba cuando se comprometió el plan es alcance añadido, y eso es información sobre por qué el plan se desvía.

Un roadmap sin plan fijado MUST poder usarse con normalidad, y el sistema MUST advertirlo allí donde se muestre la completitud, porque sin línea base la desviación acumulada no se puede medir.

#### Scenario: Fijar el plan de un roadmap

- **WHEN** el usuario fija el plan del roadmap activo
- **THEN** el sistema copia el fin planificado de cada item a su línea base y registra la fecha de fijación del roadmap

#### Scenario: Fijar el plan no altera las fechas

- **WHEN** el usuario fija el plan de un roadmap
- **THEN** ningún item cambia de fechas, de estado ni de posición en la parrilla

#### Scenario: Refijar el plan

- **WHEN** el usuario vuelve a fijar el plan de un roadmap que ya lo tenía fijado
- **THEN** el sistema advierte de que la desviación acumulada se reinicia y, al confirmar, sustituye la línea base de cada item por su fin planificado actual

#### Scenario: Item creado después de fijar el plan

- **WHEN** el usuario crea un item en un roadmap cuyo plan ya estaba fijado
- **THEN** el sistema lo crea sin línea base y lo señala como añadido después del plan

#### Scenario: Completitud en un roadmap sin plan fijado

- **WHEN** el usuario completa items en un roadmap cuyo plan nunca se ha fijado
- **THEN** el sistema los completa con normalidad y advierte de que sin plan fijado no se mide la desviación acumulada

### Requirement: Desviación respecto al plan y respecto a la última previsión

Al marcar un item como completado, el sistema MUST guardar el fin planificado que el item tenía en ese instante, de forma que los arrastres posteriores no puedan reescribirlo.

El sistema MUST mostrar, para cada item completado, dos desviaciones en días naturales y con signo, donde el signo negativo significa terminado antes de lo previsto:

- la **desviación acumulada**, entre la fecha de completitud y la línea base del item;
- la **desviación de la última previsión**, entre la fecha de completitud y el fin planificado guardado al completarse.

Un item sin línea base MUST mostrar solo la segunda, indicando que la primera no existe en lugar de mostrarla como cero.

#### Scenario: Item completado más tarde de lo planificado

- **WHEN** el usuario completa un item con línea base en una fecha posterior a esa línea base
- **THEN** el sistema muestra una desviación acumulada positiva igual a los días naturales transcurridos entre ambas

#### Scenario: Item completado antes de lo planificado

- **WHEN** el usuario completa un item con línea base en una fecha anterior a esa línea base
- **THEN** el sistema muestra una desviación acumulada negativa

#### Scenario: Plan movido y luego cumplido

- **WHEN** el usuario arrastra el fin de un item más allá de su línea base y después lo completa en esa nueva fecha
- **THEN** el sistema muestra una desviación acumulada positiva y una desviación de la última previsión de cero días

#### Scenario: Arrastrar después de completar no cambia lo medido

- **WHEN** un item ya está completado
- **THEN** ninguna edición posterior del roadmap altera el fin planificado que guardó al completarse ni sus desviaciones

#### Scenario: Item sin línea base

- **WHEN** el usuario completa un item creado después de fijar el plan, o en un roadmap sin plan fijado
- **THEN** el sistema muestra solo la desviación de la última previsión e indica que el item no tiene línea base

### Requirement: Porcentaje de completitud por fase

El sistema MUST mostrar en cada fase su porcentaje de completitud, calculado como la proporción de items completados sobre el total de items de la fase, contando cada item una vez con independencia de su duración.

Los hitos MUST contar como un item más, en igualdad con los items con duración.

Una fase sin items MUST NOT mostrar porcentaje, en lugar de mostrar cero por ciento.

El porcentaje MUST mostrarse junto al nombre de la fase, no sobre su barra agregada.

#### Scenario: Fase con la mitad de sus items completados

- **WHEN** una fase contiene cuatro items y dos de ellos están completados
- **THEN** el sistema muestra un cincuenta por ciento en esa fase

#### Scenario: Fase con todos sus items completados

- **WHEN** todos los items de una fase están completados
- **THEN** el sistema muestra un cien por cien en esa fase

#### Scenario: Los hitos cuentan igual que los items

- **WHEN** una fase contiene un item con duración completado y un hito sin completar
- **THEN** el sistema muestra un cincuenta por ciento, sin ponderar por la duración de ninguno de los dos

#### Scenario: Fase vacía

- **WHEN** una fase no contiene ningún item
- **THEN** el sistema no muestra porcentaje en esa fase

#### Scenario: El porcentaje sigue a la completitud

- **WHEN** el usuario marca o desmarca como completado un item de una fase
- **THEN** el sistema actualiza el porcentaje de esa fase

### Requirement: Representación de la completitud en la parrilla

El sistema MUST distinguir en la parrilla los items completados de los que no lo están, sustituyendo el asa de arrastre de la barra por una marca de verificación en la misma posición y al mismo tamaño, de forma que la señal de completitud y la retirada de la afordancia de arrastre sean el mismo gesto visual.

La marca MUST aparecer también en los hitos completados, dibujada dentro de su rombo, ya que un hito no tiene asa que sustituir.

La marca MUST dibujarse con la tinta que el sistema ya calcula para cada barra, de modo que contraste sobre cualquier posición de la paleta y en cualquier tema sin requerir tokens de tema nuevos.

La marca MUST NOT ser interactiva: es indicación de estado, y marcar o desmarcar viven en el detalle del item.

Un item completado MUST conservar la señal de sus dependencias externas si las tiene, porque estar cerrado y haber estado esperando algo de fuera son hechos distintos y compatibles.

#### Scenario: Item completado en la parrilla

- **WHEN** un item está completado
- **THEN** el sistema dibuja una marca de verificación donde estaba su asa de arrastre, y el asa deja de estar disponible

#### Scenario: Hito completado en la parrilla

- **WHEN** un hito está completado
- **THEN** el sistema dibuja la marca de verificación dentro de su rombo y el rombo deja de ofrecer arrastre

#### Scenario: Contraste de la marca sobre cualquier color

- **WHEN** un item completado ocupa una posición de la paleta cuyo color es muy claro o muy oscuro
- **THEN** el sistema dibuja la marca con una tinta que contrasta con ese color, en cualquier tema

#### Scenario: Item completado con dependencias externas

- **WHEN** un item completado tiene dependencias externas asignadas
- **THEN** el sistema muestra a la vez la marca de completitud y las señales de dependencia externa que correspondan a su estado

#### Scenario: La marca no actúa al pulsarla

- **WHEN** el usuario pulsa la marca de verificación de un item completado
- **THEN** el sistema no desmarca el item

