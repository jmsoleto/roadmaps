## ADDED Requirements

### Requirement: Reordenación vertical de fases e items

El sistema MUST permitir cambiar el orden vertical de las fases de un roadmap y el de los items dentro de una fase, arrastrándolos.

El gesto MUST arrancar desde una manija propia situada en el canalón de la fila, en la columna de nombres. La cuadrícula temporal MUST quedar excluida: arrastrar sobre ella sigue significando fechas, nunca orden.

La manija MUST ocupar su espacio en la fila de forma permanente y MUST hacerse visible al situar el puntero sobre la fila, de modo que su aparición no desplace nada de lo que ya hay.

El orden resultante MUST persistirse.

#### Scenario: Reordenar una fase

- **WHEN** el usuario arrastra una fase por su manija hasta la posición de otra fase del mismo roadmap
- **THEN** el sistema coloca la fase arrastrada en esa posición, con sus items y su fila de añadir, y persiste el nuevo orden

#### Scenario: Reordenar un item dentro de su fase

- **WHEN** el usuario arrastra un item por su manija hasta otra posición dentro de su fase
- **THEN** el sistema coloca el item en esa posición y persiste el nuevo orden

#### Scenario: Ver el resultado durante el arrastre

- **WHEN** el usuario mantiene una fila arrastrada sobre una posición de destino
- **THEN** el sistema desplaza las demás filas a la posición que van a ocupar, en la columna de nombres y en la cuadrícula a la vez, dejando libre el hueco donde caerá la fila

#### Scenario: Levantar una fase

- **WHEN** el usuario arrastra una fase
- **THEN** el sistema desplaza únicamente su cabecera con el puntero, y coloca sus items y su fila de añadir en la posición de destino

#### Scenario: Un item se frena en los límites de su fase

- **WHEN** el usuario arrastra un item más allá del primero o del último de su fase
- **THEN** el sistema detiene la fila en esa posición extrema aunque el puntero siga avanzando, y al soltar el item queda dentro de su fase

#### Scenario: Un item no cambia de fase

- **WHEN** el usuario suelta un item arrastrado
- **THEN** el item permanece en la fase en la que estaba, conservando sus dependencias, sus bloqueos y su responsable

#### Scenario: Una fase no cambia de roadmap

- **WHEN** el usuario suelta una fase arrastrada
- **THEN** la fase permanece en el roadmap en el que estaba

#### Scenario: Reordenar no altera ninguna fecha

- **WHEN** el usuario reordena una fase o un item
- **THEN** el sistema conserva sin cambios las fechas de todo lo que se ha movido y de todo lo que se ha apartado, y no propaga ninguna cascada de dependencias

#### Scenario: Soltar en el sitio de partida

- **WHEN** el usuario arrastra una fila y la suelta en la posición de la que salió
- **THEN** el sistema deja el orden como estaba
