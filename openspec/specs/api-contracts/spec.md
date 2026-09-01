# api-contracts

## Purpose
La aplicación donde el contrato de una API se acuerda mientras se habla, en lugar de quedar en prosa ambigua dentro de un Word. Cubre qué es un contrato de API dentro del contenedor, que hay varios y cómo se eligen, y el resumen que la aplicación aporta a la landing del hub. El árbol de campos, la exportación a OpenAPI y los modelos reutilizables amplían esta misma capability en changes posteriores.

## Requirements

### Requirement: Un contrato de API es la unidad de trabajo de la aplicación

El sistema MUST tratar el contrato de una API como el documento sobre el que se trabaja, identificado por un título, y MUST guardar junto a él la versión de la API, una descripción y el servidor base. Ninguno de esos datos MUST ser obligatorio para poder empezar: un contrato recién creado MUST poder editarse desde el primer momento.

El título MUST poder repetirse entre contratos. Es un nombre para reconocerlos en una lista, no una clave, y prohibir el duplicado obligaría a inventar sufijos en el peor momento, que es mientras se habla.

#### Scenario: Crear el primer contrato

- **WHEN** el usuario entra en API Hub en un navegador donde nunca se ha usado y crea un contrato
- **THEN** el sistema lo abre con su título, listo para editarse, sin exigir versión, descripción ni servidor

#### Scenario: Datos de la API

- **WHEN** el usuario escribe el título, la versión, la descripción y el servidor base de un contrato
- **THEN** el sistema los conserva como parte de ese contrato y no de ningún otro

#### Scenario: Dos contratos con el mismo título

- **WHEN** el usuario crea un contrato con el título de otro que ya existe
- **THEN** el sistema lo acepta y los muestra a ambos en la lista

### Requirement: La aplicación gestiona varios contratos

El sistema MUST permitir tener varios contratos de API a la vez, y MUST ofrecer crear uno nuevo, duplicar uno existente, renombrarlo y borrarlo.

Duplicar MUST producir un contrato independiente: modificar la copia MUST NOT alterar el original, ni al revés. Borrar MUST pedir confirmación, porque no hay forma de deshacerlo.

El sistema MUST mantener un orden de los contratos elegido por el usuario, y ese orden MUST ser el mismo dondequiera que se listen.

#### Scenario: Duplicar un contrato

- **WHEN** el usuario duplica un contrato
- **THEN** el sistema crea otro con el mismo contenido y lo abre, y editar cualquiera de los dos deja intacto al otro

#### Scenario: Borrar un contrato

- **WHEN** el usuario pide borrar un contrato
- **THEN** el sistema pide confirmación y solo lo borra si se confirma

#### Scenario: Borrar el contrato abierto

- **WHEN** el usuario borra el contrato que tenía abierto
- **THEN** el sistema muestra el inicio de la aplicación y no deja ningún contrato a medio abrir

### Requirement: El contrato abierto se elige desde el segundo nivel del contexto

El sistema MUST mostrar el contrato abierto como segundo nivel del contexto de la aplicación, y MUST permitir cambiar de contrato desde ahí. El selector MUST ocupar un ancho independiente del número de contratos.

El inicio de la aplicación MUST ser **el contrato en el que se estaba trabajando**, y la lista de contratos cuando no hay ninguno abierto. `hub-shell` deja que cada aplicación defina su propio inicio, y el de esta es volver a donde se dejó: la herramienta se usa conduciendo una reunión, y obligar a reabrir el contrato en cada entrada es una fricción que no compra nada.

Desde el contrato abierto MUST poder volverse siempre a la lista, y desde ella abrirse cualquier otro. El contrato abierto MUST NOT aparecer en la dirección: la ubicación llega hasta la aplicación y no más allá, como define `hub-shell`.

#### Scenario: Cambiar de contrato

- **WHEN** el usuario elige otro contrato en el selector
- **THEN** el sistema lo abre y el segundo nivel del contexto pasa a nombrarlo

#### Scenario: Entrar en la aplicación

- **WHEN** el usuario entra en API Hub desde el hub o desde el conmutador habiendo dejado un contrato abierto
- **THEN** el sistema muestra ese contrato

#### Scenario: Volver a la lista

- **WHEN** el usuario está en un contrato y activa el nivel de contexto que nombra la lista
- **THEN** el sistema muestra la lista de contratos, sin ninguno abierto

#### Scenario: Sin ningún contrato

- **WHEN** el usuario entra en API Hub y no existe todavía ningún contrato
- **THEN** el sistema muestra un estado vacío que ofrece crear el primero

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

### Requirement: API Hub aporta su resumen a la landing del hub

El sistema MUST hacer que API Hub cumpla el contrato de aplicación definido en `hub-landing`, como aplicación viva:

- **Cifras**: contratos, endpoints y modelos, sumados sobre todos los contratos.
- **Lista corta**: los contratos abiertos más recientemente, del más reciente al menos reciente, con su versión al final y bajo una etiqueta propia de la aplicación.
- **Avisos**: los contratos cuya comprobación encuentra algo, nombrando el contrato y cuántos problemas tiene.

Activar una fila de la lista corta MUST abrir ese contrato dentro de la aplicación, sin pasar por su inicio.

Los avisos MUST salir de la misma comprobación que se muestra al exportar, y MUST NOT ser una segunda lista de reglas que pueda decir algo distinto. Un contrato vacío —sin endpoints todavía— MUST NOT producir aviso: está sin empezar, no está mal.

#### Scenario: La tarjeta refleja el estado real

- **WHEN** el usuario vuelve al hub tras crear un contrato
- **THEN** las cifras y la lista de la tarjeta de API Hub reflejan el estado nuevo

#### Scenario: Entrar desde una fila de la lista

- **WHEN** el usuario activa una fila de la lista corta de la tarjeta de API Hub
- **THEN** el sistema entra en API Hub con ese contrato abierto

#### Scenario: Crear desde la tarjeta

- **WHEN** el usuario activa la acción de crear de la tarjeta de API Hub
- **THEN** el sistema entra en API Hub con el alta de contrato ya iniciada

#### Scenario: Sin contratos

- **WHEN** no existe ningún contrato
- **THEN** el sistema muestra las tres cifras a cero, ninguna con tono de gravedad, y la lista vacía con su indicación propia

#### Scenario: Un contrato abierto recientemente ya no existe

- **WHEN** el usuario borra un contrato que estaba en la lista y vuelve al hub
- **THEN** el sistema no lo muestra en la lista

#### Scenario: Un contrato con problemas

- **WHEN** un contrato tiene una clave duplicada y un endpoint sin respuestas
- **THEN** la tira de avisos del hub lo nombra, diciendo cuántos problemas tiene

#### Scenario: Un contrato recién creado

- **WHEN** el usuario crea un contrato y todavía no le ha puesto ningún endpoint
- **THEN** el sistema no produce ningún aviso por él

### Requirement: La aplicación sigue el tema y su identidad no

El sistema MUST pintar el interior de API Hub con los colores del tema activo, de modo que cambiar de tema cambie la aplicación entera igual que cambia Roadmaps y Decisions.

El par de colores con que se reconoce la aplicación —su icono y su punto— MUST NOT seguir al tema, según define `hub-shell` para toda identidad de aplicación.

#### Scenario: Cambiar de tema dentro de la aplicación

- **WHEN** el usuario cambia el tema estando dentro de API Hub
- **THEN** la aplicación adopta los colores del tema nuevo, y su icono conserva su propio par de colores

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

Los tipos MUST ser `string`, `number`, `integer`, `boolean`, `object`, `array`, `null` y **referencia a un modelo**. Un `array` MUST declarar además qué contiene —un escalar, un objeto o un modelo—, y MUST NOT poder contener otro array: es un caso raro en un contrato real que duplicaría la forma de cada campo sin aportar a la conversación.

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

#### Scenario: Un campo que apunta a un modelo

- **WHEN** el usuario elige el tipo referencia en un campo
- **THEN** el sistema le deja elegir a qué modelo del contrato apunta

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

### Requirement: El contrato sale como OpenAPI 3.0.3

El sistema MUST poder emitir el contrato abierto como un documento OpenAPI 3.0.3, en YAML y en JSON, con el mismo contenido en los dos.

El documento MUST ser **autocontenido**: todo lo que necesita para entenderse va dentro, y el sistema MUST NOT emitir ninguna referencia a un fichero externo. Un `$ref` a otro fichero es legal en OpenAPI y los generadores y los agentes lo resuelven mal o lo ignoran; la reutilización de esta herramienta es de diseño, no de fichero.

El sistema MUST emitir el título, la versión y la descripción de la API, y su servidor base cuando lo tenga. MUST NOT emitir claves vacías: un resumen que nadie escribió no aparece, en lugar de aparecer como cadena vacía.

Cada endpoint MUST emitirse bajo su ruta y su método, con un identificador de operación derivado de la ruta, y con sus tags cuando los tenga.

#### Scenario: Un contrato con endpoints

- **WHEN** el usuario exporta un contrato con dos endpoints descritos
- **THEN** el sistema produce un documento OpenAPI 3.0.3 con los dos bajo sus rutas, y sin ninguna referencia a un fichero externo

#### Scenario: Lo que nadie escribió no se emite

- **WHEN** un endpoint no tiene resumen, descripción ni tags
- **THEN** el sistema no emite esas claves, en lugar de emitirlas vacías

#### Scenario: Las dos salidas dicen lo mismo

- **WHEN** el usuario exporta el mismo contrato a YAML y a JSON
- **THEN** los dos documentos describen exactamente la misma API

### Requirement: El comentario de un campo es su documentación en el schema

El sistema MUST emitir el comentario de cada campo como la `description` de ese campo en el schema, y el tipo, el formato, la enumeración, si admite nulo y su ejemplo cuando los tenga. Los campos marcados como obligatorios MUST listarse como `required` de su objeto.

Esto no es un detalle de formato: el comentario es lo que se dijo en voz alta al lado del campo, y la `description` del schema es lo que lee quien implementa y lo que lee un agente de codificación. Si el comentario no llega ahí, la herramienta no ha servido para nada.

#### Scenario: El comentario llega al documento

- **WHEN** el usuario escribe «Total de elementos, no de páginas» en el comentario de un campo y exporta
- **THEN** ese texto aparece como la descripción de ese campo en el schema

#### Scenario: Los campos obligatorios de un objeto

- **WHEN** un objeto tiene dos campos obligatorios y uno opcional
- **THEN** el sistema lista los dos obligatorios y no el tercero

### Requirement: Los marcadores de la ruta se emiten declarados o no

El sistema MUST emitir cada marcador de la ruta de un endpoint como un parámetro de path obligatorio, lo haya declarado el usuario o no. Un parámetro de path declarado a mano MUST emitirse como obligatorio aunque no esté marcado como tal.

Es lo que la pantalla ya anuncia mientras se edita, y es requisito de OpenAPI: un marcador sin su parámetro hace inválido el documento.

#### Scenario: Marcadores no declarados

- **WHEN** el usuario exporta un endpoint con la ruta `/clientes/{id}/pedidos/{pedidoId}` y ningún parámetro declarado
- **THEN** el documento declara `id` y `pedidoId` como parámetros de path obligatorios de tipo texto

#### Scenario: Un marcador declarado a mano

- **WHEN** el usuario declara `id` como parámetro de path con su comentario y su ejemplo
- **THEN** el documento emite ese parámetro una sola vez, obligatorio, conservando lo que el usuario escribió

### Requirement: Toda respuesta sale con descripción

El sistema MUST emitir una descripción para cada respuesta. Cuando el usuario no ha escrito ninguna, MUST emitir una por defecto acorde al código.

`description` es obligatoria en el objeto Response de OpenAPI, así que una respuesta sin describir no haría inválida solo a esa respuesta: haría inválido el documento entero, y por una casilla que nadie rellenó a mitad de una reunión.

Un endpoint sin ninguna respuesta MUST emitirse igualmente con una respuesta de éxito genérica, por el mismo motivo.

#### Scenario: Una respuesta sin describir

- **WHEN** el usuario exporta un endpoint con una respuesta `404` cuya descripción está vacía
- **THEN** el documento emite una descripción por defecto para ese código

#### Scenario: Una respuesta sin cuerpo

- **WHEN** una respuesta no tiene cuerpo
- **THEN** el documento la emite con su código y su descripción, y sin contenido

### Requirement: Los ejemplos y el briefing

El sistema MUST poder emitir, además del OpenAPI, los **ejemplos JSON** de los cuerpos del endpoint abierto, y un **briefing en Markdown** legible por una persona.

El briefing MUST recoger la API, sus endpoints, sus parámetros y la forma de sus cuerpos campo a campo con sus comentarios, y MUST decir de sí mismo que el OpenAPI es la fuente de verdad. Existe para pegarlo en un hilo o en la descripción de una épica, donde un YAML no se lee.

#### Scenario: Los ejemplos del endpoint abierto

- **WHEN** el usuario pide los ejemplos de un endpoint con cuerpo de petición y dos respuestas con cuerpo
- **THEN** el sistema muestra los tres, cada uno identificado por lo que es

#### Scenario: El briefing recoge los comentarios

- **WHEN** el usuario pide el briefing de un contrato cuyos campos tienen comentarios
- **THEN** el Markdown los incluye junto a cada campo, con su tipo y si es opcional

### Requirement: Copiar y descargar cualquiera de las salidas

El sistema MUST ofrecer, para cada salida, copiarla al portapapeles y descargarla como fichero con un nombre y una extensión acordes a lo que es.

Copiar es lo que se usa para pegárselo a un agente; descargar es lo que se usa para meterlo en un repositorio. Ofrecer solo una de las dos deja fuera la mitad de los casos.

#### Scenario: Copiar

- **WHEN** el usuario copia el OpenAPI en YAML
- **THEN** el sistema lo pone en el portapapeles y lo confirma

#### Scenario: Descargar

- **WHEN** el usuario descarga el OpenAPI en YAML
- **THEN** el sistema entrega un fichero con extensión `.yaml`

### Requirement: El contrato se comprueba antes de entregarlo

El sistema MUST comprobar la coherencia del contrato y mostrar lo que encuentre **en el propio panel de exportación**, junto a lo que se va a entregar y no en otra pantalla.

Las comprobaciones MUST cubrir: rutas que no empiezan por `/`, endpoints sin ninguna respuesta, claves repetidas dentro de un mismo objeto, campos sin nombre, cuerpos declarados sin ningún campo dentro, **referencias a un modelo que no existe**, **arrays de un modelo que no existe**, **dos modelos cuyo nombre se normaliza al mismo nombre de schema**, y **modelos que no usa nadie**.

Las cuatro últimas MUST distinguirse por su gravedad: una referencia rota entrega un contrato que describe algo que no está, y un modelo huérfano solo entrega uno con un bloque de más. El sistema MUST NOT presentarlas como el mismo problema.

Cada aviso MUST decir **dónde** ocurre, no solo qué ocurre: «hay una clave duplicada» sin decir en qué respuesta de qué endpoint obliga a buscarla a mano.

El validador MUST NOT impedir exportar. A mitad de una reunión, un contrato incompleto entregado es más útil que ninguno, y quien exporta ya está viendo lo que le falta.

#### Scenario: Una clave duplicada

- **WHEN** un objeto de la respuesta 200 de un endpoint tiene dos campos llamados `nombre`
- **THEN** el sistema lo avisa diciendo en qué endpoint y en qué respuesta ocurre

#### Scenario: Una ruta mal escrita

- **WHEN** un endpoint tiene la ruta `catalogo/productos`
- **THEN** el sistema avisa de que debe empezar por `/`

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

### Requirement: Un contrato tiene bloques reutilizables con nombre

El sistema MUST permitir describir dentro de un contrato N modelos, cada uno con un nombre, una descripción y su propio árbol de campos, editado igual que el cuerpo de una respuesta.

El sistema MUST ofrecer crear, renombrar, describir, duplicar y borrar modelos, y MUST listarlos junto a los endpoints para poder elegir cuál se está editando.

Un modelo MUST poder existir sin que nadie lo use todavía: se crea antes de referenciarlo.

#### Scenario: Crear un modelo

- **WHEN** el usuario crea un modelo en un contrato
- **THEN** el sistema lo añade con un nombre editable y su árbol vacío, y lo abre

#### Scenario: Duplicar un modelo

- **WHEN** el usuario duplica un modelo con tres campos
- **THEN** el sistema crea otro con los mismos campos y un nombre que no choca, y editar cualquiera de los dos deja intacto al otro

#### Scenario: Renombrar un modelo

- **WHEN** el usuario cambia el nombre de un modelo al que apuntan dos campos
- **THEN** los dos campos siguen apuntando a él, y el documento exportado usa el nombre nuevo

### Requirement: Un campo puede apuntar a un modelo

El sistema MUST admitir que un campo sea una referencia a un modelo, y que un array declare que sus elementos son de un modelo.

Un campo que es una referencia MUST NOT pedir ni ejemplo ni hijos: su forma es la del modelo. MUST conservar su clave, su comentario y su obligatoriedad, que son suyos y no del modelo.

El sistema MUST permitir ir del campo al modelo que referencia, para poder mirarlo sin buscarlo en la lista.

#### Scenario: Un campo que es una referencia

- **WHEN** el usuario da a un campo `paginacion` el tipo referencia y elige el modelo `Paginacion`
- **THEN** el campo deja de pedir ejemplo e hijos, y el ejemplo JSON muestra la forma de ese modelo

#### Scenario: Un array de un modelo

- **WHEN** el usuario declara un campo `items` como array cuyos elementos son el modelo `ItemProducto`
- **THEN** el ejemplo muestra un array con un elemento con la forma de ese modelo

#### Scenario: El comentario del campo es del campo

- **WHEN** el usuario escribe un comentario en un campo que es una referencia
- **THEN** el sistema lo conserva en el campo, sin tocar la descripción del modelo

#### Scenario: Ir al modelo

- **WHEN** el usuario pide abrir el modelo que un campo referencia
- **THEN** el sistema muestra ese modelo en edición

### Requirement: Extraer un bloque a modelo sin cambiar lo que describe

El sistema MUST permitir convertir un objeto ya escrito en un modelo con nombre, dejando el campo original como una referencia a él.

**El ejemplo JSON generado MUST ser idéntico antes y después.** Es lo que hace que la operación se pueda hacer en directo delante de alguien: extraer un bloque reorganiza el contrato, no lo cambia.

El nombre propuesto MUST derivarse de la clave del campo, y MUST NOT chocar con el de otro modelo.

#### Scenario: Extraer un bloque repetido

- **WHEN** el usuario extrae a modelo un objeto `paginacion` con tres campos
- **THEN** el sistema crea un modelo con esos tres campos, el campo original pasa a referenciarlo, y el JSON de ejemplo sigue siendo el mismo

#### Scenario: Extraer un array de objetos

- **WHEN** el usuario extrae a modelo un campo `items` que es un array de objetos
- **THEN** el sistema crea un modelo con la forma del elemento y el campo pasa a ser un array de ese modelo

### Requirement: Deshacer una referencia en el sitio

El sistema MUST permitir expandir una referencia: el campo deja de apuntar al modelo y pasa a describir sus campos directamente.

Expandir MUST **copiar**, no mover: el modelo original MUST quedar intacto, y los demás campos que lo referencian MUST seguir haciéndolo.

#### Scenario: Expandir una referencia

- **WHEN** el usuario expande un campo que referencia al modelo `Paginacion`
- **THEN** el campo pasa a ser un objeto con una copia de los campos del modelo

#### Scenario: El modelo sobrevive a que lo expandan

- **WHEN** el usuario expande una de las tres referencias a un modelo
- **THEN** el modelo sigue existiendo y las otras dos referencias siguen apuntando a él

### Requirement: Saber quién usa un modelo antes de tocarlo

El sistema MUST mostrar en qué sitios se usa cada modelo, nombrándolos, y MUST decirlo también donde se elige borrarlo.

Borrar un modelo que está en uso MUST advertir de cuántas referencias van a quedar rotas, y MUST NOT borrarlo sin confirmación. Un modelo que no usa nadie se puede borrar con la confirmación normal.

Romper un contrato sin enterarse es el fallo que esta pantalla existe para evitar: una referencia rota no se ve hasta que alguien exporta.

#### Scenario: Dónde se usa

- **WHEN** el usuario abre un modelo referenciado desde dos respuestas y un cuerpo de petición
- **THEN** el sistema nombra esos tres sitios

#### Scenario: Borrar un modelo en uso

- **WHEN** el usuario pide borrar un modelo usado en tres sitios
- **THEN** el sistema advierte de que quedarán tres referencias rotas y solo lo borra si se confirma

#### Scenario: Un modelo que no usa nadie

- **WHEN** el usuario abre un modelo al que no apunta ningún campo
- **THEN** el sistema lo dice, en lugar de no mostrar nada

### Requirement: Un modelo recursivo no cuelga la aplicación

El sistema MUST admitir que un modelo se referencie a sí mismo, directa o indirectamente: un árbol de categorías es un contrato legítimo y frecuente.

Al generar el **ejemplo**, el sistema MUST cortar la recursión, mostrando la forma sin intentar desarrollarla infinitamente. El ejemplo es ilustrativo, no exhaustivo.

Al generar el **schema**, el sistema MUST conservar la referencia recursiva. Es válida en OpenAPI y es la forma correcta de describir un árbol; cortarla ahí produciría un contrato que dice algo distinto de lo acordado.

#### Scenario: Un modelo que se contiene a sí mismo

- **WHEN** el usuario crea un modelo `Categoria` con un campo `hijas` que es un array de `Categoria`
- **THEN** el sistema genera el ejemplo sin bloquearse, cortando la recursión

#### Scenario: El schema conserva la recursión

- **WHEN** el usuario exporta un contrato con un modelo recursivo
- **THEN** el documento conserva la referencia a sí mismo

#### Scenario: Un ciclo entre dos modelos

- **WHEN** un modelo `A` referencia a `B` y `B` referencia a `A`
- **THEN** el sistema genera el ejemplo sin bloquearse

### Requirement: Los modelos viajan dentro del documento exportado

El sistema MUST emitir cada modelo del contrato como un schema con nombre dentro del documento, y MUST hacer que las referencias apunten a él **dentro del mismo documento**.

El sistema MUST NOT emitir referencias a ficheros externos, ni siquiera para los modelos. La reutilización de esta herramienta es de diseño, no de fichero: un `$ref` externo es legal y los generadores y los agentes lo resuelven mal o lo ignoran.

Un campo que es una referencia **y tiene comentario** MUST emitirse de forma que el comentario sobreviva. En OpenAPI 3.0.x los hermanos de un `$ref` se ignoran por especificación, así que emitir los dos al mismo nivel perdería en silencio justo lo que esta herramienta aporta.

#### Scenario: Modelos incrustados

- **WHEN** el usuario exporta un contrato con dos modelos referenciados desde tres endpoints
- **THEN** los dos modelos aparecen como schemas con nombre en el documento y todas las referencias son internas

#### Scenario: Comentario sobre una referencia

- **WHEN** el usuario exporta un campo que es una referencia y tiene comentario
- **THEN** el documento conserva a la vez la referencia y el comentario

#### Scenario: Dos modelos cuyo nombre se normaliza igual

- **WHEN** un contrato tiene un modelo `paginación` y otro `Paginacion`
- **THEN** el documento les da nombres de schema distintos, sin que uno pise al otro
