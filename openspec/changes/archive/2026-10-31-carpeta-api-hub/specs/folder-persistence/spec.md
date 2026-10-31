## ADDED Requirements

### Requirement: API Hub se conecta a su propia carpeta

El sistema MUST permitir conectar API Hub a una carpeta del dispositivo, con las mismas reglas que Roadmaps: es opcional, es independiente de la conexión de cualquier otra aplicación, la carpeta elegida es la raíz del repo y API Hub ocupa en ella su propia subcarpeta `api`, marcada como suya. Sin conexión, API Hub MUST seguir guardando como antes de existir esta capacidad.

Conectar API Hub y Roadmaps al mismo repo MUST dejar a cada uno en su subcarpeta, sin que ninguno lea ni escriba la del otro.

#### Scenario: Las dos aplicaciones en el mismo repo

- **WHEN** el usuario conecta Roadmaps y API Hub eligiendo en los dos casos la raíz del mismo repo
- **THEN** el repo queda con `roadmaps/` y `api/`, cada una con su marcador, y editar en una aplicación no cambia ningún fichero de la otra

#### Scenario: Cada aplicación a un repo distinto

- **WHEN** el usuario conecta Roadmaps a un repo y API Hub a otro
- **THEN** cada aplicación guarda en el suyo, y desconectar una no cambia dónde guarda la otra

#### Scenario: La carpeta de Roadmaps no es de API Hub

- **WHEN** el usuario conecta API Hub eligiendo la subcarpeta `roadmaps` de un repo
- **THEN** el sistema rechaza la conexión diciendo que esa carpeta es de Roadmaps, y no escribe nada

### Requirement: Una conexión para los tres documentos de API Hub

Los contratos, la biblioteca de modelos y las fuentes de valores MUST guardarse en la misma subcarpeta de API Hub, bajo una sola conexión: se conectan, se vuelcan y se desconectan juntos.

Cada documento MUST leerse por separado. Un fichero ilegible de uno de ellos MUST dejar no disponible ese documento, nombrando el fichero, y MUST NOT impedir usar los otros dos. La falta de permiso sobre la carpeta, o una carpeta que ya no está, MUST dejar no disponibles los tres.

Guardar un contrato MUST NOT reescribir la biblioteca ni las fuentes de valores, y guardar en la biblioteca MUST NOT reescribir ningún contrato.

#### Scenario: Un conflicto en la biblioteca

- **WHEN** un fichero de la biblioteca contiene marcas de conflicto de git sin resolver
- **THEN** la biblioteca se muestra no disponible nombrando ese fichero, y los contratos y las fuentes de valores se pueden usar con normalidad

#### Scenario: Falta el permiso

- **WHEN** el usuario abre la aplicación con API Hub conectado y el navegador no ha conservado el permiso sobre la carpeta
- **THEN** los contratos, la biblioteca y las fuentes de valores se muestran no disponibles por la misma causa, y conceder el permiso una vez los abre los tres

#### Scenario: Volcar los tres documentos

- **WHEN** el usuario conecta API Hub a una carpeta vacía teniendo contratos, modelos en la biblioteca y fuentes de valores en el navegador
- **THEN** la carpeta queda con los tres, verificados, y el navegador conserva los tres como estaban

### Requirement: El formato de API Hub en la carpeta

El sistema MUST guardar cada contrato en su propio fichero y cada entrada de la biblioteca en el suyo, nombrados por su id, y las fuentes de valores en un único fichero de catálogo. Los ficheros MUST cumplir las mismas reglas que los de Roadmaps: JSON de texto, escritura determinista, sin valores derivados ni estado de vista, orden de los contratos conservado, y solo se reescriben los ficheros que han cambiado.

Los ajustes del mock de un contrato son datos del contrato y MUST viajar con él. El mock generado no: se deriva del contrato cada vez y MUST NOT escribirse.

#### Scenario: Editar un campo de un contrato

- **WHEN** el usuario cambia la descripción de un campo de un contrato
- **THEN** en la carpeta cambia solo el fichero de ese contrato

#### Scenario: Guardar un modelo en la biblioteca

- **WHEN** el usuario guarda un modelo en la biblioteca
- **THEN** en la carpeta aparece o cambia solo el fichero de esa entrada

#### Scenario: Ida y vuelta

- **WHEN** el sistema escribe los tres documentos en la carpeta y los vuelve a leer
- **THEN** obtiene los mismos contratos en el mismo orden, la misma biblioteca y las mismas fuentes de valores

### Requirement: Lo que es de cada persona en API Hub no viaja a la carpeta

El sistema MUST NOT escribir en la carpeta qué contrato tiene abierto el usuario, qué endpoint o modelo está viendo dentro de cada contrato, ni qué nodos de un árbol tiene plegados, tampoco en los modelos de la biblioteca. Todo eso MUST seguir en el navegador de cada persona.

#### Scenario: Plegar un campo no cambia la carpeta

- **WHEN** el usuario pliega o despliega un campo de un modelo con API Hub conectado
- **THEN** ningún fichero de la carpeta cambia

#### Scenario: Dos personas sobre el mismo contrato

- **WHEN** dos personas conectadas a clones del mismo repo abren endpoints distintos de un mismo contrato y pliegan campos distintos
- **THEN** sus ficheros de datos son idénticos
