## ADDED Requirements

### Requirement: El mock se genera y no se guarda

El sistema MUST poder generar, a partir de la definición de los endpoints de un contrato, **datos de ejemplo múltiples y coherentes entre sí** —un mock—, y MUST derivarlo cada vez de la definición vigente.

El sistema MUST persistir de un mock solo sus **ajustes**: la semilla, cuántas entidades, cuántos elementos por página, cuántas variantes, y lo que el usuario haya desmentido de lo inferido. MUST NOT persistir las entidades generadas, ni las páginas, ni el JSON que se muestra.

Un mock guardado sería un dato que envejece contra el árbol que tiene al lado, sin nadie que se entere. Y guardar solo los ajustes es lo que hace cierta la otra mitad de esta capability: **no hay nada almacenado que pueda contradecir a un contrato**, así que un contrato que nunca ha pedido un mock no tiene un mock viejo — no tiene mock.

Un contrato sin ajustes de mock MUST comportarse exactamente como antes de que esto existiera: el ejemplo JSON que muestra el panel MUST ser idéntico, y el documento OpenAPI que emite MUST ser idéntico.

#### Scenario: Un contrato que no ha pedido nunca un mock

- **WHEN** el usuario abre un contrato escrito antes de que existiera el mock
- **THEN** el panel del ejemplo muestra el mismo JSON que mostraba, y el documento OpenAPI exportado es idéntico al que salía

#### Scenario: El mock sigue a la definición

- **WHEN** el usuario cambia el tipo de un campo con el mock a la vista
- **THEN** el mock refleja el cambio, sin que haya que regenerarlo a mano

#### Scenario: Lo que se guarda

- **WHEN** el usuario genera un mock de 45 entidades y recarga la aplicación
- **THEN** el sistema vuelve a producir el mismo mock a partir de la semilla, sin haber guardado ninguna entidad

### Requirement: El mock es estable mientras se edita

El sistema MUST derivar el valor de cada campo de cada entidad de **su coordenada** —la semilla, la colección, el índice de la entidad y la ruta del campo— y MUST NOT derivarlo de una secuencia consumida en el orden en que se recorre el árbol.

Es lo que hace posible que el mock se vea en el panel mientras se escribe. Con una secuencia consumida en orden, añadir un campo desplaza el consumo y **todas las entidades cambian de valor a la vez**: el panel parpadea entero con cada tecla y deja de poder leerse, que es justo para lo que está ahí. Con la coordenada, añadir un campo añade una columna y no toca ninguna otra.

La misma propiedad MUST sostener la coherencia: una entidad MUST valer lo mismo la calcule quien la calcule —en una lista, en un detalle o incrustada en otra entidad— porque su valor **no depende de en qué orden se pidió**. La coherencia referencial deja así de ser un mecanismo que hay que mantener y pasa a ser una propiedad de cómo nace el valor.

El sistema MUST producir el mismo mock para la misma semilla y la misma definición, en cualquier navegador, y MUST permitir pedir otro cambiando la semilla.

#### Scenario: Añadir un campo no mueve lo demás

- **WHEN** el usuario añade un campo a un objeto con el mock a la vista
- **THEN** aparece el campo nuevo en cada entidad y **ningún otro valor cambia**

#### Scenario: Otra semilla, otro mock

- **WHEN** el usuario pide otro mock
- **THEN** el sistema cambia la semilla y todo el mock cambia

#### Scenario: La misma semilla, el mismo mock

- **WHEN** el usuario vuelve a la semilla anterior
- **THEN** el mock es exactamente el que era

### Requirement: Un campo puede declarar de dónde sale su valor

El sistema MUST permitir asignar a un campo escalar una **fuente de valores**, y MUST usarla al generar el mock en lugar del valor que deduce del tipo y del formato.

Una fuente MUST poder ser una **lista** de valores escritos por el usuario, o una **receta**. Las recetas MUST cubrir al menos: un entero en un rango, un decimal en un rango con sus decimales, un texto de una longitud, unos dígitos de una longitud, un booleano con su proporción de cierto, una fecha en un rango, y un patrón donde `#` es un dígito y `A` una letra.

El sistema MUST NOT pedir que se declare de nuevo lo que ya sabe deducir. Un campo con formato `uuid`, `date-time`, `email` o `uri`, o con enumeración, MUST seguir generando valores de esa forma sin necesidad de fuente: lo que una fuente aporta es **variar** dentro de una forma conocida, o traer el vocabulario del dominio, que es lo que ninguna deducción puede dar.

La asignación MUST decir **cómo se consume** la fuente —al azar, en ciclo, o sin repetir—, y ese modo MUST pertenecer a la asignación y no a la fuente: la misma lista de nombres puede querer repetirse en un campo y no repetirse en otro.

Una fuente que no da para todas las entidades MUST avisarse cuando el modo es sin repetir, en lugar de inventar valores.

Cuando un campo **no** tiene fuente asignada, el sistema MUST respetar el `example` que el usuario haya escrito en él, y MUST variar cuando no lo hay: entre los valores de su enumeración si la tiene, y dentro de su tipo y su formato si no. Un `example` escrito es un hecho declarado sobre ese campo, y sobrescribirlo sería cambiar en silencio lo que alguien escribió a mano; un campo sin nada declarado repetido en todas las entidades hace el mock inútil. La consecuencia MUST asumirse: un contrato con ejemplo escrito en cada campo produce un mock sin variación, y la forma de darle variación es asignar fuentes.

La asignación MUST pertenecer al campo, y MUST sobrevivir a que se renombre su clave, a que se reordene entre sus hermanos y a que se duplique el campo.

La fuente asignada MUST NOT llegar al documento OpenAPI. El `example` declarado de un campo sigue siendo lo único que el documento emite como ejemplo; una fuente alimenta el mock y nada más.

#### Scenario: Una lista del dominio

- **WHEN** el usuario asigna al campo `estado` una lista con `pendiente`, `enviado`, `entregado` y `devuelto`
- **THEN** las entidades del mock traen esos valores y no `texto`

#### Scenario: Una receta suelta

- **WHEN** el usuario declara en un campo entero una receta de un entero entre 1 y 10
- **THEN** los valores del mock están en ese rango

#### Scenario: Renombrar la clave no pierde la fuente

- **WHEN** el usuario cambia la clave de un campo que tiene una fuente asignada
- **THEN** el campo conserva su fuente

#### Scenario: La fuente no sale en el documento

- **WHEN** el usuario exporta un contrato con fuentes asignadas
- **THEN** el documento OpenAPI es idéntico al que saldría sin ellas

#### Scenario: Un campo con ejemplo escrito

- **WHEN** el usuario mira el mock de un campo donde escribió el ejemplo `Camisa lino` y no asignó fuente
- **THEN** las entidades traen `Camisa lino`, sin variar

#### Scenario: Un campo sin nada declarado

- **WHEN** el usuario mira el mock de un campo de texto sin ejemplo, sin enumeración y sin fuente
- **THEN** las entidades traen valores distintos entre sí, y no el mismo en todas

#### Scenario: Una enumeración varía

- **WHEN** el usuario mira el mock de un campo cuyos valores admitidos son `alta`, `baja` y `pendiente`
- **THEN** las entidades reparten esos tres valores, en lugar de traer siempre el primero

#### Scenario: Una fuente que se agota

- **WHEN** el usuario asigna sin repetir una lista de 10 valores a un campo de un mock de 45 entidades
- **THEN** el sistema lo avisa, en lugar de rellenar con valores que no están en la lista

### Requirement: Las fuentes guardadas son comunes a todos los contratos

El sistema MUST ofrecer guardar una fuente con nombre, y esas fuentes MUST ser **propias de la aplicación y comunes a todos sus contratos**, no de un contrato en particular. Una receta sin nombre MUST poder vivir en el campo sin guardarse.

Editar una fuente guardada MUST alcanzar a los mocks de todos los contratos que la usan. Es la diferencia deliberada con la biblioteca de modelos, que se trae copiando: allí una copia divergente quedaría **guardada** en dos sitios y sin servidor no hay forma de reconciliarla, mientras que aquí no hay nada guardado que pueda divergir, porque el mock se deriva cada vez. Cambiar una fuente no puede dejar un contrato describiendo algo que no está: solo cambia qué valores enseña.

Borrar una fuente MUST NOT romper ningún contrato. Un campo cuya fuente ya no existe MUST conservar su asignación y MUST generar el valor que generaría sin ella, y el sistema MUST nombrarlo como aviso menor. La asignación no se borra porque la fuente puede volver —de un fichero importado después—, y borrarla sería perder trabajo por el orden en que se abrieron dos cosas.

Un modelo guardado en la biblioteca MUST llevarse las asignaciones de sus campos, y MUST seguir funcionando al traerlo a otro contrato, porque las fuentes no son del contrato.

#### Scenario: Una fuente desde dos contratos

- **WHEN** el usuario guarda una lista de estados y la asigna en dos contratos distintos
- **THEN** los dos mocks usan la misma lista

#### Scenario: Editar la fuente alcanza a los mocks

- **WHEN** el usuario añade un valor a una lista guardada
- **THEN** los mocks que la usan pueden producir ese valor, sin tocar ningún contrato

#### Scenario: Borrar una fuente en uso

- **WHEN** el usuario borra una fuente asignada en un contrato
- **THEN** el contrato sigue intacto, su mock genera valores deducidos del tipo, y el sistema avisa de la asignación que quedó sin fuente

### Requirement: El mock es un dataset del contrato, y los endpoints son vistas de él

El sistema MUST generar las entidades **por colección y por encima de los endpoints**, y MUST hacer que cada endpoint muestre un tramo, un elemento o un filtro de ese dataset, en lugar de generar su cuerpo por su cuenta.

Es lo que hace que el detalle diga lo mismo que la lista, y no una comprobación que haya que añadir después. Generar cada cuerpo por separado produce dos entidades distintas con los mismos campos, que es la incoherencia más visible que puede tener un mock.

El sistema MUST deducir a qué colección pertenece un endpoint de **su ruta**, tomando su último segmento literal: `/clientes`, `/v1/clientes` y `/clientes/{id}` son la misma colección, y `/clientes/{id}/pedidos` es otra. Un segmento de ruta y no un modelo, porque una lista puede ser un array de objetos escritos en línea, sin modelo ninguno.

Un endpoint que no corresponde a ninguna colección MUST generar su cuerpo igualmente, con valores variados, y el sistema MUST decir que ahí no hay colección en lugar de aparentar una.

El sistema MUST usar **un tamaño para todas las colecciones**, y MUST permitir desmentirlo en una colección concreta. Un tamaño único deja las colecciones hijas raquíticas —tantos pedidos como clientes es un pedido por cliente, y un endpoint anidado que nunca tiene página 2—, y subir el número global infla también las listas de arriba.

#### Scenario: El detalle es el de la lista

- **WHEN** el usuario mira el cliente `7` en la lista de `GET /clientes` y luego en `GET /clientes/{id}`
- **THEN** los dos dicen exactamente lo mismo

#### Scenario: Los identificadores no se repiten

- **WHEN** el usuario recorre las tres páginas de una lista de 45 entidades
- **THEN** los 45 identificadores son distintos entre sí

#### Scenario: Un endpoint que no es de ninguna colección

- **WHEN** el usuario mira el mock de `POST /login`
- **THEN** el sistema genera su cuerpo con valores variados y dice que ese endpoint no tiene colección

#### Scenario: Desmentir el tamaño de una colección

- **WHEN** el usuario pone 225 en la colección `pedidos` de un dataset global de 45
- **THEN** hay 45 clientes y 225 pedidos, y el resto de colecciones siguen en 45

### Requirement: La identidad de una entidad la gobierna el dataset

El sistema MUST derivar el identificador de una entidad de **su colección y su índice**, y de nada más. MUST NOT admitir que un campo de identidad tenga una fuente de valores asignada; si la tiene, MUST ignorarla y MUST avisarlo.

No es una restricción de comodidad. Es lo que garantiza que una clave ajena nunca cree una dependencia circular entre dos colecciones: si el identificador depende solo de la colección y el índice, un campo que apunta a otra entidad no necesita ningún **campo** de ella, solo su identidad. Con la identidad sorteada de una fuente, dos colecciones que se referencian mutuamente no tendrían forma de resolverse.

El sistema MUST deducir qué campo es el de identidad del **marcador de la ruta**: `/clientes/{clienteId}` nombra el campo `clienteId`. Cuando la ruta no lo dice, MUST buscar un campo llamado `id`, y cuando no hay ninguno MUST llevar la identidad aparte sin emitirla. MUST permitir desmentir la deducción.

#### Scenario: La ruta nombra la identidad

- **WHEN** el usuario mira el mock de `/clientes/{clienteId}`
- **THEN** el sistema toma `clienteId` como el campo de identidad de la colección

#### Scenario: Una fuente sobre un campo de identidad

- **WHEN** el usuario asigna una lista de valores a un campo que es el de identidad
- **THEN** el sistema genera el identificador igualmente y avisa de que la fuente se ignora

#### Scenario: Dos colecciones que se referencian

- **WHEN** un contrato tiene `Cliente` con un campo que apunta a `Pedido` y `Pedido` con uno que apunta a `Cliente`
- **THEN** el sistema genera el mock sin bloquearse

### Requirement: Un modelo que es la forma de una colección se sortea de ella

Cuando un modelo es la forma de los elementos de una colección, el sistema MUST **elegir una de sus entidades** cada vez que ese modelo aparezca, en lugar de generar una nueva: como cuerpo de un endpoint de detalle, como campo de tipo referencia dentro de otra entidad, o como elementos de un array de ese modelo.

Toda esta herramienta empuja a describir con modelos —extraer bloques, referenciar, la biblioteca—, así que en un contrato bien escrito una relación estará escrita como una referencia y no como un campo de identificador. Sin esta regla, el cliente incrustado en un pedido saldría distinto de los que da la lista de clientes, y esa sería la incoherencia más visible justo en el contrato mejor hecho.

#### Scenario: Una referencia incrustada

- **WHEN** el usuario mira el mock de un `Pedido` con un campo `cliente` que referencia al modelo `Cliente`, forma de la colección `clientes`
- **THEN** el cliente incrustado es uno de los de la lista de clientes, con sus mismos valores

#### Scenario: Un array de un modelo que es colección

- **WHEN** una respuesta declara `array<Cliente>` fuera del endpoint de la lista
- **THEN** sus elementos son entidades de la colección `clientes`

### Requirement: El paginado se infiere y se corrige

El sistema MUST reconocer por su cuenta, en el cuerpo de una respuesta, qué campo lleva los **elementos** y qué campos llevan la página, el tamaño, el total, si hay siguiente, y los enlaces a la siguiente y la anterior; y MUST decir que lo ha inferido.

El sistema MUST permitir **desmentir** cada uno de esos papeles, eligiendo otro campo del cuerpo, y MUST permitir desmentir la inferencia entera declarando que esa respuesta no es paginada. MUST guardar solo lo desmentido, de modo que un contrato que ya existe funcione sin abrirlo.

Es la diferencia entre una propuesta y un formulario. Nadie va a declarar el sobre de paginado de ocho endpoints que lo dicen ya en los nombres de sus campos; y una heurística que no se puede contradecir es una heurística que manda.

El sistema MUST NOT paginar una respuesta cuyo cuerpo es un array desnudo en la raíz: MUST emitirla entera. Y MUST NOT paginar un cuerpo donde se reconocen los elementos pero **ningún** otro papel: sin página, total, siguiente ni enlaces, dos páginas serían indistinguibles entre sí y trocear produciría respuestas que no dicen en cuál estás.

El sistema MUST permitir declarar si la primera página es la `0` o la `1`, porque no se puede deducir del nombre del campo.

#### Scenario: Un sobre reconocido

- **WHEN** el usuario abre una respuesta con `data`, `meta.page`, `meta.size` y `meta.total`
- **THEN** el sistema propone esos cuatro papeles y dice que los ha inferido

#### Scenario: Corregir un papel

- **WHEN** el sistema ha tomado `meta.count` como el total y en realidad el total es `meta.totalElements`
- **THEN** el usuario lo reasigna y el sistema lo conserva

#### Scenario: Una respuesta que no es paginada

- **WHEN** el usuario declara que una respuesta con un campo `items` no es paginada
- **THEN** el sistema deja de trocearla y no vuelve a proponerlo

#### Scenario: Un array desnudo

- **WHEN** una respuesta devuelve un array en la raíz, sin sobre
- **THEN** el sistema emite todos los elementos, sin páginas

#### Scenario: Un sobre sin ningún papel más

- **WHEN** una respuesta tiene un campo con los elementos y ningún campo de página, total ni siguiente
- **THEN** el sistema no la pagina y dice por qué

### Requirement: Las páginas de una lista cuadran entre sí

Cuando una respuesta es paginada, el sistema MUST generar **todas sus páginas de forma coherente**: el total MUST ser el número real de elementos de la colección tras el filtro que aplique el endpoint, la última página MUST traer los que queden, los elementos MUST NOT repetirse ni faltar entre páginas, y si hay siguiente y los enlaces MUST decir la verdad en cada una.

El sistema MUST permitir recorrer esas páginas y ver cada una.

Es el motivo entero por el que esto existe: un total que no cuadra con los elementos es el error que nadie ve al escribirlo a mano y que aparece cuando el frontend ya está montado.

El sistema MUST poder generar además la **página vacía** —una lista sin ningún elemento y su total a cero— como algo que se pide a propósito. Es el caso más útil para quien monta una pantalla y el que nadie escribe a mano.

#### Scenario: La última página es parcial

- **WHEN** el usuario recorre un mock de 45 elementos con 20 por página
- **THEN** las dos primeras traen 20, la tercera trae 5, y las tres dicen que el total es 45

#### Scenario: Si hay siguiente, se dice bien

- **WHEN** el usuario mira la última página de una lista paginada
- **THEN** el campo de «hay siguiente» dice que no, y el enlace a la siguiente no aparece

#### Scenario: Nada se repite entre páginas

- **WHEN** el usuario recorre todas las páginas de una lista
- **THEN** cada elemento aparece exactamente una vez

#### Scenario: La lista vacía

- **WHEN** el usuario pide el mock de una lista vacía
- **THEN** el sistema emite el sobre con cero elementos y el total a cero, con la misma forma que el resto

### Requirement: La relación entre dos colecciones se infiere y se corrige

El sistema MUST reconocer que un endpoint anidado devuelve **los hijos de un padre** y MUST filtrar por él. La señal MUST leerse primero de la propia ruta —`/clientes/{id}/pedidos` dice que son los pedidos de ese cliente— y, cuando la ruta no lo dice, del nombre de un campo del hijo que apunte a la identidad del padre, o de un campo de tipo referencia al modelo que es la forma del padre.

El sistema MUST decir que lo ha inferido y MUST permitir desmentirlo: reasignar el campo que sostiene la relación, o declarar que ese endpoint no filtra por su padre.

El total de la respuesta MUST ser el de **lo filtrado**, no el de la colección entera.

El sistema MUST repartir los hijos entre los padres de forma que, **cuando haya al menos tantos hijos como padres, ningún padre se quede sin ninguno**, y de forma que las cuentas no sean iguales para todos. Un reparto puramente al azar deja a una parte de los padres a cero y rompe por sorteo la comprobación que se está haciendo delante de alguien; un reparto perfectamente igual no se parece a ningún dato real.

El sistema MUST mostrar **de qué padre** son los hijos que está enseñando, y MUST poder pasar de un padre a otro. El padre MUST tomarse del ejemplo declarado en el parámetro de la ruta cuando lo hay, que es un campo que el contrato ya tiene, y del primero cuando no.

#### Scenario: Los hijos son del padre

- **WHEN** el usuario mira el mock de `GET /clientes/{id}/pedidos` con el ejemplo `7` en el parámetro
- **THEN** todos los pedidos que salen apuntan al cliente `7`, y el total es el de esos y no el de todos los pedidos

#### Scenario: Ningún padre se queda sin hijos

- **WHEN** el usuario tiene 45 clientes y 225 pedidos
- **THEN** cada cliente tiene al menos un pedido, y no todos tienen los mismos

#### Scenario: Cambiar de padre

- **WHEN** el usuario pasa al padre siguiente en el panel
- **THEN** ve los hijos de ese otro padre, con su propio total

#### Scenario: Desmentir la relación

- **WHEN** el usuario declara que un endpoint anidado no filtra por su padre
- **THEN** el sistema emite la colección hija completa

### Requirement: El mock honra la ruta y no adivina la consulta

El sistema MUST honrar los parámetros de **path** de un endpoint: el que identifica una entidad y el que nombra al padre de una relación.

El sistema MUST honrar los parámetros de **query** que tengan papel de paginado, es decir la página y el tamaño.

El sistema MUST NOT honrar ningún otro parámetro de query —los que filtran, ordenan o buscan—, y MUST decirlo cuando el endpoint los declara, en lugar de emitir un cuerpo que parece filtrado y no lo está.

La asimetría no es arbitraria: **se honra lo que tiene papel declarado o confirmado, y se ignora lo que no**. La ruta declara su significado y los papeles de paginado se confirman en pantalla; nadie declara que un parámetro llamado `estado` filtre por el campo `estado`, y adivinarlo es la clase de conjetura que se equivoca sin avisar.

#### Scenario: Un filtro declarado que no se aplica

- **WHEN** un endpoint declara un parámetro de query `estado` y el usuario mira su mock
- **THEN** el sistema emite la colección sin filtrar y dice que ese parámetro no se tiene en cuenta

#### Scenario: La página pedida

- **WHEN** un endpoint declara un parámetro de query con papel de página
- **THEN** el mock enseña la página que ese parámetro indica

### Requirement: Un endpoint de escritura devuelve lo que se le mandó

Cuando un endpoint escribe sobre una colección, el sistema MUST generar el cuerpo de la petición y el de la respuesta **como la misma entidad**: los campos que están en los dos MUST traer el mismo valor, y los que solo están en la respuesta —el identificador, la fecha de creación— MUST aparecer solo ahí.

Es lo que nadie escribe a mano, porque obliga a copiar valores entre dos árboles, y es donde la incoherencia se ve antes: una petición que crea a Lucía y una respuesta que devuelve a Marcos.

La entidad de una creación MUST ser **nueva**, y no una de las que ya da la lista.

#### Scenario: Crear y devolver

- **WHEN** el usuario mira el mock de `POST /clientes` con un cuerpo de petición y una respuesta `201`
- **THEN** los campos comunes traen el mismo valor en los dos, y el identificador aparece solo en la respuesta

#### Scenario: La entidad creada es nueva

- **WHEN** el usuario compara el cliente que devuelve `POST /clientes` con los de la lista
- **THEN** no es ninguno de ellos

### Requirement: El mock se ve junto al ejemplo mientras se edita

El sistema MUST mostrar el mock en el mismo panel que el ejemplo JSON, con un control que pase de uno al otro, y MUST mantenerlo al día con cada cambio de la definición.

En el ejemplo MUST verse exactamente lo que se veía antes de que el mock existiera. Ese control es la promesa de no afectar a lo existente hecha visible: se comprueba mirándola.

El sistema MUST permitir recorrer lo que hay varias veces: las **páginas** cuando la respuesta es paginada, y las **variantes** cuando el cuerpo no es una lista. MUST decir en cada momento en cuál se está y cuántas hay.

El sistema MUST mostrar junto al mock lo que ha inferido —la colección, el sobre de paginado y la relación—, marcado como inferido, y MUST ofrecer corregirlo ahí mismo. Esos bloques MUST nacer plegados: el panel ya compite por el ancho con el árbol, que es la razón por la que el panel entero puede ocultarse.

El sistema MUST mostrar la semilla y MUST ofrecer cambiarla desde el panel.

#### Scenario: Pasar del ejemplo al mock

- **WHEN** el usuario pasa al mock y vuelve al ejemplo
- **THEN** el ejemplo es el mismo que era, campo por campo

#### Scenario: Recorrer las páginas delante de alguien

- **WHEN** el usuario pasa a la última página de una lista de 45 con 20 por página
- **THEN** ve 5 elementos y que no hay siguiente, sin salir del panel

#### Scenario: Variantes de un cuerpo que no es lista

- **WHEN** el usuario mira el mock de una respuesta que no es una lista
- **THEN** puede recorrer varias variantes de ese cuerpo, y el panel dice cuál de cuántas está viendo

#### Scenario: Corregir lo inferido desde el panel

- **WHEN** el usuario despliega el bloque del paginado y reasigna el campo del total
- **THEN** el mock se rehace con esa corrección, sin salir del panel

### Requirement: El mock sale por las salidas del contrato

El sistema MUST poder emitir el mock como una salida más del contrato, copiable al portapapeles y descargable como fichero, con las mismas reglas que las demás salidas.

Lo que se ve en el panel tiene que poder llevarse entero: el panel sirve para acordarlo, y el fichero para dárselo a quien lo va a implementar o pegárselo a un agente.

El sistema MUST identificar cada cuerpo por lo que es, incluida la página o la variante de la que se trata.

#### Scenario: Copiar el mock

- **WHEN** el usuario copia el mock de un endpoint paginado de tres páginas
- **THEN** el sistema pone las tres en el portapapeles, cada una identificada por su página, y lo confirma

#### Scenario: Descargar el mock

- **WHEN** el usuario descarga el mock
- **THEN** el sistema entrega un fichero con un nombre y una extensión acordes a lo que es

### Requirement: El mock no cambia el documento OpenAPI

El sistema MUST emitir el documento OpenAPI **sin ninguna huella del mock**: ni la semilla, ni los tamaños, ni las fuentes asignadas, ni los papeles de paginado, ni las relaciones inferidas o corregidas.

El `example` declarado en un campo MUST seguir siendo lo único que el documento emite como ejemplo de ese campo.

El contrato es lo que se acuerda y lo que se entrega; el mock es una lectura del contrato. Si la lectura se cuela en la entrega, dos personas con el mismo acuerdo exportan documentos distintos según qué mock tuvieran configurado.

#### Scenario: El documento es el mismo

- **WHEN** el usuario configura un mock completo —semilla, tamaños, fuentes y correcciones— y exporta el contrato
- **THEN** el documento OpenAPI es byte a byte el que salía antes de configurar nada

### Requirement: El contrato avisa de lo que el mock tiene roto

El sistema MUST nombrar, entre las comprobaciones del contrato y como avisos **menores**, lo que impide que un mock signifique lo que parece: una fuente asignada que ya no existe, un papel de paginado corregido que apunta a un campo que se ha borrado, una relación corregida cuyo padre ya no es una colección, y una fuente asignada a un campo cuyo valor gobiernan el dataset o la aritmética.

Menores y no errores: ninguna de esas cosas hace inválido el contrato ni el documento que se entrega. Pero ninguna se ve hasta que alguien mira un mock y no entiende por qué no dice lo que esperaba, que es el mismo motivo por el que una referencia rota se avisa antes de exportar.

#### Scenario: Una asignación sin fuente

- **WHEN** el usuario comprueba un contrato con un campo asignado a una fuente que se borró
- **THEN** el sistema lo nombra como aviso menor, distinto de una referencia rota

#### Scenario: Un papel sobre un campo que ya no está

- **WHEN** el usuario borra el campo que había marcado como el total de una respuesta paginada
- **THEN** el sistema lo avisa, y el mock deja de emitir ese papel en lugar de emitir un campo que no existe
