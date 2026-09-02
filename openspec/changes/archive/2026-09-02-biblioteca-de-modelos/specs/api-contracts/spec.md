## ADDED Requirements

### Requirement: Una biblioteca de modelos transversal a los contratos

El sistema MUST ofrecer una biblioteca de modelos propia de la aplicación y **común a todos sus contratos**, donde guardar un modelo para poder usarlo en otro.

El sistema MUST permitir guardar un modelo desde su editor, ver los que hay guardados, traerlos a un contrato y borrarlos de la biblioteca.

Cada entrada MUST decir cuándo se guardó, y borrar una MUST NOT afectar a ningún contrato: lo que se llevó de ella ya es suyo.

#### Scenario: Guardar un modelo

- **WHEN** el usuario guarda en la biblioteca un modelo de su contrato
- **THEN** el sistema lo conserva bajo su nombre, disponible desde cualquier contrato

#### Scenario: Volver a guardar el mismo nombre

- **WHEN** el usuario guarda un modelo cuyo nombre ya está en la biblioteca
- **THEN** el sistema avisa de que va a reemplazar la entrada anterior y solo lo hace si se confirma

#### Scenario: Borrar de la biblioteca

- **WHEN** el usuario borra una entrada de la biblioteca
- **THEN** los contratos que trajeron ese modelo lo conservan sin cambios

### Requirement: Guardar un modelo se lleva sus dependencias

Cuando el modelo que se guarda referencia a otros modelos, el sistema MUST guardarlos con él, incluidos los que estos referencien a su vez.

Un modelo guardado a medias se trae con referencias rotas, que es peor que no poder traerlo: el contrato de destino queda describiendo algo que no está.

El sistema MUST decir qué se lleva además del modelo elegido, para que guardar no sea una operación con efectos que no se ven.

#### Scenario: Dependencias en cadena

- **WHEN** el usuario guarda un modelo `ItemProducto` que referencia a `Paginacion`, que a su vez referencia a `Moneda`
- **THEN** el sistema guarda los tres y lo dice

#### Scenario: Un modelo recursivo

- **WHEN** el usuario guarda un modelo que se referencia a sí mismo
- **THEN** el sistema lo guarda una sola vez, sin bloquearse

### Requirement: Traer un modelo copia, nunca enlaza

El sistema MUST traer un modelo de la biblioteca a un contrato **copiándolo**: el modelo que llega recibe identidad nueva y sus referencias se remapean a las copias que llegan con él.

El sistema MUST NOT crear ningún vínculo vivo entre el modelo del contrato y la entrada de la biblioteca. Sin servidor no hay forma de versionar un modelo compartido ni de resolver un conflicto entre dos contratos que lo hayan cambiado, y un enlace que nadie puede mantener es peor que una copia que se sabe copia.

Editar el modelo traído MUST NOT alterar la biblioteca, y editar la biblioteca MUST NOT alterar los contratos que ya trajeron algo de ella.

#### Scenario: Traer un modelo con sus dependencias

- **WHEN** el usuario trae `ItemProducto`, que en la biblioteca depende de `Paginacion`
- **THEN** el contrato recibe los dos, y la referencia de `ItemProducto` apunta al `Paginacion` que acaba de llegar

#### Scenario: Lo traído es del contrato

- **WHEN** el usuario cambia un campo de un modelo que trajo de la biblioteca
- **THEN** la entrada de la biblioteca no cambia

#### Scenario: La biblioteca no alcanza a los contratos

- **WHEN** el usuario reemplaza una entrada de la biblioteca
- **THEN** los contratos que ya la trajeron siguen como estaban

### Requirement: Un nombre que ya existe se decide, no se renombra a la callada

Cuando lo que se trae incluye un modelo cuyo nombre ya existe en el contrato, el sistema MUST preguntar qué hacer con **ese** modelo, ofreciendo reutilizar el que ya está o traer el de la biblioteca como un modelo aparte.

Renombrar en silencio a `Paginacion2` produce exactamente la divergencia que la biblioteca existe para evitar, y lo hace sin que nadie lo decida. Reutilizar en silencio cambia lo que el bloque traído describía. Las dos salidas son legítimas y ninguna se puede elegir por el usuario.

El sistema MUST ayudar a decidir diciendo en qué se diferencian los dos, aunque sea de forma somera.

El sistema MUST NOT preguntar cuando no hay colisión: traer un modelo cuyo nombre nadie usa MUST ser un solo gesto.

#### Scenario: Sin colisión

- **WHEN** el usuario trae un modelo cuyo nombre no existe en el contrato
- **THEN** el sistema lo trae sin preguntar nada

#### Scenario: Reutilizar el que ya está

- **WHEN** el usuario trae un bundle cuyo `Paginacion` colisiona y elige reutilizar el suyo
- **THEN** el sistema no añade un segundo `Paginacion`, y lo que venía apuntando a él apunta al que ya estaba

#### Scenario: Traerlo aparte

- **WHEN** el usuario elige traer el de la biblioteca en lugar de reutilizar el suyo
- **THEN** el sistema añade el modelo con un nombre que no choca, y lo que venía con él apunta al recién traído

#### Scenario: Saber en qué se diferencian

- **WHEN** el sistema pregunta por una colisión
- **THEN** dice algo de cada uno de los dos que permita distinguirlos

#### Scenario: Varias colisiones a la vez

- **WHEN** lo que se trae colisiona en dos nombres
- **THEN** el usuario decide cada uno por separado
