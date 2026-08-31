# roadmap-editor

## Purpose

Edición del roadmap en el Gantt: jerarquía fase → item, milestones, dependencias con flechas, drag/resize, reordenación vertical de fases e items, drawer de detalle, responsables, sprints, vista "Todos", navegación y gestión de varios roadmaps, y zoom. Formaliza la paridad funcional con el HTML original (`roadmap_tool_6_6_2.html`); el objetivo es cero regresión percibida.

La reordenación entró tarde, en `2026-08-31-reordenar-fases-e-items`: el port original la perdió y nadie lo advirtió porque ninguna spec la recogía. Es el motivo de que esta capacidad enumere lo que cubre.

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

#### Scenario: Arrastrar la barra de un item completado
- **WHEN** el usuario arrastra el cuerpo o un borde de la barra de un item completado
- **THEN** el sistema no altera sus fechas

### Requirement: Milestones
El sistema MUST soportar hitos representados como marcadores de fecha única (rombo).

#### Scenario: Crear un milestone
- **WHEN** el usuario añade un milestone en una fecha
- **THEN** el sistema lo representa como marcador de un solo día con inicio igual a fin

### Requirement: Dependencias entre items
El sistema MUST permitir declarar dependencias de un item respecto a otros y representarlas visualmente con flechas.

El sistema MUST impedir que un item completado declare una dependencia respecto a un item que no lo esté, ya que un item completado no puede quedar con un predecesor pendiente. Ver `completion`.

#### Scenario: Visualizar una dependencia
- **WHEN** un item declara depender de otro
- **THEN** el sistema dibuja una flecha desde el item predecesor hasta el dependiente

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

#### Scenario: Sprint actual resaltado
- **WHEN** la fecha de hoy cae dentro de un sprint visible
- **THEN** el sistema resalta ese sprint como actual

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

### Requirement: Color de fases e items por slot de paleta
El sistema MUST asignar a cada fase e item una posición dentro de la paleta de barras del tema activo, en lugar de un color absoluto, de modo que su color concreto lo determine el tema.

#### Scenario: Crear una fase
- **WHEN** el usuario crea una fase
- **THEN** el sistema le asigna la siguiente posición de la paleta y la barra se pinta con el color que esa posición tiene en el tema activo

#### Scenario: Cambiar el color de un elemento
- **WHEN** el usuario avanza el color de una fase, item o responsable
- **THEN** el sistema pasa a la siguiente posición de la paleta y recorre todas las posiciones cíclicamente, sin saltar ni volver al principio de forma inesperada

#### Scenario: Un elemento conserva su posición al cambiar de tema
- **WHEN** el usuario cambia el tema activo
- **THEN** cada fase, item y responsable conserva su posición en la paleta y adopta el color que esa posición tiene en el tema nuevo

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
