# data-portability

## Purpose

Import/export en JSON como copia de seguridad e intercambio manual, preservando la integridad referencial. Es el único mecanismo de trasvase que existe: sin servidor, un documento exportado es la única forma de mover algo entre navegadores o de recuperarlo.

Cubre los roadmaps —en el formato actual y en el heredado—, los temas, y las decisiones. Cada uno es un documento independiente: un fichero de decisiones nunca lleva roadmaps ni al revés, y cada aplicación rechaza el documento de la otra diciendo cuál es.

Un documento de decisiones lleva la ficha de cada imagen adjunta pero no su contenido, para que exportar siga siendo algo que se hace. Lo que no puede es callárselo: el manifiesto viaja precisamente para que quien importe vea qué falta.

## Requirements

### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

El documento MUST incluir las dependencias externas del catálogo global que los items del roadmap referencian, y solo esas, del mismo modo que incluye únicamente los responsables referenciados. Cada asignación de dependencia externa MUST viajar dentro de su item con su nombre de funcionalidad y su estado de resolución.

El documento MUST incluir además el estado de completitud de cada item —su fecha de completitud, el fin planificado que guardó al completarse y su línea base— y la fecha de fijación del plan del roadmap, de modo que las desviaciones medidas se conserven al reimportarlo y no haya que volver a fijar el plan.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas, responsables referenciados, dependencias externas referenciadas y estado de completitud del roadmap

#### Scenario: El export solo lleva las dependencias externas que el roadmap usa
- **WHEN** el usuario exporta un roadmap existiendo en el catálogo dependencias externas que ninguno de sus items tiene asignadas
- **THEN** el archivo generado contiene solo las dependencias externas referenciadas por ese roadmap y no las demás

#### Scenario: El estado de resolución viaja en el export
- **WHEN** el usuario exporta un roadmap con dependencias externas asignadas, unas resueltas y otras pendientes
- **THEN** el archivo generado conserva el estado de resolución de cada asignación por separado

#### Scenario: La completitud y la línea base viajan en el export
- **WHEN** el usuario exporta un roadmap con el plan fijado y varios items completados
- **THEN** el archivo generado conserva la fecha de fijación del plan y, por cada item, su fecha de completitud, el fin planificado guardado al completarse y su línea base

### Requirement: Importar un roadmap desde JSON

El sistema MUST permitir importar un roadmap desde un archivo JSON, tanto del formato actual como del formato heredado, convirtiendo a posiciones de paleta los colores que el documento exprese como valores de color absolutos.

El formato heredado abarca los dos dialectos de fecha que produjo la herramienta HTML original: **índices de día enteros** relativos a `2026-01-01` y **fechas ISO absolutas** `YYYY-MM-DD`. El sistema MUST reconocer cada fecha por su valor, no por la versión declarada del documento, de modo que un documento que mezcle ambos dialectos se importe correctamente.

#### Scenario: Importar un JSON del formato actual

- **WHEN** el usuario importa un JSON exportado por la aplicación
- **THEN** el sistema crea un nuevo roadmap con su contenido y lo persiste en el almacén local

#### Scenario: Importar un JSON heredado con índices de día

- **WHEN** el usuario importa un JSON del formato antiguo cuyas fechas son índices relativos a `2026-01-01`
- **THEN** el sistema convierte esos índices en fechas absolutas antes de persistir

#### Scenario: Importar un JSON heredado con fechas ISO absolutas

- **WHEN** el usuario importa un JSON heredado cuyas fechas son cadenas `YYYY-MM-DD`
- **THEN** el sistema conserva esas fechas tal cual, de modo que cada fase e item ocupa en la línea temporal el mismo rango que declaraba el documento

#### Scenario: Importar un JSON heredado que mezcla ambos dialectos de fecha

- **WHEN** el usuario importa un JSON heredado en el que unos items fechan con índices de día y otros con fechas ISO
- **THEN** el sistema interpreta cada fecha según su propio valor y ninguna de las dos clases se pierde

#### Scenario: Importar un JSON heredado con una fecha ilegible

- **WHEN** el usuario importa un JSON heredado en el que la fecha de un item no es ni un índice de día ni una fecha ISO válida
- **THEN** el sistema trata esa fecha como ausente y aplica el valor por defecto para ese item, sin rechazar el documento ni alterar las fechas de los demás items

#### Scenario: Importar un JSON con colores absolutos

- **WHEN** el usuario importa un JSON cuyos colores de fases, items y responsables son valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima, de modo que el roadmap importado se muestre con la paleta del tema activo

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias, responsables y dependencias externas) en el ciclo exportar → importar, y MUST hacerlo también al importar documentos heredados que declaren sus propios responsables.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items, las asignaciones de responsables y las asignaciones de dependencias externas —con su funcionalidad y su estado de resolución— se mantienen coherentes en el roadmap importado

#### Scenario: Importar un JSON heredado con responsables
- **WHEN** el usuario importa un JSON heredado que declara una lista de responsables a la que sus items hacen referencia
- **THEN** el sistema incorpora esos responsables a los ya existentes y las asignaciones de los items siguen resolviéndose tras la importación

### Requirement: Exportar un tema a JSON
El sistema MUST permitir exportar un tema propio como archivo JSON autocontenido, independiente del export de roadmaps.

#### Scenario: Exportar un tema propio
- **WHEN** el usuario exporta un tema propio
- **THEN** el sistema genera un archivo JSON con el nombre del tema, sus colores base, su paleta de barras y las sobrescrituras que tenga

#### Scenario: El tema no viaja dentro del export de un roadmap
- **WHEN** el usuario exporta un roadmap
- **THEN** el archivo generado no contiene información de tema

### Requirement: Importar un tema desde JSON
El sistema MUST permitir importar un tema desde un archivo JSON, tolerando que el documento no contenga todos los tokens del contrato vigente.

#### Scenario: Importar un tema completo
- **WHEN** el usuario importa un archivo de tema válido
- **THEN** el sistema lo añade a sus temas propios y permite seleccionarlo

#### Scenario: Importar un tema al que le faltan tokens
- **WHEN** el usuario importa un tema que solo declara sus colores base
- **THEN** el sistema deriva el resto de tokens y el tema resulta utilizable en toda la interfaz

#### Scenario: Importar un tema con tokens desconocidos
- **WHEN** el usuario importa un tema que declara tokens que la versión actual no reconoce
- **THEN** el sistema ignora esos tokens e importa el resto sin error

#### Scenario: Importar un archivo que no es un tema
- **WHEN** el usuario intenta importar como tema un archivo que no lo es
- **THEN** el sistema rechaza la importación con un mensaje de error y no altera los temas existentes

### Requirement: Ventana temporal utilizable en el roadmap importado
El sistema MUST dar al roadmap importado una ventana temporal en la que su contenido sea visible, cuando el documento importado no especifique una.

#### Scenario: El contenido importado cae fuera de la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas quedan fuera del rango por defecto
- **THEN** el sistema ajusta la fecha de inicio y la duración de la ventana del roadmap importado para cubrir todo su contenido

#### Scenario: El contenido importado cabe en la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas caben en el rango por defecto
- **THEN** el sistema conserva la ventana por defecto sin modificarla

### Requirement: Dependencias externas en el documento importado

El sistema MUST incorporar al catálogo global las dependencias externas declaradas por un documento importado, omitiendo las que ya existan con el mismo identificador, del mismo modo que hace con los responsables.

El sistema MUST descartar las asignaciones de dependencia externa cuya dependencia externa no exista en el catálogo tras la importación, en lugar de conservarlas apuntando a nada: una asignación sin dependencia externa no tiene nombre ni responsable que mostrar y marcaría un item como bloqueado sin poder explicar por qué.

El sistema MUST aceptar documentos que no declaren dependencias externas, importándolos como un roadmap sin dependencias externas y sin error.

#### Scenario: Importar un documento con dependencias externas nuevos

- **WHEN** el usuario importa un roadmap que declara dependencias externas que no están en su catálogo
- **THEN** el sistema las añade al catálogo global y las asignaciones de los items importados se resuelven contra ellos

#### Scenario: Importar un documento con dependencias externas ya conocidos

- **WHEN** el usuario importa un roadmap que declara una dependencia externa cuyo identificador ya existe en el catálogo
- **THEN** el sistema conserva la dependencia externa del catálogo tal como está y las asignaciones importadas se resuelven contra ella

#### Scenario: Importar un documento con una asignación huérfana

- **WHEN** el usuario importa un roadmap en el que un item declara una asignación a una dependencia externa que el documento no incluye y que tampoco está en el catálogo
- **THEN** el sistema descarta esa asignación e importa el resto del documento sin error

#### Scenario: Importar un documento sin dependencias externas

- **WHEN** el usuario importa un roadmap exportado por una versión anterior, que no declara dependencias externas
- **THEN** el sistema lo importa como un roadmap cuyos items no tienen dependencias externas, sin error

### Requirement: Completitud en el documento importado

El sistema MUST conservar al importar el estado de completitud que el documento declare —fecha de completitud, fin planificado guardado al completarse y línea base de cada item, y fecha de fijación del plan del roadmap—, de forma que las desviaciones medidas se muestren igual que en el origen.

El sistema MUST aceptar documentos que no declaren completitud, importándolos como un roadmap sin nada completado y sin plan fijado, y sin error. Esto incluye los documentos del formato heredado, que nunca la declaran.

El sistema MUST aplicar al documento importado las mismas comprobaciones de coherencia que aplica al cargar: un item completado cuyos predecesores no lo estén se importa sin completar, en lugar de introducir en el modelo un estado que la regla de orden no permite alcanzar.

#### Scenario: Importar un documento con completitud

- **WHEN** el usuario importa un roadmap exportado con el plan fijado y varios items completados
- **THEN** el sistema lo importa conservando la fecha de fijación, y por cada item su fecha de completitud, su fin planificado al completarse y su línea base, con las mismas desviaciones que en el origen

#### Scenario: Importar un documento sin completitud

- **WHEN** el usuario importa un roadmap exportado por una versión anterior, que no declara completitud
- **THEN** el sistema lo importa con todos sus items sin completar y sin plan fijado, sin error

#### Scenario: Importar un documento en formato heredado

- **WHEN** el usuario importa un documento del formato heredado del HTML original
- **THEN** el sistema lo importa con todos sus items sin completar y sin plan fijado, sin error

#### Scenario: Importar un item completado con un predecesor pendiente

- **WHEN** el usuario importa un documento en el que un item completado depende de otro que no lo está
- **THEN** el sistema importa ese item sin completar y el resto del documento sin error

#### Scenario: Importar un item completado sin línea base

- **WHEN** el usuario importa un roadmap en el que un item completado no declara línea base
- **THEN** el sistema lo importa completado y muestra solo su desviación de la última previsión, señalando que no tiene línea base

### Requirement: Exportar decisiones a JSON
El sistema MUST permitir exportar las decisiones a un documento JSON autocontenido, que MUST incluir de cada decisión sus dos textos y el contexto del origen, el proyecto, el responsable de negocio, la fecha límite, el impacto, las notas, sus alternativas con los efectos declarados sobre cada eje, la recomendación con su motivo y la fecha en que se congeló, y la resolución con su fecha.

El documento exportado MUST bastar para reconstruir el estado derivado de cada decisión —incluido su ciclo de vida y el desenlace de la comparación entre recomendación y resolución— sin necesidad de ningún dato adicional.

El export de decisiones MUST ser independiente del de roadmaps: ni un documento de decisiones incluye roadmaps ni al revés.

#### Scenario: Exportar el conjunto de decisiones
- **WHEN** el usuario exporta desde Decisions
- **THEN** el sistema descarga un JSON con todas sus decisiones y todo lo necesario para reconstruirlas

#### Scenario: Una decisión planteada conserva su recomendación congelada
- **WHEN** se exporta una decisión que se planteó con recomendación
- **THEN** el documento incluye qué alternativa se recomendaba, por qué, y la fecha en que quedó congelada

#### Scenario: Los dos documentos no se mezclan
- **WHEN** el usuario exporta un roadmap y exporta sus decisiones
- **THEN** obtiene dos documentos independientes, y ninguno contiene los datos del otro

### Requirement: Importar decisiones desde JSON
El sistema MUST permitir importar un documento de decisiones exportado por él mismo, añadiendo las decisiones que contiene a las ya existentes.

El sistema MUST rechazar un documento que no reconozca, explicando por qué, y MUST NOT dejar decisiones a medio importar: o entra el documento entero o no entra ninguna.

El sistema MUST asignar identidad nueva a las decisiones importadas, de modo que importar dos veces el mismo documento no pise las decisiones ya presentes.

#### Scenario: Importar un documento válido
- **WHEN** el usuario importa un documento de decisiones
- **THEN** el sistema añade sus decisiones a las existentes, conservando sus textos, alternativas, recomendación y resolución

#### Scenario: Documento no reconocible
- **WHEN** el usuario importa un archivo que no es un documento de decisiones
- **THEN** el sistema no altera ninguna decisión e indica el motivo del rechazo

#### Scenario: Importar dos veces
- **WHEN** el usuario importa el mismo documento dos veces
- **THEN** las decisiones de la segunda importación conviven con las de la primera en lugar de sustituirlas

#### Scenario: Importar un documento de roadmaps en Decisions
- **WHEN** el usuario intenta importar en Decisions un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que no es un documento de decisiones

### Requirement: El documento de decisiones lleva el manifiesto de adjuntos, no sus bytes
El documento exportado MUST incluir, por cada adjunto, su nombre, su peso, su tipo y cuándo se añadió, y MUST NOT incluir su contenido binario.

Omitir el contenido es deliberado: un documento con imágenes dentro pesa decenas de megas y deja de hacerse. Lo que MUST NOT ocurrir es que se omita en silencio — el manifiesto viaja precisamente para que quien importe vea qué falta y cuánto pesaba.

#### Scenario: Exportar decisiones con adjuntos
- **WHEN** el usuario exporta decisiones que tienen imágenes adjuntas
- **THEN** el documento incluye la ficha de cada imagen y no su contenido

#### Scenario: El tamaño del documento no depende de las imágenes
- **WHEN** se exportan dos conjuntos iguales salvo por el peso de sus adjuntos
- **THEN** los dos documentos tienen un tamaño equivalente

#### Scenario: Importar un documento con manifiesto
- **WHEN** el usuario importa un documento cuyas decisiones declaran adjuntos
- **THEN** el sistema conserva las fichas y las presenta como ausencias, sin dar la decisión por completa

### Requirement: Color del roadmap en el documento importado

El documento exportado MUST llevar la posición de paleta del roadmap, y al importar el sistema MUST respetarla, de modo que quien reimporte una exportación propia recupere el color que tenía.

Cuando el documento no la traiga —formato heredado, o exportado antes de que el campo existiera— el sistema MUST asignarla por la posición que el roadmap ocupa al entrar, igual que al crear uno nuevo. La posición dentro del documento MUST NOT usarse para derivarla: un documento lleva un solo roadmap y esa posición es siempre la primera.

Que la posición asignada coincida con la de un roadmap que ya estaba MUST NOT tratarse como un error. La paleta tiene un número fijo de posiciones y compartir color es el estado normal en cuanto hay más elementos que posiciones.

#### Scenario: Importar un documento que trae su color

- **WHEN** el usuario importa un roadmap exportado con su posición de paleta
- **THEN** el roadmap importado se muestra con esa misma posición

#### Scenario: Importar un documento heredado

- **WHEN** el usuario importa un roadmap cuyo documento no trae posición de paleta
- **THEN** el sistema le asigna la que corresponde a su lugar entre los roadmaps que ya existen

#### Scenario: El color importado coincide con uno existente

- **WHEN** el roadmap importado trae una posición de paleta que ya usa otro roadmap
- **THEN** el sistema la respeta y ambos comparten color, sin avisos ni reasignaciones

#### Scenario: El orden de los roadmaps no viaja

- **WHEN** el usuario exporta un roadmap y lo importa en otro navegador
- **THEN** el roadmap entra al final de la lista de destino, porque un documento describe un roadmap y no el orden del conjunto

### Requirement: Exportar un contrato a JSON

El sistema MUST permitir guardar un contrato de API como un documento JSON, y ese documento MUST ser **autocontenido**: todo lo que hace falta para reconstruirlo va dentro, sin depender de nada que se quede en la aplicación.

Los modelos reutilizables viajan dentro del contrato, porque es donde viven. El documento MUST NOT necesitar acompañamiento de ningún catálogo aparte.

El documento MUST NOT llevar el estado de sesión —qué se estaba editando dentro del contrato—, que pertenece a quien lo exportó y no a quien lo reciba.

El sistema MUST identificar el documento como suyo y como de contratos, para que quien lo importe sepa qué es antes de leerlo.

#### Scenario: Guardar un contrato

- **WHEN** el usuario guarda como JSON un contrato con dos endpoints y dos modelos
- **THEN** el sistema entrega un fichero que contiene el contrato entero, con sus modelos dentro

#### Scenario: El documento no lleva dónde se estaba editando

- **WHEN** el usuario exporta un contrato mientras edita uno de sus endpoints
- **THEN** el documento no dice cuál era

### Requirement: Importar un contrato desde JSON

El sistema MUST permitir importar un documento de contrato exportado por él mismo, **añadiéndolo** a los contratos existentes.

El sistema MUST rechazar un documento que no reconozca, explicando por qué, y MUST NOT dejar nada a medio importar: o entra el contrato entero o no entra ninguno.

El sistema MUST asignar identidad nueva a todo lo que entra —el contrato, sus modelos, sus endpoints y cada campo de sus árboles—, y MUST remapear las referencias internas para que apunten a los modelos del contrato importado y no a los del original. Importar dos veces el mismo fichero MUST producir dos contratos independientes.

Un contrato importado que no traiga posición de paleta MUST recibir la que le corresponda por su lugar de llegada, no la que tuviera en el documento: dentro de un documento su posición es siempre cero y no dice nada.

#### Scenario: Traer un contrato

- **WHEN** el usuario importa un documento de contrato
- **THEN** el sistema lo añade a los que ya tiene, con sus endpoints, sus modelos y sus comentarios intactos

#### Scenario: Importar dos veces

- **WHEN** el usuario importa el mismo documento dos veces
- **THEN** los dos contratos conviven, y editar uno no altera al otro

#### Scenario: Las referencias del contrato importado apuntan a sus propios modelos

- **WHEN** el usuario importa un contrato cuyos campos referencian a sus modelos
- **THEN** esas referencias resuelven dentro del contrato importado, y no a los modelos de ningún otro

#### Scenario: Un documento ilegible

- **WHEN** el usuario importa un archivo que no es un documento de contratos
- **THEN** el sistema no altera ningún contrato e indica el motivo del rechazo

#### Scenario: El ciclo completo

- **WHEN** el usuario exporta un contrato, lo importa y lo exporta de nuevo
- **THEN** el segundo documento describe la misma API que el primero

### Requirement: Un documento equivocado se nombra por lo que es

Cuando una aplicación rechaza un documento que pertenece a **otra** aplicación del contenedor, MUST decir de cuál es, en lugar de limitarse a decir que no es el suyo.

Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y crece con cada aplicación: con tres hay seis combinaciones equivocadas. «No es un documento válido» deja adivinando; «esto es un documento de roadmaps» se corrige en un segundo.

Esto MUST valer en las tres aplicaciones, y no solo en la que lo tuviera resuelto.

#### Scenario: Un contrato en Decisions

- **WHEN** el usuario intenta importar en Decisions un documento de contratos
- **THEN** el sistema lo rechaza indicando que es un documento de API Hub

#### Scenario: Un roadmap en API Hub

- **WHEN** el usuario intenta importar en API Hub un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que es un documento de Roadmaps

#### Scenario: Unas decisiones en Roadmaps

- **WHEN** el usuario intenta importar en Roadmaps un documento de decisiones
- **THEN** el sistema lo rechaza indicando que es un documento de Decisions

#### Scenario: Un fichero que no es de nadie

- **WHEN** el usuario importa un JSON que no pertenece a ninguna aplicación del contenedor
- **THEN** el sistema lo rechaza diciendo que no lo reconoce, sin atribuirlo a ninguna

### Requirement: Exportar e importar la biblioteca de modelos

El sistema MUST permitir guardar la biblioteca de modelos como un documento JSON e importarla de vuelta, con las mismas reglas que el contrato: autocontenido, identificado como suyo, y rechazando con su motivo lo que no reconozca.

La biblioteca vive en el navegador de un perfil igual que los contratos, así que **esto es lo único que la mueve entre máquinas y entre personas** — y es la vía por la que dos squads pueden acabar usando el mismo `Paginacion`, que es el objetivo entero de tenerla.

Importar MUST **añadir** a las entradas existentes, no reemplazarlas. Una entrada cuyo nombre ya está en la biblioteca MUST resolverse igual que se resuelve al guardar: avisando antes de reemplazar.

Cada entrada importada MUST recibir identidad nueva, para que importar dos veces el mismo documento no dependa de que los identificadores del origen sean únicos aquí.

#### Scenario: El ciclo completo

- **WHEN** el usuario exporta la biblioteca y la importa de vuelta
- **THEN** las entradas describen los mismos modelos que antes

#### Scenario: Importar añade

- **WHEN** el usuario importa una biblioteca con entradas que aquí no están
- **THEN** el sistema las añade a las que ya tenía

#### Scenario: Una entrada que ya existe

- **WHEN** el documento importado trae una entrada con un nombre que ya está en la biblioteca
- **THEN** el sistema avisa antes de reemplazarla

#### Scenario: Un documento equivocado

- **WHEN** el usuario intenta importar como biblioteca un documento de contratos, o de otra aplicación
- **THEN** el sistema lo rechaza diciendo qué es en realidad

#### Scenario: Y en la otra dirección

- **WHEN** el usuario intenta importar como contrato una biblioteca de modelos
- **THEN** el sistema lo rechaza diciendo que es una biblioteca, no que no es un contrato: los dos documentos son de la misma aplicación, así que nombrar otra aplicación no está disponible como explicación
