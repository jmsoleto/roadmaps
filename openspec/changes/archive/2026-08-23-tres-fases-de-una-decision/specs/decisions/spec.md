## RENAMED Requirements

### Requirement: La recomendación se congela al declarar la decisión lista
FROM: `### Requirement: La recomendación se congela al plantear`
TO: `### Requirement: La recomendación se congela al declarar la decisión lista`

### Requirement: Alternativas valoradas criterio a criterio
FROM: `### Requirement: Alternativas con ejes de intercambio`
TO: `### Requirement: Alternativas valoradas criterio a criterio`

## MODIFIED Requirements

### Requirement: El estado de una decisión se deriva de sus datos
El sistema MUST derivar el estado de una decisión de qué campos tiene puestos y de la fecha de hoy, y MUST NOT almacenar el estado como un campo propio. El ciclo de vida MUST expresarse como tres fases, y el sistema MUST indicar en cuál está cada decisión:

- **fase 1, captura**: no tiene pregunta a negocio.
- **fase 2, estudio y evaluación**: tiene pregunta a negocio y no se ha declarado lista para presentar.
- **fase 3, lista para presentar**: se ha declarado lista y no tiene resolución.
- **cerrada**: tiene resolución.
- **caducada**: está en la fase 3 y su fecha límite ya pasó.

Una decisión cerrada MUST NOT considerarse caducada, cualquiera que sea su fecha límite. Una decisión que no ha llegado a la fase 3 MUST NOT caducar: no se ha puesto delante de nadie.

#### Scenario: Una decisión recién capturada
- **WHEN** el usuario crea una decisión con solo una línea de texto
- **THEN** el sistema la muestra en la fase 1

#### Scenario: Traducir la lleva al estudio
- **WHEN** el usuario escribe la pregunta a negocio de una decisión capturada
- **THEN** el sistema la muestra en la fase 2, sin pedir ningún gesto adicional

#### Scenario: Vencer sin respuesta
- **WHEN** una decisión lista para presentar alcanza el día siguiente a su fecha límite sin resolución
- **THEN** el sistema la muestra como caducada, sin que nadie haya tenido que marcarla

#### Scenario: Aplazar una decisión caducada
- **WHEN** el usuario mueve la fecha límite de una decisión caducada a una fecha futura
- **THEN** el sistema vuelve a mostrarla como lista para presentar

#### Scenario: Resolver fuera de plazo
- **WHEN** el usuario resuelve una decisión cuya fecha límite ya había pasado
- **THEN** el sistema la muestra como cerrada y no como caducada

#### Scenario: Sin fecha límite
- **WHEN** una decisión lista para presentar no tiene fecha límite
- **THEN** el sistema la mantiene en la fase 3 indefinidamente y nunca la da por caducada

#### Scenario: Una decisión en estudio no caduca
- **WHEN** la fecha límite de una decisión en fase 1 o en fase 2 ya pasó
- **THEN** el sistema no la da por caducada, porque nunca se declaró lista para presentar

### Requirement: La recomendación se congela al declarar la decisión lista
El sistema MUST permitir registrar, durante la fase de estudio, qué alternativa se recomienda y por qué.

El sistema MUST congelar esa recomendación en el instante en que la decisión se declara **lista para presentar**: a partir de ahí MUST NOT permitir cambiarla ni retirarla. Declararla lista MUST ser un gesto explícito del usuario y MUST registrar su fecha.

Congelar al declararla lista y no al ponerla delante de negocio cierra la ventana entre terminar el análisis y presentarlo, en la que la recomendación seguía siendo editable con la reunión ya convocada.

El sistema MUST permitir declarar lista una decisión **sin** recomendación. Exigirla produciría recomendaciones de trámite.

#### Scenario: Recomendar durante el estudio
- **WHEN** el usuario elige una alternativa como recomendada en una decisión en fase 2
- **THEN** el sistema la registra y permite cambiarla mientras la decisión no se haya declarado lista

#### Scenario: Intentar reescribir la recomendación después
- **WHEN** el usuario intenta cambiar la recomendación de una decisión ya declarada lista
- **THEN** el sistema no la altera y sigue mostrando la que se congeló

#### Scenario: Declararla lista sin recomendación
- **WHEN** el usuario declara lista una decisión sin haber recomendado ninguna alternativa
- **THEN** el sistema la pasa a la fase 3 y registra que no hubo recomendación

#### Scenario: La fecha de congelación es la de declararla lista
- **WHEN** el usuario recomienda una alternativa un día y declara lista la decisión días después
- **THEN** el sistema registra como instante de congelación aquel en que se declaró lista

### Requirement: Alternativas valoradas criterio a criterio
El sistema MUST permitir asociar a una decisión una lista ordenada de alternativas, cada una con su texto. Para cada alternativa, el sistema MUST permitir valorarla sobre un conjunto corto y fijo de criterios: **esfuerzo, coste, tiempo hasta valor, riesgo, beneficio y deuda que deja**.

Cada valoración MUST admitir un **texto**, que es lo que se lee en voz alta, y MUST admitir además un **valor** cuando el criterio lo tenga —una duración, un importe, una fecha, un nivel de riesgo o una apreciación de beneficio—. El texto MUST poder existir sin valor: una alternativa que nadie ha cuantificado sigue diciendo lo que se sabe de ella.

Los criterios MUST ser los mismos para todas las alternativas de todas las decisiones, para que se puedan comparar entre sí. Valorar un criterio MUST ser opcional: una alternativa puede no decir nada sobre uno o sobre ninguno.

El sistema MUST NOT calcular un total ni una puntuación global por alternativa, MUST NOT ordenar las alternativas por bondad y MUST NOT sugerir cuál recomendar. Los valores por criterio son un dato que el usuario escribe, no una conclusión que el sistema deduzca.

#### Scenario: Comparar dos alternativas criterio a criterio
- **WHEN** dos alternativas están valoradas sobre los mismos criterios
- **THEN** el sistema las muestra de modo que la diferencia entre ambas se lee criterio a criterio

#### Scenario: Texto sin valor
- **WHEN** una alternativa describe su riesgo con una frase y no declara su nivel
- **THEN** el sistema muestra la frase igualmente y no atribuye ningún nivel

#### Scenario: Una alternativa sin valorar
- **WHEN** una alternativa no declara ningún criterio
- **THEN** el sistema la muestra igualmente, sin valoraciones y sin inventarlas

#### Scenario: Ningún agregado
- **WHEN** el usuario consulta una decisión con varias alternativas valoradas
- **THEN** el sistema no muestra ninguna puntuación global, ni total, ni ranking, ni recomendación deducida

#### Scenario: El beneficio es una apreciación declarada
- **WHEN** el usuario valora el beneficio de una alternativa
- **THEN** el sistema lo registra como una apreciación suya y no la deduce de los demás criterios

### Requirement: Resolución y su comparación con la recomendación
El sistema MUST permitir registrar la resolución de una decisión que está en la fase 3, eligiendo una de sus alternativas o escribiendo una resolución que no corresponde a ninguna, junto con la fecha en que se cerró.

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
- **WHEN** se resuelve una decisión que llegó a la fase 3 sin recomendación
- **THEN** el sistema registra la resolución y no muestra ningún desenlace comparado

#### Scenario: No se resuelve lo que no está listo
- **WHEN** el usuario intenta resolver una decisión que todavía está en fase 1 o en fase 2
- **THEN** el sistema no registra ninguna resolución

### Requirement: Reabrir una decisión resuelta
El sistema MUST permitir retirar la resolución de una decisión cerrada, devolviéndola a la fase 3.

Reabrir MUST NOT descongelar la recomendación ni borrar la fecha en que la decisión se declaró lista: lo que se deshace es la respuesta, no el hecho de haber cerrado el estudio. Una decisión reabierta MUST volver a poder caducar si su fecha límite ya pasó.

#### Scenario: Retirar una resolución
- **WHEN** el usuario reabre una decisión cerrada
- **THEN** el sistema la muestra de nuevo en la fase 3, o como caducada si su fecha límite ya pasó, y vuelve a ofrecer registrar una resolución

#### Scenario: La recomendación sigue congelada al reabrir
- **WHEN** el usuario reabre una decisión que llegó a la fase 3 con recomendación
- **THEN** el sistema conserva esa recomendación y su fecha, y sigue sin permitir cambiarla

#### Scenario: El desenlace desaparece con la resolución
- **WHEN** el usuario reabre una decisión cuyo desenlace se estaba mostrando
- **THEN** el sistema deja de mostrar la comparación entre recomendación y resolución

## ADDED Requirements

### Requirement: Cierre de la fase de estudio
El sistema MUST ofrecer, en la fase 2, un cierre explícito que declare la decisión **lista para presentar**, y MUST mostrar junto a él qué se ha completado y qué no: si la duda está traducida a negocio, cuántas alternativas hay valoradas y si hay recomendación marcada.

El cierre MUST NOT exigir que todo esté completo. A veces se presenta con lo que hay, y bloquear el paso produciría campos rellenados de trámite, que es lo que arruina el valor del registro.

El sistema MUST NOT declarar lista una decisión que no tenga pregunta a negocio: sin ella no hay nada que presentar.

#### Scenario: Ver qué falta antes de cerrar el estudio
- **WHEN** el usuario abre una decisión en fase 2
- **THEN** el sistema indica cuáles de los pasos del estudio están hechos y cuáles no

#### Scenario: Cerrar el estudio con todo hecho
- **WHEN** el usuario declara lista una decisión traducida, con alternativas y con recomendación
- **THEN** el sistema la pasa a la fase 3 y congela la recomendación

#### Scenario: Cerrar el estudio con algo pendiente
- **WHEN** el usuario declara lista una decisión que tiene pregunta a negocio pero ninguna alternativa
- **THEN** el sistema la pasa igualmente a la fase 3

#### Scenario: Una captura sin traducir no se puede cerrar
- **WHEN** el usuario intenta declarar lista una decisión que sigue en la fase 1
- **THEN** el sistema no la pasa de fase

### Requirement: Nota interna de la recomendación
El sistema MUST permitir escribir, aparte del motivo de la recomendación, una **nota interna** sobre la decisión, y MUST marcarla como material que no se presenta.

Es un campo distinto del motivo por una razón concreta: el motivo es el argumento que se dice en voz alta, y la nota es lo que se piensa y no se cuenta. Guardarlos juntos garantizaría que un día se proyecte lo que no debía proyectarse.

#### Scenario: Escribir una nota que no se enseña
- **WHEN** el usuario escribe una nota interna en una decisión
- **THEN** el sistema la guarda y la muestra señalada como no presentable, separada del motivo de la recomendación

### Requirement: Procedencia de lo capturado
El sistema MUST registrar, para cada decisión, cuándo se capturó y si su texto se tecleó o se dictó, además del contexto en texto libre que ya admite.

#### Scenario: Ver de dónde salió una decisión
- **WHEN** el usuario consulta una decisión capturada semanas antes
- **THEN** el sistema muestra cuándo se capturó, de qué contexto salió y por qué vía entró su texto

### Requirement: La pregunta a negocio es lo único que se presenta
El sistema MUST señalar, en la fase de estudio, que la pregunta a negocio es el único de los textos de la decisión que se enseñará en la fase de presentación.

El texto técnico de origen, la nota interna y el motivo de la recomendación MUST quedar identificados como material de trabajo.

#### Scenario: Saber qué verá negocio
- **WHEN** el usuario edita la pregunta a negocio de una decisión
- **THEN** el sistema indica que es lo único que se enseñará al presentarla

### Requirement: Las decisiones guardadas con el modelo anterior se leen sin pérdida
El sistema MUST leer las decisiones guardadas o exportadas con el modelo anterior —el de tres ejes con dirección— y MUST convertirlas al modelo de criterios al cargarlas y al importarlas, sin descartar nada de lo que dijeran.

La conversión MUST trasladar lo que el eje declaraba al **texto** de la valoración correspondiente, y MUST dejar el valor vacío. El sistema MUST NOT inventar magnitudes que nadie escribió: un importe o una duración plausibles acabarían enseñándose a negocio como si el usuario los hubiera dicho.

El instante en que la recomendación quedó congelada MUST conservarse: significa lo mismo en los dos modelos.

#### Scenario: Un documento del modelo anterior
- **WHEN** el sistema carga decisiones guardadas con ejes de dirección
- **THEN** las muestra con sus criterios equivalentes, conservando en texto lo que cada eje declaraba, y sin ningún valor numérico

#### Scenario: Los criterios que antes no existían
- **WHEN** se convierte una decisión que no tenía esfuerzo, beneficio ni deuda
- **THEN** el sistema deja esos criterios vacíos en lugar de rellenarlos

#### Scenario: La congelación sobrevive a la conversión
- **WHEN** se convierte una decisión que ya tenía su recomendación congelada
- **THEN** el sistema conserva esa recomendación, su motivo y la fecha en que se congeló, y sigue sin permitir cambiarla

#### Scenario: Importar un export anterior al cambio
- **WHEN** el usuario importa un documento de decisiones exportado antes de este cambio
- **THEN** el sistema lo acepta y aplica la misma conversión
