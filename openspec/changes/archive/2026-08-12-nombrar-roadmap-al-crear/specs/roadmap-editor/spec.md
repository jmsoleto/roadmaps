## ADDED Requirements

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
