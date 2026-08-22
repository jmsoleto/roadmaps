# decisions

## Purpose

Las decisiones de proyecto que hay que cerrar con negocio, y el traslado que va desde donde nacen hasta donde se resuelven. Una decisión lleva dos textos —la duda como surgió, normalmente en lenguaje técnico, y la misma cuestión formulada para quien decide—, y esa traducción es parte del registro, no solo su resultado.

Cubre la captura rápida de un solo campo, el ciclo de vida derivado de los datos y nunca almacenado, las alternativas con lo que cada una le hace a un conjunto corto de ejes, la recomendación congelada en el instante en que deja de poder discutirse, la resolución y su comparación con aquella, y el resumen que la aplicación aporta a la landing del hub.

Deliberadamente sin vínculo con `roadmap-editor`: una decisión no tiene duración, tiene fecha límite y resolución.
## Requirements
### Requirement: Una decisión lleva la duda y la pregunta como textos distintos
El sistema MUST guardar en una decisión, por separado, la **duda de origen** —la pregunta tal como surgió, normalmente en lenguaje técnico— y la **pregunta a negocio** —la misma cuestión formulada de modo que quien decide pueda responderla. El sistema MUST permitir además registrar el contexto del que salió la duda, en texto libre.

El sistema MUST proponer la pregunta a negocio rellenada con el texto de la duda de origen la primera vez que se prepara una decisión, y MUST permitir editarla. Una decisión que ya nació en lenguaje de negocio no puede obligar a reescribir el mismo texto.

La duda de origen MUST poder quedar vacía, para las decisiones que nacen directamente en una conversación con negocio.

#### Scenario: Traducir una duda técnica
- **WHEN** el usuario prepara una decisión cuya duda de origen es técnica
- **THEN** el sistema ofrece la pregunta a negocio con el texto de origen ya escrito, y conserva ambos textos por separado cuando el usuario la reescribe

#### Scenario: La duda ya estaba en lenguaje de negocio
- **WHEN** el usuario prepara una decisión y acepta sin cambios la pregunta propuesta
- **THEN** el sistema la da por preparada sin pedir que se reescriba nada

#### Scenario: El origen se conserva tras traducir
- **WHEN** una decisión traducida se consulta más tarde
- **THEN** el sistema sigue mostrando la duda tal como nació y el contexto del que salió

### Requirement: El estado de una decisión se deriva de sus datos
El sistema MUST derivar el estado de una decisión de qué campos tiene puestos y de la fecha de hoy, y MUST NOT almacenar el estado como un campo propio:

- **borrador**: no tiene pregunta a negocio.
- **preparada**: tiene pregunta a negocio y no se ha planteado.
- **planteada**: se ha planteado y no tiene resolución.
- **resuelta**: tiene resolución.
- **caducada**: está planteada y su fecha límite ya pasó.

Una decisión resuelta MUST NOT considerarse caducada, cualquiera que sea su fecha límite.

#### Scenario: Una decisión recién capturada
- **WHEN** el usuario crea una decisión con solo una línea de texto
- **THEN** el sistema la muestra como borrador

#### Scenario: Vencer sin respuesta
- **WHEN** una decisión planteada alcanza el día siguiente a su fecha límite sin resolución
- **THEN** el sistema la muestra como caducada, sin que nadie haya tenido que marcarla

#### Scenario: Aplazar una decisión caducada
- **WHEN** el usuario mueve la fecha límite de una decisión caducada a una fecha futura
- **THEN** el sistema vuelve a mostrarla como planteada

#### Scenario: Resolver fuera de plazo
- **WHEN** el usuario resuelve una decisión cuya fecha límite ya había pasado
- **THEN** el sistema la muestra como resuelta y no como caducada

#### Scenario: Sin fecha límite
- **WHEN** una decisión planteada no tiene fecha límite
- **THEN** el sistema la mantiene como planteada indefinidamente y nunca la da por caducada

### Requirement: Captura rápida de un solo campo
El sistema MUST permitir crear una decisión escribiendo únicamente una línea de texto y confirmando, sin exigir proyecto, responsable, fecha límite ni impacto. El texto introducido MUST guardarse como duda de origen.

El sistema MUST ofrecer esa captura tanto dentro de la aplicación como desde la tarjeta de Decisions en la landing del hub.

#### Scenario: Capturar en mitad de una reunión
- **WHEN** el usuario abre la captura rápida, escribe una línea y confirma
- **THEN** el sistema crea la decisión como borrador y queda listo para capturar otra

#### Scenario: Ningún otro campo es obligatorio
- **WHEN** el usuario intenta confirmar la captura con solo el texto puesto
- **THEN** el sistema no reclama ningún dato adicional

#### Scenario: Texto vacío
- **WHEN** el usuario intenta confirmar la captura sin escribir nada
- **THEN** el sistema no crea ninguna decisión

### Requirement: Los borradores cuentan y se ven
El sistema MUST incluir los borradores en los recuentos de decisiones abiertas y MUST ofrecer verlos agrupados. El sistema MUST NOT ocultarlos hasta que estén completos.

#### Scenario: Deuda de traducción visible
- **WHEN** existen decisiones capturadas y todavía sin traducir
- **THEN** el sistema indica cuántas son, sin que el usuario tenga que buscarlas

### Requirement: Alternativas con ejes de intercambio
El sistema MUST permitir asociar a una decisión una lista ordenada de alternativas, cada una con su texto. Para cada alternativa, el sistema MUST permitir declarar, sobre un conjunto corto y fijo de ejes, si esa alternativa sube, mantiene o baja ese eje, con una nota opcional de una línea.

Los ejes MUST ser los mismos para todas las alternativas de todas las decisiones, para que las alternativas se puedan comparar entre sí. Declarar un eje MUST ser opcional: una alternativa puede no decir nada sobre uno o sobre ninguno.

El sistema MUST NOT calcular puntuaciones, totales ni recomendaciones automáticas a partir de los ejes.

#### Scenario: Comparar el intercambio de dos alternativas
- **WHEN** dos alternativas declaran efectos sobre los mismos ejes
- **THEN** el sistema las muestra de modo que la diferencia entre ambas se lee eje a eje

#### Scenario: Una alternativa sin efectos declarados
- **WHEN** una alternativa no declara ningún eje
- **THEN** el sistema la muestra igualmente, sin efectos y sin inventarlos

#### Scenario: Ninguna puntuación
- **WHEN** el usuario consulta una decisión con varias alternativas valoradas
- **THEN** el sistema no muestra ninguna puntuación, total ni ranking derivado de los ejes

### Requirement: La recomendación se congela al plantear
El sistema MUST permitir registrar, antes de plantear una decisión, qué alternativa se recomienda y por qué.

El sistema MUST congelar esa recomendación en el instante en que la decisión se plantea: a partir de ahí MUST NOT permitir cambiarla ni retirarla. Plantear MUST ser un gesto explícito del usuario y MUST registrar su fecha.

El sistema MUST permitir plantear una decisión **sin** recomendación. Exigirla produciría recomendaciones de trámite.

#### Scenario: Recomendar antes de plantear
- **WHEN** el usuario elige una alternativa como recomendada en una decisión preparada
- **THEN** el sistema la registra y permite cambiarla mientras la decisión no se haya planteado

#### Scenario: Intentar reescribir la recomendación después
- **WHEN** el usuario intenta cambiar la recomendación de una decisión ya planteada
- **THEN** el sistema no la altera y sigue mostrando la que se congeló

#### Scenario: Plantear sin recomendación
- **WHEN** el usuario plantea una decisión sin haber recomendado ninguna alternativa
- **THEN** el sistema la marca como planteada y registra que no hubo recomendación

### Requirement: Resolución y su comparación con la recomendación
El sistema MUST permitir registrar la resolución de una decisión planteada, eligiendo una de sus alternativas o escribiendo una resolución que no corresponde a ninguna, junto con la fecha en que se cerró.

Cuando hubo recomendación, el sistema MUST derivar y mostrar cuál de estos tres desenlaces se dio:

- **coincidió**: se resolvió en la alternativa recomendada.
- **se decidió otra**: se resolvió en una alternativa distinta de la recomendada.
- **fuera de las alternativas**: se resolvió en algo que no era ninguna de las ofrecidas.

El tercer desenlace MUST presentarse como información sobre cómo se plantearon las alternativas, no como un error.

#### Scenario: La resolución coincide con lo recomendado
- **WHEN** una decisión con recomendación se resuelve en esa misma alternativa
- **THEN** el sistema indica que coincidió

#### Scenario: Negocio elige otra alternativa
- **WHEN** una decisión con recomendación se resuelve en una alternativa distinta
- **THEN** el sistema indica que se decidió otra, mostrando ambas

#### Scenario: La respuesta no estaba entre las alternativas
- **WHEN** una decisión se resuelve con un texto que no corresponde a ninguna alternativa
- **THEN** el sistema lo registra e indica que se resolvió fuera de las alternativas ofrecidas

#### Scenario: Resolver sin haber recomendado
- **WHEN** se resuelve una decisión que se planteó sin recomendación
- **THEN** el sistema registra la resolución y no muestra ningún desenlace comparado

### Requirement: Proyecto como texto libre con sugerencias
El sistema MUST permitir asociar una decisión a un proyecto escrito en texto libre, y MUST sugerir mientras se escribe los proyectos ya usados en otras decisiones. Las sugerencias MUST NOT impedir escribir un proyecto nuevo.

El sistema MUST permitir filtrar las decisiones por proyecto.

#### Scenario: Reutilizar un proyecto existente
- **WHEN** el usuario empieza a escribir en el proyecto de una decisión
- **THEN** el sistema ofrece los proyectos ya usados que coinciden con lo escrito

#### Scenario: Estrenar un proyecto
- **WHEN** el usuario escribe un proyecto que no existía y confirma
- **THEN** el sistema lo acepta y lo ofrece como sugerencia a partir de entonces

### Requirement: Datos de acompañamiento de una decisión
El sistema MUST permitir registrar en una decisión quién decide en negocio, su fecha límite, su impacto y notas en texto libre. Todos ellos MUST ser opcionales.

#### Scenario: Completar una decisión capturada
- **WHEN** el usuario abre una decisión en borrador y añade responsable, fecha límite e impacto
- **THEN** el sistema los guarda y los muestra junto a la decisión

### Requirement: Las decisiones se ordenan por lo que más urge
El sistema MUST ordenar por defecto las decisiones abiertas por urgencia: primero las caducadas, después las que tienen fecha límite más próxima, y al final las que no tienen fecha.

#### Scenario: Lo vencido va primero
- **WHEN** coexisten decisiones caducadas y decisiones con límite futuro
- **THEN** el sistema muestra antes las caducadas

#### Scenario: Sin fecha, al final
- **WHEN** coexisten decisiones con fecha límite y sin ella
- **THEN** el sistema muestra las que no tienen fecha después de las que sí

### Requirement: Decisions aporta su resumen a la landing del hub
El sistema MUST hacer que Decisions cumpla el contrato de aplicación definido en `hub-landing`, pasando a ser una aplicación viva:

- **Cifras**: decisiones abiertas, decisiones sin traducir, decisiones caducadas. La última MUST llevar tono de gravedad cuando es mayor que cero.
- **Lista corta**: sus decisiones preparadas y planteadas, las más urgentes primero, bajo una etiqueta propia de la aplicación.
- **Avisos**: las decisiones caducadas, las que vencen pronto y los borradores acumulados, cada uno con su gravedad.

Las cifras MUST contar decisiones **abiertas** y no el total histórico, que crece para siempre y deja de informar.

#### Scenario: La tarjeta refleja el estado real
- **WHEN** el usuario vuelve al hub tras resolver una decisión
- **THEN** las cifras y la lista de la tarjeta de Decisions reflejan el estado nuevo

#### Scenario: Entrar desde una fila de la lista
- **WHEN** el usuario activa una fila de la lista corta de la tarjeta de Decisions
- **THEN** el sistema entra en Decisions con esa decisión abierta

#### Scenario: Sin decisiones
- **WHEN** no existe ninguna decisión
- **THEN** el sistema muestra las tres cifras a cero, ninguna con tono de gravedad, y la lista vacía con su indicación propia

### Requirement: Borrar una decisión
El sistema MUST permitir borrar una decisión, cualquiera que sea su estado, desde su propio detalle. El borrado MUST llevarse por delante sus alternativas, su recomendación y su resolución, y MUST dejar de contarla en las cifras del hub.

El sistema MUST NOT ofrecer el borrado desde la lista: la lista se recorre decenas de veces al día y un control destructivo no tiene sitio en un camino de navegación. Es el mismo criterio que sigue Roadmaps, que solo borra desde la vista "Todos" y nunca desde el selector.

#### Scenario: Borrar desde el detalle
- **WHEN** el usuario borra la decisión que tiene abierta
- **THEN** el sistema la elimina, deja de mostrarla en la lista y cierra su detalle

#### Scenario: La lista no borra
- **WHEN** el usuario recorre la lista de decisiones
- **THEN** el sistema no ofrece en ella ningún control de borrado

### Requirement: Reabrir una decisión resuelta
El sistema MUST permitir retirar la resolución de una decisión resuelta, devolviéndola al estado en que estaba antes de cerrarse.

Reabrir MUST NOT descongelar la recomendación ni borrar la fecha en que la decisión se planteó: lo que se deshace es la respuesta, no el hecho de haberla puesto delante de negocio. Una decisión reabierta MUST volver a poder caducar si su fecha límite ya pasó.

#### Scenario: Retirar una resolución
- **WHEN** el usuario reabre una decisión resuelta
- **THEN** el sistema la muestra de nuevo como planteada, o como caducada si su fecha límite ya pasó, y vuelve a ofrecer registrar una resolución

#### Scenario: La recomendación sigue congelada al reabrir
- **WHEN** el usuario reabre una decisión que se planteó con recomendación
- **THEN** el sistema conserva esa recomendación y su fecha, y sigue sin permitir cambiarla

#### Scenario: El desenlace desaparece con la resolución
- **WHEN** el usuario reabre una decisión cuyo desenlace se estaba mostrando
- **THEN** el sistema deja de mostrar la comparación entre recomendación y resolución

