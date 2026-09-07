## Why

La barra se desplaza cuando habla. El error de importación y el aviso neutro se insertan entre las acciones y el indicador de guardado, así que los botones se mueven a la izquierda al aparecer un mensaje y vuelven al retirarse: un botón cambia de sitio bajo el cursor mientras se va a pulsar.

Ya pasaba con el error rojo, pero se disparaba solo al fallar una importación y era raro verlo. Desde que una acción puede devolver un aviso neutro, la barra habla también cuando todo va bien —cada exportación y cada importación—, y lo que era una rareza pasa a ser el comportamiento normal. Durante la verificación del change anterior el desplazamiento hizo pulsar «exportar» creyendo pulsar «tema».

## What Changes

- **El sitio del mensaje deja de empujar a las acciones.** Reservarlo, sacarlo del flujo, o anclarlo a la derecha: la decisión es del design, y lo que el requisito debe fijar es la propiedad observable —las acciones de la barra no cambian de posición porque aparezca o desaparezca un mensaje—, no la técnica.
- **Vale para los dos mensajes**, el error y el aviso. Arreglar solo el nuevo dejaría el defecto vivo justo en el caso en que más molesta, que es cuando algo ha fallado y se va a volver a pulsar.
- **El ancho reservado tiene que caber la frase más larga que hoy existe**, que es el aviso de exportación de Links Hub, o recortar de forma que lo que sobreviva siga siendo lo que importa. Esa regla ya está resuelta en el texto —la advertencia va delante y el nombre del fichero detrás— y conviene no deshacerla al mover el hueco.

Fuera de alcance:

- Cambiar qué dicen los mensajes, o cuánto duran.
- Un sistema de notificaciones. Es una barra, no una bandeja: sigue habiendo como mucho un mensaje a la vez y se retira solo.

## Capabilities

### Modified Capabilities

- `hub-shell`: el requisito del aviso neutro gana la propiedad de que presentar un mensaje no mueve las acciones de la barra. Es donde vive el contrato de qué presenta el topbar y cómo, y el requisito del aviso es de este mismo cambio anterior, así que el arreglo pertenece ahí y no a ninguna aplicación.

## Impact

- `src/lib/components/Topbar.svelte`: la maquetación de `.notice`, `.import-error` y el hueco que ocupan entre las acciones y `.scope`. Nada de lógica: los mensajes, sus tiempos y quién los produce no cambian.
- Ninguna aplicación se entera. Siguen declarando qué dicen; el topbar sigue decidiendo cómo se ve, que es exactamente el reparto que `hub-shell` ya fija.
