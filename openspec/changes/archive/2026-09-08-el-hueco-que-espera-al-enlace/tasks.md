## 1. Que la previsualización se mueva

Va primero: sin esto no hay nada sobre lo que dibujar el destino.

- [x] 1.1 `LinksApp.svelte`: `frame` pasa a `$state`, y el derivado de la maquetación lee el gesto y el marco **antes** de la condición que puede cortocircuitar — D5
- [x] 1.2 **Punto de verificación**: en mitad de un arrastre, la baldosa en mano lleva un `transform` que sigue al puntero y las demás uno distinto de cero. Mirarlo con el gesto en vuelo, no el resultado al soltar, que es lo que se dejó de mirar la vez anterior

## 2. La silueta del destino

- [x] 2.1 `links/grid.ts`: `spanWidth(span, m)` — el ancho en píxeles de un tramo de una o dos casillas, contando la separación de en medio
- [x] 2.2 `links/grid.test.ts`: una casilla es el ancho de pista; dos son dos pistas más una separación
- [x] 2.3 `LinksApp.svelte`: un derivado `ghost` que, con el gesto en vuelo, da la coordenada de `layout.preview[gesture.to]`, el ancho del tramo y el número de destino cuando lo hay — D2
- [x] 2.4 `LinksApp.svelte`: la silueta como hija posicionada de `.grid`, escrita **antes** que las baldosas y sin `z-index`, arrancando en el relleno de la caja — D3. `.grid` estrena `position: relative`
- [x] 2.5 `LinksApp.svelte`: borde punteado y número atenuado, con la misma transición de 120 ms que las baldosas, para que destino y movimiento se lean como una sola cosa — D1
- [x] 2.6 Del décimo en adelante la silueta va sin número — D2
- [x] 2.7 `LinkTile.svelte`: la baldosa en mano baja a un 72 % de opacidad, o la silueta queda tapada por lo que apunta a ella — D6
- [x] 2.8 `LinkTile.svelte`: la baldosa en mano esconde su propia insignia, que a esa distancia de la del hueco se lee como un número de dos cifras — D6
- [x] 2.9 `LinkTile.svelte` y `LinksApp.svelte`: la insignia enseña el puesto de la previsualización y no el índice real, que se conserva aparte para las flechas — D7

## 3. Verificación

- [x] 3.1 `npm test`, `npx tsc --noEmit` y `npm run lint` en verde
- [x] 3.2 En el navegador, **con el gesto en vuelo**: la silueta está en la casilla de destino y lleva el número que tocaría — escenarios «El destino se ve mientras se arrastra» y «La marca dice qué número tocaría»
- [x] 3.3 Arrastrar un doble: la silueta ocupa dos casillas — escenario del tamaño exacto
- [x] 3.4 Llevar un enlace más allá del noveno: la silueta va sin número — escenario «Un destino sin tecla detrás»
- [x] 3.5 Arrastrar hacia el carril: la baldosa frena en el borde y el carril no se ofrece como sitio donde soltar — escenario «Un enlace no sale de su área»
- [x] 3.6 Arrastrar un área: las filas se apartan y no aparece ninguna silueta — escenario «El carril no marca destinos»
- [x] 3.7 Con el gesto en vuelo, ningún número aparece dos veces en la rejilla — escenario «Los números son los de después, no los de antes»
