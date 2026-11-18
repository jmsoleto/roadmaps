## MODIFIED Requirements

### Requirement: Sprints en planificación

El sistema MUST permitir crear un sprint de un equipo activo con nombre, fecha de inicio, fecha de fin y porcentaje de reserva para incidencias. Al crearlo, MUST incorporar a todas las personas activas del equipo con su dedicación por defecto. El sistema MUST proponer como nombre el siguiente número de sprint del equipo, como inicio el día laborable siguiente al fin del sprint anterior, como duración dos semanas y como reserva la del sprint anterior (o un 15 % si no lo hay). El sistema MUST permitir quitar e incorporar personas del equipo al sprint, y sustituir para ese sprint la dedicación de cualquiera de ellas. La fecha de fin MUST NOT ser anterior a la de inicio, y la reserva MUST estar entre 0 y 100 %. Quitar o incorporar personas, y cambiar las fechas o la reserva, MUST ser posible solo mientras el sprint está en planificación (`personas-plan-real`).

#### Scenario: Crear un sprint

- **WHEN** el usuario crea un sprint del equipo Pagos, que tiene diez personas activas y una inactiva
- **THEN** el sprint incorpora a las diez personas activas, con su dedicación por defecto

#### Scenario: El sprint siguiente

- **WHEN** el último sprint del equipo se llamaba «Sprint 18», terminaba un viernes y reservaba un 20 %
- **THEN** el sistema propone «Sprint 19», empezando el lunes siguiente, de dos semanas y con un 20 % de reserva

#### Scenario: Alguien que esta vez no está

- **WHEN** el usuario quita a una persona de un sprint
- **THEN** su capacidad deja de contar en ese sprint, y la persona sigue en el equipo

### Requirement: Pantallas de Personas Hub

Personas Hub MUST mostrar a la izquierda sus equipos y el acceso a los catálogos, y a la derecha lo que esté abierto:

- **Un equipo**, con sus sprints (del más reciente al más antiguo, con su estado y la capacidad planificable de cada uno: la del plan si ya está activo o cerrado), sus personas y sus ausencias.
- **Un sprint**, con su estado y la acción que lo hace avanzar (activar o cerrar), su resumen de capacidad y desglose, sus personas con la dedicación del sprint, su matriz diaria de disponibilidad y, si está activo o cerrado, la comparación entre lo planificado y lo real. En un sprint activo o cerrado, el resumen, el desglose y la matriz MUST poder verse del plan o de lo real.
- **Un catálogo**: roles y tecnologías, o localidades y festivos.

Desde la matriz de un sprint, el usuario MUST poder registrar una ausencia a una persona en un día sin salir del sprint. Al entrar en la aplicación, MUST abrirse el primer equipo activo. Sin equipos, MUST explicarse qué es un equipo y ofrecer crear el primero. Qué está abierto MUST NOT guardarse con los datos.

#### Scenario: Planificar en tres pasos

- **WHEN** el usuario abre un sprint, revisa sus personas y registra desde la matriz una ausencia que conocía
- **THEN** el resumen del sprint muestra al momento la capacidad planificable resultante

#### Scenario: Sin equipos

- **WHEN** el usuario entra en Personas Hub sin ningún equipo
- **THEN** el sistema explica qué es un equipo y ofrece crear el primero, sin mostrar catálogos vacíos como si fueran la aplicación

### Requirement: La tarjeta de Personas Hub en la landing

La tarjeta de Personas Hub MUST mostrar tres cifras: las personas activas, los sprints activos y los sprints en planificación. Su lista MUST titularse «PRÓXIMOS SPRINTS» y mostrar hasta tres sprints que no han terminado, del más próximo al más lejano, cada uno con su capacidad planificable (la real si está activo) y, si está activo, la marca de que está en curso. Elegir una fila MUST abrir ese sprint. Sin sprints pendientes, la lista MUST decirlo. En este cambio Personas Hub MUST NOT aportar avisos.

#### Scenario: La tarjeta con un sprint por empezar

- **WHEN** hay un sprint de Pagos que empieza el lunes con 469,2 horas planificables
- **THEN** la tarjeta lo lista en «PRÓXIMOS SPRINTS» con «469,2 h»

#### Scenario: Abrir un sprint desde la landing

- **WHEN** el usuario elige un sprint en la tarjeta
- **THEN** el sistema entra en Personas Hub con ese sprint abierto
