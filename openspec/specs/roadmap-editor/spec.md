# roadmap-editor

## Purpose

Edición del roadmap en el Gantt: jerarquía fase → item, milestones, dependencias con flechas, drag/resize, reordenación vertical de fases, items y roadmaps, drawer de detalle, responsables, sprints, vista "Todos", navegación y gestión de varios roadmaps, zoom, y el ancho de la columna de nombres. Formaliza la paridad funcional con el HTML original (`roadmap_tool_6_6_2.html`); el objetivo es cero regresión percibida.

La reordenación entró tarde, en `2026-08-31-reordenar-fases-e-items` y `2026-08-31-reordenar-roadmaps`: el port original la perdió y nadie lo advirtió porque ninguna spec la recogía. Es el motivo de que esta capacidad enumere lo que cubre.

El orden de los roadmaps no es el de una vista. Vive en la lista de roadmaps y lo respeta cualquier superficie que los enumere, de modo que fijarlo en "Todos" lo fija también en la navegación.

Roadmaps es **una** de las aplicaciones que aloja el contenedor (ver `hub-shell`), no la aplicación entera. La vista "Todos" es su inicio propio, un nivel por debajo del inicio de la sesión, que es la landing del hub.

## Requirements

### Requirement: Jerarquía roadmap → fase → item
El sistema MUST permitir organizar el trabajo en roadmaps que contienen fases, y fases que contienen items, con fases colapsables.

#### Scenario: Desplegar y plegar una fase
- **WHEN** el usuario hace clic en el chevron de una fase
- **THEN** el sistema muestra u oculta los items hijos y persiste el estado de expansión

#### Scenario: Añadir un item a una fase
- **WHEN** el usuario usa la fila "añadir" de una fase desplegada
- **THEN** el sistema crea un item nuevo dentro de esa fase

### Requirement: Barras del Gantt editables por interacción directa
El sistema MUST permitir crear, mover y redimensionar barras arrastrando en la cuadrícula temporal.

La barra de una fase o de un item MUST cubrir su día de fin, según la convención de fechas inclusivas. En consecuencia, un item MUST poder durar **un solo día**, con inicio y fin en la misma fecha; lo que distingue ese item de un hito es ser o no ser un hito, no la relación entre sus dos fechas.

Al arrastrar el extremo de una barra, el sistema MUST llevarla al día sobre el que está el puntero, y no a la frontera entre días más cercana. Con un fin inclusivo, el día señalado es el día que el usuario está nombrando.

Los items completados MUST quedar excluidos de esta edición: sus fechas no cambian por arrastre ni por redimensión. Ver `completion`, que define el congelamiento y su representación en la barra.

#### Scenario: Crear una barra arrastrando
- **WHEN** el usuario arrastra sobre una fila vacía en el área de cuadrícula
- **THEN** el sistema crea una barra cuyo inicio y fin corresponden al rango arrastrado

#### Scenario: Mover una barra
- **WHEN** el usuario arrastra el cuerpo de una barra
- **THEN** el sistema desplaza inicio y fin conservando la duración

#### Scenario: Redimensionar una barra por un borde
- **WHEN** el usuario arrastra el borde de una barra
- **THEN** el sistema ajusta solo ese extremo de la fecha

#### Scenario: Estirar hasta dejar un item de un día
- **WHEN** el usuario arrastra el borde derecho de la barra de un item hasta el día de su inicio
- **THEN** el sistema deja el item con inicio y fin en esa fecha, y su barra ocupa ese único día

#### Scenario: El borde va al día señalado
- **WHEN** el usuario suelta el borde derecho de una barra sobre un día concreto de la cuadrícula
- **THEN** el fin del item queda en ese día, y la barra lo cubre

#### Scenario: Arrastrar la barra de un item completado
- **WHEN** el usuario arrastra el cuerpo o un borde de la barra de un item completado
- **THEN** el sistema no altera sus fechas

### Requirement: Milestones
El sistema MUST soportar hitos representados como marcadores de fecha única (rombo).

El marcador MUST situarse sobre el día del hito, no sobre la frontera entre ese día y el anterior. Con barras que cubren su día de fin, un marcador anclado a la frontera quedaría medio día a la izquierda de la fecha que anuncia.

#### Scenario: Crear un milestone
- **WHEN** el usuario añade un milestone en una fecha
- **THEN** el sistema lo representa como marcador de un solo día con inicio igual a fin

#### Scenario: El rombo cae sobre su día
- **WHEN** un hito está fechado en un día concreto de la cuadrícula
- **THEN** su marcador aparece centrado sobre ese día, alineado con la columna que le corresponde en la cabecera

### Requirement: Dependencias entre items
El sistema MUST permitir declarar dependencias de un item respecto a otros y representarlas visualmente con flechas.

La flecha MUST salir del borde final de la barra predecesora y llegar al borde inicial de la dependiente. Con un fin inclusivo, ese borde final es el que cierra el último día del predecesor, de modo que la flecha nunca arranca por dentro de la barra de la que sale.

El sistema MUST impedir que un item completado declare una dependencia respecto a un item que no lo esté, ya que un item completado no puede quedar con un predecesor pendiente. Ver `completion`.

#### Scenario: Visualizar una dependencia
- **WHEN** un item declara depender de otro
- **THEN** el sistema dibuja una flecha desde el item predecesor hasta el dependiente

#### Scenario: La flecha sale del final de la barra
- **WHEN** un item depende de otro que termina un viernes
- **THEN** la flecha arranca del borde derecho de la barra del predecesor, después del viernes, y no desde dentro de ella

#### Scenario: Eliminar una dependencia
- **WHEN** el usuario elimina una dependencia existente
- **THEN** el sistema deja de mostrar la flecha y actualiza el modelo del item

#### Scenario: Declarar una dependencia desde un item completado hacia uno pendiente
- **WHEN** el usuario intenta declarar en un item completado una dependencia respecto a un item que no está completado
- **THEN** el sistema no la añade y el item completado conserva sus dependencias tal como estaban

### Requirement: Detalle de item en drawer lateral
El sistema MUST ofrecer un panel lateral para editar el detalle de una fase o item (nombre, responsable, notas, dependencias).

#### Scenario: Editar notas de un item
- **WHEN** el usuario abre el drawer de un item y escribe notas
- **THEN** el sistema guarda las notas y muestra un indicador de que el item tiene notas

### Requirement: Responsables (assignees)
El sistema MUST permitir gestionar una lista de responsables y asignarlos a fases e items, mostrándolos como badges de iniciales cuyo color procede de una posición de la paleta de barras del tema activo, con las iniciales pintadas en una tinta legible sobre ese color.

#### Scenario: Asignar un responsable
- **WHEN** el usuario asigna un responsable a un item
- **THEN** el sistema muestra el badge del responsable en la fila del item

#### Scenario: Iniciales legibles sobre cualquier color de badge
- **WHEN** un responsable ocupa una posición de la paleta cuyo color es muy claro o muy oscuro
- **THEN** el sistema pinta sus iniciales con la tinta del tema que contrasta con ese color

### Requirement: Cabeceras temporales de sprints y trimestres
El sistema MUST mostrar una cabecera de sprints (ventanas de 14 días) en la vista de roadmap y una cabecera de trimestres en la vista meta, resaltando el periodo actual.

Ambas cabeceras MUST permanecer a la vista mientras el usuario recorre la lista en vertical, a cualquier profundidad. Resaltar el periodo actual no sirve de nada si la cabecera desaparece en cuanto la lista es larga.

La cabecera de sprints MUST ser además el sitio desde el que se elige un sprint: cada sprint MUST ofrecerse como un control accionable, alcanzable y operable con teclado además de con puntero, y MUST anunciar su número y sus fechas a quien no ve la pantalla. Ver «Foco en un sprint».

#### Scenario: Sprint actual resaltado
- **WHEN** la fecha de hoy cae dentro de un sprint visible
- **THEN** el sistema resalta ese sprint como actual

#### Scenario: La cabecera acompaña al recorrido vertical
- **WHEN** el usuario recorre la lista hacia abajo hasta el final de un plan largo
- **THEN** la cabecera del periodo sigue a la vista, con el periodo actual resaltado igual que arriba

#### Scenario: Elegir un sprint con el teclado
- **WHEN** el usuario lleva el foco a la etiqueta de un sprint y la activa con el teclado
- **THEN** el sistema elige ese sprint igual que si lo hubiera pinchado, y anuncia que queda elegido

### Requirement: Zoom y navegación temporal
El sistema MUST permitir ajustar el nivel de zoom (px por día) y saltar a la fecha de hoy. La acción de saltar a hoy MUST estar disponible tanto en la vista de roadmap como en la vista "Todos", y MUST actuar sobre la vista que el usuario esté viendo.

#### Scenario: Ir a hoy
- **WHEN** el usuario pulsa "ir a hoy"
- **THEN** el sistema desplaza la vista para que la fecha de hoy sea visible

#### Scenario: Ir a hoy en la vista "Todos"
- **WHEN** el usuario pulsa "ir a hoy" estando en la vista "Todos"
- **THEN** el sistema desplaza la cuadrícula de "Todos" para que la marca del día de hoy sea visible, sin cambiar de vista ni de roadmap activo

#### Scenario: Recuperar hoy tras alejar el zoom
- **WHEN** el usuario aleja el zoom hasta que el día de hoy queda fuera de la parte visible y pulsa "ir a hoy"
- **THEN** el sistema vuelve a desplazar la vista hasta dejar el día de hoy a la vista

### Requirement: Vista "Todos" como inicio y portfolio
El sistema MUST ofrecer una vista llamada "Todos" que agregue todos los roadmaps, mostrando cada uno como una sola barra que abarca su extensión temporal total sobre una cuadrícula de trimestres. "Todos" MUST ser la vista que el sistema muestra **al entrar en la aplicación Roadmaps**, siempre, con independencia de qué roadmap estuviera activo la última vez. El sistema MUST seguir conservando el roadmap activo persistido, que representa el último roadmap abierto.

"Todos" MUST NOT ser ya el inicio de la sesión: ese lugar lo ocupa la landing del hub (ver `hub-landing`). "Todos" es el inicio *dentro* de Roadmaps, un nivel por debajo.

Entrar en Roadmaps por una vía que nombra un roadmap concreto —una fila de la lista corta de la landing— MUST abrir ese roadmap directamente, sin pasar por "Todos".

La ventana temporal de "Todos" MUST contener siempre el día de hoy, cualquiera que sea el rango de fechas de los roadmaps existentes, y el sistema MUST señalar el día de hoy dentro de esa cuadrícula. Ajustar la ventana de "Todos" para contener el día de hoy MUST NOT alterar la ventana temporal configurada de ningún roadmap.

#### Scenario: Agregar roadmaps en la vista "Todos"
- **WHEN** el usuario abre la vista "Todos"
- **THEN** el sistema muestra una fila por roadmap con una barra desde su inicio más temprano hasta su fin más tardío

#### Scenario: Entrar en Roadmaps aterriza en "Todos"
- **WHEN** el usuario entra en la aplicación Roadmaps desde el hub o desde el conmutador
- **THEN** el sistema muestra la vista "Todos" aunque la última visita terminara dentro de un roadmap concreto

#### Scenario: Entrar en Roadmaps nombrando un roadmap
- **WHEN** el usuario entra en Roadmaps activando la fila de un roadmap en la lista corta de la landing
- **THEN** el sistema abre ese roadmap directamente, sin mostrar antes la vista "Todos"

#### Scenario: El último roadmap abierto se conserva
- **WHEN** el usuario cierra la aplicación con un roadmap abierto y la vuelve a abrir
- **THEN** el sistema muestra la landing del hub y, al entrar en Roadmaps, muestra "Todos" señalando ese roadmap como el último abierto

#### Scenario: Sin roadmaps
- **WHEN** no existe ningún roadmap
- **THEN** el sistema muestra la vista "Todos" vacía con la acción de crear el primer roadmap disponible

#### Scenario: El día de hoy está marcado
- **WHEN** el usuario abre la vista "Todos" existiendo al menos un roadmap
- **THEN** el sistema señala el día de hoy sobre la cuadrícula con la misma marca que usa la vista de roadmap

#### Scenario: Todos los roadmaps empiezan después de hoy
- **WHEN** el inicio más temprano de todos los roadmaps es posterior al día de hoy
- **THEN** el sistema extiende la ventana de "Todos" hacia atrás de modo que el día de hoy quede dentro de ella y separado de su borde izquierdo

#### Scenario: Todos los roadmaps terminan antes de hoy
- **WHEN** el fin más tardío de todos los roadmaps es anterior al día de hoy
- **THEN** el sistema extiende la ventana de "Todos" hacia adelante de modo que el día de hoy quede dentro de ella

#### Scenario: Hoy ya cae dentro del rango de los roadmaps
- **WHEN** el día de hoy está comprendido entre el inicio más temprano y el fin más tardío de los roadmaps
- **THEN** el sistema no modifica la ventana temporal que ya derivaba de los roadmaps

### Requirement: Navegación entre roadmaps
El sistema MUST permitir cambiar de roadmap activo sin recurrir a una lista horizontal que crezca con el número de roadmaps. El topbar MUST ofrecer, con un ancho independiente del número de roadmaps existentes, una indicación del contexto actual ("Todos" o el roadmap abierto) y un selector desplegable que liste la entrada "Todos" y todos los roadmaps. El selector MUST permitir filtrar la lista escribiendo texto y elegir una entrada con teclado. El selector MUST NOT ofrecer acciones destructivas.

Este selector MUST ocupar el segundo nivel del breadcrumb del contenedor, precedido por el conmutador de aplicaciones (ver `hub-shell`). MUST aparecer solo dentro de Roadmaps, y MUST NOT aparecer en el hub ni dentro de otra aplicación.

El sistema MUST registrar la apertura de un roadmap, cualquiera que sea la vía, para alimentar la lista de aperturas recientes de la landing (ver `hub-landing`). Ese registro MUST NOT formar parte del modelo de datos ni viajar en el documento exportado.

#### Scenario: Abrir un roadmap desde su fila en "Todos"
- **WHEN** el usuario hace clic en la fila de un roadmap dentro de la vista "Todos"
- **THEN** el sistema abre ese roadmap, lo marca como activo persistido y sale de la vista "Todos"

#### Scenario: Cambiar de roadmap desde el selector
- **WHEN** el usuario elige otro roadmap en el selector desplegable
- **THEN** el sistema muestra ese roadmap y lo marca como activo persistido

#### Scenario: Volver a "Todos"
- **WHEN** el usuario elige la entrada "Todos", en el selector o en la indicación de contexto del topbar
- **THEN** el sistema muestra la vista "Todos" sin cambiar cuál es el roadmap activo

#### Scenario: Filtrar la lista de roadmaps
- **WHEN** el usuario escribe texto en el selector desplegable
- **THEN** el sistema reduce la lista a los roadmaps cuyo nombre coincide con ese texto

#### Scenario: El topbar no crece con el número de roadmaps
- **WHEN** existen muchos roadmaps
- **THEN** el topbar sigue ocupando el mismo espacio y no aparece ningún desplazamiento horizontal para alcanzar un roadmap

#### Scenario: El selector no permite borrar
- **WHEN** el usuario abre el selector desplegable
- **THEN** el sistema no ofrece en él ningún control de borrado de roadmaps

#### Scenario: El selector de roadmaps no aparece fuera de Roadmaps
- **WHEN** el usuario está en la landing del hub
- **THEN** el topbar no muestra el selector de roadmaps

#### Scenario: Abrir un roadmap queda registrado
- **WHEN** el usuario abre un roadmap por cualquier vía
- **THEN** el sistema lo anota como el más recientemente abierto sin modificar el modelo de datos

### Requirement: Gestión de roadmaps desde la vista "Todos"
El sistema MUST permitir crear, renombrar y eliminar roadmaps, y MUST ofrecer el renombrado y la eliminación únicamente desde la fila del roadmap en la vista "Todos". La eliminación MUST exigir doble confirmación en línea: la primera pulsación pone el control en estado de confirmación pendiente y solo la segunda pulsación sobre ese mismo control elimina el roadmap. El sistema MUST NOT usar diálogos nativos del navegador para esta confirmación.

#### Scenario: Renombrar un roadmap
- **WHEN** el usuario edita el nombre de un roadmap en su fila de la vista "Todos"
- **THEN** el sistema guarda el nombre nuevo y lo refleja en la fila, en el selector y en la indicación de contexto del topbar

#### Scenario: Eliminar un roadmap con doble confirmación
- **WHEN** el usuario pulsa el control de borrado de una fila y vuelve a pulsar ese mismo control
- **THEN** el sistema elimina ese roadmap, retira su fila y persiste el estado resultante

#### Scenario: La primera pulsación no borra nada
- **WHEN** el usuario pulsa el control de borrado de una fila una sola vez
- **THEN** el sistema pide confirmación en el propio control y conserva el roadmap intacto

#### Scenario: Cancelar una confirmación pendiente
- **WHEN** hay una confirmación pendiente en una fila y el usuario pulsa el control de borrado de otra, o interactúa fuera del control
- **THEN** el sistema descarta la confirmación pendiente sin eliminar ningún roadmap

#### Scenario: Pedir confirmación no abre el roadmap
- **WHEN** el usuario pulsa el control de borrado de una fila
- **THEN** el sistema permanece en la vista "Todos" y no abre ese roadmap

#### Scenario: Eliminar el roadmap abierto por última vez
- **WHEN** el usuario confirma el borrado del roadmap marcado como activo y quedan otros roadmaps
- **THEN** el sistema marca otro roadmap existente como activo y permanece en la vista "Todos"

#### Scenario: Eliminar el último roadmap
- **WHEN** el usuario confirma el borrado del único roadmap que queda
- **THEN** el sistema deja de tener roadmap activo y muestra la vista "Todos" vacía

#### Scenario: El borrado no está disponible fuera de "Todos"
- **WHEN** el usuario tiene un roadmap abierto
- **THEN** el sistema no ofrece desde esa vista ningún control para eliminar el roadmap

### Requirement: Posición temporal inicial de cada vista
El sistema MUST fijar la posición horizontal de la línea de tiempo al entrar en una vista, en lugar de conservar la que tuviera de una vista o un roadmap anteriores. Al entrar en la vista "Todos" el sistema MUST situarla en el día de hoy. Al abrir un roadmap el sistema MUST situarla en el primer día de la ventana temporal de ese roadmap, con independencia de si tiene fases y de en qué fecha empiece la primera.

Volver al hub y regresar a Roadmaps MUST comportarse como entrar de nuevo: la posición se vuelve a fijar y no se conserva la que hubiera al salir.

#### Scenario: Entrar en Roadmaps
- **WHEN** el usuario entra en la aplicación Roadmaps y aterriza en la vista "Todos"
- **THEN** el sistema muestra la cuadrícula desplazada de modo que el día de hoy queda a la vista sin necesidad de desplazarse

#### Scenario: Volver a "Todos" desde un roadmap
- **WHEN** el usuario vuelve a la vista "Todos" desde un roadmap abierto
- **THEN** el sistema vuelve a situar la vista en el día de hoy

#### Scenario: Volver de una visita al hub
- **WHEN** el usuario sale de Roadmaps al hub y vuelve a entrar
- **THEN** el sistema vuelve a situar la vista según la regla de la vista en la que aterriza, sin conservar el desplazamiento anterior

#### Scenario: Abrir un roadmap
- **WHEN** el usuario abre un roadmap desde la vista "Todos" o desde el selector
- **THEN** el sistema sitúa la vista en el primer día de la ventana temporal de ese roadmap

#### Scenario: Cambiar de un roadmap a otro
- **WHEN** el usuario pasa directamente de un roadmap a otro sin volver a "Todos"
- **THEN** el sistema sitúa la vista en el primer día del roadmap nuevo y no conserva el desplazamiento del anterior

#### Scenario: Abrir un roadmap cuyas fases empiezan más tarde
- **WHEN** el usuario abre un roadmap cuya primera fase empieza semanas después del inicio de su ventana temporal
- **THEN** el sistema sitúa igualmente la vista en el primer día de la ventana, dejando visible el hueco previo a la primera fase

#### Scenario: Abrir un roadmap sin fases
- **WHEN** el usuario abre un roadmap que no tiene ninguna fase
- **THEN** el sistema sitúa la vista en el primer día de su ventana temporal

### Requirement: Alta de roadmap con nombre explícito

El sistema MUST pedir el nombre del roadmap antes de crearlo. Al accionar la creación de un roadmap, el sistema MUST abrir un diálogo modal propio de la aplicación —no un diálogo nativo del navegador— que solicite el nombre, y MUST NOT crear ningún roadmap, alterar el roadmap activo ni cambiar de vista hasta que el usuario acepte ese diálogo con un nombre válido. Todas las acciones de creación de roadmap que ofrezca el sistema MUST pasar por este mismo diálogo.

El campo de nombre MUST aparecer vacío al abrirse el diálogo. El sistema MAY mostrar un nombre sugerido como texto de ayuda del campo, pero MUST NOT usarlo como valor inicial.

Al aceptar con un nombre válido, el sistema MUST crear el roadmap con ese nombre, marcarlo como activo y mostrar su vista. Al cancelar, el sistema MUST NOT crear nada y MUST dejar al usuario en la vista en la que estaba, con el mismo roadmap activo que antes.

#### Scenario: Crear un roadmap pide el nombre primero
- **WHEN** el usuario acciona la creación de un roadmap
- **THEN** el sistema abre un diálogo modal que pide el nombre y no crea todavía ningún roadmap ni cambia de vista

#### Scenario: Aceptar un nombre válido crea y abre el roadmap
- **WHEN** el usuario introduce un nombre válido en el diálogo y lo acepta
- **THEN** el sistema crea el roadmap con ese nombre, lo marca como activo y muestra su vista

#### Scenario: Cancelar no crea nada
- **WHEN** el usuario cierra el diálogo sin aceptar, ya sea con el control de cancelar, con la tecla `Escape` o pulsando fuera del diálogo
- **THEN** el sistema no crea ningún roadmap, no cambia el roadmap activo y deja al usuario en la vista en la que estaba

#### Scenario: El campo de nombre arranca vacío
- **WHEN** el usuario abre el diálogo de creación
- **THEN** el campo de nombre está vacío y cualquier nombre sugerido aparece únicamente como texto de ayuda, no como valor a aceptar

#### Scenario: Crear el primer roadmap desde el estado vacío
- **WHEN** el usuario acciona la creación desde el estado vacío de la vista "Todos" al no existir ningún roadmap
- **THEN** el sistema abre el mismo diálogo de nombre antes de crear nada

### Requirement: Nombre de roadmap obligatorio y único al crearlo

El sistema MUST rechazar la creación de un roadmap cuyo nombre esté vacío o se componga solo de espacios, y MUST rechazar la creación de un roadmap cuyo nombre coincida con el de un roadmap existente.

Para decidir si dos nombres coinciden, el sistema MUST compararlos ignorando mayúsculas y minúsculas, ignorando los acentos y demás signos diacríticos, e ignorando todos los espacios, estén al principio, al final o en el interior del nombre. Bajo esta comparación, `"Plataforma Q1"`, `"plataforma q1"` y `"PlataformaQ1"` son el mismo nombre.

El sistema MUST guardar y mostrar el nombre exactamente como lo escribió el usuario. La normalización MUST usarse solo para detectar la coincidencia y MUST NOT alterar el nombre almacenado.

Mientras el nombre introducido sea inválido, el sistema MUST mantener el diálogo abierto, MUST impedir la aceptación y MUST indicar el motivo del rechazo. Cuando el motivo sea la coincidencia con un roadmap existente, la indicación MUST identificar el nombre de ese roadmap.

#### Scenario: Nombre vacío
- **WHEN** el usuario intenta aceptar el diálogo con el campo de nombre vacío
- **THEN** el sistema no crea nada, mantiene el diálogo abierto e indica que el nombre es obligatorio

#### Scenario: Nombre compuesto solo de espacios
- **WHEN** el usuario intenta aceptar el diálogo con un nombre que solo contiene espacios
- **THEN** el sistema lo trata igual que un nombre vacío y no crea nada

#### Scenario: Nombre idéntico a uno existente
- **WHEN** el usuario intenta crear un roadmap con un nombre idéntico al de un roadmap existente
- **THEN** el sistema no crea nada, mantiene el diálogo abierto e indica con qué roadmap existente coincide

#### Scenario: Nombre que solo difiere en mayúsculas
- **WHEN** existe un roadmap llamado "Plataforma" y el usuario intenta crear otro llamado "plataforma"
- **THEN** el sistema lo rechaza por coincidencia de nombre

#### Scenario: Nombre que solo difiere en acentos
- **WHEN** existe un roadmap llamado "Diseño" y el usuario intenta crear otro llamado "Diseno"
- **THEN** el sistema lo rechaza por coincidencia de nombre

#### Scenario: Nombre que solo difiere en espacios
- **WHEN** existe un roadmap llamado "Plan Q1" y el usuario intenta crear otro llamado "PlanQ1" o "  Plan  Q1  "
- **THEN** el sistema lo rechaza por coincidencia de nombre

#### Scenario: El nombre se conserva tal como se escribió
- **WHEN** el usuario crea un roadmap llamado "Diseño de Producto"
- **THEN** el sistema lo guarda y lo muestra como "Diseño de Producto" en la fila de "Todos", en el selector y en la indicación de contexto del topbar, conservando acentos y mayúsculas

#### Scenario: Un nombre distinto bajo la comparación sí se acepta
- **WHEN** existe un roadmap llamado "Plataforma" y el usuario crea otro llamado "Plataforma 2"
- **THEN** el sistema crea el roadmap, porque los nombres no coinciden bajo la comparación

### Requirement: Alcance de la unicidad de nombres

La unicidad de nombres MUST exigirse únicamente al crear un roadmap. El renombrado de un roadmap desde su fila en la vista "Todos" y la importación de un roadmap desde un documento JSON MUST NOT comprobar la unicidad, y por tanto pueden producir nombres repetidos.

El sistema MUST cargar sin alterar los datos persistidos que contengan nombres repetidos, cualquiera que sea su origen, y MUST NOT renombrar roadmaps existentes al arrancar.

#### Scenario: Renombrar no comprueba la unicidad
- **WHEN** el usuario renombra un roadmap desde su fila en la vista "Todos" dándole el nombre de otro roadmap existente
- **THEN** el sistema guarda ese nombre sin rechazarlo, quedando dos roadmaps con el mismo nombre

#### Scenario: Importar no comprueba la unicidad
- **WHEN** el usuario importa un documento JSON cuyo roadmap se llama igual que uno existente
- **THEN** el sistema completa la importación sin rechazarla ni renombrar nada

#### Scenario: Datos guardados con nombres repetidos
- **WHEN** el usuario abre la aplicación con datos persistidos que ya contienen dos roadmaps con el mismo nombre
- **THEN** el sistema los carga y los muestra tal cual, sin renombrarlos ni impedir el arranque

### Requirement: Reordenación vertical de fases e items

El sistema MUST permitir cambiar el orden vertical de las fases de un roadmap y el de los items dentro de una fase, arrastrándolos.

El gesto MUST arrancar desde una manija propia situada en el canalón de la fila, en la columna de nombres. La cuadrícula temporal MUST quedar excluida: arrastrar sobre ella sigue significando fechas, nunca orden.

La manija MUST ocupar su espacio en la fila de forma permanente y MUST hacerse visible al situar el puntero sobre la fila, de modo que su aparición no desplace nada de lo que ya hay.

El orden resultante MUST persistirse.

#### Scenario: Reordenar una fase

- **WHEN** el usuario arrastra una fase por su manija hasta la posición de otra fase del mismo roadmap
- **THEN** el sistema coloca la fase arrastrada en esa posición, con sus items y su fila de añadir, y persiste el nuevo orden

#### Scenario: Reordenar un item dentro de su fase

- **WHEN** el usuario arrastra un item por su manija hasta otra posición dentro de su fase
- **THEN** el sistema coloca el item en esa posición y persiste el nuevo orden

#### Scenario: Ver el resultado durante el arrastre

- **WHEN** el usuario mantiene una fila arrastrada sobre una posición de destino
- **THEN** el sistema desplaza las demás filas a la posición que van a ocupar, en la columna de nombres y en la cuadrícula a la vez, dejando libre el hueco donde caerá la fila

#### Scenario: Levantar una fase

- **WHEN** el usuario arrastra una fase
- **THEN** el sistema desplaza únicamente su cabecera con el puntero, y coloca sus items y su fila de añadir en la posición de destino

#### Scenario: Un item se frena en los límites de su fase

- **WHEN** el usuario arrastra un item más allá del primero o del último de su fase
- **THEN** el sistema detiene la fila en esa posición extrema aunque el puntero siga avanzando, y al soltar el item queda dentro de su fase

#### Scenario: Un item no cambia de fase

- **WHEN** el usuario suelta un item arrastrado
- **THEN** el item permanece en la fase en la que estaba, conservando sus dependencias, sus bloqueos y su responsable

#### Scenario: Una fase no cambia de roadmap

- **WHEN** el usuario suelta una fase arrastrada
- **THEN** la fase permanece en el roadmap en el que estaba

#### Scenario: Reordenar no altera ninguna fecha

- **WHEN** el usuario reordena una fase o un item
- **THEN** el sistema conserva sin cambios las fechas de todo lo que se ha movido y de todo lo que se ha apartado, y no propaga ninguna cascada de dependencias

#### Scenario: Soltar en el sitio de partida

- **WHEN** el usuario arrastra una fila y la suelta en la posición de la que salió
- **THEN** el sistema deja el orden como estaba

### Requirement: Color de fases, items y roadmaps por slot de paleta
El sistema MUST asignar a cada fase, item y roadmap una posición dentro de la paleta de barras del tema activo, en lugar de un color absoluto, de modo que su color concreto lo determine el tema.

Esa posición MUST ser una propiedad del elemento y no de su lugar en la lista: mover o borrar un elemento MUST NOT cambiar el color de ningún otro.

#### Scenario: Crear una fase
- **WHEN** el usuario crea una fase
- **THEN** el sistema le asigna la siguiente posición de la paleta y la barra se pinta con el color que esa posición tiene en el tema activo

#### Scenario: Crear un roadmap
- **WHEN** el usuario crea un roadmap
- **THEN** el sistema le asigna la siguiente posición de la paleta, y ese color lo identifica en todas las superficies que lo enumeran

#### Scenario: Borrar un roadmap
- **WHEN** el usuario borra un roadmap
- **THEN** los demás conservan su color

#### Scenario: Cambiar el color de un elemento
- **WHEN** el usuario avanza el color de un responsable, que es el único elemento que ofrece hacerlo
- **THEN** el sistema pasa a la siguiente posición de la paleta y recorre todas las posiciones cíclicamente, sin saltar ni volver al principio de forma inesperada

Fases, items y roadmaps reciben su posición al crearse y no ofrecen forma de cambiarla. El escenario decía antes que los tres podían avanzar su color; nunca fue cierto para ninguno salvo el responsable.

#### Scenario: Un elemento conserva su posición al cambiar de tema
- **WHEN** el usuario cambia el tema activo
- **THEN** cada fase, item, roadmap y responsable conserva su posición en la paleta y adopta el color que esa posición tiene en el tema nuevo

### Requirement: Reordenación de roadmaps en la vista "Todos"

El sistema MUST permitir cambiar el orden de los roadmaps arrastrándolos en la vista "Todos", con el mismo gesto que reordena fases e items: una manija propia en el canalón de la fila, que ocupa su espacio de forma permanente y se hace visible al situar el puntero sobre la fila.

El orden resultante MUST ser el orden de los roadmaps en toda la aplicación, no el de esa vista: cualquier otra superficie que los enumere MUST presentarlos en él.

Mientras dura el arrastre el sistema MUST desplazar las demás filas a la posición que van a ocupar, en la columna de nombres y en la cuadrícula a la vez, y MUST desplazar la fila arrastrada con el puntero sin dejar que se dibuje fuera de la lista.

El orden MUST persistirse. Es estado local: no viaja en los documentos exportados, porque un documento lleva un solo roadmap.

#### Scenario: Reordenar un roadmap

- **WHEN** el usuario arrastra un roadmap por su manija hasta la posición de otro
- **THEN** el sistema coloca el roadmap arrastrado en esa posición y persiste el nuevo orden

#### Scenario: El orden alcanza a la navegación

- **WHEN** el usuario reordena los roadmaps en "Todos" y despliega después el selector de roadmaps
- **THEN** el selector los enumera en el mismo orden

#### Scenario: Ver el resultado durante el arrastre

- **WHEN** el usuario mantiene un roadmap arrastrado sobre una posición de destino
- **THEN** el sistema desplaza las demás filas a la posición que van a ocupar, dejando libre el hueco donde caerá la fila

#### Scenario: La fila se frena en los extremos de la lista

- **WHEN** el usuario arrastra un roadmap más allá del primero o del último
- **THEN** el sistema detiene la fila en esa posición extrema aunque el puntero siga avanzando

#### Scenario: Reordenar no cambia ningún color

- **WHEN** el usuario reordena los roadmaps
- **THEN** cada roadmap conserva el color que tenía, en todas las superficies que lo muestran

#### Scenario: Soltar en el sitio de partida

- **WHEN** el usuario arrastra un roadmap y lo suelta en la posición de la que salió
- **THEN** el sistema deja el orden como estaba

#### Scenario: Reordenar no altera el contenido

- **WHEN** el usuario reordena los roadmaps
- **THEN** cada roadmap conserva sus fases, sus fechas, su ventana temporal y su línea base, y el roadmap abierto sigue siendo el mismo

### Requirement: Ancho de la columna de nombres decidido por el usuario

El sistema MUST permitir cambiar el ancho de la columna de nombres arrastrando un tirador situado en su borde derecho, en la vista de roadmap y en la vista "Todos". El tirador MUST anunciarse como tal al pasar el puntero por encima, y MUST poder agarrarse esté donde esté el desplazamiento vertical.

El sistema MUST NOT permitir que el arrastre lleve la columna más allá de **la mitad del ancho de la pantalla**, ni por debajo de su ancho por defecto. La línea de tiempo es la razón de ser de la vista: la columna puede llegar a compartir el sitio a partes iguales, nunca a ser la mayoría.

El límite superior MUST aplicarse **solo mientras se arrastra**. El sistema MUST NOT recortar un ancho ya fijado porque la ventana cambie de tamaño después: quien fija un ancho en una pantalla grande lo recupera intacto al volver a ella.

Con una excepción, que es física y no de producto: el sistema MUST pintar la columna sin exceder el ancho de la ventana, para que el tirador nunca quede fuera de alcance. La columna se mantiene fija a la izquierda y no se desplaza con el desplazamiento horizontal, así que una columna más ancha que la ventana dejaría su tirador permanentemente inaccesible. Ese límite MUST NOT alterar el ancho guardado.

El sistema MUST mantener **dos anchos independientes**, uno para la vista de roadmap y otro para la vista "Todos": son dos listas distintas y no tienen por qué querer el mismo sitio. El ancho de la vista de roadmap MUST ser el mismo para todos los roadmaps.

El ancho extra MUST ir a parar al nombre, y no repartirse entre los demás elementos de la fila.

#### Scenario: Ensanchar la columna

- **WHEN** el usuario arrastra el tirador del borde derecho de la columna hacia la derecha
- **THEN** la columna se ensancha siguiendo al puntero y los nombres de las filas disponen de ese espacio

#### Scenario: El tope es media pantalla

- **WHEN** el usuario arrastra el tirador más allá de la mitad del ancho de la pantalla
- **THEN** la columna se detiene en la mitad y la línea de tiempo conserva la otra mitad

#### Scenario: No se puede estrechar por debajo del ancho de siempre

- **WHEN** el usuario arrastra el tirador hacia la izquierda más allá del ancho por defecto
- **THEN** la columna se detiene en ese ancho, con sus filas legibles y sus botones alcanzables

#### Scenario: Cambiar el tamaño de la ventana no recorta lo elegido

- **WHEN** el usuario fija la columna en la mitad de una pantalla ancha y después reduce la ventana
- **THEN** el sistema conserva el ancho elegido, y solo vuelve a limitar a la mitad cuando el usuario arrastra de nuevo

#### Scenario: El tirador nunca queda fuera de alcance

- **WHEN** el usuario abre la aplicación en una ventana más estrecha que el ancho que había fijado
- **THEN** la columna se pinta sin salirse de la ventana, el tirador sigue siendo alcanzable, y al volver a una ventana ancha reaparece el ancho que había fijado

#### Scenario: Cada vista recuerda su ancho

- **WHEN** el usuario ensancha la columna en un roadmap y después va a la vista "Todos"
- **THEN** "Todos" conserva su propio ancho, y volver al roadmap devuelve el que se le había dado allí

#### Scenario: Un ancho para todos los roadmaps

- **WHEN** el usuario ensancha la columna en un roadmap y abre otro
- **THEN** el segundo roadmap muestra la columna con ese mismo ancho

### Requirement: Leer el nombre completo de una fila sin ensancharla

El sistema MUST permitir leer el nombre completo de una fase, de un item o de un roadmap **al pasar el puntero por encima**, cuando no cabe en la columna. Hoy un nombre largo se corta en seco y solo se puede leer entero pinchando dentro de la caja y recorriéndolo con el cursor.

Es el complemento del ancho ajustable, no su sustituto: el tirador responde a «esta lista necesita más sitio siempre», y esto responde a «este nombre suelto se me pasa de largo», donde ensanchar la columna para siempre es pagar de más.

#### Scenario: Un nombre de fase que no cabe

- **WHEN** el usuario deja el puntero sobre el nombre de una fase que aparece cortado
- **THEN** el sistema muestra el nombre completo, sin que el usuario tenga que pinchar ni ensanchar la columna

#### Scenario: También en la vista "Todos"

- **WHEN** el usuario deja el puntero sobre el nombre cortado de un roadmap en la vista "Todos"
- **THEN** el sistema muestra el nombre completo del roadmap

### Requirement: La columna y las cabeceras se sostienen a cualquier profundidad

El sistema MUST mantener la columna de nombres delimitada frente a la cuadrícula —con su fondo y su separación— a lo largo de **todo** el desplazamiento vertical, y no solo durante la primera pantalla. Esto MUST cumplirse en la vista de roadmap y en la vista "Todos".

El sistema MUST mantener a la vista las cabeceras temporales mientras se recorre la lista en vertical, por hondo que se baje. Un plan largo es justo donde la referencia temporal hace más falta: mirar el final de la lista sin saber en qué mes se está mirando deja la vista sin sentido.

La promesa MUST valer igualmente por abajo: con pocas filas, o con ninguna, la columna MUST seguir delimitada hasta el borde inferior del área visible, sin franjas sin pintar bajo la última fila.

#### Scenario: Bajar más allá de una pantalla de fases

- **WHEN** el usuario recorre hacia abajo un roadmap con suficientes fases como para pasar de una pantalla
- **THEN** la columna de nombres sigue delimitada frente a la cuadrícula hasta la última fila

#### Scenario: La referencia temporal no se pierde al bajar

- **WHEN** el usuario está mirando el final de un roadmap largo
- **THEN** las cabeceras de meses y de sprints siguen a la vista, indicando sobre qué fechas caen las barras que está mirando

#### Scenario: La cabecera no se parte por la mitad

- **WHEN** el usuario recorre hacia abajo una lista larga
- **THEN** la banda superior de la columna de nombres sigue arriba, alineada con la cabecera temporal de la cuadrícula, y ninguna fila de nombres se cuela por debajo de ella

#### Scenario: Bajar y desplazarse a la vez

- **WHEN** el usuario recorre hacia abajo y a la derecha al mismo tiempo
- **THEN** la columna de nombres sigue cubriendo el borde izquierdo, sin dejar ver por debajo las barras de la cuadrícula

#### Scenario: Un roadmap con pocas fases

- **WHEN** el usuario abre un roadmap cuyas fases no llegan a llenar la altura de la ventana
- **THEN** la columna queda delimitada hasta el borde inferior del área visible, sin ninguna franja sin pintar bajo la última fila

#### Scenario: Lo mismo en la vista "Todos"

- **WHEN** el usuario recorre hacia abajo la vista "Todos" con suficientes roadmaps como para pasar de una pantalla
- **THEN** la columna sigue delimitada y la cabecera de trimestres sigue a la vista

### Requirement: El fin de una fecha es inclusivo

El sistema MUST tratar la fecha de fin de una fase o de un item como **inclusiva**: el último día nombrado forma parte del trabajo. Una barra que va del lunes al viernes MUST cubrir el viernes entero, y MUST contar el viernes allí donde se cuenten sus días.

Esta convención MUST regir por igual las tres cosas que hoy no se ponen de acuerdo: lo que se pinta, lo que se cuenta y lo que se anuncia al arrastrar. La ayuda emergente del arrastre ya nombra un rango inclusivo; son el pintado y la cuenta los que se alinean con ella.

El sistema MUST aplicar la misma convención en la vista de roadmap y en la vista "Todos". Un mismo item MUST ocupar los mismos días en las dos.

Ninguna fecha guardada cambia por esto. Cambia lo que la aplicación entiende que ocupan las fechas que ya hay, así que los roadmaps existentes MUST verse un día más largos sin que su contenido se haya alterado, y sin que la exportación de un roadmap produzca un documento distinto del que producía antes.

#### Scenario: Una barra cubre su último día

- **WHEN** un item va del lunes al viernes de la misma semana
- **THEN** su barra se extiende hasta el final del viernes, y no hasta el principio

#### Scenario: Las dos vistas coinciden sobre el mismo item

- **WHEN** el usuario mira un item en la vista de roadmap y después el mismo trabajo en la vista "Todos"
- **THEN** ocupa los mismos días en las dos

#### Scenario: Un roadmap existente no se altera al adoptar la convención

- **WHEN** el usuario abre un roadmap creado antes de este cambio
- **THEN** sus barras se muestran un día más largas, sus fechas siguen siendo las mismas, y exportarlo produce las mismas fechas que producía antes

### Requirement: Foco en un sprint

El sistema MUST permitir elegir un sprint desde la cabecera de sprints de la vista de roadmap, y MUST soltarlo al volver a elegir el mismo. Elegir otro sprint MUST trasladar el foco sin pasar por ningún estado intermedio.

Mientras hay un sprint elegido, el sistema MUST recortarlo verticalmente sobre la cuadrícula y **atenuar todo lo demás**: las barras que caen fuera, las demás etiquetas de la cabecera de sprints, la marca del día de hoy cuando el sprint elegido no es el actual, y las filas de la columna de nombres que no tienen nada dentro del sprint. El recorte vertical dice sobre qué fechas está el foco; las filas apagadas dicen quién y qué participa.

Atenuar MUST NOT ser desactivar. El usuario MUST poder seguir arrastrando, estirando, creando y editando cualquier barra, dentro o fuera del sprint elegido, exactamente igual que sin foco. Es un foco visual, no un modo.

Lo atenuado MUST seguir siendo legible. El resto del roadmap es el contexto que hace útil el foco, así que baja de tono sin desaparecer, y su contraste MUST decidirse con los mismos criterios con los que el sistema decide el resto de sus tintas, en todos los temas.

El sprint elegido se identifica por su **número absoluto**, no por su posición en la ventana temporal de un roadmap. La elección MUST sobrevivir a cambiar de roadmap, mostrando en el nuevo el mismo sprint del calendario. La elección MUST NOT persistir entre sesiones ni viajar en la exportación.

Un sprint elegido puede ser además el sprint actual. El sistema MUST distinguir los dos estados: elegido MUST verse distinto de actual, no simplemente más marcado.

#### Scenario: Elegir un sprint

- **WHEN** el usuario pincha la etiqueta de un sprint en la cabecera
- **THEN** el sistema recorta ese sprint sobre la cuadrícula, atenúa el resto del roadmap y abre el panel de carga de ese sprint

#### Scenario: Soltar el sprint

- **WHEN** el usuario vuelve a pinchar la etiqueta del sprint elegido
- **THEN** el sistema retira el foco y el roadmap vuelve a verse entero

#### Scenario: Editar una barra de fuera del sprint

- **WHEN** hay un sprint elegido y el usuario arrastra o estira una barra que cae fuera de él
- **THEN** el sistema cambia sus fechas igual que sin foco, y el foco sigue donde estaba

#### Scenario: Las filas sin trabajo en el sprint se apagan

- **WHEN** una fase y sus items no tienen nada dentro del sprint elegido
- **THEN** el sistema atenúa también sus nombres en la columna, de modo que se ve de un vistazo que no participan

#### Scenario: El sprint elegido no es el actual

- **WHEN** el usuario elige un sprint distinto de aquel en el que cae hoy
- **THEN** el sistema atenúa la marca del día de hoy junto con el resto, y el sprint actual deja de competir con el elegido

#### Scenario: El sprint elegido es además el actual

- **WHEN** el usuario elige el sprint en el que cae hoy
- **THEN** el sistema lo muestra a la vez como elegido y como actual, con dos marcas distinguibles entre sí

#### Scenario: Cambiar de roadmap con un sprint elegido

- **WHEN** el usuario elige un sprint y abre otro roadmap
- **THEN** el segundo roadmap muestra el foco sobre el mismo sprint del calendario, con la carga que le corresponde allí

#### Scenario: La elección no sobrevive a la sesión

- **WHEN** el usuario elige un sprint y recarga la aplicación
- **THEN** el roadmap se abre sin ningún sprint elegido

### Requirement: Carga de un sprint por responsable

El sistema MUST mostrar, para el sprint elegido, un panel con su nombre, sus fechas y sus días laborables, y con el reparto del trabajo entre los responsables.

El reparto se mide en **días laborables de solape**: los días de lunes a viernes en que un item y el sprint coinciden. Un item que cruza el sprint aporta solo la parte que cae dentro. Contar el item entero diría que un desarrollo de ocho semanas ocupa ocho semanas de un sprint de dos.

Laborable MUST significar de lunes a viernes. El sistema MUST NOT descontar días festivos: no hay una fuente fiable de festivos, y los autonómicos y locales harían que la misma cuenta diera resultados distintos por persona. Es una decisión declarada, no una carencia por resolver.

El sprint que se mide MUST ser el sprint **completo** del calendario, aunque la ventana temporal del roadmap solo enseñe una parte de él. Un mismo sprint MUST dar la misma capacidad en todos los roadmaps, sea cual sea la ventana de cada uno.

La capacidad contra la que se compara MUST ser los días laborables del sprint. El sistema MUST avisar cuando un responsable la supera, y MUST ordenar el reparto de más cargado a menos, porque el que se pasa es lo que se ha venido a ver.

Lo que esta medida detecta es el **solape**. Una persona con un solo item que ocupa el sprint entero está llena y es realista; tres items simultáneos de dos semanas suman treinta días en un sprint de diez, y eso es lo que hoy no se ve. El sistema MUST presentar la medida como ocupación de calendario y MUST NOT presentarla como una estimación de esfuerzo: cuánto cuesta de verdad un item es algo que la aplicación no sabe.

El sistema MUST atribuir un item al responsable de su fase cuando el item no tenga uno propio, y el suyo propio MUST prevalecer cuando lo tenga.

El sistema MUST marcar aparte, en su propia entrada y siempre al final, el trabajo del sprint que no tiene responsable ni propio ni heredado. No saber quién hace la mitad de un sprint responde a la pregunta del panel tanto como saber que alguien va sobrecargado.

El sistema MUST listar los items del sprint agrupados por su fase, cada uno con los días que aporta. Los hitos MUST aparecer en la lista y MUST aportar cero días. Un item cuyo solape con el sprint cae entero en fin de semana MUST aparecer igualmente, con cero días.

Los items completados MUST contar en la carga y MUST mostrarse atenuados, junto a un recuento de cuántos de los items del sprint están cerrados. Un sprint pasado se mide igual que uno futuro: el panel sirve para planificar lo que viene y para revisar lo que pasó.

Un item que cae dentro del sprint pero fuera de la ventana temporal visible del roadmap MUST aparecer en el panel, señalado como fuera de la vista. Está en el sprint aunque no esté en pantalla, y omitirlo falsearía la carga.

El panel MUST considerar únicamente los items. Una fase sin items, aunque tenga fechas propias, MUST NOT aportar carga; su responsable sigue contando como responsable heredado de los items que sí tenga.

El panel MUST medir un solo roadmap. La carga de una persona repartida entre varios roadmaps queda fuera de esta capacidad.

El foco del sprint MUST ser independiente del panel de detalle de fase o de item. Abrir el detalle de un item desde el panel de carga MUST NOT retirar el foco del sprint.

#### Scenario: Un item que cruza el sprint aporta solo su parte

- **WHEN** un item de ocho semanas atraviesa el sprint elegido de lado a lado
- **THEN** el panel le atribuye los días laborables del sprint, no los de todo el item

#### Scenario: El fin de semana no cuenta

- **WHEN** un item ocupa dos semanas naturales completas dentro del sprint
- **THEN** el panel le atribuye diez días, no catorce

#### Scenario: El último día del item cuenta

- **WHEN** un item termina el viernes de la segunda semana del sprint
- **THEN** el panel cuenta ese viernes entre sus días

#### Scenario: Alguien con tres items a la vez

- **WHEN** un responsable tiene tres items simultáneos que ocupan el sprint entero
- **THEN** el panel le atribuye treinta días frente a una capacidad de diez y avisa de que la supera

#### Scenario: Alguien lleno pero realista

- **WHEN** un responsable tiene un único item que ocupa el sprint entero
- **THEN** el panel le atribuye los diez días de la capacidad y no avisa de nada

#### Scenario: El más cargado primero

- **WHEN** el panel muestra a varios responsables
- **THEN** los ordena de más días a menos, con el trabajo sin responsable al final

#### Scenario: Un item sin responsable dentro de una fase que sí tiene uno

- **WHEN** un item del sprint no tiene responsable propio y su fase sí
- **THEN** el panel atribuye sus días al responsable de la fase

#### Scenario: El responsable propio manda sobre el de la fase

- **WHEN** un item del sprint tiene un responsable distinto del de su fase
- **THEN** el panel atribuye sus días al del item

#### Scenario: Trabajo sin responsable en ninguna parte

- **WHEN** un item del sprint no tiene responsable propio y su fase tampoco
- **THEN** el panel recoge sus días en una entrada de trabajo sin responsable, situada al final del reparto

#### Scenario: Un hito dentro del sprint

- **WHEN** hay un hito en una fecha dentro del sprint elegido
- **THEN** el panel lo lista entre los items del sprint y le atribuye cero días

#### Scenario: Un sprint ya cerrado

- **WHEN** el usuario elige un sprint cuyos items están completados
- **THEN** el panel muestra su carga igual que la de cualquier otro, con los items atenuados y el recuento de cuántos están cerrados

#### Scenario: Un item fuera de la ventana visible

- **WHEN** un item cae dentro del sprint elegido pero fuera de la ventana temporal del roadmap
- **THEN** el panel lo lista con sus días, señalado como fuera de la vista

#### Scenario: Una fase sin items

- **WHEN** una fase tiene fechas propias y responsable, pero ningún item
- **THEN** el panel no le atribuye carga en ningún sprint

#### Scenario: El mismo sprint en dos roadmaps con ventanas distintas

- **WHEN** el usuario mira el mismo sprint del calendario en dos roadmaps cuyas ventanas temporales lo recortan de forma distinta
- **THEN** el panel declara la misma capacidad en los dos, y solo cambia el trabajo que cada roadmap tiene dentro

#### Scenario: Abrir un item desde el panel de carga

- **WHEN** el usuario pincha un item del panel de carga para ver su detalle
- **THEN** el sistema muestra el detalle del item y mantiene el foco sobre el sprint
