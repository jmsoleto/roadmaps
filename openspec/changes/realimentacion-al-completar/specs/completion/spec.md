## ADDED Requirements

### Requirement: Realimentación en el momento de completar

El sistema MUST señalar con movimiento el momento en que el usuario marca un item como completado, y MUST hacerlo únicamente en ese momento: arrancar la aplicación, cambiar de roadmap, plegar o desplegar una fase y abrir el detalle de un item ya completado MUST NOT producir ninguna animación.

El movimiento MUST ocurrir en el detalle del item, que es donde se marca, y en el porcentaje de la fase. La marca de completitud de la parrilla MUST NOT animarse, ya que la barra puede quedar tapada por el propio detalle, fuera de la parte visible o dentro de una fase plegada.

En el detalle del item, el sistema MUST dibujar la marca de completitud y MUST mostrar a continuación las dos desviaciones, en ese orden: primero el hecho de estar completado y después lo que ha costado.

El porcentaje de la fase MUST recorrer los valores intermedios hasta el nuevo en lugar de saltar a él, y MUST hacerlo aunque en ese instante no esté a la vista. Los dígitos MUST mantener su anchura mientras recorren, de modo que el número no desplace al nombre de la fase.

Al desmarcar, el sistema MUST NOT reproducir el dibujado de la marca, y el porcentaje de la fase MUST recorrer los valores hasta el nuevo igual que al completar.

#### Scenario: Completar un item con el detalle abierto

- **WHEN** el usuario marca un item como completado desde su detalle
- **THEN** el sistema dibuja la marca de completitud, muestra después las dos desviaciones y recorre el porcentaje de la fase hasta su nuevo valor

#### Scenario: Arrancar la aplicación con items completados

- **WHEN** el usuario abre la aplicación en un roadmap que ya tiene items completados
- **THEN** el sistema muestra las marcas y los porcentajes en su estado final, sin animación alguna

#### Scenario: Cambiar de roadmap

- **WHEN** el usuario cambia a otro roadmap cuyas fases tienen porcentajes distintos
- **THEN** el sistema muestra los porcentajes del roadmap abierto directamente, sin recorrer valores entre los de un roadmap y los del otro

#### Scenario: Plegar y desplegar una fase con items completados

- **WHEN** el usuario despliega una fase que contiene items completados
- **THEN** el sistema muestra sus marcas en el estado final, sin animación

#### Scenario: Abrir el detalle de un item ya completado

- **WHEN** el usuario abre el detalle de un item que ya estaba completado
- **THEN** el sistema muestra la marca y las desviaciones en su estado final, sin dibujar nada

#### Scenario: Desmarcar un item

- **WHEN** el usuario desmarca un item completado
- **THEN** el sistema recorre el porcentaje de la fase hasta el nuevo valor y no dibuja ninguna marca

#### Scenario: Desmarcado en cascada de varios items

- **WHEN** una cascada de desmarcado retira la completitud de varios items
- **THEN** el porcentaje de su fase recorre los valores hasta el nuevo una sola vez, con el total ya descontado

Una cascada nunca alcanza más de una fase: se propaga por `dependsOn`, que es
intra-fase (ver `roadmap-editor`), de modo que todos los items que arrastra viven
en la fase del item desmarcado.

#### Scenario: Movimiento reducido

- **WHEN** el usuario tiene activada la preferencia del sistema de reducir el movimiento y marca un item como completado
- **THEN** el sistema no dibuja la marca y el porcentaje adopta su nuevo valor directamente, conservando toda la información y ninguna animación
