## ADDED Requirements

### Requirement: Un cuerpo puede apuntar a un modelo

El sistema MUST admitir que el cuerpo de una petición o de una respuesta sea una **referencia a un modelo** del contrato, igual que ya lo admite en un campo. Una respuesta de error es casi siempre un bloque que el contrato ya tiene escrito con nombre, y tener que repetirlo en cada `400`, `404` y `409` es la forma de que los tres acaben diciendo cosas distintas.

Un cuerpo MUST poder ser un objeto, un array —de objetos o de un modelo— o una referencia a un modelo, y nada más. Un cuerpo que es un número o un booleano suelto no es un cuerpo, y una respuesta que no tiene forma que describir se dice quitándole el cuerpo, no dándole un tipo vacío.

El sistema MUST ofrecer sobre el cuerpo los **mismos tres verbos** que ya ofrece sobre un campo que referencia: elegir a qué modelo apunta, expandirlo ahí mismo, e ir al modelo para mirarlo. Sin el segundo, la única vuelta atrás sería rehacer el cuerpo desde cero.

Un cuerpo que es un **array de un modelo** MUST poder declarar de qué modelo. Hasta ahora se podía decir que un cuerpo era un array de una referencia y no había dónde decir de cuál, lo que entrega un documento con una referencia rota dentro de `items`.

Lo que la pantalla enseña del cuerpo MUST ser lo que el cuerpo es. Un cuerpo que es una referencia MUST NOT aparecer declarado como otra cosa.

Un cuerpo que pasa a ser una referencia **MUST perder los campos que tuviera**. Es la misma regla que rige en un campo y por el mismo motivo: la forma de una referencia es la del modelo, y conservar los hijos dejaría al contrato enseñando una cosa y exportando otra. Quien quiera conservarlos tiene extraerlos a un modelo, que es exactamente convertirlos en uno.

#### Scenario: Una respuesta de error que ya tiene nombre

- **WHEN** el usuario declara que el cuerpo de la respuesta `404` es el modelo `Error` que el contrato ya tiene
- **THEN** el documento OpenAPI emite ese cuerpo como una referencia a ese schema, y el ejemplo muestra la forma del modelo

#### Scenario: El mismo modelo en tres respuestas

- **WHEN** el usuario apunta los cuerpos de `400`, `404` y `409` al modelo `Error`
- **THEN** los tres referencian el mismo schema, y editar el modelo alcanza a los tres

#### Scenario: Un cuerpo que es una lista de un modelo

- **WHEN** el usuario declara que el cuerpo de una respuesta es un array del modelo `Pedido`
- **THEN** el sistema le deja elegir ese modelo, y el documento emite un array cuyos elementos lo referencian

#### Scenario: El cuerpo de la petición también

- **WHEN** el usuario declara que el cuerpo de la petición de un `POST` es el modelo `CrearPedido`
- **THEN** el sistema lo admite igual que en una respuesta

#### Scenario: La barra dice lo que el cuerpo es

- **WHEN** el usuario mira un cuerpo que es una referencia a un modelo
- **THEN** el sistema lo declara como una referencia, y no como un objeto

#### Scenario: Apuntar a un modelo lo que ya tenía campos

- **WHEN** el usuario apunta a un modelo un cuerpo en el que ya había escrito tres campos
- **THEN** el cuerpo pasa a ser esa referencia y deja de describir campos propios

#### Scenario: Ir al modelo desde el cuerpo

- **WHEN** el usuario pide abrir el modelo al que apunta un cuerpo
- **THEN** el sistema muestra ese modelo en edición

## MODIFIED Requirements

### Requirement: Deshacer una referencia en el sitio

El sistema MUST permitir expandir una referencia: el campo —o el cuerpo— deja de apuntar al modelo y pasa a describir sus campos directamente.

Expandir MUST **copiar**, no mover: el modelo original MUST quedar intacto, y los demás campos que lo referencian MUST seguir haciéndolo.

#### Scenario: Expandir una referencia

- **WHEN** el usuario expande un campo que referencia al modelo `Paginacion`
- **THEN** el campo pasa a ser un objeto con una copia de los campos del modelo

#### Scenario: Expandir el cuerpo de una respuesta

- **WHEN** el usuario expande el cuerpo de una respuesta que referencia al modelo `Error`
- **THEN** el cuerpo pasa a ser un objeto con una copia de los campos del modelo, y el modelo queda intacto

#### Scenario: El modelo sobrevive a que lo expandan

- **WHEN** el usuario expande una de las tres referencias a un modelo
- **THEN** el modelo sigue existiendo y las otras dos referencias siguen apuntando a él
