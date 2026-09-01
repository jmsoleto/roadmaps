## ADDED Requirements

### Requirement: Un contrato se compone de endpoints

El sistema MUST permitir describir dentro de un contrato N endpoints, cada uno con su método —`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` u `OPTIONS`—, su ruta, un resumen, una descripción y sus tags. Solo el método y la ruta MUST tener valor desde el principio; todo lo demás MUST poder quedarse vacío.

El sistema MUST ofrecer crear, duplicar y borrar endpoints. Duplicar MUST producir uno independiente: todos sus identificadores internos son nuevos y editar la copia MUST NOT alterar el original.

El sistema MUST listar los endpoints de un contrato identificándolos por su método y su ruta, y MUST permitir elegir cuál se está editando.

#### Scenario: Crear un endpoint

- **WHEN** el usuario crea un endpoint en un contrato
- **THEN** el sistema lo añade con un método y una ruta que ya se pueden editar, y lo abre

#### Scenario: Duplicar un endpoint

- **WHEN** el usuario duplica un endpoint que tiene parámetros y respuestas con cuerpo
- **THEN** el sistema crea otro con lo mismo dentro, y editar cualquiera de los dos deja intacto al otro

#### Scenario: Borrar un endpoint

- **WHEN** el usuario pide borrar un endpoint
- **THEN** el sistema pide confirmación y solo lo borra si se confirma

### Requirement: Parámetros de un endpoint

El sistema MUST permitir declarar parámetros de un endpoint en `query`, `path` o `header`, cada uno con nombre, tipo escalar, obligatoriedad, ejemplo y comentario.

Los marcadores de la ruta MUST NOT tener que declararse a mano para existir: una ruta con `{id}` los declara. El sistema MUST tratarlos como parámetros de `path` obligatorios aunque nadie los haya escrito en la lista, y MUST decirlo en la propia pantalla en lugar de dejarlo como un comportamiento invisible que solo aparece al exportar.

#### Scenario: Un parámetro de consulta

- **WHEN** el usuario añade un parámetro `pagina` de tipo entero, no obligatorio, con ejemplo y comentario
- **THEN** el sistema lo conserva como parte de ese endpoint

#### Scenario: Marcadores de ruta no declarados

- **WHEN** el usuario escribe la ruta `/clientes/{id}/pedidos/{pedidoId}` y no declara ningún parámetro
- **THEN** el sistema indica que `id` y `pedidoId` cuentan ya como parámetros de path obligatorios

### Requirement: Respuestas de un endpoint

El sistema MUST permitir declarar N respuestas por endpoint, cada una con su código como texto, su descripción y, opcionalmente, un cuerpo. Una respuesta sin cuerpo MUST ser un estado normal y no un cuerpo vacío: un `204` no tiene forma que describir.

El sistema MUST distinguir visualmente los códigos de éxito, de error del cliente y de error del servidor, para que la lista se lea de un vistazo mientras se habla.

Un endpoint recién creado MUST llegar con una respuesta de éxito ya puesta, porque un endpoint sin ninguna respuesta no describe nada.

#### Scenario: Añadir una respuesta de error

- **WHEN** el usuario añade una respuesta con código `404`
- **THEN** el sistema la muestra junto a las demás, marcada como error, y permite darle descripción y cuerpo

#### Scenario: Una respuesta sin cuerpo

- **WHEN** el usuario quita el cuerpo de una respuesta
- **THEN** el sistema la conserva con su código y su descripción, y ofrece volver a añadirlo

#### Scenario: Un método que suele llevar cuerpo de petición

- **WHEN** el usuario cambia el método de un endpoint sin cuerpo de petición a `POST`, `PUT` o `PATCH`
- **THEN** el sistema le añade un cuerpo de petición vacío, listo para describirlo

### Requirement: El árbol de campos

El sistema MUST describir el cuerpo de una petición o de una respuesta como un árbol de campos. Un campo MUST tener clave, tipo, comentario, ejemplo y obligatoriedad; y según su tipo, formato, enumeración y si admite nulo.

Los tipos MUST ser `string`, `number`, `integer`, `boolean`, `object`, `array` y `null`. Un `array` MUST declarar además qué contiene, y MUST NOT poder contener otro array: es un caso raro en un contrato real que duplicaría la forma de cada campo sin aportar a la conversación.

El sistema MUST permitir añadir y borrar campos, y plegar y desplegar los que tienen hijos. El estado de plegado MUST persistir con el contrato: forma parte de cómo se dejó el trabajo.

**El comentario es el motivo de la herramienta**, no un adorno: es lo que se dice en voz alta al lado de un campo y lo que acaba siendo la documentación que lee quien implementa. El sistema MUST darle sitio en la propia fila del campo, no escondido tras una opción avanzada.

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

### Requirement: Cambiar el tipo de un campo deja el campo utilizable

Cuando un campo cambia de tipo, el sistema MUST dejarlo en un estado con el que se pueda seguir trabajando en lugar de en uno a medias.

Un campo que pasa a ser objeto, o array de objetos, MUST recibir un primer hijo editable si no tenía ninguno: un contenedor vacío no dice nada y obliga a un clic más en el peor momento. Un campo que deja de ser escalar MUST dejar de pedir ejemplo, que ya no significa nada. Un campo que pasa a ser array MUST tener declarado qué contiene.

El sistema MUST NOT destruir lo que el nuevo tipo todavía puede usar: la clave, el comentario y la obligatoriedad sobreviven a cualquier cambio de tipo.

#### Scenario: De texto a objeto

- **WHEN** el usuario cambia un campo `cliente` de texto a objeto
- **THEN** el sistema le crea un hijo editable, deja de pedirle ejemplo, y conserva su clave y su comentario

#### Scenario: De objeto a texto

- **WHEN** el usuario cambia a texto un campo que era un objeto con hijos
- **THEN** el sistema lo trata como escalar y vuelve a pedirle ejemplo

### Requirement: Duplicar un campo con todo lo que cuelga de él

El sistema MUST permitir duplicar un campo completo, con sus hijos, como hermano inmediatamente posterior al original.

La copia MUST recibir una clave que no choque con la de ningún hermano, y todos los identificadores internos de los campos copiados MUST ser nuevos. Editar la copia MUST NOT alterar el original.

#### Scenario: Duplicar un objeto con hijos

- **WHEN** el usuario duplica un campo `direccion` de tipo objeto con cuatro hijos
- **THEN** aparece un hermano justo debajo con los cuatro hijos copiados, con una clave distinta de `direccion`, y editar uno no cambia el otro

### Requirement: Reordenar campos entre hermanos

El sistema MUST permitir mover un campo arriba y abajo dentro de su objeto, y MUST NOT permitir sacarlo de él. Mover un campo entre objetos distintos exigiría resolver colisiones de claves y no aporta al caso de uso.

El orden de los campos MUST conservarse, porque es el orden en que se pensó el contrato y en el que se leerá.

#### Scenario: Subir una propiedad

- **WHEN** el usuario tiene un objeto con `nombre`, `id` y `precio` y sube `id`
- **THEN** el orden pasa a ser `id`, `nombre`, `precio`

#### Scenario: Los extremos

- **WHEN** el usuario intenta subir el primer campo de un objeto o bajar el último
- **THEN** el sistema no ofrece hacerlo, y ningún campo sale de su objeto

### Requirement: Construir el árbol desde un JSON pegado

El sistema MUST permitir pegar un JSON —una respuesta real de Postman, de un log o del backend— y construir con él el árbol del nodo elegido, reemplazando lo que ese nodo tuviera.

El sistema MUST inferir el anidamiento y el tipo de cada valor, distinguiendo entero de decimal, y MUST reconocer por su forma los formatos `date-time`, `date`, `uuid`, `email` y `uri`. Los valores escalares MUST quedar como ejemplo del campo que los produjo.

Un texto que no sea un JSON válido, o que sea un JSON que no describe un objeto ni un array, MUST producir un aviso y MUST NOT alterar el árbol que ya estaba construido. Perder media hora de trabajo por un pegado torcido es exactamente lo que no puede pasar en una reunión.

#### Scenario: Construir desde una respuesta real

- **WHEN** el usuario pega un JSON con objetos anidados en un nodo objeto
- **THEN** el sistema construye el árbol con los tipos inferidos, `2026-01-31T10:00:00Z` marcado como `date-time`, y un entero como entero y no como decimal

#### Scenario: JSON inválido

- **WHEN** el usuario pega un texto que no es JSON válido
- **THEN** el sistema avisa y el árbol que ya tenía construido queda intacto

#### Scenario: Un JSON que no es un objeto ni un array

- **WHEN** el usuario pega un número o una cadena sueltos
- **THEN** el sistema avisa y no altera nada

### Requirement: El ejemplo JSON se ve mientras se edita

El sistema MUST mostrar el JSON de ejemplo que produce el árbol que se está editando, y MUST mantenerlo al día con cada cambio, para poder validar de un vistazo con quien se tiene delante.

El ejemplo MUST derivarse del ejemplo declarado en cada campo cuando lo hay, y de su tipo y su formato cuando no: un campo sin ejemplo MUST aparecer con un valor plausible de su tipo, no en blanco.

El panel del ejemplo MUST poder ocultarse, porque el árbol también necesita el ancho.

#### Scenario: El ejemplo sigue a la edición

- **WHEN** el usuario añade un campo o cambia el ejemplo de uno existente
- **THEN** el JSON mostrado refleja el cambio

#### Scenario: Un campo sin ejemplo declarado

- **WHEN** un campo de tipo entero con formato de fecha no tiene ejemplo escrito
- **THEN** el sistema muestra un valor plausible de ese tipo y formato en lugar de un hueco

#### Scenario: Ocultar el panel

- **WHEN** el usuario oculta el panel del ejemplo
- **THEN** el árbol ocupa el ancho que dejó libre

### Requirement: Formatos y enumeraciones de un campo escalar

El sistema MUST permitir marcar en un campo escalar su formato y la lista de valores que admite.

Los formatos MUST incluir los cinco que se reconocen al pegar un JSON —`date-time`, `date`, `uuid`, `email`, `uri`— y además `password`, `byte`, `int64` y `float`, que nadie infiere y solo se eligen a mano. Ninguno MUST ser obligatorio.

La lista de valores MUST escribirse como texto separado por comas, y el sistema MUST ignorar los espacios sobrantes y las entradas vacías.

#### Scenario: Una enumeración

- **WHEN** el usuario escribe `alta, baja , pendiente,` como valores admitidos de un campo
- **THEN** el sistema registra tres valores, sin espacios sobrantes ni una cuarta entrada vacía

#### Scenario: Un formato que no se infiere

- **WHEN** el usuario marca un campo de texto con formato `password`
- **THEN** el sistema lo conserva

## MODIFIED Requirements

### Requirement: El trabajo persiste sin darle a guardar

El sistema MUST guardar los cambios de un contrato de forma automática, sin que el usuario tenga que pedirlo, y MUST recuperarlos al volver a abrir la aplicación.

El sistema MUST recordar además **dónde se estaba trabajando**: qué contrato estaba abierto y qué se estaba editando dentro de él. Volver a un contrato y tener que buscar otra vez el endpoint que se estaba describiendo es la misma fricción, un nivel más abajo.

Que el trabajo sobreviva sin un gesto explícito es requisito de uso, no comodidad: la herramienta se usa mientras se conduce una reunión, y acordarse de guardar es exactamente lo que no va a pasar ahí.

#### Scenario: Recuperar el trabajo

- **WHEN** el usuario edita un contrato, cierra el navegador por completo y vuelve a abrir la aplicación
- **THEN** el contrato sigue como lo dejó, y es el que aparece abierto

#### Scenario: Cambios pendientes al cerrar

- **WHEN** el usuario hace un cambio y cierra la pestaña de inmediato
- **THEN** el cambio está ahí al volver a abrir

#### Scenario: Recuperar el endpoint que se estaba editando

- **WHEN** el usuario está describiendo un endpoint, sale de la aplicación y vuelve al mismo contrato
- **THEN** el sistema muestra ese endpoint, no el primero de la lista

#### Scenario: Lo que se estaba editando ya no existe

- **WHEN** el contrato recuerda un endpoint que ha sido borrado
- **THEN** el sistema muestra el contrato sin ninguno abierto, en lugar de una pantalla vacía
