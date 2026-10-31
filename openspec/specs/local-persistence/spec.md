# local-persistence

## Purpose

Cómo sobreviven los datos entre sesiones, sabiendo que no hay servidor y que perderlos no tiene vuelta atrás.

**Un almacén por aplicación**, y ninguna lee el de otra. El de Roadmaps es el almacenamiento de clave-valor del navegador, bajo una clave versionada, y no se mueve de ahí. El de Links Hub es también de clave-valor, bajo una clave propia al lado de aquella y nunca dentro: es la excepción declarada frente a los dos siguientes, porque un almacén capaz de hacer esperar no puede quedarse entre el usuario y el panel que necesita en mitad de una caída. Esa excepción vale mientras Links Hub no esté conectado a una carpeta. El de Decisions vive fuera de él, en un almacén cuya cuota no compite con aquella: agotar la del primero haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario. Dentro de ese almacén, el contenido binario de los adjuntos va aparte del documento, que se reescribe entero en cada guardado.

Roadmaps, API Hub y Links Hub pueden guardar en cambio en una carpeta del dispositivo (`folder-persistence`). Mientras lo hacen, su almacén del navegador queda intacto, y lo que es de cada persona (qué está abierto, qué está plegado, el zoom) sigue aquí, como estado de sesión, fuera de los datos.

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

Esto vale **mientras Roadmaps no esté conectado a una carpeta**. Con una carpeta conectada, los datos de Roadmaps se guardan allí según `folder-persistence`, y el almacén del navegador MUST quedar intacto, sin leerse ni escribirse, hasta que se desconecte. Es lo que permite que desconectar devuelva los datos tal como estaban.

Cada aplicación del hub MUST tener su propio almacén, y una aplicación MUST NOT leer ni escribir el almacén de otra. El almacén de Roadmaps en el navegador es el descrito aquí y MUST NOT cambiar de sitio ni de clave.

El almacén es propio de cada navegador y de cada perfil: los datos no se sincronizan entre máquinas ni entre navegadores, y desaparecen si el usuario borra los datos del sitio. El mecanismo de copia de seguridad y de trasvase es el export/import JSON descrito en `data-portability`, y **su alcance es el que cada aplicación declare allí**: en Roadmaps y en API Hub el documento es una unidad de trabajo (un roadmap, un contrato), en Decisions es el conjunto entero, y en Links Hub es un área. Una aplicación cuyo documento sea una unidad y no el conjunto MUST NOT presentarse como respaldada por completo: mientras no declare un documento de conjunto, guardar todo su contenido son tantos ficheros como unidades tenga, y esta capability no promete lo contrario. Conectarla a una carpeta es la otra forma de tenerla respaldada por completo.

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

#### Scenario: El respaldo de Links Hub es por áreas

- **WHEN** el usuario quiere guardar fuera del navegador todo el contenido de Links Hub
- **THEN** el sistema le permite hacerlo exportando cada área, y no ofrece un único documento que las contenga todas

#### Scenario: Con carpeta conectada el navegador no se toca

- **WHEN** el usuario edita roadmaps con Roadmaps conectado a una carpeta
- **THEN** el almacén de Roadmaps en el navegador conserva exactamente lo que tenía al conectar

### Requirement: Autosave con agrupación de escrituras

El sistema MUST guardar los cambios de forma automática, agrupando las escrituras próximas en el tiempo en una sola.

En el almacén del navegador, cada guardado MUST escribir el estado completo de una vez, de modo que el almacén nunca contenga un estado a medio escribir.

En una carpeta conectada el estado está repartido en varios ficheros y la plataforma no ofrece escribir varios a la vez. La garantía MUST ser entonces por fichero: cada fichero escrito MUST quedar con su contenido anterior íntegro o con el nuevo íntegro. El indicador de guardado MUST NOT mostrarse hasta que hayan terminado todas las escrituras de ese guardado.

#### Scenario: Ediciones en ráfaga

- **WHEN** el usuario arrastra una barra generando muchos cambios en menos de 250 ms
- **THEN** el sistema agrupa la escritura y persiste el estado final una sola vez, mostrando el indicador de guardado

#### Scenario: Consistencia del estado guardado

- **WHEN** el sistema persiste el estado en el almacén del navegador
- **THEN** lo escribe como una única operación, y una lectura posterior obtiene el estado anterior íntegro o el nuevo íntegro, nunca una mezcla de ambos

#### Scenario: Consistencia por fichero en una carpeta

- **WHEN** el sistema persiste el estado en una carpeta conectada
- **THEN** cada fichero que escribe queda con su contenido anterior íntegro o con el nuevo íntegro, y el indicador de guardado aparece solo cuando han terminado todos

### Requirement: Persistencia del estado de sesión

El sistema MUST recordar entre sesiones el roadmap activo, qué fases están plegadas y las preferencias de vista (p. ej. el nivel de zoom), en el mismo almacén que el resto de preferencias.

Los **dos anchos de la columna de nombres**, el de la vista de roadmap y el de la vista "Todos", son preferencias de vista de pleno derecho y MUST recordarse igual, cada uno por separado. Un ancho de columna es una decisión que se toma una vez y se espera encontrar tal cual al volver.

El sistema MUST guardarlos al terminar el gesto de redimensionado, no durante el arrastre: un arrastre genera decenas de posiciones intermedias y ninguna de ellas es una decisión.

Estas preferencias, el roadmap activo y el plegado de las fases incluidos, MUST vivir fuera de los datos de los roadmaps. Por tanto MUST NOT viajar en la exportación, MUST NOT alterarse al importar y MUST NOT escribirse en una carpeta conectada. Describen cómo mira el usuario, no lo que hay planificado.

#### Scenario: Reabrir en el último estado

- **WHEN** el usuario cierra la aplicación con un roadmap y un nivel de zoom concretos y la vuelve a abrir
- **THEN** la aplicación restaura ese roadmap como roadmap activo y ese nivel de zoom

#### Scenario: El plegado de las fases sobrevive a la sesión

- **WHEN** el usuario pliega varias fases, cierra la aplicación y la vuelve a abrir
- **THEN** esas fases siguen plegadas y las demás desplegadas

#### Scenario: Los anchos de columna sobreviven a la sesión

- **WHEN** el usuario ajusta el ancho de la columna en un roadmap y el de la vista "Todos", cierra la aplicación y la vuelve a abrir
- **THEN** cada vista reaparece con el ancho que se le había dado

#### Scenario: Primer arranque sin preferencias guardadas

- **WHEN** el usuario abre la aplicación en un navegador donde nunca ha ajustado el ancho
- **THEN** las dos vistas arrancan con el ancho por defecto, sin esperar a que termine la carga

#### Scenario: Los anchos no viajan con los datos

- **WHEN** el usuario exporta sus roadmaps y los importa en otro navegador
- **THEN** los roadmaps llegan completos y los anchos de columna del navegador de destino no cambian

#### Scenario: Datos guardados con el estado de vista dentro

- **WHEN** la aplicación carga datos de una versión anterior que guardaban el roadmap activo y el plegado de las fases junto a los roadmaps
- **THEN** conserva ese roadmap activo y ese plegado como estado de sesión, sin perderlos ni forzar una escritura

### Requirement: Guardado de cambios pendientes al cerrar

Con el almacén del navegador, el sistema MUST persistir los cambios pendientes de guardar cuando el usuario cierra la pestaña o la ventana de la aplicación, sin esperar a que expire la agrupación del autosave.

La garantía alcanza hasta donde alcanza la plataforma: el cierre iniciado por el usuario. El sistema NO puede garantizar el guardado cuando el navegador descarta la pestaña sin previo aviso, situación en la que se pierden como mucho los cambios de la última ráfaga de edición.

Con una carpeta conectada, la escritura es asíncrona y la plataforma no espera a que termine antes de descargar la página. El sistema MUST entonces empezar la escritura de lo pendiente al cerrar y, mientras quede alguna escritura sin terminar, MUST pedir al navegador que confirme el cierre, de modo que el usuario pueda quedarse hasta que acabe. Sin escrituras pendientes, el cierre MUST NOT pedir confirmación.

#### Scenario: Cierre con cambios pendientes

- **WHEN** el usuario realiza un cambio y cierra la pestaña o la ventana antes de que expire la agrupación del autosave, con Roadmaps en el almacén del navegador
- **THEN** el cambio se escribe en el almacén antes de que la página se descargue, y al volver a abrir la aplicación el cambio está ahí

#### Scenario: Cierre con escrituras pendientes en la carpeta

- **WHEN** el usuario cierra la pestaña con Roadmaps conectado a una carpeta y un cambio que todavía no se ha escrito
- **THEN** el navegador pide confirmar el cierre, y si el usuario se queda el cambio termina de escribirse en la carpeta

#### Scenario: Cierre sin nada pendiente en la carpeta

- **WHEN** el usuario cierra la pestaña con Roadmaps conectado y todo escrito
- **THEN** la página se cierra sin pedir confirmación

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

La regla vale para toda aplicación con almacén propio, y MUST NOT resolverse en cada una a su manera: lo que el usuario ve al no poder leerse sus datos MUST ser reconociblemente lo mismo en todas. Una carpeta conectada es un almacén más: la carpeta que falta, el fichero ilegible y el permiso no concedido son formas de no poder abrirlo, y se presentan igual.

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

#### Scenario: La carpeta de Roadmaps no se puede leer

- **WHEN** Roadmaps está conectado a una carpeta que no se puede leer o sobre la que falta el permiso
- **THEN** el sistema indica que los roadmaps no están disponibles, con la misma presentación que Decisions y API Hub, en lugar de mostrar el plan vacío o el sembrado inicial

#### Scenario: Una carpeta marcada sin roadmaps

- **WHEN** Roadmaps se conecta a una carpeta suya que no contiene ningún roadmap
- **THEN** el sistema muestra el estado vacío normal, con el alta disponible, y no siembra el roadmap de ejemplo en la carpeta

#### Scenario: Las demás siguen funcionando sin la carpeta de Roadmaps

- **WHEN** la carpeta de Roadmaps no se puede leer
- **THEN** Decisions, API Hub, Links Hub y la landing del hub siguen funcionando con normalidad

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

Esto vale **mientras API Hub no esté conectado a una carpeta**. Con una carpeta conectada, sus tres documentos se guardan allí según `folder-persistence`, y su almacén del navegador MUST quedar intacto hasta que se desconecte.

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

#### Scenario: Con carpeta conectada el navegador no se toca

- **WHEN** el usuario edita contratos con API Hub conectado a una carpeta
- **THEN** el almacén de API Hub en el navegador conserva exactamente lo que tenía al conectar

### Requirement: El almacén de Links Hub vive fuera del de las demás aplicaciones

Las áreas y los enlaces de Links Hub MUST guardarse bajo una clave propia del almacenamiento local, separada de la de Roadmaps y del almacén de documentos de Decisions y API Hub, de modo que ninguna aplicación pueda corromper ni desalojar los datos de otra.

Mientras Links Hub no esté conectado a una carpeta, el almacenamiento MUST ser síncrono y estar disponible antes del primer fotograma. Es la excepción declarada frente a Decisions y API Hub, y la razón es el día en que se usa: en una guardia no puede haber un desenlace «el almacén no responde» entre el usuario y el enlace que necesita, y el volumen —unas decenas de enlaces— no justifica pagar ese riesgo.

Con una carpeta conectada, la excepción no vale, y es una decisión de quien conecta: leer una carpeta es asíncrono y puede depender de un permiso. Links Hub MUST entonces mostrar que se está abriendo mientras lee la carpeta, y MUST distinguir una carpeta que no se puede leer de una vacía, con las mismas reglas que las demás aplicaciones. El almacén del navegador MUST quedar intacto hasta que se desconecte.

El sistema MUST tolerar un contenido ilegible o escrito por una versión anterior arrancando con lo que sí pueda interpretar, en lugar de no arrancar.

#### Scenario: Los enlaces sobreviven a cerrar el navegador

- **WHEN** el usuario crea áreas y enlaces, cierra el navegador y vuelve a abrir la aplicación
- **THEN** el sistema muestra las mismas áreas y los mismos enlaces, con su orden, su tamaño y sus colores

#### Scenario: Un contenido ilegible no impide arrancar

- **WHEN** la clave de Links Hub contiene algo que el sistema no puede interpretar
- **THEN** la aplicación arranca igualmente, con lo que haya podido recuperar o vacía, y el resto del contenedor no se ve afectado

#### Scenario: Los datos de una aplicación no tocan los de otra

- **WHEN** el usuario elimina todos los enlaces de Links Hub
- **THEN** los roadmaps, las decisiones y los contratos siguen intactos

#### Scenario: Sin carpeta, nunca hay espera

- **WHEN** el usuario abre Links Hub sin ninguna carpeta conectada
- **THEN** los enlaces están en pantalla desde el primer fotograma, sin ningún estado de «abriendo»

#### Scenario: Con carpeta, la espera se dice

- **WHEN** el usuario abre Links Hub conectado a una carpeta que todavía se está leyendo, o sobre la que falta el permiso
- **THEN** el sistema indica que se está abriendo o que falta el permiso, y no muestra un panel vacío

### Requirement: El estado de vista de API Hub es estado de sesión

El sistema MUST recordar entre sesiones qué contrato estaba abierto, qué endpoint o modelo se veía en cada contrato y qué nodos de los árboles estaban plegados, como preferencias del navegador y fuera de los documentos de API Hub. Por tanto MUST NOT viajar en la exportación de un contrato ni de la biblioteca, y MUST NOT alterarse al importar.

Al cargar documentos guardados por una versión anterior, que llevan ese estado dentro, el sistema MUST conservarlo como estado de sesión sin perderlo y sin forzar una escritura de los documentos.

#### Scenario: Reabrir donde se estaba

- **WHEN** el usuario cierra la aplicación con un contrato abierto, un endpoint a la vista y varios campos plegados, y la vuelve a abrir
- **THEN** encuentra ese contrato, ese endpoint y esos campos plegados

#### Scenario: Un nodo nuevo nace desplegado

- **WHEN** el usuario añade un campo a un modelo
- **THEN** el campo aparece desplegado, sin que se escriba ninguna preferencia

#### Scenario: Documentos guardados con el estado de vista dentro

- **WHEN** la aplicación carga contratos de una versión anterior que guardaban el contrato abierto, la vista de cada contrato y el plegado de sus nodos
- **THEN** los conserva como estado de sesión, sin perderlos ni forzar una escritura

#### Scenario: Exportar un contrato no lleva la vista

- **WHEN** el usuario exporta un contrato con campos plegados
- **THEN** el documento exportado no dice qué campos estaban plegados ni qué endpoint se estaba viendo
