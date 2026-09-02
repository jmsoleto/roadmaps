# local-persistence

## Purpose

Cómo sobreviven los datos entre sesiones, sabiendo que no hay servidor y que perderlos no tiene vuelta atrás.

**Un almacén por aplicación**, y ninguna lee el de otra. El de Roadmaps es el almacenamiento de clave-valor del navegador, bajo una clave versionada, y no se mueve de ahí. El de Decisions vive fuera de él, en un almacén cuya cuota no compite con aquella: agotar la del primero haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario. Dentro de ese almacén, el contenido binario de los adjuntos va aparte del documento, que se reescribe entero en cada guardado.

Cubre además las fechas absolutas como formato canónico, el autosave con agrupación de escrituras, la persistencia del estado de sesión y de las preferencias de tema, el volcado de los cambios pendientes al cerrar, y la distinción entre un almacén vacío y uno que no se ha podido abrir.

## Requirements

### Requirement: Fechas absolutas como formato canónico
El sistema MUST almacenar las fechas de fases, items y milestones como fechas absolutas (ISO `YYYY-MM-DD`), no como índices relativos a una fecha de inicio fija.

#### Scenario: Persistir un item con fechas
- **WHEN** el usuario crea un item con inicio y fin
- **THEN** el sistema guarda `start_date` y `end_date` como fechas ISO absolutas

#### Scenario: Milestone con fecha única
- **WHEN** el usuario marca un item como milestone
- **THEN** el sistema fuerza que `start_date` sea igual a `end_date`

### Requirement: Persistencia de la preferencia de tema y de los temas propios
El sistema MUST persistir el tema activo y la colección de temas propios en el mismo almacén que el resto de preferencias, de forma que sobrevivan al cierre de la aplicación.

#### Scenario: El tema sobrevive al reinicio
- **WHEN** el usuario selecciona un tema y cierra la aplicación
- **THEN** al volver a abrirla la aplicación se muestra con ese mismo tema

#### Scenario: Los temas propios sobreviven al reinicio
- **WHEN** el usuario crea varios temas propios y reinicia la aplicación
- **THEN** todos siguen disponibles para seleccionarlos, con sus nombres y colores

### Requirement: Copia de arranque del tema activo

El sistema MUST mantener una copia del tema activo en un almacén de lectura inmediata, además del almacén canónico, para poder aplicarlo antes de que la aplicación termine de cargarse.

La copia existe porque el tema debe pintarse antes del primer fotograma, momento en el que el código de la aplicación todavía no se ha ejecutado y por tanto no ha leído el almacén canónico.

#### Scenario: Divergencia entre la copia de arranque y el almacén canónico

- **WHEN** la copia de arranque no coincide con el tema registrado en el almacén canónico
- **THEN** el sistema aplica la copia de arranque para pintar y, al terminar la carga, corrige la interfaz con el valor del almacén canónico

### Requirement: Normalización de colores a slots al cargar

El sistema MUST convertir a posiciones de paleta los colores de fases, items y responsables que estén almacenados como valores de color absolutos, en el momento de cargar los datos.

#### Scenario: Cargar datos guardados antes del sistema de temas

- **WHEN** la aplicación carga datos cuyos colores de fases, items y responsables están guardados como valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima y los datos quedan utilizables sin intervención del usuario

#### Scenario: La conversión se consolida al guardar

- **WHEN** el sistema ha normalizado colores al cargar y a continuación se produce un guardado
- **THEN** los datos persistidos contienen ya posiciones de paleta y no vuelven a necesitar conversión

#### Scenario: Cargar datos ya normalizados

- **WHEN** la aplicación carga datos cuyos colores ya son posiciones de paleta
- **THEN** el sistema los usa tal cual, sin alterarlos

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos de Roadmaps (roadmaps, fases, items, milestones, dependencias, responsables, catálogo de dependencias externas, asignaciones de dependencia externa, estado de completitud de cada item y línea base del plan de cada roadmap) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

Cada aplicación del hub MUST tener su propio almacén, y una aplicación MUST NOT leer ni escribir el almacén de otra. El almacén de Roadmaps es el descrito aquí y MUST NOT cambiar de sitio ni de clave.

El almacén es propio de cada navegador y de cada perfil: los datos no se sincronizan entre máquinas ni entre navegadores, y desaparecen si el usuario borra los datos del sitio. El mecanismo de copia de seguridad y de trasvase es el export/import JSON descrito en `data-portability`.

#### Scenario: Primer arranque sin datos previos

- **WHEN** la aplicación arranca en un navegador donde nunca se ha usado y el almacén está vacío
- **THEN** la aplicación arranca con su estado inicial y queda lista para crear el primer roadmap, sin errores

#### Scenario: Datos guardados en un formato no reconocible

- **WHEN** la aplicación arranca y el contenido del almacén no se corresponde con el formato esperado
- **THEN** la aplicación arranca con su estado inicial en lugar de fallar, y el usuario puede recuperar sus roadmaps importando un JSON

#### Scenario: Los datos sobreviven al cierre del navegador

- **WHEN** el usuario edita un roadmap, cierra el navegador por completo y vuelve a abrir la aplicación en el mismo navegador y perfil
- **THEN** sus cambios siguen ahí

#### Scenario: Las dependencias externas sobreviven al cierre del navegador

- **WHEN** el usuario da de alta dependencias externas, los asigna a items, resuelve alguno y vuelve a abrir la aplicación
- **THEN** el catálogo, las asignaciones con su funcionalidad y el estado de resolución de cada una siguen ahí

#### Scenario: La completitud sobrevive al cierre del navegador

- **WHEN** el usuario fija el plan de un roadmap, completa varios items y vuelve a abrir la aplicación
- **THEN** la fecha de completitud de cada item, el fin planificado que guardó al completarse, su línea base y la fecha de fijación del plan siguen ahí, y las desviaciones se muestran igual que antes de cerrar

#### Scenario: Los datos de otra aplicación no afectan a los de Roadmaps

- **WHEN** otra aplicación del hub escribe o borra sus propios datos
- **THEN** el almacén de Roadmaps no cambia

### Requirement: Autosave con agrupación de escrituras

El sistema MUST guardar los cambios de forma automática, agrupando las escrituras próximas en el tiempo en una sola. Cada guardado MUST escribir el estado completo de una vez, de modo que el almacén nunca contenga un estado a medio escribir.

#### Scenario: Ediciones en ráfaga

- **WHEN** el usuario arrastra una barra generando muchos cambios en menos de 250 ms
- **THEN** el sistema agrupa la escritura y persiste el estado final una sola vez, mostrando el indicador de guardado

#### Scenario: Consistencia del estado guardado

- **WHEN** el sistema persiste el estado
- **THEN** lo escribe como una única operación, y una lectura posterior obtiene el estado anterior íntegro o el nuevo íntegro, nunca una mezcla de ambos

### Requirement: Persistencia del estado de sesión

El sistema MUST recordar entre sesiones el roadmap activo y las preferencias de vista (p. ej. el nivel de zoom), en el mismo almacén que el resto de preferencias.

#### Scenario: Reabrir en el último estado

- **WHEN** el usuario cierra la aplicación con un roadmap y un nivel de zoom concretos y la vuelve a abrir
- **THEN** la aplicación restaura ese roadmap como roadmap activo y ese nivel de zoom

### Requirement: Guardado de cambios pendientes al cerrar

El sistema MUST persistir los cambios pendientes de guardar cuando el usuario cierra la pestaña o la ventana de la aplicación, sin esperar a que expire la agrupación del autosave.

La garantía alcanza hasta donde alcanza la plataforma: el cierre iniciado por el usuario. El sistema NO puede garantizar el guardado cuando el navegador descarta la pestaña sin previo aviso, situación en la que se pierden como mucho los cambios de la última ráfaga de edición.

#### Scenario: Cierre con cambios pendientes

- **WHEN** el usuario realiza un cambio y cierra la pestaña o la ventana antes de que expire la agrupación del autosave
- **THEN** el cambio se escribe en el almacén antes de que la página se descargue, y al volver a abrir la aplicación el cambio está ahí

### Requirement: Normalización de datos sin dependencias externas al cargar

El sistema MUST cargar sin error los datos guardados por versiones anteriores a la introducción de las dependencias externas, tratando como ausencia de dependencias externas tanto el catálogo global como las asignaciones de cada item.

La normalización MUST ser idempotente y MUST NOT provocar por sí sola una escritura en el almacén: la conversión se consolida en el siguiente guardado que ocurra por el flujo normal de la aplicación, igual que la normalización de colores a slots.

#### Scenario: Cargar datos guardados antes de las dependencias externas

- **WHEN** la aplicación carga datos que no declaran catálogo de dependencias externas ni asignaciones en sus items
- **THEN** el sistema arranca con el catálogo vacío, ningún item bloqueado y sin error

#### Scenario: Cargar datos que ya declaran dependencias externas

- **WHEN** la aplicación carga datos que ya contienen catálogo de dependencias externas y asignaciones
- **THEN** el sistema los usa tal cual, sin alterarlos

#### Scenario: La conversión se consolida al guardar

- **WHEN** el sistema ha cargado datos sin dependencias externas y a continuación se produce un guardado
- **THEN** los datos persistidos contienen ya el catálogo de dependencias externas y las listas de asignaciones, y no vuelven a necesitar normalización

### Requirement: Normalización de datos sin completitud al cargar

El sistema MUST cargar sin error los documentos guardados por versiones anteriores, que no declaran completitud ni línea base, tratando cada item como sin completar, sin fin planificado guardado y sin línea base, y cada roadmap como sin plan fijado.

La normalización MUST ser idempotente y MUST NOT forzar por sí misma una escritura en el almacén.

El sistema MUST descartar en la carga los estados de completitud imposibles, dejando sin completar todo item completado cuyos predecesores no lo estén. Un modelo cargado en ese estado dejaría items congelados que el desplazamiento automático de dependencias querría mover, y es preferible perder una marca a conservar esa contradicción.

#### Scenario: Cargar datos anteriores a este cambio

- **WHEN** la aplicación arranca con datos guardados por una versión que no conocía la completitud
- **THEN** los carga sin error, con todos los items sin completar y todos los roadmaps sin plan fijado

#### Scenario: Cargar datos ya normalizados

- **WHEN** la aplicación arranca con datos que ya declaran completitud y línea base
- **THEN** los carga tal cual, sin alterarlos ni forzar un guardado

#### Scenario: Cargar un item completado con un predecesor pendiente

- **WHEN** la aplicación carga datos en los que un item completado depende de otro que no lo está
- **THEN** deja ese item sin completar y carga el resto del documento sin error

### Requirement: El almacén de Decisions vive fuera del almacenamiento de clave-valor

El sistema MUST persistir las decisiones en un almacén del navegador cuya capacidad no compete con la del almacenamiento de clave-valor que usa Roadmaps, y que admita datos binarios sin recodificarlos como texto.

La razón es de seguridad del dato, no de capacidad: agotar la cuota del almacenamiento de clave-valor haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario. Con los dos almacenes separados, ninguna cantidad de datos de Decisions puede impedir que Roadmaps guarde.

#### Scenario: Decisions no puede agotar el almacén de Roadmaps

- **WHEN** el almacén de Decisions crece hasta un tamaño grande
- **THEN** Roadmaps sigue guardando sus cambios con normalidad

#### Scenario: Primer arranque de Decisions

- **WHEN** el usuario entra en Decisions en un navegador donde nunca se ha usado
- **THEN** la aplicación arranca sin decisiones y lista para capturar la primera, sin errores

#### Scenario: Las decisiones sobreviven al cierre del navegador

- **WHEN** el usuario captura decisiones, las prepara, plantea alguna y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, con sus dos textos, sus alternativas, la recomendación congelada y la resolución de las que la tengan

### Requirement: Un almacén que no se puede abrir se distingue de un almacén vacío

Cuando el sistema no consigue abrir el almacén de una aplicación, MUST decírselo al usuario y MUST NOT presentar esa aplicación como si no tuviera datos. Mientras el almacén no esté disponible, el sistema MUST NOT permitir crear ni modificar nada en esa aplicación.

Arrancar en blanco sobre un almacén que sí tiene datos invita a volver a escribir encima de ellos, y esa pérdida sería irreversible: no hay servidor del que recuperarlos.

La regla vale para toda aplicación con almacén propio, y MUST NOT resolverse en cada una a su manera: lo que el usuario ve al no poder leerse sus datos MUST ser reconociblemente lo mismo en todas.

#### Scenario: El almacén no abre

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** el sistema indica que las decisiones no están disponibles en lugar de mostrar la lista vacía, y no ofrece capturar ninguna

#### Scenario: El almacén abre y está vacío

- **WHEN** el almacén de Decisions abre correctamente y no contiene ninguna decisión
- **THEN** el sistema muestra el estado vacío normal, con la captura disponible

#### Scenario: Roadmaps sigue funcionando

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** Roadmaps y la landing del hub siguen funcionando con normalidad

#### Scenario: El almacén de contratos no abre

- **WHEN** el almacén de API Hub no se puede abrir
- **THEN** el sistema indica que los contratos no están disponibles en lugar de mostrar la lista vacía, y no ofrece crear ninguno

#### Scenario: El almacén de contratos abre y está vacío

- **WHEN** el almacén de API Hub abre correctamente y no contiene ningún contrato
- **THEN** el sistema muestra el estado vacío normal, con el alta disponible

#### Scenario: Las demás aplicaciones siguen funcionando

- **WHEN** el almacén de API Hub no se puede abrir
- **THEN** Roadmaps, Decisions y la landing del hub siguen funcionando con normalidad

### Requirement: Los bytes de los adjuntos se guardan aparte del documento
El sistema MUST guardar el contenido binario de los adjuntos en un almacén distinto del que guarda el documento de decisiones, dentro del mismo almacén de la aplicación, referenciado desde la ficha de cada adjunto.

El documento se reescribe entero en cada guardado; con los bytes dentro, escribir una letra en una nota reescribiría todas las imágenes de todas las decisiones.

#### Scenario: Escribir texto no reescribe las imágenes
- **WHEN** el usuario edita el texto de una decisión que tiene adjuntos
- **THEN** el sistema guarda el documento sin volver a escribir el contenido de los adjuntos

#### Scenario: Los adjuntos sobreviven al cierre del navegador
- **WHEN** el usuario adjunta imágenes a una decisión y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, con su ficha y su contenido

### Requirement: Recogida de contenidos huérfanos
Al arrancar, y solo tras haber leído el documento con éxito, el sistema MUST borrar el contenido de los adjuntos que ninguna ficha menciona.

El sistema MUST NOT borrar fichas cuyo contenido falte: una ficha sin bytes es lo que produce una importación, y borrarla destruiría el registro de que esa imagen existió.

#### Scenario: Contenido sin dueño
- **WHEN** el almacén contiene el contenido de un adjunto que ninguna decisión menciona
- **THEN** el sistema lo borra al arrancar

#### Scenario: Ficha sin contenido
- **WHEN** una decisión declara un adjunto cuyo contenido no está en el almacén
- **THEN** el sistema conserva la ficha y no borra nada

#### Scenario: No se recoge nada si no se pudo leer
- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** el sistema no borra ningún contenido

### Requirement: Un almacén que no responde no impide arrancar
El sistema MUST acotar la espera al abrir el almacén de una aplicación. Si no obtiene respuesta —ni éxito, ni error, ni el aviso de estar bloqueado— MUST darlo por no disponible y explicar la causa probable.

Ninguna aplicación MUST poder impedir que el resto arranque por culpa de su almacén. El arranque MUST completarse aunque el almacén de una de ellas no conteste, y esa aplicación MUST reflejar por sí misma que no está disponible.

Mientras el almacén todavía está respondiendo, el sistema MUST distinguirlo de un almacén vacío: enseñar una lista vacía sobre datos que aún no se han leído es el mismo error que enseñarla sobre datos que no se han podido leer.

#### Scenario: El almacén no contesta
- **WHEN** la apertura del almacén de una aplicación no produce ninguna respuesta en un plazo razonable
- **THEN** el sistema la da por no disponible e indica que puede haber otra pestaña con una versión anterior abierta

#### Scenario: El resto de la aplicación arranca igual
- **WHEN** el almacén de una aplicación no responde
- **THEN** el hub y las demás aplicaciones se montan y funcionan con normalidad

#### Scenario: Mientras se está abriendo
- **WHEN** el usuario entra en una aplicación cuyo almacén todavía está respondiendo
- **THEN** el sistema indica que se está abriendo, y no muestra una lista vacía

### Requirement: Normalización de roadmaps sin slot de color al cargar

Al cargar datos guardados antes de que el roadmap tuviera su propia posición de paleta, el sistema MUST asignar a cada roadmap que no la traiga la posición que corresponde a su lugar en la lista.

Derivarla de la posición no es una elección arbitraria: es de donde salía el color antes de existir el campo, de modo que la normalización MUST reproducir exactamente el color que cada roadmap ya mostraba. Actualizar la aplicación MUST NOT cambiar ningún color.

La normalización MUST ser idempotente y MUST NOT provocar por sí sola una escritura en el almacén: la conversión se consolida en el siguiente guardado que ocurra por el flujo normal de la aplicación, igual que la normalización de colores a slots.

#### Scenario: Cargar datos sin slot de color en los roadmaps

- **WHEN** el sistema carga un documento cuyos roadmaps no tienen posición de paleta
- **THEN** cada roadmap recibe la que corresponde a su lugar en la lista y se muestra con el mismo color que antes

#### Scenario: Cargar datos ya normalizados

- **WHEN** el sistema carga un documento cuyos roadmaps ya tienen su posición
- **THEN** el sistema los deja como están, sin reasignar nada por su lugar en la lista

#### Scenario: Reordenar tras la normalización

- **WHEN** el usuario reordena los roadmaps de un documento recién normalizado
- **THEN** cada uno conserva el color que tenía antes de moverse

### Requirement: El almacén de API Hub vive fuera del de las demás aplicaciones

El sistema MUST persistir los contratos de API en un almacén del navegador cuya capacidad no compita con la del almacenamiento de clave-valor que usa Roadmaps, por el mismo motivo por el que Decisions tiene el suyo: agotar esa cuota haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario.

El sistema MUST guardar la biblioteca de modelos reutilizables aparte del documento de contratos, dentro del mismo almacén de la aplicación. La biblioteca es transversal a todos los contratos y el documento se reescribe entero en cada guardado; con la biblioteca dentro, escribir una letra en un contrato reescribiría también la biblioteca completa.

El sitio de la biblioteca se creó antes de que hubiera nada que guardar en ella, y esa fue la decisión correcta: crearlo después habría obligado a migrar contratos que el usuario ya tuviera, que es justamente la migración irreversible que este proyecto evita. Se elige por donde acaba y no por donde empieza.

Guardar en la biblioteca MUST NOT reescribir el documento de contratos, y guardar un contrato MUST NOT reescribir la biblioteca.

#### Scenario: API Hub no puede agotar el almacén de Roadmaps

- **WHEN** el almacén de API Hub crece hasta un tamaño grande
- **THEN** Roadmaps sigue guardando sus cambios con normalidad

#### Scenario: Primer arranque de API Hub

- **WHEN** el usuario entra en API Hub en un navegador donde nunca se ha usado
- **THEN** la aplicación arranca sin contratos y lista para crear el primero, sin errores

#### Scenario: Actualizar sobre datos ya guardados

- **WHEN** el usuario abre la aplicación tras una actualización que añade el almacén de API Hub
- **THEN** sus roadmaps y sus decisiones siguen intactos

#### Scenario: Escribir en un contrato no toca la biblioteca

- **WHEN** el usuario edita un campo de un contrato
- **THEN** el sistema guarda el documento de contratos sin reescribir la biblioteca

#### Scenario: La biblioteca sobrevive al cierre del navegador

- **WHEN** el usuario guarda modelos en la biblioteca y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, disponibles desde cualquier contrato
