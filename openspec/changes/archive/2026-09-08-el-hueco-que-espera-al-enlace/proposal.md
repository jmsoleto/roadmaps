## Why

Arrastrar un enlace no dice dónde va a caer. Las demás baldosas se apartan a su sitio nuevo, pero la casilla de destino no existe: la que está en mano tapa a las de debajo y el hueco hay que deducirlo. Con dobles y huecos de por medio, deducirlo es exactamente lo que no se puede pedir a las cuatro de la mañana.

Y hasta ahora ni siquiera se apartaban. El change que trajo el gesto dejó la previsualización inerte por un defecto de reactividad: reordenar funcionaba, pero durante el arrastre no se movía un solo píxel, así que lo único que se veía era el resultado al soltar. El carril nunca lo tuvo. Está arreglado, y este change es donde queda el registro de qué pasó.

## What Changes

- **La casilla de destino se dibuja.** Una silueta que ocupa exactamente lo que va a ocupar el enlace —una casilla o dos— en el sitio donde caería si se soltara ahora, y que se mueve con la misma animación que las baldosas mientras el destino cambia.
- **La silueta lleva el número que le va a tocar**, no el que tiene. Reordenar es reasignar teclas, así que lo útil no es «este enlace» sino «este enlace va a ser el 2».
- **No es una copia de la baldosa.** Se consideró una copia atenuada, más literal; se descarta en el design, y el requisito solo fija que el destino se vea, no con qué se dibuja.
- **El carril no lo necesita.** En una columna la fila levantada no tapa a nadie y el hueco se ve solo. Añadirle una silueta sería cromo que no resuelve nada.
- **El defecto de la previsualización**, como corrección registrada: el requisito ya prometía que el gesto se ve mientras ocurre, y no se cumplía.

Fuera de alcance:

- Mover un enlace de un área a otra, que sigue fuera desde el change anterior.
- Deshacer.
- Desplazamiento automático contra el borde.

## Capabilities

### Modified Capabilities

- `links-hub`: el requisito del orden gana la propiedad de que, mientras se arrastra, el sistema enseña dónde caería lo que se lleva en la mano, en lugar de dejarlo a deducción.

## Impact

- `src/lib/components/links/LinksApp.svelte`: el elemento nuevo y de dónde salen sus coordenadas. Ya hay ahí una colocación de destino calculada para mover las demás baldosas; la silueta es el mismo dato dibujado.
- `src/lib/links/grid.ts`: puede necesitar el ancho en píxeles de un tramo de una o dos casillas, que hoy nadie pregunta.
- `src/lib/components/links/AreaRail.svelte`: nada, y es una decisión y no un olvido.
