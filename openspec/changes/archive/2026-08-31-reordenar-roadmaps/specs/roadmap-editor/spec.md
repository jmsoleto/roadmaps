## ADDED Requirements

### Requirement: Reordenación de roadmaps en la vista "Todos"

El sistema MUST permitir cambiar el orden de los roadmaps arrastrándolos en la vista "Todos", con el mismo gesto que reordena fases e items: una manija propia en el canalón de la fila, que ocupa su espacio de forma permanente y se hace visible al situar el puntero sobre la fila.

El orden resultante MUST ser el orden de los roadmaps en toda la aplicación, no el de esa vista: cualquier otra superficie que los enumere MUST presentarlos en él.

Mientras dura el arrastre el sistema MUST desplazar las demás filas a la posición que van a ocupar, en la columna de nombres y en la cuadrícula a la vez, y MUST desplazar la fila arrastrada con el puntero sin dejar que se dibuje fuera de la lista.

El orden MUST persistirse. Es estado local: no viaja en los documentos exportados, porque un documento lleva un solo roadmap.

#### Scenario: Reordenar un roadmap

- **WHEN** el usuario arrastra un roadmap por su manija hasta la posición de otro
- **THEN** el sistema coloca el roadmap arrastrado en esa posición y persiste el nuevo orden

#### Scenario: El orden alcanza a la navegación

- **WHEN** el usuario reordena los roadmaps en "Todos" y despliega después el selector de roadmaps
- **THEN** el selector los enumera en el mismo orden

#### Scenario: Ver el resultado durante el arrastre

- **WHEN** el usuario mantiene un roadmap arrastrado sobre una posición de destino
- **THEN** el sistema desplaza las demás filas a la posición que van a ocupar, dejando libre el hueco donde caerá la fila

#### Scenario: La fila se frena en los extremos de la lista

- **WHEN** el usuario arrastra un roadmap más allá del primero o del último
- **THEN** el sistema detiene la fila en esa posición extrema aunque el puntero siga avanzando

#### Scenario: Reordenar no cambia ningún color

- **WHEN** el usuario reordena los roadmaps
- **THEN** cada roadmap conserva el color que tenía, en todas las superficies que lo muestran

#### Scenario: Soltar en el sitio de partida

- **WHEN** el usuario arrastra un roadmap y lo suelta en la posición de la que salió
- **THEN** el sistema deja el orden como estaba

#### Scenario: Reordenar no altera el contenido

- **WHEN** el usuario reordena los roadmaps
- **THEN** cada roadmap conserva sus fases, sus fechas, su ventana temporal y su línea base, y el roadmap abierto sigue siendo el mismo

## RENAMED Requirements

### Requirement: Color de fases, items y roadmaps por slot de paleta
FROM: `### Requirement: Color de fases e items por slot de paleta`
TO: `### Requirement: Color de fases, items y roadmaps por slot de paleta`

## MODIFIED Requirements

### Requirement: Color de fases, items y roadmaps por slot de paleta
El sistema MUST asignar a cada fase, item y roadmap una posición dentro de la paleta de barras del tema activo, en lugar de un color absoluto, de modo que su color concreto lo determine el tema.

Esa posición MUST ser una propiedad del elemento y no de su lugar en la lista: mover o borrar un elemento MUST NOT cambiar el color de ningún otro.

#### Scenario: Crear una fase
- **WHEN** el usuario crea una fase
- **THEN** el sistema le asigna la siguiente posición de la paleta y la barra se pinta con el color que esa posición tiene en el tema activo

#### Scenario: Crear un roadmap
- **WHEN** el usuario crea un roadmap
- **THEN** el sistema le asigna la siguiente posición de la paleta, y ese color lo identifica en todas las superficies que lo enumeran

#### Scenario: Borrar un roadmap
- **WHEN** el usuario borra un roadmap
- **THEN** los demás conservan su color

#### Scenario: Cambiar el color de un elemento
- **WHEN** el usuario avanza el color de un responsable, que es el único elemento que ofrece hacerlo
- **THEN** el sistema pasa a la siguiente posición de la paleta y recorre todas las posiciones cíclicamente, sin saltar ni volver al principio de forma inesperada

Fases, items y roadmaps reciben su posición al crearse y no ofrecen forma de cambiarla. El escenario decía antes que los tres podían avanzar su color; nunca fue cierto para ninguno salvo el responsable.

#### Scenario: Un elemento conserva su posición al cambiar de tema
- **WHEN** el usuario cambia el tema activo
- **THEN** cada fase, item, roadmap y responsable conserva su posición en la paleta y adopta el color que esa posición tiene en el tema nuevo
