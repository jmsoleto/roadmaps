## ADDED Requirements

### Requirement: Modo de presentación
El sistema MUST ofrecer, para una decisión que está en la fase 3, un modo de presentación que ocupe la pantalla entera y deje fuera la lista, los filtros y la interfaz de estudio.

El sistema MUST pedir la pantalla completa del navegador y MUST seguir funcionando igual cuando no esté disponible o se rechace: la presentación no puede depender de un permiso.

El sistema MUST ofrecer una salida visible y MUST salir también con la tecla de escape.

El sistema MUST NOT ofrecer este modo para una decisión que no haya llegado a la fase 3: no hay nada terminado que presentar.

#### Scenario: Presentar una decisión lista
- **WHEN** el usuario presenta una decisión que está en la fase 3
- **THEN** el sistema muestra la presentación ocupando la pantalla, sin la lista ni los controles de estudio

#### Scenario: Sin permiso de pantalla completa
- **WHEN** el navegador no concede la pantalla completa
- **THEN** el sistema muestra la presentación ocupando la ventana entera igualmente

#### Scenario: Salir
- **WHEN** el usuario pulsa la tecla de escape o la salida visible
- **THEN** el sistema vuelve a la pantalla de estudio

#### Scenario: Una decisión en estudio no se presenta
- **WHEN** la decisión está en la fase 1 o en la fase 2
- **THEN** el sistema no ofrece presentarla

### Requirement: En presentación solo se muestra lo presentable
Durante la presentación el sistema MUST mostrar la pregunta a negocio, las alternativas y sus criterios, y MUST señalar cuál se recomienda.

El sistema MUST NOT mostrar la duda de origen, su contexto, la nota interna ni el motivo escrito de la recomendación. Ocultarlos por estilo o tras un desplegable no basta: MUST NOT formar parte de lo que la vista pinta.

Señalar la alternativa recomendada MUST seguir haciéndose, porque quien decide tiene derecho a saber qué opina quien preparó la decisión. Lo que no se proyecta es el argumento escrito, que se dice en voz alta.

#### Scenario: El material de trabajo no se proyecta
- **WHEN** el usuario presenta una decisión que tiene nota interna y motivo de recomendación
- **THEN** ninguno de los dos aparece en la presentación, en ninguna parte

#### Scenario: La recomendación sí se señala
- **WHEN** la decisión llegó a la fase 3 con una alternativa recomendada
- **THEN** la presentación la señala como recomendada

### Requirement: Esfuerzo frente a beneficio
El sistema MUST mostrar un gráfico que sitúe cada alternativa según su esfuerzo y su beneficio, con el esfuerzo creciendo hacia la derecha y el beneficio hacia arriba, e MUST indicar cuál es la zona favorable.

El sistema MUST rotular el beneficio como una apreciación de quien preparó la decisión, no como una medida.

#### Scenario: Comparar de un vistazo
- **WHEN** varias alternativas tienen esfuerzo y beneficio declarados
- **THEN** el sistema las sitúa en el plano, identificadas, y señala qué zona es la favorable

#### Scenario: El beneficio no se presenta como medida
- **WHEN** el usuario ve el gráfico
- **THEN** el sistema indica que el beneficio es una apreciación declarada

### Requirement: Cuándo lo tendría el cliente
El sistema MUST mostrar una línea temporal con la fecha en que cada alternativa entregaría valor, y MUST señalar el día de hoy sobre ella.

#### Scenario: Ver las fechas en una línea
- **WHEN** varias alternativas declaran cuándo entregarían valor
- **THEN** el sistema las sitúa sobre una línea temporal común, con hoy marcado

### Requirement: Un gráfico dibuja lo cuantificado y declara lo que no
El sistema MUST situar en un gráfico únicamente las alternativas que tengan los valores que ese gráfico necesita.

Una alternativa a la que le falte alguno MUST quedar fuera del gráfico y MUST declararse junto a él, nombrada. El sistema MUST NOT situarla en el origen ni en ninguna posición supuesta: dibujar sin valor en el cero la mostraría como si costara cero.

Cuando ninguna alternativa tenga los valores necesarios, el sistema MUST omitir ese gráfico e indicar por qué, en lugar de mostrar un plano vacío.

#### Scenario: Falta una magnitud
- **WHEN** una alternativa no declara su esfuerzo
- **THEN** el sistema no la sitúa en el gráfico de esfuerzo y beneficio, y la nombra debajo como no cuantificada

#### Scenario: No hay nada que dibujar
- **WHEN** ninguna alternativa declara las magnitudes que un gráfico necesita
- **THEN** el sistema no muestra ese gráfico e indica que faltan esos datos

#### Scenario: Las alternativas sin cuantificar siguen presentándose
- **WHEN** una alternativa no tiene ninguna magnitud declarada
- **THEN** el sistema la muestra igualmente entre las alternativas, con lo que sí dice de ella

### Requirement: La decisión se toma y se cierra en la reunión
Durante la presentación el sistema MUST permitir elegir una alternativa o escribir una resolución que no corresponda a ninguna, y cerrar la decisión sin salir de la vista.

Al cerrarla el sistema MUST registrar qué se decidió, la fecha, y quién decidía, y MUST mostrar ese registro.

El sistema MUST NOT pedir ni representar una firma: en una aplicación sin cuentas ni servidor no acreditaría nada ante nadie, y aparentar una garantía que no existe es peor que no ofrecerla.

#### Scenario: Elegir una alternativa delante de negocio
- **WHEN** el usuario elige una alternativa durante la presentación
- **THEN** el sistema cierra la decisión, registra la elección con su fecha y muestra el acta

#### Scenario: La respuesta no era ninguna
- **WHEN** el usuario escribe durante la presentación una resolución que no corresponde a ninguna alternativa
- **THEN** el sistema la registra y cierra la decisión igualmente

#### Scenario: Ninguna firma
- **WHEN** el usuario cierra una decisión desde la presentación
- **THEN** el sistema no pide ninguna firma ni muestra ningún espacio para firmar
