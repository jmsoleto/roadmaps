# personas-hub

## Purpose
Personas Hub es la aplicación del hub que sustituye al Excel de disponibilidad, capacidad y velocidad por sprint. Este documento cubre lo que mantiene quien lleva el equipo: los catálogos, los equipos, las personas, sus ausencias y los sprints. El ciclo de un sprint y sus dos verdades están en `personas-plan-real`. También cubre sus pantallas, su tarjeta en la landing y su documento de intercambio.

## Requirements

### Requirement: Catálogo de roles

El sistema MUST permitir crear, renombrar e inactivar roles. Un rol inactivo MUST NOT ofrecerse al dar de alta o editar personas, pero MUST seguir mostrándose en las personas que ya lo tienen. Un rol que no tiene ninguna persona MUST poder borrarse; uno que la tiene, no.

#### Scenario: Crear un rol

- **WHEN** el usuario crea el rol «QA»
- **THEN** el rol aparece en el catálogo y se puede asignar a personas

#### Scenario: Inactivar un rol en uso

- **WHEN** el usuario inactiva un rol que tienen dos personas
- **THEN** las dos personas lo conservan, el rol no se ofrece a nadie más y no se puede borrar

### Requirement: Catálogo de tecnologías en dos niveles

Las tecnologías MUST organizarse en familias y tecnologías dentro de cada familia, y MUST NOT estar fijadas en el código: se crean, se renombran y se inactivan como los roles. Una aplicación nueva MUST empezar con el árbol del PRD: APP (App Front, App Back / Gateway, QA), WEB (Web, QA) y BACKEND (Backend). Una persona MUST poder tener una tecnología o directamente una familia.

#### Scenario: El catálogo de partida

- **WHEN** el usuario entra por primera vez en Personas Hub
- **THEN** el catálogo de tecnologías ya contiene las familias APP, WEB y BACKEND con sus tecnologías

#### Scenario: Dos QA distintos

- **WHEN** una persona tiene QA de APP y otra QA de WEB
- **THEN** el sistema las distingue, porque cada QA pertenece a su familia

### Requirement: Localidades y festivos

El sistema MUST permitir crear, renombrar e inactivar localidades, y mantener para cada una su lista de festivos, cada uno con fecha y nombre. Los festivos MUST poder añadirse de uno en uno o pegando una lista con una fecha y un nombre por línea. Las líneas que no se entienden MUST rechazarse diciendo cuáles son, sin perder las demás. Una fecha que ya es festivo de esa localidad MUST NOT duplicarse.

#### Scenario: Pegar el calendario del año

- **WHEN** el usuario pega en Madrid doce líneas con fecha y nombre, y una de ellas no tiene una fecha válida
- **THEN** se añaden los once festivos válidos y el sistema dice qué línea no ha entendido

#### Scenario: Un festivo repetido

- **WHEN** el usuario pega un festivo con una fecha que Madrid ya tiene
- **THEN** el festivo no se duplica

### Requirement: Equipos

El sistema MUST permitir crear y renombrar equipos, con un nombre obligatorio y una descripción opcional. Un equipo con personas o con sprints MUST NOT borrarse: solo se puede inactivar, y un equipo inactivo deja de ofrecerse para sprints nuevos pero conserva todo lo suyo. Un equipo vacío MUST poder borrarse.

#### Scenario: Crear el primer equipo

- **WHEN** el usuario entra en Personas Hub sin equipos y crea el equipo «Pagos»
- **THEN** el equipo queda abierto, listo para dar de alta a sus personas

#### Scenario: Un equipo con historia

- **WHEN** el usuario intenta borrar un equipo que tiene sprints
- **THEN** el sistema no lo borra y ofrece inactivarlo

### Requirement: Personas

Cada persona MUST pertenecer a un equipo y tener nombre, rol, tecnología o familia, localidad, horas por día y dedicación por defecto, además de su estado (activa o inactiva). Las horas por día MUST estar entre 0 y 24, sin incluir el 0. La dedicación MUST estar entre 0 y 100 %, ambos incluidos, y admitir decimales. Un valor fuera de rango MUST rechazarse diciendo por qué. Una persona que aparece en algún sprint MUST NOT borrarse: solo se puede inactivar. Una persona inactiva MUST seguir en los sprints en los que ya estaba, y MUST NOT incorporarse a los sprints nuevos.

#### Scenario: Dar de alta una persona

- **WHEN** el usuario da de alta a una persona de QA, de Madrid, con 8 horas por día y un 100 % de dedicación
- **THEN** la persona aparece en su equipo con esos datos

#### Scenario: Dedicación fuera de rango

- **WHEN** el usuario escribe una dedicación del 120 %
- **THEN** el sistema no la guarda y dice que la dedicación debe estar entre 0 y 100 %

#### Scenario: Inactivar a quien ya estuvo en un sprint

- **WHEN** el usuario inactiva a una persona que participa en un sprint
- **THEN** la persona sigue en ese sprint y no se incorpora al siguiente que se cree

### Requirement: Ausencias

El sistema MUST permitir registrar, editar y borrar ausencias de una persona. Cada ausencia tiene un tipo, una fecha de inicio y una de fin (ambas incluidas), si es de día completo o de unas horas por día, y un comentario opcional. Los tipos MUST ser: vacaciones, baja médica, permiso, formación, asuntos propios y otra. La fecha de fin MUST NOT ser anterior a la de inicio, y las horas de una ausencia parcial MUST ser mayores que 0.

#### Scenario: Registrar unas vacaciones

- **WHEN** el usuario registra unas vacaciones de una persona del 22 al 26 de diciembre
- **THEN** la ausencia queda en la persona y descuenta esos días laborables en los sprints que los incluyen

#### Scenario: Fechas al revés

- **WHEN** el usuario pone una fecha de fin anterior a la de inicio
- **THEN** el sistema no guarda la ausencia y dice por qué

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

### Requirement: Exportar e importar Personas Hub

El sistema MUST exportar todo Personas Hub (catálogos, equipos, personas, ausencias y sprints) a un documento JSON propio, que se declara como de Personas Hub y lleva su propia versión. Después de descargarlo, MUST decir que el fichero contiene datos personales y de ausencias.

Importar MUST restaurar un documento de Personas Hub solo cuando Personas Hub está vacío, porque no tiene equipos, personas ni sprints. Con datos, MUST rechazarlo sin cambiar nada y decir por qué. Un documento ilegible o de otra aplicación MUST rechazarse sin cambiar nada.

#### Scenario: Exportar

- **WHEN** el usuario exporta Personas Hub
- **THEN** se descarga un único fichero y la barra avisa de que contiene datos personales

#### Scenario: Restaurar en otro navegador

- **WHEN** el usuario importa ese fichero en un Personas Hub vacío
- **THEN** quedan los mismos equipos, personas, ausencias y sprints, y cada sprint calcula la misma capacidad

#### Scenario: Importar sobre datos

- **WHEN** el usuario importa un documento de Personas Hub teniendo ya equipos
- **THEN** el sistema no cambia nada y explica que la importación solo restaura en un Personas Hub vacío
