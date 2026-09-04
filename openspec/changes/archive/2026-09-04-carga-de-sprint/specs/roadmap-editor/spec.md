## ADDED Requirements

### Requirement: El fin de una fecha es inclusivo

El sistema MUST tratar la fecha de fin de una fase o de un item como **inclusiva**: el último día nombrado forma parte del trabajo. Una barra que va del lunes al viernes MUST cubrir el viernes entero, y MUST contar el viernes allí donde se cuenten sus días.

Esta convención MUST regir por igual las tres cosas que hoy no se ponen de acuerdo: lo que se pinta, lo que se cuenta y lo que se anuncia al arrastrar. La ayuda emergente del arrastre ya nombra un rango inclusivo; son el pintado y la cuenta los que se alinean con ella.

El sistema MUST aplicar la misma convención en la vista de roadmap y en la vista "Todos". Un mismo item MUST ocupar los mismos días en las dos.

Ninguna fecha guardada cambia por esto. Cambia lo que la aplicación entiende que ocupan las fechas que ya hay, así que los roadmaps existentes MUST verse un día más largos sin que su contenido se haya alterado, y sin que la exportación de un roadmap produzca un documento distinto del que producía antes.

#### Scenario: Una barra cubre su último día

- **WHEN** un item va del lunes al viernes de la misma semana
- **THEN** su barra se extiende hasta el final del viernes, y no hasta el principio

#### Scenario: Las dos vistas coinciden sobre el mismo item

- **WHEN** el usuario mira un item en la vista de roadmap y después el mismo trabajo en la vista "Todos"
- **THEN** ocupa los mismos días en las dos

#### Scenario: Un roadmap existente no se altera al adoptar la convención

- **WHEN** el usuario abre un roadmap creado antes de este cambio
- **THEN** sus barras se muestran un día más largas, sus fechas siguen siendo las mismas, y exportarlo produce las mismas fechas que producía antes

### Requirement: Foco en un sprint

El sistema MUST permitir elegir un sprint desde la cabecera de sprints de la vista de roadmap, y MUST soltarlo al volver a elegir el mismo. Elegir otro sprint MUST trasladar el foco sin pasar por ningún estado intermedio.

Mientras hay un sprint elegido, el sistema MUST recortarlo verticalmente sobre la cuadrícula y **atenuar todo lo demás**: las barras que caen fuera, las demás etiquetas de la cabecera de sprints, la marca del día de hoy cuando el sprint elegido no es el actual, y las filas de la columna de nombres que no tienen nada dentro del sprint. El recorte vertical dice sobre qué fechas está el foco; las filas apagadas dicen quién y qué participa.

Atenuar MUST NOT ser desactivar. El usuario MUST poder seguir arrastrando, estirando, creando y editando cualquier barra, dentro o fuera del sprint elegido, exactamente igual que sin foco. Es un foco visual, no un modo.

Lo atenuado MUST seguir siendo legible. El resto del roadmap es el contexto que hace útil el foco, así que baja de tono sin desaparecer, y su contraste MUST decidirse con los mismos criterios con los que el sistema decide el resto de sus tintas, en todos los temas.

El sprint elegido se identifica por su **número absoluto**, no por su posición en la ventana temporal de un roadmap. La elección MUST sobrevivir a cambiar de roadmap, mostrando en el nuevo el mismo sprint del calendario. La elección MUST NOT persistir entre sesiones ni viajar en la exportación.

Un sprint elegido puede ser además el sprint actual. El sistema MUST distinguir los dos estados: elegido MUST verse distinto de actual, no simplemente más marcado.

#### Scenario: Elegir un sprint

- **WHEN** el usuario pincha la etiqueta de un sprint en la cabecera
- **THEN** el sistema recorta ese sprint sobre la cuadrícula, atenúa el resto del roadmap y abre el panel de carga de ese sprint

#### Scenario: Soltar el sprint

- **WHEN** el usuario vuelve a pinchar la etiqueta del sprint elegido
- **THEN** el sistema retira el foco y el roadmap vuelve a verse entero

#### Scenario: Editar una barra de fuera del sprint

- **WHEN** hay un sprint elegido y el usuario arrastra o estira una barra que cae fuera de él
- **THEN** el sistema cambia sus fechas igual que sin foco, y el foco sigue donde estaba

#### Scenario: Las filas sin trabajo en el sprint se apagan

- **WHEN** una fase y sus items no tienen nada dentro del sprint elegido
- **THEN** el sistema atenúa también sus nombres en la columna, de modo que se ve de un vistazo que no participan

#### Scenario: El sprint elegido no es el actual

- **WHEN** el usuario elige un sprint distinto de aquel en el que cae hoy
- **THEN** el sistema atenúa la marca del día de hoy junto con el resto, y el sprint actual deja de competir con el elegido

#### Scenario: El sprint elegido es además el actual

- **WHEN** el usuario elige el sprint en el que cae hoy
- **THEN** el sistema lo muestra a la vez como elegido y como actual, con dos marcas distinguibles entre sí

#### Scenario: Cambiar de roadmap con un sprint elegido

- **WHEN** el usuario elige un sprint y abre otro roadmap
- **THEN** el segundo roadmap muestra el foco sobre el mismo sprint del calendario, con la carga que le corresponde allí

#### Scenario: La elección no sobrevive a la sesión

- **WHEN** el usuario elige un sprint y recarga la aplicación
- **THEN** el roadmap se abre sin ningún sprint elegido

### Requirement: Carga de un sprint por responsable

El sistema MUST mostrar, para el sprint elegido, un panel con su nombre, sus fechas y sus días laborables, y con el reparto del trabajo entre los responsables.

El reparto se mide en **días laborables de solape**: los días de lunes a viernes en que un item y el sprint coinciden. Un item que cruza el sprint aporta solo la parte que cae dentro. Contar el item entero diría que un desarrollo de ocho semanas ocupa ocho semanas de un sprint de dos.

Laborable MUST significar de lunes a viernes. El sistema MUST NOT descontar días festivos: no hay una fuente fiable de festivos, y los autonómicos y locales harían que la misma cuenta diera resultados distintos por persona. Es una decisión declarada, no una carencia por resolver.

El sprint que se mide MUST ser el sprint **completo** del calendario, aunque la ventana temporal del roadmap solo enseñe una parte de él. Un mismo sprint MUST dar la misma capacidad en todos los roadmaps, sea cual sea la ventana de cada uno.

La capacidad contra la que se compara MUST ser los días laborables del sprint. El sistema MUST avisar cuando un responsable la supera, y MUST ordenar el reparto de más cargado a menos, porque el que se pasa es lo que se ha venido a ver.

Lo que esta medida detecta es el **solape**. Una persona con un solo item que ocupa el sprint entero está llena y es realista; tres items simultáneos de dos semanas suman treinta días en un sprint de diez, y eso es lo que hoy no se ve. El sistema MUST presentar la medida como ocupación de calendario y MUST NOT presentarla como una estimación de esfuerzo: cuánto cuesta de verdad un item es algo que la aplicación no sabe.

El sistema MUST atribuir un item al responsable de su fase cuando el item no tenga uno propio, y el suyo propio MUST prevalecer cuando lo tenga.

El sistema MUST marcar aparte, en su propia entrada y siempre al final, el trabajo del sprint que no tiene responsable ni propio ni heredado. No saber quién hace la mitad de un sprint responde a la pregunta del panel tanto como saber que alguien va sobrecargado.

El sistema MUST listar los items del sprint agrupados por su fase, cada uno con los días que aporta. Los hitos MUST aparecer en la lista y MUST aportar cero días. Un item cuyo solape con el sprint cae entero en fin de semana MUST aparecer igualmente, con cero días.

Los items completados MUST contar en la carga y MUST mostrarse atenuados, junto a un recuento de cuántos de los items del sprint están cerrados. Un sprint pasado se mide igual que uno futuro: el panel sirve para planificar lo que viene y para revisar lo que pasó.

Un item que cae dentro del sprint pero fuera de la ventana temporal visible del roadmap MUST aparecer en el panel, señalado como fuera de la vista. Está en el sprint aunque no esté en pantalla, y omitirlo falsearía la carga.

El panel MUST considerar únicamente los items. Una fase sin items, aunque tenga fechas propias, MUST NOT aportar carga; su responsable sigue contando como responsable heredado de los items que sí tenga.

El panel MUST medir un solo roadmap. La carga de una persona repartida entre varios roadmaps queda fuera de esta capacidad.

El foco del sprint MUST ser independiente del panel de detalle de fase o de item. Abrir el detalle de un item desde el panel de carga MUST NOT retirar el foco del sprint.

#### Scenario: Un item que cruza el sprint aporta solo su parte

- **WHEN** un item de ocho semanas atraviesa el sprint elegido de lado a lado
- **THEN** el panel le atribuye los días laborables del sprint, no los de todo el item

#### Scenario: El fin de semana no cuenta

- **WHEN** un item ocupa dos semanas naturales completas dentro del sprint
- **THEN** el panel le atribuye diez días, no catorce

#### Scenario: El último día del item cuenta

- **WHEN** un item termina el viernes de la segunda semana del sprint
- **THEN** el panel cuenta ese viernes entre sus días

#### Scenario: Alguien con tres items a la vez

- **WHEN** un responsable tiene tres items simultáneos que ocupan el sprint entero
- **THEN** el panel le atribuye treinta días frente a una capacidad de diez y avisa de que la supera

#### Scenario: Alguien lleno pero realista

- **WHEN** un responsable tiene un único item que ocupa el sprint entero
- **THEN** el panel le atribuye los diez días de la capacidad y no avisa de nada

#### Scenario: El más cargado primero

- **WHEN** el panel muestra a varios responsables
- **THEN** los ordena de más días a menos, con el trabajo sin responsable al final

#### Scenario: Un item sin responsable dentro de una fase que sí tiene uno

- **WHEN** un item del sprint no tiene responsable propio y su fase sí
- **THEN** el panel atribuye sus días al responsable de la fase

#### Scenario: El responsable propio manda sobre el de la fase

- **WHEN** un item del sprint tiene un responsable distinto del de su fase
- **THEN** el panel atribuye sus días al del item

#### Scenario: Trabajo sin responsable en ninguna parte

- **WHEN** un item del sprint no tiene responsable propio y su fase tampoco
- **THEN** el panel recoge sus días en una entrada de trabajo sin responsable, situada al final del reparto

#### Scenario: Un hito dentro del sprint

- **WHEN** hay un hito en una fecha dentro del sprint elegido
- **THEN** el panel lo lista entre los items del sprint y le atribuye cero días

#### Scenario: Un sprint ya cerrado

- **WHEN** el usuario elige un sprint cuyos items están completados
- **THEN** el panel muestra su carga igual que la de cualquier otro, con los items atenuados y el recuento de cuántos están cerrados

#### Scenario: Un item fuera de la ventana visible

- **WHEN** un item cae dentro del sprint elegido pero fuera de la ventana temporal del roadmap
- **THEN** el panel lo lista con sus días, señalado como fuera de la vista

#### Scenario: Una fase sin items

- **WHEN** una fase tiene fechas propias y responsable, pero ningún item
- **THEN** el panel no le atribuye carga en ningún sprint

#### Scenario: El mismo sprint en dos roadmaps con ventanas distintas

- **WHEN** el usuario mira el mismo sprint del calendario en dos roadmaps cuyas ventanas temporales lo recortan de forma distinta
- **THEN** el panel declara la misma capacidad en los dos, y solo cambia el trabajo que cada roadmap tiene dentro

#### Scenario: Abrir un item desde el panel de carga

- **WHEN** el usuario pincha un item del panel de carga para ver su detalle
- **THEN** el sistema muestra el detalle del item y mantiene el foco sobre el sprint

## MODIFIED Requirements

### Requirement: Barras del Gantt editables por interacción directa
El sistema MUST permitir crear, mover y redimensionar barras arrastrando en la cuadrícula temporal.

La barra de una fase o de un item MUST cubrir su día de fin, según la convención de fechas inclusivas. En consecuencia, un item MUST poder durar **un solo día**, con inicio y fin en la misma fecha; lo que distingue ese item de un hito es ser o no ser un hito, no la relación entre sus dos fechas.

Al arrastrar el extremo de una barra, el sistema MUST llevarla al día sobre el que está el puntero, y no a la frontera entre días más cercana. Con un fin inclusivo, el día señalado es el día que el usuario está nombrando.

Los items completados MUST quedar excluidos de esta edición: sus fechas no cambian por arrastre ni por redimensión. Ver `completion`, que define el congelamiento y su representación en la barra.

#### Scenario: Crear una barra arrastrando
- **WHEN** el usuario arrastra sobre una fila vacía en el área de cuadrícula
- **THEN** el sistema crea una barra cuyo inicio y fin corresponden al rango arrastrado

#### Scenario: Mover una barra
- **WHEN** el usuario arrastra el cuerpo de una barra
- **THEN** el sistema desplaza inicio y fin conservando la duración

#### Scenario: Redimensionar una barra por un borde
- **WHEN** el usuario arrastra el borde de una barra
- **THEN** el sistema ajusta solo ese extremo de la fecha

#### Scenario: Estirar hasta dejar un item de un día
- **WHEN** el usuario arrastra el borde derecho de la barra de un item hasta el día de su inicio
- **THEN** el sistema deja el item con inicio y fin en esa fecha, y su barra ocupa ese único día

#### Scenario: El borde va al día señalado
- **WHEN** el usuario suelta el borde derecho de una barra sobre un día concreto de la cuadrícula
- **THEN** el fin del item queda en ese día, y la barra lo cubre

#### Scenario: Arrastrar la barra de un item completado
- **WHEN** el usuario arrastra el cuerpo o un borde de la barra de un item completado
- **THEN** el sistema no altera sus fechas

### Requirement: Milestones
El sistema MUST soportar hitos representados como marcadores de fecha única (rombo).

El marcador MUST situarse sobre el día del hito, no sobre la frontera entre ese día y el anterior. Con barras que cubren su día de fin, un marcador anclado a la frontera quedaría medio día a la izquierda de la fecha que anuncia.

#### Scenario: Crear un milestone
- **WHEN** el usuario añade un milestone en una fecha
- **THEN** el sistema lo representa como marcador de un solo día con inicio igual a fin

#### Scenario: El rombo cae sobre su día
- **WHEN** un hito está fechado en un día concreto de la cuadrícula
- **THEN** su marcador aparece centrado sobre ese día, alineado con la columna que le corresponde en la cabecera

### Requirement: Dependencias entre items
El sistema MUST permitir declarar dependencias de un item respecto a otros y representarlas visualmente con flechas.

La flecha MUST salir del borde final de la barra predecesora y llegar al borde inicial de la dependiente. Con un fin inclusivo, ese borde final es el que cierra el último día del predecesor, de modo que la flecha nunca arranca por dentro de la barra de la que sale.

El sistema MUST impedir que un item completado declare una dependencia respecto a un item que no lo esté, ya que un item completado no puede quedar con un predecesor pendiente. Ver `completion`.

#### Scenario: Visualizar una dependencia
- **WHEN** un item declara depender de otro
- **THEN** el sistema dibuja una flecha desde el item predecesor hasta el dependiente

#### Scenario: La flecha sale del final de la barra
- **WHEN** un item depende de otro que termina un viernes
- **THEN** la flecha arranca del borde derecho de la barra del predecesor, después del viernes, y no desde dentro de ella

#### Scenario: Eliminar una dependencia
- **WHEN** el usuario elimina una dependencia existente
- **THEN** el sistema deja de mostrar la flecha y actualiza el modelo del item

#### Scenario: Declarar una dependencia desde un item completado hacia uno pendiente
- **WHEN** el usuario intenta declarar en un item completado una dependencia respecto a un item que no está completado
- **THEN** el sistema no la añade y el item completado conserva sus dependencias tal como estaban

### Requirement: Cabeceras temporales de sprints y trimestres
El sistema MUST mostrar una cabecera de sprints (ventanas de 14 días) en la vista de roadmap y una cabecera de trimestres en la vista meta, resaltando el periodo actual.

Ambas cabeceras MUST permanecer a la vista mientras el usuario recorre la lista en vertical, a cualquier profundidad. Resaltar el periodo actual no sirve de nada si la cabecera desaparece en cuanto la lista es larga.

La cabecera de sprints MUST ser además el sitio desde el que se elige un sprint: cada sprint MUST ofrecerse como un control accionable, alcanzable y operable con teclado además de con puntero, y MUST anunciar su número y sus fechas a quien no ve la pantalla. Ver «Foco en un sprint».

#### Scenario: Sprint actual resaltado
- **WHEN** la fecha de hoy cae dentro de un sprint visible
- **THEN** el sistema resalta ese sprint como actual

#### Scenario: La cabecera acompaña al recorrido vertical
- **WHEN** el usuario recorre la lista hacia abajo hasta el final de un plan largo
- **THEN** la cabecera del periodo sigue a la vista, con el periodo actual resaltado igual que arriba

#### Scenario: Elegir un sprint con el teclado
- **WHEN** el usuario lleva el foco a la etiqueta de un sprint y la activa con el teclado
- **THEN** el sistema elige ese sprint igual que si lo hubiera pinchado, y anuncia que queda elegido
