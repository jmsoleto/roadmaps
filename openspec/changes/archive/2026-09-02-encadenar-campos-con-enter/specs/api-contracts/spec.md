## ADDED Requirements

### Requirement: Encadenar campos y parámetros con Enter

El sistema MUST permitir crear el siguiente campo de un objeto **sin soltar el teclado**: pulsar Enter en la clave de un campo MUST crear otro campo y dejar el cursor en su clave, listo para escribir el nombre. El sistema MUST hacer lo mismo en el nombre de un parámetro de un endpoint.

Es la misma promesa en los dos sitios porque es la misma fricción: una lista de filas donde lo primero que se escribe es un nombre, y donde describir diez campos no debe costar diez viajes al ratón mientras la reunión espera.

El elemento nuevo MUST aparecer **inmediatamente después** de aquel desde el que se encadenó, y no al final de la lista. Es la diferencia con el botón de añadir, y es lo que permite intercalar un campo olvidado sin luego subirlo a base de flechas.

El elemento nuevo MUST heredar **su forma, y nada más**:

- Un campo hereda el tipo, y si es un `array`, también qué contiene: son las dos mitades de la misma declaración.
- Un parámetro hereda dónde viaja —`query`, `path` o `header`— y su tipo. Declarar tres cabeceras seguidas es justo el caso que duele, y el sitio por donde viaja es tan parte de lo que un parámetro *es* como su tipo.
- El sistema MUST NOT heredar comentario, ejemplo, formato, enumeración, obligatoriedad ni el modelo al que apunta una referencia. Son cosas de *ese* campo, no de su forma, y arrastrarlas obligaría a borrarlas.

La clave del campo nuevo MUST no chocar con la de ningún hermano, igual que al añadirlo con el botón. Un campo encadenado que resulte ser un contenedor MUST nacer utilizable, con la misma regla que rige cuando un campo cambia de tipo a contenedor: la aplicación MUST tener **una sola** manera de que nazca un objeto.

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

## MODIFIED Requirements

### Requirement: El árbol de campos

El sistema MUST describir el cuerpo de una petición o de una respuesta como un árbol de campos. Un campo MUST tener clave, tipo, comentario, ejemplo y obligatoriedad; y según su tipo, formato, enumeración y si admite nulo.

Los tipos MUST ser `string`, `number`, `integer`, `boolean`, `object`, `array`, `null` y **referencia a un modelo**. Un `array` MUST declarar además qué contiene —un escalar, un objeto o un modelo—, y MUST NOT poder contener otro array: es un caso raro en un contrato real que duplicaría la forma de cada campo sin aportar a la conversación.

El sistema MUST permitir añadir y borrar campos, y plegar y desplegar los que tienen hijos. El estado de plegado MUST persistir con el contrato: forma parte de cómo se dejó el trabajo.

**El comentario es el motivo de la herramienta**, no un adorno: es lo que se dice en voz alta al lado de un campo y lo que acaba siendo la documentación que lee quien implementa. El sistema MUST darle sitio en la propia fila del campo, no escondido tras una opción avanzada.

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
