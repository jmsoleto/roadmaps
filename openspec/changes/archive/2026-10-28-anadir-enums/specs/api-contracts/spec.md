## MODIFIED Requirements

### Requirement: El árbol de campos

El sistema MUST describir el cuerpo de una petición o de una respuesta como un árbol de campos. Un campo MUST tener clave, tipo, comentario, ejemplo y obligatoriedad; y según su tipo, formato, enumeración y si admite nulo.

Los tipos MUST ser `string`, `enum`, `number`, `integer`, `boolean`, `object`, `array`, `null` y **referencia a un modelo**. Un `array` MUST declarar además qué contiene —un escalar, un objeto o un modelo—, y MUST NOT poder contener otro array: es un caso raro en un contrato real que duplicaría la forma de cada campo sin aportar a la conversación.

Hay tipos cuya declaración **no está completa con el nombre del tipo**: un `array` tiene que decir qué contiene, una referencia a qué modelo apunta, y un `enum` qué valores admite. Esa segunda mitad MUST declararse en la propia fila del campo, junto al selector de tipo. Es la misma regla que ya protege al comentario y a la obligatoriedad: lo que se decide en cada fila no se esconde tras un gesto, porque quien no sabe que está ahí no lo busca.

En un campo `enum`, el **ejemplo** MUST declararse en las opciones avanzadas y no en la fila. No caben los dos sin estrechar el comentario hasta dejarlo sin sitio para escribir, y de los dos es el ejemplo el que menos dice cuando la lista está delante: el ejemplo de una enumeración es uno de sus valores admitidos, y la lista entera está al lado. El sistema MUST enseñar ahí qué valor saldría si nadie escribe ninguno.

El sistema MUST permitir añadir y borrar campos, y plegar y desplegar los que tienen hijos. El estado de plegado MUST persistir con el contrato: forma parte de cómo se dejó el trabajo.

**El comentario es el motivo de la herramienta**, no un adorno: es lo que se dice en voz alta al lado de un campo y lo que acaba siendo la documentación que lee quien implementa. El sistema MUST darle sitio en la propia fila del campo, no escondido tras una opción avanzada. Ningún control que llegue a la fila MUST dejarlo sin sitio para escribir.

**Escribir** en un campo MUST NOT mover el foco. La única excepción es deliberada y está pedida por el usuario: pulsar Enter en la clave encadena un campo nuevo y le lleva el foco, según define «Encadenar campos y parámetros con Enter». La diferencia importa: teclear no reorganiza nada, y una tecla concreta sí.

#### Scenario: Añadir un campo a un objeto

- **WHEN** el usuario añade un campo a un objeto
- **THEN** el sistema crea un campo de texto con una clave que no choca con las de sus hermanos

#### Scenario: Escribir no reorganiza el árbol

- **WHEN** el usuario escribe en la clave, el ejemplo o el comentario de un campo
- **THEN** el árbol no se reconstruye y el foco no salta a otro sitio

#### Scenario: El comentario es documentación

- **WHEN** el usuario escribe «Total de elementos, no de páginas» en el comentario de un campo
- **THEN** el sistema lo conserva como la documentación de ese campo

#### Scenario: El plegado sobrevive

- **WHEN** el usuario pliega una rama del árbol y vuelve más tarde al contrato
- **THEN** esa rama sigue plegada

#### Scenario: Un campo que apunta a un modelo

- **WHEN** el usuario elige el tipo referencia en un campo
- **THEN** el sistema le deja elegir a qué modelo del contrato apunta

#### Scenario: Un campo enumerado declara sus valores en la fila

- **WHEN** el usuario elige el tipo `enum` en un campo
- **THEN** el sistema le deja escribir los valores que admite en la propia fila del campo, sin abrir ninguna opción avanzada

#### Scenario: El comentario sigue teniendo sitio

- **WHEN** el usuario mira la fila de un campo `enum` con sus valores escritos
- **THEN** la caja del comentario sigue siendo suficiente para leer y escribir en ella

#### Scenario: El ejemplo de una enumeración está en las opciones avanzadas

- **WHEN** el usuario despliega las opciones de un campo `enum` cuyos valores son `alta` y `baja`
- **THEN** encuentra ahí el ejemplo, que anuncia `alta` como el valor que saldría si no escribe ninguno

### Requirement: Formatos y enumeraciones de un campo escalar

El sistema MUST permitir marcar en un campo escalar su formato, y MUST ofrecer la enumeración como **un tipo de campo** y no como una marca escondida.

Los formatos MUST incluir los cinco que se reconocen al pegar un JSON —`date-time`, `date`, `uuid`, `email`, `uri`— y además `password`, `byte`, `int64` y `float`, que nadie infiere y solo se eligen a mano. Ninguno MUST ser obligatorio.

**La enumeración es un tipo.** El tipo `enum` MUST ofrecerse en la lista de tipos de un campo, y MUST aparecer junto a `string`, no al final de la lista. Es lo que decide si se encuentra: `string` es el tipo con el que nace todo campo, así que es donde ya está puesta la vista de quien declara un campo mientras alguien habla. Un tipo que resuelve «no sabía que esto se podía decir» y se coloca donde nadie mira no resuelve nada.

La lista de valores MUST escribirse como texto separado por comas, y el sistema MUST ignorar los espacios sobrantes y las entradas vacías.

**El tipo base de la enumeración se deduce de los valores escritos**, y el sistema MUST NOT pedir que se declare. Una enumeración MUST tratarse como numérica cuando *todos* sus valores sobreviven el ida y vuelta exacto a número, y como de texto en cuanto uno no lo hace. Esto es lo que protege los códigos con ceros delante, los prefijos y los decimales con cero final: entregar `1` donde alguien acordó `01` sería cambiar en silencio el valor acordado, y es peor que pedir un clic.

El tipo deducido MUST ser **el mismo** en los tres sitios donde la enumeración se ve: el documento OpenAPI, el ejemplo JSON y el mock. Que el documento prometa números y el mock entregue texto es un contrato que se contradice a sí mismo.

**Una enumeración sin valores MUST NOT inventarlos.** Un campo `enum` recién declarado nace sin ningún valor, el sistema MUST NOT rellenarlo con uno de muestra, y el documento MUST NOT emitir ninguna lista de valores admitidos por él. Un valor de relleno saldría entregado como un valor que alguien admitió, y nadie lo admitió. Que el campo quedó a medias lo dice el validador, según «El contrato se comprueba antes de entregarlo».

**Un contrato escrito antes de que la enumeración fuera un tipo MUST abrirse como lo que dice.** Un campo escalar que traiga valores admitidos MUST leerse como un campo `enum`, con esos valores y con su tipo base deducido de ellos. Ninguno de sus datos MUST perderse ni reescribirse para conseguirlo.

#### Scenario: Una enumeración

- **WHEN** el usuario escribe `alta, baja , pendiente,` como valores admitidos de un campo `enum`
- **THEN** el sistema registra tres valores, sin espacios sobrantes ni una cuarta entrada vacía

#### Scenario: Una enumeración numérica sale como números

- **WHEN** el usuario declara un campo `enum` con los valores `1, 2, 3`
- **THEN** el documento OpenAPI los emite como números, y el ejemplo y el mock también

#### Scenario: Un código con cero delante sigue siendo texto

- **WHEN** el usuario declara un campo `enum` con los valores `01, 02, 03`
- **THEN** el sistema los trata como texto y los entrega tal como se escribieron, sin convertir `01` en `1`

#### Scenario: Un decimal con cero final sigue siendo texto

- **WHEN** el usuario declara un campo `enum` con los valores `1.50, 2.00`
- **THEN** el sistema los trata como texto, porque convertirlos perdería el cero que alguien escribió

#### Scenario: Una enumeración vacía no inventa un valor

- **WHEN** el usuario cambia un campo a tipo `enum` y todavía no ha escrito ningún valor
- **THEN** el campo queda editable sin ningún valor puesto, y el documento no declara ninguna lista de valores admitidos para él

#### Scenario: El ejemplo de una enumeración es uno de sus valores

- **WHEN** el usuario declara un campo `enum` con los valores `alta, baja` y no escribe ningún ejemplo
- **THEN** el ejemplo de ese campo es `alta`, y no un valor ajeno a la lista

#### Scenario: Un ejemplo escrito a mano manda

- **WHEN** el usuario declara un campo `enum` con los valores `alta, baja` y escribe `baja` como ejemplo en las opciones avanzadas
- **THEN** el ejemplo de ese campo es `baja`, y no el primero de la lista

#### Scenario: Un contrato de antes se abre como enumeración

- **WHEN** el usuario abre un contrato guardado antes de este cambio, con un campo de texto que tenía `alta, baja` como valores admitidos
- **THEN** ese campo aparece como un campo `enum` con esos dos valores, y nada más del contrato cambia

#### Scenario: Un formato que no se infiere

- **WHEN** el usuario marca un campo de texto con formato `password`
- **THEN** el sistema lo conserva

### Requirement: Encadenar campos y parámetros con Enter

El sistema MUST permitir crear el siguiente campo de un objeto **sin soltar el teclado**: pulsar Enter en la clave de un campo MUST crear otro campo y dejar el cursor en su clave, listo para escribir el nombre. El sistema MUST hacer lo mismo en el nombre de un parámetro de un endpoint.

Es la misma promesa en los dos sitios porque es la misma fricción: una lista de filas donde lo primero que se escribe es un nombre, y donde describir diez campos no debe costar diez viajes al ratón mientras la reunión espera.

El elemento nuevo MUST aparecer **inmediatamente después** de aquel desde el que se encadenó, y no al final de la lista. Es la diferencia con el botón de añadir, y es lo que permite intercalar un campo olvidado sin luego subirlo a base de flechas.

El elemento nuevo MUST heredar **su forma, y nada más**:

- Un campo hereda el tipo, y si es un `array`, también qué contiene: son las dos mitades de la misma declaración.
- Un campo `enum` hereda el tipo y **no** los valores. Es la excepción aparente a la regla anterior, y no lo es: los valores que un campo admite son un hecho sobre *ese* campo, como su comentario, mientras que lo que contiene un array es su forma. Encadenar diez campos enumerados con la misma lista no es un caso real; corregir una lista heredada que no venía a cuento, sí.
- Un parámetro hereda dónde viaja —`query`, `path` o `header`— y su tipo. Declarar tres cabeceras seguidas es justo el caso que duele, y el sitio por donde viaja es tan parte de lo que un parámetro *es* como su tipo.
- El sistema MUST NOT heredar comentario, ejemplo, formato, enumeración, obligatoriedad ni el modelo al que apunta una referencia. Son cosas de *ese* campo, no de su forma, y arrastrarlas obligaría a borrarlas.

La clave del campo nuevo MUST no chocar con la de ningún hermano, igual que al añadirlo con el botón. Un campo encadenado que resulte ser un contenedor MUST nacer utilizable, con la misma regla que rige cuando un campo cambia de tipo a contenedor: la aplicación MUST tener **una sola** manera de que nazca un objeto.

Un campo `enum` encadenado MUST nacer sin ningún valor, y eso MUST NOT corregirse con un valor de muestra. Es la diferencia deliberada con el contenedor que nace con un primer hijo: un hijo de relleno se ve en pantalla y se renombra, pero un valor de relleno se entrega en el documento como un valor que alguien admitió.

El sistema MUST conservar el botón de añadir en la fila, en la barra del cuerpo y en la lista de parámetros. Enter es el atajo de quien está escribiendo, no su sustituto: es también la única forma de crear el primer campo de un objeto vacío, donde no hay ninguna caja en la que pulsar Enter.

#### Scenario: Encadenar campos escribiendo

- **WHEN** el usuario escribe `nombre` en la clave de un campo de texto y pulsa Enter
- **THEN** aparece justo debajo otro campo de texto, con el cursor en su clave, y el usuario puede escribir `apellido` sin tocar el ratón

#### Scenario: El campo nuevo hereda el tipo

- **WHEN** el usuario pulsa Enter en la clave de un campo de tipo entero
- **THEN** el campo nuevo es de tipo entero

#### Scenario: Un array hereda también qué contiene

- **WHEN** el usuario pulsa Enter en la clave de un campo `array` de `integer`
- **THEN** el campo nuevo es un `array` de `integer`

#### Scenario: Un enum hereda el tipo y no los valores

- **WHEN** el usuario pulsa Enter en la clave de un campo `enum` cuyos valores son `alta, baja`
- **THEN** el campo nuevo es un campo `enum` sin ningún valor, y el sistema no le pone ninguno de muestra

#### Scenario: Lo que no viaja al campo nuevo

- **WHEN** el usuario pulsa Enter en la clave de un campo que tiene comentario, ejemplo y una enumeración
- **THEN** el campo nuevo llega con el mismo tipo pero sin comentario, sin ejemplo y sin enumeración

#### Scenario: Un campo que apunta a un modelo

- **WHEN** el usuario pulsa Enter en la clave de un campo que es una referencia al modelo `Cliente`
- **THEN** el campo nuevo es una referencia sin modelo elegido, y el sistema le pide a cuál apunta

#### Scenario: Encadenar un objeto lo deja utilizable

- **WHEN** el usuario pulsa Enter en la clave de un campo de tipo objeto
- **THEN** el campo nuevo es un objeto con un primer hijo editable, igual que si se hubiera cambiado un campo a objeto

#### Scenario: El sitio es el de al lado

- **WHEN** un objeto tiene `id`, `nombre` y `precio` y el usuario pulsa Enter en la clave de `id`
- **THEN** el campo nuevo queda entre `id` y `nombre`, y no al final

#### Scenario: Encadenar cabeceras

- **WHEN** el usuario declara un parámetro de `header` y pulsa Enter en su nombre
- **THEN** aparece otro parámetro de `header` del mismo tipo, con el cursor en su nombre, sin tener que volver a elegir dónde viaja

#### Scenario: El botón sigue estando

- **WHEN** el usuario tiene delante un objeto sin ningún campo
- **THEN** el sistema le ofrece añadir el primero, porque no hay ninguna clave en la que pulsar Enter

### Requirement: El contrato se comprueba antes de entregarlo

El sistema MUST comprobar la coherencia del contrato y mostrar lo que encuentre **en el propio panel de exportación**, junto a lo que se va a entregar y no en otra pantalla.

Las comprobaciones MUST cubrir: rutas que no empiezan por `/`, endpoints sin ninguna respuesta, claves repetidas dentro de un mismo objeto, campos sin nombre, cuerpos declarados sin ningún campo dentro, **enumeraciones declaradas sin ningún valor**, **referencias a un modelo que no existe**, **arrays de un modelo que no existe**, **dos modelos cuyo nombre se normaliza al mismo nombre de schema**, y **modelos que no usa nadie**.

Las cuatro últimas MUST distinguirse por su gravedad: una referencia rota entrega un contrato que describe algo que no está, y un modelo huérfano solo entrega uno con un bloque de más. El sistema MUST NOT presentarlas como el mismo problema.

Una enumeración sin valores MUST avisarse como una declaración a medias y no como un contrato roto: el campo se entrega igual, con su tipo, y lo único que falta es la lista que lo haría cerrado. Es el aviso que sustituye al valor de relleno que el sistema no pone.

Cada aviso MUST decir **dónde** ocurre, no solo qué ocurre: «hay una clave duplicada» sin decir en qué respuesta de qué endpoint obliga a buscarla a mano.

El validador MUST NOT impedir exportar. A mitad de una reunión, un contrato incompleto entregado es más útil que ninguno, y quien exporta ya está viendo lo que le falta.

#### Scenario: Una clave duplicada

- **WHEN** un objeto de la respuesta 200 de un endpoint tiene dos campos llamados `nombre`
- **THEN** el sistema lo avisa diciendo en qué endpoint y en qué respuesta ocurre

#### Scenario: Una ruta mal escrita

- **WHEN** un endpoint tiene la ruta `catalogo/productos`
- **THEN** el sistema avisa de que debe empezar por `/`

#### Scenario: Una enumeración sin valores

- **WHEN** un campo de tipo `enum` no tiene ningún valor escrito
- **THEN** el sistema lo avisa diciendo dónde está ese campo, y como algo menor que una referencia rota

#### Scenario: Avisar no impide exportar

- **WHEN** el contrato tiene avisos
- **THEN** el sistema los muestra y permite copiar y descargar igualmente

#### Scenario: Un contrato coherente

- **WHEN** el contrato no tiene ningún problema de los comprobados
- **THEN** el sistema lo dice, en lugar de no mostrar nada

#### Scenario: Una referencia rota

- **WHEN** un campo apunta a un modelo que ya no existe
- **THEN** el sistema lo avisa diciendo dónde está ese campo

#### Scenario: Un modelo huérfano

- **WHEN** un contrato tiene un modelo al que no apunta ningún campo
- **THEN** el sistema lo avisa como algo menor, distinto de una referencia rota

#### Scenario: Nombres de schema que colisionan

- **WHEN** un contrato tiene un modelo `paginación` y otro `Paginacion`
- **THEN** el sistema avisa de que los dos generan el mismo nombre de schema
