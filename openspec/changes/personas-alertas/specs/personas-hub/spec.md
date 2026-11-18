## MODIFIED Requirements

### Requirement: Equipos

El sistema MUST permitir crear y renombrar equipos, con un nombre obligatorio y una descripción opcional, y fijar en cada equipo sus roles críticos y su umbral de caída de capacidad (`personas-alertas`). Un equipo con personas o con sprints MUST NOT borrarse: solo se puede inactivar, y un equipo inactivo deja de ofrecerse para sprints nuevos pero conserva todo lo suyo. Un equipo vacío MUST poder borrarse.

#### Scenario: Crear el primer equipo

- **WHEN** el usuario entra en Personas Hub sin equipos y crea el equipo «Pagos»
- **THEN** el equipo queda abierto, listo para dar de alta a sus personas

#### Scenario: Un equipo con historia

- **WHEN** el usuario intenta borrar un equipo que tiene sprints
- **THEN** el sistema no lo borra y ofrece inactivarlo

### Requirement: Pantallas de Personas Hub

Personas Hub MUST mostrar a la izquierda sus equipos y el acceso a los catálogos, y a la derecha lo que esté abierto:

- **Un equipo**, con sus sprints (del más reciente al más antiguo, con su estado y la capacidad planificable de cada uno: la del plan si ya está activo o cerrado), sus personas, sus ausencias y su histórico (`personas-historico`).
- **Un sprint**, con su estado y la acción que lo hace avanzar (activar o cerrar), su resumen de capacidad y desglose, sus personas con la dedicación del sprint, su matriz diaria de disponibilidad, sus resultados por familia, sus alertas, el forecast de Story Points mientras está en planificación y, si está activo o cerrado, la comparación entre lo planificado y lo real. En un sprint activo o cerrado, el resumen, el desglose y la matriz MUST poder verse del plan o de lo real.
- **Un catálogo**: roles y tecnologías, o localidades y festivos.

Desde la matriz de un sprint, el usuario MUST poder registrar una ausencia a una persona en un día sin salir del sprint. Al entrar en la aplicación, MUST abrirse el primer equipo activo. Sin equipos, MUST explicarse qué es un equipo y ofrecer crear el primero. Qué está abierto MUST NOT guardarse con los datos.

#### Scenario: Planificar en tres pasos

- **WHEN** el usuario abre un sprint, revisa sus personas y registra desde la matriz una ausencia que conocía
- **THEN** el resumen del sprint muestra al momento la capacidad planificable resultante

#### Scenario: Sin equipos

- **WHEN** el usuario entra en Personas Hub sin ningún equipo
- **THEN** el sistema explica qué es un equipo y ofrece crear el primero, sin mostrar catálogos vacíos como si fueran la aplicación

### Requirement: La tarjeta de Personas Hub en la landing

La tarjeta de Personas Hub MUST mostrar tres cifras: las personas activas, los sprints activos y los sprints en planificación. Su lista MUST titularse «PRÓXIMOS SPRINTS» y mostrar hasta tres sprints que no han terminado, del más próximo al más lejano, cada uno con su capacidad planificable (la real si está activo) y, si está activo, la marca de que está en curso. Junto a un sprint en planificación MUST mostrar los SP recomendados por la media de los 3 últimos sprints, si hay histórico. Elegir una fila MUST abrir ese sprint. Sin sprints pendientes, la lista MUST decirlo. Personas Hub MUST aportar a la tira de avisos las alertas de sus sprints en planificación y activos (`personas-alertas`).

#### Scenario: La tarjeta con un sprint por empezar

- **WHEN** hay un sprint de Pagos que empieza el lunes con 469,2 horas planificables
- **THEN** la tarjeta lo lista en «PRÓXIMOS SPRINTS» con «469,2 h»

#### Scenario: Abrir un sprint desde la landing

- **WHEN** el usuario elige un sprint en la tarjeta
- **THEN** el sistema entra en Personas Hub con ese sprint abierto
