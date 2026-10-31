## MODIFIED Requirements

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
