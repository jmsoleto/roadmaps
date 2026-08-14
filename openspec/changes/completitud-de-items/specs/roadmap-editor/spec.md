## MODIFIED Requirements

### Requirement: Barras del Gantt editables por interacción directa
El sistema MUST permitir crear, mover y redimensionar barras arrastrando en la cuadrícula temporal.

Los items completados MUST quedar excluidos de esta edición: sus fechas no cambian por arrastre ni por redimensión. Ver `completion`, que define el congelamiento y su representación en la barra.

#### Scenario: Crear una barra arrastrando
- **WHEN** el usuario arrastra sobre una fila vacía en el área de cuadrícula
- **THEN** el sistema crea una barra cuyo inicio y fin corresponden al rango arrastrado

#### Scenario: Mover una barra
- **WHEN** el usuario arrastra el cuerpo de una barra
- **THEN** el sistema desplaza inicio y fin conservando la duración

#### Scenario: Redimensionar una barra por un borde
- **WHEN** el usuario arrastra el borde de una barra
- **THEN** el sistema ajusta solo ese extremo de la fecha

#### Scenario: Arrastrar la barra de un item completado
- **WHEN** el usuario arrastra el cuerpo o un borde de la barra de un item completado
- **THEN** el sistema no altera sus fechas

### Requirement: Dependencias entre items
El sistema MUST permitir declarar dependencias de un item respecto a otros y representarlas visualmente con flechas.

El sistema MUST impedir que un item completado declare una dependencia respecto a un item que no lo esté, ya que un item completado no puede quedar con un predecesor pendiente. Ver `completion`.

#### Scenario: Visualizar una dependencia
- **WHEN** un item declara depender de otro
- **THEN** el sistema dibuja una flecha desde el item predecesor hasta el dependiente

#### Scenario: Eliminar una dependencia
- **WHEN** el usuario elimina una dependencia existente
- **THEN** el sistema deja de mostrar la flecha y actualiza el modelo del item

#### Scenario: Declarar una dependencia desde un item completado hacia uno pendiente
- **WHEN** el usuario intenta declarar en un item completado una dependencia respecto a un item que no está completado
- **THEN** el sistema no la añade y el item completado conserva sus dependencias tal como estaban
