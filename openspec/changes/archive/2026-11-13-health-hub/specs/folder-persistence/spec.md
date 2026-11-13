## ADDED Requirements

### Requirement: Health Hub solo guarda en una carpeta

El sistema MUST guardar los datos de Health Hub únicamente en una carpeta conectada. A diferencia de las demás aplicaciones, Health Hub MUST NOT tener un almacén en el navegador: sin carpeta conectada, MUST explicar para qué la necesita y ofrecer conectarla, sin crear ni mostrar datos.

La conexión MUST seguir las reglas de las demás aplicaciones: es independiente de las otras, la carpeta elegida es la raíz del repo, ocupa su propia subcarpeta `health` marcada como suya, y aplica los mismos rechazos, el mismo recuerdo de la conexión y el mismo permiso.

Conectar a una carpeta sin datos MUST crear el marcador y el catálogo inicial de métricas, sin volcar nada del navegador. Desconectar MUST dejar la carpeta intacta y devolver a Health Hub al estado sin carpeta.

Cuando el navegador no ofrezca acceso a carpetas, Health Hub MUST indicar que hace falta Chrome o Edge y MUST NOT ofrecer conectar.

#### Scenario: Health Hub sin carpeta

- **WHEN** el usuario entra en Health Hub sin carpeta conectada
- **THEN** el sistema explica que los datos viven en una carpeta de un repo privado, ofrece conectarla y no muestra paneles ni cifras

#### Scenario: Conectar a una carpeta nueva

- **WHEN** el usuario conecta Health Hub a la raíz de un repo sin subcarpeta `health`
- **THEN** el sistema crea `health/` con su marcador y el catálogo de métricas

#### Scenario: Conectar Health Hub no mueve a las demás

- **WHEN** el usuario conecta Health Hub a una carpeta
- **THEN** ninguna otra aplicación del hub cambia dónde guarda sus datos

#### Scenario: Desconectar

- **WHEN** el usuario desconecta Health Hub
- **THEN** la carpeta queda como estaba y Health Hub vuelve a pedir una carpeta

### Requirement: El formato de Health Hub en la carpeta

El sistema MUST guardar en la subcarpeta `health` el catálogo, el orden de las aplicaciones vigiladas, un fichero por aplicación vigilada con sus consultas y versiones, y sus observaciones en un fichero por aplicación y mes. Los ficheros MUST cumplir las reglas de formato de las demás aplicaciones: JSON de texto, escritura determinista y sin estado de vista, y solo se reescriben los que han cambiado.

Cada observación MUST ocupar una sola línea, para que un diff muestre exactamente qué día cambió. Las observaciones MUST escribirse ordenadas por día y métrica.

Un fichero de datos ilegible, o cuyo contenido contradiga su nombre, MUST dejar Health Hub no disponible nombrando el fichero, como en las demás aplicaciones. Un día duplicado para la misma métrica en un fichero MUST tratarse como ilegible. Un fichero de la bandeja de entrada MUST NOT provocar ese estado: queda rechazado individualmente.

El sistema MUST NOT tocar ningún fichero de la subcarpeta que no reconozca como suyo.

#### Scenario: Una captura cambia un solo mes

- **WHEN** se consolida una captura con días de noviembre de la aplicación vigilada «Pedidos»
- **THEN** en la carpeta cambia solo el fichero de observaciones de «Pedidos» de noviembre, y la entrada desaparece

#### Scenario: Un día corregido

- **WHEN** cambia el valor de un día ya guardado
- **THEN** el diff del fichero muestra una única línea cambiada

#### Scenario: Observaciones con un conflicto de git

- **WHEN** un fichero de observaciones contiene marcas de conflicto sin resolver
- **THEN** Health Hub se muestra no disponible nombrando ese fichero, y no escribe nada en la carpeta

#### Scenario: Fichero ajeno

- **WHEN** la subcarpeta contiene un fichero que Health Hub no reconoce
- **THEN** el sistema no lo lee como dato, no lo modifica y no lo borra
