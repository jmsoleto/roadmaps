# theming

## Purpose

Temas de color de la aplicación: cuatro esquemas predefinidos inmutables (claro, oscuro y sus variantes de alto contraste), temas propios creados por el usuario, y un editor con vista previa en vivo. El usuario elige un puñado de colores base y el resto de la interfaz se deriva de ellos, de modo que un tema propio salga coherente sin tener que acertar treinta valores. Incluye la paleta de barras por tema, los tokens no cromáticos que el alto contraste necesita, la validación de contraste WCAG y la aplicación del tema antes del primer fotograma.

## Requirements
### Requirement: Temas predefinidos inmutables
El sistema MUST ofrecer cuatro temas predefinidos —claro, oscuro, claro de alto contraste y oscuro de alto contraste— que el usuario puede seleccionar pero no modificar ni eliminar.

#### Scenario: Seleccionar un tema predefinido
- **WHEN** el usuario selecciona uno de los cuatro temas predefinidos
- **THEN** el sistema aplica sus colores a toda la interfaz y persiste la selección como tema activo

#### Scenario: El tema oscuro reproduce el aspecto previo
- **WHEN** el usuario selecciona el tema oscuro predefinido
- **THEN** la interfaz presenta los mismos colores que la aplicación tenía antes de existir el sistema de temas

#### Scenario: Un predefinido no se puede editar
- **WHEN** el usuario abre el editor con un tema predefinido activo
- **THEN** el sistema ofrece duplicarlo en un tema propio en lugar de permitir editar el predefinido

### Requirement: Resolución de tokens en dos niveles
El sistema MUST derivar los tokens de color secundarios (hover, velos, tintes de acento, sombras, líneas débiles) a partir de un conjunto reducido de colores base, de forma que elegir los colores base produzca una interfaz completa y coherente.

#### Scenario: Un color base propaga a sus derivados
- **WHEN** el usuario cambia un color base de un tema propio
- **THEN** el sistema recalcula todos los tokens derivados de ese color base y actualiza la interfaz

#### Scenario: Un tema definido solo por sus colores base es válido
- **WHEN** el sistema resuelve un tema que únicamente especifica sus colores base
- **THEN** produce el conjunto completo de tokens sin valores ausentes

### Requirement: Sobrescritura manual de tokens derivados
El sistema MUST permitir fijar manualmente el valor de un token derivado, y MUST dejar de recalcularlo a partir de su color base mientras esa sobrescritura exista.

#### Scenario: Fijar un token derivado
- **WHEN** el usuario fija manualmente el valor de un token derivado y después cambia el color base del que dependía
- **THEN** el token sobrescrito conserva el valor fijado y el resto de derivados de ese color base sí se recalculan

#### Scenario: Devolver un token a su valor calculado
- **WHEN** el usuario restablece un token que había sobrescrito
- **THEN** el sistema elimina la sobrescritura y el token vuelve a derivarse de su color base

### Requirement: Paleta de barras por tema
Cada tema MUST definir una paleta de colores para las barras de fases, items y responsables, y el sistema MUST ofrecer paletas de partida predefinidas al crear o editar un tema.

#### Scenario: Cambiar de tema recolorea los roadmaps
- **WHEN** el usuario cambia el tema activo por otro con distinta paleta de barras
- **THEN** las barras de todos los roadmaps existentes pasan a mostrar los colores de la paleta del tema nuevo, conservando cada elemento su posición en la paleta

#### Scenario: Partir de una paleta predefinida
- **WHEN** el usuario elige una paleta de partida al editar un tema propio
- **THEN** el sistema rellena los slots de la paleta con esos colores y permite ajustarlos individualmente

### Requirement: Tinta legible sobre las barras
El sistema MUST calcular el color del texto que se muestra sobre una barra a partir de la luminancia del color de esa barra, eligiendo entre las tintas clara y oscura del tema activo.

#### Scenario: Texto sobre una barra clara
- **WHEN** una barra usa un color de luminancia alta
- **THEN** el sistema muestra su etiqueta con la tinta oscura del tema

#### Scenario: Texto sobre una barra oscura
- **WHEN** una barra usa un color de luminancia baja
- **THEN** el sistema muestra su etiqueta con la tinta clara del tema

### Requirement: Tokens no cromáticos del tema
El sistema MUST incluir en el tema el grosor de línea, el grosor del anillo de foco y el redondeo de las barras, de modo que los temas de alto contraste puedan sustituir separaciones sutiles por líneas sólidas y ofrecer un foco visible.

#### Scenario: Alto contraste refuerza las separaciones
- **WHEN** el usuario activa un tema de alto contraste
- **THEN** las separaciones que en los temas normales se dibujan como tintes muy tenues se muestran como líneas sólidas del grosor definido por el tema

#### Scenario: Foco visible
- **WHEN** un control recibe el foco de teclado
- **THEN** el sistema dibuja un anillo de foco del grosor definido por el tema activo

### Requirement: Temas propios múltiples
El sistema MUST permitir crear, nombrar, editar, duplicar y eliminar varios temas propios, y persistirlos junto a la selección de tema activo.

#### Scenario: Crear un tema propio
- **WHEN** el usuario crea un tema propio y le da un nombre
- **THEN** el sistema lo guarda, lo añade a la lista de temas seleccionables y lo activa

#### Scenario: Eliminar el tema activo
- **WHEN** el usuario elimina el tema propio que está activo
- **THEN** el sistema activa un tema predefinido y la interfaz sigue siendo utilizable

### Requirement: Editor de temas con vista previa en vivo
El sistema MUST ofrecer un editor de temas que muestre el efecto de cada cambio de color sobre la interfaz real mientras se edita, y que permita descartar los cambios.

#### Scenario: Ver el efecto de un color al elegirlo
- **WHEN** el usuario modifica un color en el editor
- **THEN** la interfaz visible tras el editor adopta ese color de inmediato, sin necesidad de confirmar

#### Scenario: Descartar la edición
- **WHEN** el usuario cancela la edición de un tema
- **THEN** el sistema restaura la apariencia previa a haber abierto el editor

### Requirement: Validación de contraste
El sistema MUST evaluar el contraste de los pares texto/fondo de un tema propio según la relación de contraste WCAG y MUST advertir al usuario de los pares que no alcanzan el umbral, sin impedir guardar el tema.

#### Scenario: Aviso de contraste insuficiente
- **WHEN** el usuario elige una combinación de texto y fondo cuya relación de contraste queda por debajo del umbral
- **THEN** el sistema muestra una advertencia identificando el par afectado y su relación de contraste

#### Scenario: Guardar pese a la advertencia
- **WHEN** el usuario guarda un tema que tiene advertencias de contraste
- **THEN** el sistema lo guarda y lo aplica

#### Scenario: Los predefinidos cumplen su objetivo de contraste
- **WHEN** se evalúa el contraste de los cuatro temas predefinidos, incluidas las tintas sobre cada color de su paleta de barras
- **THEN** los temas claro y oscuro alcanzan al menos el nivel AA y los dos de alto contraste alcanzan al menos el nivel AAA

### Requirement: Aplicación del tema sin destello
El sistema MUST aplicar el tema activo antes de pintar el primer fotograma, de modo que el arranque no muestre los colores de un tema distinto al seleccionado.

#### Scenario: Arrancar con un tema claro seleccionado
- **WHEN** el usuario tiene seleccionado un tema claro y abre la aplicación
- **THEN** la aplicación se muestra con los colores de ese tema desde el primer fotograma, sin destello oscuro intermedio

### Requirement: Coherencia del tema con la ventana anfitriona
El sistema MUST reflejar el color de fondo del tema activo en los metadatos de color de la aplicación web, para que la barra de estado de la aplicación instalada acompañe al tema.

#### Scenario: Cambio de tema en la PWA instalada
- **WHEN** el usuario cambia de tema en la aplicación instalada como PWA
- **THEN** el color declarado de la interfaz del navegador pasa a corresponder al fondo del tema nuevo

