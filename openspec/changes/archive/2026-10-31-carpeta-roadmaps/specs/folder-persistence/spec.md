## Purpose

Cómo una aplicación del hub guarda sus datos en una carpeta del dispositivo en lugar del navegador, para que esa carpeta, el clon de un repo, se pueda versionar y compartir con git. Cubre conectar y desconectar, la estructura y el marcador de la carpeta, el formato de los ficheros, el volcado inicial y los estados en que la carpeta no se puede usar. La primera aplicación que la usa es Roadmaps.

## ADDED Requirements

### Requirement: Conectar una aplicación a una carpeta es opcional y es de cada aplicación

El sistema MUST permitir conectar Roadmaps a una carpeta del dispositivo elegida por el usuario, y MUST permitir no hacerlo: sin conexión, Roadmaps MUST funcionar exactamente igual que antes de existir esta capacidad.

La conexión MUST ser propia de cada aplicación. Conectar o desconectar Roadmaps MUST NOT cambiar dónde guarda sus datos ninguna otra aplicación del hub. Así se decide qué se comparte: cada aplicación va al repo al que pertenece su carpeta, o a ninguno.

Cuando el navegador no ofrezca acceso a carpetas del dispositivo, el sistema MUST NOT ofrecer la conexión y MUST explicar que hace falta Chrome o Edge, en vez de ofrecer una acción que va a fallar.

#### Scenario: Roadmaps sin conectar

- **WHEN** el usuario no ha conectado Roadmaps a ninguna carpeta
- **THEN** sus roadmaps se guardan en el navegador como hasta ahora, y nada en la aplicación le exige conectar

#### Scenario: Conectar Roadmaps no mueve a las demás

- **WHEN** el usuario conecta Roadmaps a una carpeta
- **THEN** API Hub, Links Hub y Decisions siguen guardando donde guardaban

#### Scenario: Navegador sin acceso a carpetas

- **WHEN** el usuario abre Roadmaps en un navegador que no permite acceder a carpetas del dispositivo
- **THEN** el sistema no ofrece conectar, indica que hace falta Chrome o Edge, y Roadmaps funciona con el almacén del navegador

### Requirement: La carpeta elegida es la raíz y la aplicación ocupa su propia subcarpeta

Al conectar, el usuario MUST poder elegir la raíz del repo. Dentro de ella, el sistema MUST guardar los datos de Roadmaps en una subcarpeta llamada `roadmaps`, que lleva un fichero marcador que la declara de Roadmaps y dice la versión del formato. Así varias aplicaciones pueden compartir un mismo repo sin pisarse.

Si la carpeta elegida ya es una subcarpeta marcada como de Roadmaps, el sistema MUST usarla directamente en lugar de crear otra dentro.

El sistema MUST rechazar la conexión, sin escribir nada, cuando:

- la carpeta elegida, o su subcarpeta `roadmaps`, está marcada como de otra aplicación: el rechazo MUST nombrar esa aplicación;
- existe una subcarpeta `roadmaps` sin marcador o con un marcador que no se puede leer: el rechazo MUST decir que esa carpeta no la creó Tech Lead Hub;
- el marcador declara una versión del formato posterior a la que la aplicación sabe leer: el rechazo MUST pedir actualizar la aplicación.

#### Scenario: Elegir la raíz del repo

- **WHEN** el usuario conecta Roadmaps eligiendo la raíz de un repo que no tiene subcarpeta `roadmaps`
- **THEN** el sistema crea `roadmaps/` con su marcador y guarda ahí los datos

#### Scenario: Elegir directamente la subcarpeta

- **WHEN** el usuario conecta Roadmaps eligiendo una carpeta que ya está marcada como de Roadmaps
- **THEN** el sistema usa esa carpeta tal cual y no crea ninguna subcarpeta dentro

#### Scenario: La carpeta es de otra aplicación

- **WHEN** el usuario conecta Roadmaps eligiendo la carpeta marcada de API Hub
- **THEN** el sistema rechaza la conexión diciendo que esa carpeta es de API Hub, y no escribe nada

#### Scenario: Una subcarpeta `roadmaps` que no es nuestra

- **WHEN** la raíz elegida tiene una subcarpeta `roadmaps` sin marcador
- **THEN** el sistema rechaza la conexión diciendo que esa carpeta no la creó Tech Lead Hub, y no escribe nada en ella

#### Scenario: Una versión del formato posterior

- **WHEN** el marcador de la carpeta declara una versión del formato que la aplicación no conoce
- **THEN** el sistema rechaza la conexión, pide actualizar la aplicación y no escribe nada

### Requirement: Un formato que se puede versionar

El sistema MUST guardar los datos de Roadmaps en la carpeta como ficheros de texto JSON, con un fichero por roadmap y un fichero por cada catálogo global (responsables y dependencias externas).

La escritura MUST ser determinista: el mismo estado MUST producir exactamente los mismos bytes, con claves en un orden fijo, indentación fija y salto de línea final. Así un diff en git solo enseña lo que de verdad ha cambiado.

Los ficheros MUST NOT contener valores derivados ni estado de vista. El orden de los roadmaps es dato y MUST conservarse entre escrituras y lecturas.

Al leer, el sistema MUST aplicar las mismas normalizaciones que aplica al cargar del navegador, con la misma regla de que normalizar no provoca por sí solo una escritura.

#### Scenario: Guardar dos veces lo mismo

- **WHEN** el sistema guarda un estado y vuelve a guardarlo sin que haya cambiado
- **THEN** los ficheros de la carpeta quedan byte a byte iguales

#### Scenario: Ida y vuelta

- **WHEN** el sistema escribe un conjunto de roadmaps en la carpeta y lo vuelve a leer
- **THEN** obtiene los mismos roadmaps, en el mismo orden, con los mismos responsables y dependencias externas

#### Scenario: Un cambio pequeño es un diff pequeño

- **WHEN** el usuario mueve la fecha de un item de un roadmap
- **THEN** en la carpeta cambia solo el fichero de ese roadmap, y dentro de él solo las líneas de ese item

### Requirement: Guardar toca solo lo que ha cambiado

En cada guardado con la carpeta conectada, el sistema MUST escribir solo los ficheros cuyo contenido ha cambiado. Borrar un roadmap MUST borrar su fichero. Cada fichero MUST escribirse de forma que una lectura posterior encuentre su contenido anterior íntegro o el nuevo íntegro, nunca una mezcla.

El sistema MUST NOT borrar ni modificar ficheros de la carpeta que no haya escrito él, como un README que alguien haya añadido al repo.

#### Scenario: Editar un roadmap no reescribe los demás

- **WHEN** el usuario edita un roadmap con la carpeta conectada
- **THEN** los ficheros de los demás roadmaps y de los catálogos no cambian

#### Scenario: Borrar un roadmap

- **WHEN** el usuario borra un roadmap con la carpeta conectada
- **THEN** su fichero desaparece de la carpeta y los demás no cambian

#### Scenario: Ficheros ajenos

- **WHEN** la subcarpeta `roadmaps` contiene un fichero que el sistema no ha escrito
- **THEN** el sistema lo deja como está en todos los guardados

### Requirement: Conectar a una carpeta vacía vuelca los datos del navegador

Al conectar Roadmaps a una carpeta sin datos de Roadmaps, el sistema MUST escribir en ella los roadmaps, los responsables y las dependencias externas que tenía en el navegador, y MUST verificar la escritura releyendo la carpeta y comparándola con lo que se escribió. Este volcado es la migración al nuevo formato.

Solo si la verificación sale bien, el sistema MUST pasar a usar la carpeta. Si falla, MUST dejar Roadmaps sin conectar, decir qué ha fallado y no dar por buena una carpeta a medio escribir.

El volcado MUST NOT borrar ni modificar los datos del navegador.

#### Scenario: Volcado correcto

- **WHEN** el usuario conecta Roadmaps a una carpeta vacía teniendo tres roadmaps en el navegador
- **THEN** la carpeta queda con esos tres roadmaps y sus catálogos, Roadmaps pasa a usarla y el navegador conserva sus tres roadmaps

#### Scenario: El volcado no se verifica

- **WHEN** lo que se lee de la carpeta tras el volcado no coincide con lo que se escribió
- **THEN** Roadmaps sigue sin conectar y con los datos del navegador, y el usuario ve qué ha fallado

### Requirement: Conectar a una carpeta con datos: manda la carpeta

Al conectar Roadmaps a una carpeta que ya tiene datos de Roadmaps (lo normal para quien clona un repo que otro ya llenó), el sistema MUST usar los datos de la carpeta y MUST NOT fusionarlos con los del navegador ni escribir en la carpeta nada de lo que había en el navegador.

Antes de completar la conexión, el sistema MUST decir al usuario que va a ver los roadmaps de la carpeta y que los de su navegador se conservan aparte. Los datos del navegador MUST quedar intactos.

Llevar al repo un roadmap que solo estaba en el navegador MUST ser una acción explícita del usuario, con los imports por unidad que ya existen.

#### Scenario: Clonar el repo de un compañero

- **WHEN** el usuario, con dos roadmaps en su navegador, conecta Roadmaps a una carpeta que trae cinco
- **THEN** ve los cinco de la carpeta, la carpeta no gana los dos suyos y su navegador sigue teniendo los dos

#### Scenario: Se avisa antes de cambiar lo que se ve

- **WHEN** el usuario elige una carpeta con datos y tiene roadmaps en el navegador
- **THEN** antes de conectar se le dice que pasará a ver los de la carpeta y que los suyos quedan guardados en el navegador

### Requirement: Desconectar vuelve a los datos del navegador

Al desconectar Roadmaps, el sistema MUST volver a usar el almacén del navegador, con los datos que tenía antes de conectar. El sistema MUST NOT copiar al navegador lo que haya en la carpeta, y MUST NOT borrar ni modificar la carpeta.

Antes de desconectar, el sistema MUST terminar de escribir en la carpeta los cambios pendientes, y MUST decir al usuario que lo que hizo estando conectado queda en la carpeta y no en el navegador.

#### Scenario: Desconectar

- **WHEN** el usuario conecta Roadmaps, edita en la carpeta y desconecta
- **THEN** ve los roadmaps de su navegador tal como estaban antes de conectar, y la carpeta conserva sus ediciones

#### Scenario: Cambios pendientes al desconectar

- **WHEN** el usuario desconecta justo después de un cambio que todavía no se había escrito
- **THEN** el cambio se escribe en la carpeta antes de que Roadmaps vuelva al navegador

### Requirement: La conexión se recuerda y el permiso puede faltar

El sistema MUST recordar entre sesiones a qué carpeta está conectado Roadmaps. Al arrancar con una conexión recordada, si el navegador no ha conservado el permiso sobre la carpeta, el sistema MUST mostrar Roadmaps como «carpeta conectada, falta permiso», con una acción para concederlo, y MUST NOT mostrar los datos del navegador en su lugar ni un plan vacío.

Mientras falte el permiso, el sistema MUST NOT permitir crear ni modificar nada en Roadmaps. Al concederlo, MUST leer la carpeta y seguir como si nunca hubiera faltado. El usuario MUST poder desconectar también desde este estado.

#### Scenario: Permiso conservado

- **WHEN** el usuario vuelve a abrir la aplicación y el navegador conserva el permiso sobre la carpeta
- **THEN** Roadmaps abre directamente con los datos de la carpeta

#### Scenario: Falta el permiso

- **WHEN** el usuario vuelve a abrir la aplicación y el navegador no conserva el permiso sobre la carpeta
- **THEN** Roadmaps indica que la carpeta está conectada pero falta el permiso, ofrece concederlo y no muestra ningún roadmap ni permite crear uno

#### Scenario: Conceder el permiso

- **WHEN** el usuario concede el permiso desde ese estado
- **THEN** Roadmaps lee la carpeta y muestra sus roadmaps

### Requirement: Una carpeta que no se puede leer deja la aplicación no disponible

Cuando la carpeta conectada ya no existe, o alguno de sus ficheros de datos no se puede interpretar (por ejemplo, porque quedó a medias tras un conflicto de git), el sistema MUST mostrar Roadmaps como no disponible y MUST nombrar el fichero o la carpeta que falla. MUST NOT cargar un plan parcial que deje fuera ese fichero, y MUST NOT escribir nada en la carpeta mientras dure el estado.

El usuario MUST poder volver a intentar la lectura, o desconectar.

#### Scenario: Un fichero con marcas de conflicto

- **WHEN** un fichero de roadmap de la carpeta contiene marcas de conflicto de git sin resolver
- **THEN** Roadmaps se muestra no disponible nombrando ese fichero, y no escribe nada en la carpeta

#### Scenario: La carpeta ya no está

- **WHEN** la carpeta conectada se ha movido o borrado
- **THEN** Roadmaps se muestra no disponible, explica que no encuentra la carpeta y ofrece desconectar

#### Scenario: Reintentar tras arreglarlo

- **WHEN** el usuario resuelve el conflicto en el fichero y pide volver a intentarlo
- **THEN** Roadmaps lee la carpeta y muestra sus roadmaps

### Requirement: Lo que es de cada persona no viaja a la carpeta

El sistema MUST NOT escribir en la carpeta el roadmap que el usuario tiene abierto, qué fases tiene plegadas, el zoom, los anchos de columna, el tema ni el uso. Todo eso MUST seguir viviendo en el navegador de cada persona, también con Roadmaps conectado.

En una carpeta compartida, ese estado convertiría en cambio de la PR de uno lo que solo es cómo mira otro.

#### Scenario: Plegar una fase no cambia la carpeta

- **WHEN** el usuario pliega o despliega una fase con Roadmaps conectado
- **THEN** ningún fichero de la carpeta cambia

#### Scenario: Cada colaborador tiene su propia vista

- **WHEN** dos personas conectadas a clones del mismo repo pliegan fases distintas y abren roadmaps distintos
- **THEN** sus ficheros de datos son idénticos
