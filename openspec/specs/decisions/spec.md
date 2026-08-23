# decisions

## Purpose

Las decisiones de proyecto que hay que cerrar con negocio, y el traslado que va desde donde nacen hasta donde se resuelven. Una decisión lleva dos textos —la duda como surgió, normalmente en lenguaje técnico, y la misma cuestión formulada para quien decide—, y esa traducción es parte del registro, no solo su resultado.

El trabajo se organiza en **tres fases**, derivadas de los datos y nunca almacenadas: capturar la duda donde surge, estudiarla a solas hasta que negocio pueda responderla, y ponerla delante de negocio para decidir allí mismo. Entre la segunda y la tercera hay una sola puerta explícita —declararla lista para presentar—, porque es la única transición que los datos no pueden implicar: tener tres alternativas escritas no significa haber terminado de pensar.

Cubre la captura rápida de un solo campo, dictada o tecleada; las alternativas valoradas criterio a criterio, con texto siempre y magnitud cuando la hay; el apoyo visual del estudio; la recomendación congelada en el instante en que deja de poder discutirse; el modo de presentación con sus gráficos y lo que en él no puede enseñarse; la resolución y su comparación con la recomendación; y el resumen que la aplicación aporta a la landing del hub.

Lo que la aplicación **no** hace es opinar: no calcula totales, no ordena alternativas por bondad y no sugiere cuál recomendar. Dibuja lo que se le ha dicho.

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

### Requirement: Apoyo visual en la fase de estudio
El sistema MUST permitir asociar imágenes a una decisión durante la fase de estudio, pegándolas desde el portapapeles, arrastrándolas o eligiéndolas con el selector de archivos. Pegar MUST funcionar con la decisión abierta, sin exigir enfocar ningún campo.

El sistema MUST mostrarlas como miniaturas, MUST permitir verlas a tamaño completo y MUST permitir quitarlas.

El sistema MUST admitir únicamente imágenes, y MUST rechazar lo demás diciendo por qué.

Una imagen pegada no trae nombre; el sistema MUST asignarle uno derivado del momento en que se pegó. El nombre es lo único que identifica a un adjunto en un documento exportado, que no lleva sus bytes.

#### Scenario: Pegar una captura
- **WHEN** el usuario copia una captura de pantalla y pega con la decisión abierta
- **THEN** el sistema la adjunta a esa decisión y la muestra como miniatura

#### Scenario: Arrastrar un diagrama
- **WHEN** el usuario suelta un archivo de imagen sobre el bloque de apoyo visual
- **THEN** el sistema lo adjunta conservando su nombre

#### Scenario: Algo que no es una imagen
- **WHEN** el usuario intenta adjuntar un archivo que no es una imagen
- **THEN** el sistema no lo adjunta e indica que solo admite imágenes

#### Scenario: Ver a tamaño completo
- **WHEN** el usuario activa una miniatura
- **THEN** el sistema muestra la imagen a tamaño completo y permite volver

#### Scenario: Quitar un adjunto
- **WHEN** el usuario quita un adjunto
- **THEN** el sistema deja de mostrarlo y libera el espacio que ocupaba

### Requirement: Peso de los adjuntos
El sistema MUST mostrar el peso de cada adjunto y el total que ocupan los de una decisión.

El sistema MUST rechazar un archivo que supere el límite admitido, indicando cuánto pesa y cuál es el tope. El sistema MUST NOT reescalar ni recomprimir lo que el usuario adjunta: cambiar el archivo que alguien decidió guardar es decisión suya.

#### Scenario: Un archivo desmesurado
- **WHEN** el usuario intenta adjuntar una imagen que supera el límite
- **THEN** el sistema no la adjunta e indica su peso y el máximo admitido

#### Scenario: Saber cuánto se está ocupando
- **WHEN** una decisión tiene adjuntos
- **THEN** el sistema muestra el peso de cada uno y su total

### Requirement: Un adjunto sin bytes se declara como ausente
El sistema MUST distinguir un adjunto cuya imagen tiene de uno cuya ficha conoce pero cuyos bytes no están —el caso de un documento importado— y MUST mostrar el segundo como una ausencia declarada, con su nombre y su peso original.

El sistema MUST NOT ofrecer abrir un adjunto sin bytes, y MUST NOT borrar su ficha: es el registro de que esa imagen existió y de dónde vino.

#### Scenario: Importar una decisión con adjuntos
- **WHEN** el usuario importa un documento cuyas decisiones declaraban adjuntos
- **THEN** el sistema muestra cada uno con su nombre y su peso, indicando que no venía en el documento

#### Scenario: Una ausencia no se puede abrir
- **WHEN** el usuario activa un adjunto sin bytes
- **THEN** el sistema no muestra ninguna imagen y mantiene la ficha

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

### Requirement: Dictar la duda en la captura
El sistema MUST permitir dictar la duda desde la captura rápida, transcribiéndola al mismo campo de texto que se usa al teclear, donde MUST poder corregirse antes de guardar.

Mientras se dicta, el sistema MUST indicar que está escuchando y cuánto lleva.

El sistema MUST permitir parar y quedarse con lo transcrito, y MUST permitir descartar sin crear ninguna decisión.

El resto de la captura MUST seguir funcionando igual: confirmar guarda y deja lista la siguiente, y descartar cierra.

#### Scenario: Apuntar una duda mientras alguien habla
- **WHEN** el usuario dicta una duda y para
- **THEN** el sistema deja el texto transcrito en el campo de la duda, editable, sin haber creado nada todavía

#### Scenario: Corregir antes de guardar
- **WHEN** el usuario edita el texto transcrito y confirma
- **THEN** el sistema guarda lo que quedó en el campo, no lo que se transcribió

#### Scenario: Descartar lo dictado
- **WHEN** el usuario descarta mientras dicta o después
- **THEN** el sistema no crea ninguna decisión

#### Scenario: Dictar sobre algo ya escrito
- **WHEN** el usuario dicta con texto ya en el campo
- **THEN** el sistema añade lo transcrito a lo que había, sin borrarlo

### Requirement: Solo se guarda el texto, y se advierte de a dónde va el audio
El sistema MUST NOT guardar audio en ninguna parte, ni siquiera de forma temporal: lo que la aplicación maneja es el texto que el navegador le entrega.

Como la transcripción del navegador **envía el audio a un servicio ajeno a la máquina**, el sistema MUST advertirlo mientras se dicta, junto al indicador de que está escuchando. Es el único momento en que esa advertencia sirve para decidir algo.

#### Scenario: Advertencia en el momento
- **WHEN** el usuario está dictando
- **THEN** el sistema indica que el audio se envía a un servicio externo para transcribirlo

#### Scenario: No queda audio
- **WHEN** el usuario termina de dictar, guarde o descarte
- **THEN** el sistema no conserva ninguna grabación

### Requirement: Los fragmentos dudosos se señalan
El sistema MUST señalar los fragmentos que el navegador transcribió con poca confianza, para que se revisen antes de guardar, e MUST indicar cuántos son.

El sistema MUST NOT señalar palabras sueltas: la transcripción da confianza por fragmento y no por palabra, y repartirla entre palabras sería fabricar un dato con apariencia de medida.

#### Scenario: Un fragmento dudoso
- **WHEN** el navegador transcribe un fragmento con poca confianza
- **THEN** el sistema lo señala e indica cuántos fragmentos hay así

#### Scenario: Todo claro
- **WHEN** todos los fragmentos se transcriben con confianza suficiente
- **THEN** el sistema no señala ninguno

### Requirement: Donde no hay transcripción, no se ofrece dictar
Cuando el navegador no ofrece transcripción, el sistema MUST NOT mostrar el control de dictado, y la captura MUST comportarse exactamente como cuando solo se teclea.

Cuando el usuario no concede el micrófono, el sistema MUST decirlo en la propia captura y MUST seguir permitiendo escribir.

#### Scenario: Un navegador sin transcripción
- **WHEN** el usuario abre la captura en un navegador que no la implementa
- **THEN** el sistema no muestra ningún control de dictado y la captura funciona como siempre

#### Scenario: Micrófono denegado
- **WHEN** el usuario deniega el acceso al micrófono
- **THEN** el sistema lo indica en la captura y sigue permitiendo teclear la duda

### Requirement: Queda registrado que la duda se dictó
El sistema MUST registrar como dictada la decisión cuya duda entró por transcripción, y como tecleada la que se escribió.

#### Scenario: Procedencia de una duda dictada
- **WHEN** el usuario guarda una duda que dictó
- **THEN** el sistema registra que su texto entró por dictado

#### Scenario: Procedencia de una duda escrita
- **WHEN** el usuario guarda una duda que tecleó
- **THEN** el sistema registra que su texto entró tecleado

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

