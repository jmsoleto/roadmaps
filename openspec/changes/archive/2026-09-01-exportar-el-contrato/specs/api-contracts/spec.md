## ADDED Requirements

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

Las comprobaciones MUST cubrir: rutas que no empiezan por `/`, endpoints sin ninguna respuesta, claves repetidas dentro de un mismo objeto, campos sin nombre, y cuerpos declarados sin ningún campo dentro.

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

## MODIFIED Requirements

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
