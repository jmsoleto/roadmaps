## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Cabeceras temporales de sprints y trimestres
El sistema MUST mostrar una cabecera de sprints (ventanas de 14 días) en la vista de roadmap y una cabecera de trimestres en la vista meta, resaltando el periodo actual.

Ambas cabeceras MUST permanecer a la vista mientras el usuario recorre la lista en vertical, a cualquier profundidad. Resaltar el periodo actual no sirve de nada si la cabecera desaparece en cuanto la lista es larga.

#### Scenario: Sprint actual resaltado
- **WHEN** la fecha de hoy cae dentro de un sprint visible
- **THEN** el sistema resalta ese sprint como actual

#### Scenario: La cabecera acompaña al recorrido vertical
- **WHEN** el usuario recorre la lista hacia abajo hasta el final de un plan largo
- **THEN** la cabecera del periodo sigue a la vista, con el periodo actual resaltado igual que arriba
