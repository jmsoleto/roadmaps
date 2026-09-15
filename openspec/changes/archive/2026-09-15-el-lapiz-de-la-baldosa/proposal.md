## Why

Un enlace se puede personalizar desde que existe la aplicación, y con un ratón no hay manera de llegar. La única vía es la tecla `E` sobre el enlace enfocado: está en la spec, está en la leyenda del carril, y no hay un solo píxel en la pantalla que la ofrezca. Quien no lea la leyenda no descubre que un enlace se edita.

No es que la baldosa esté llena. Es que sus acciones secundarias **se esconden hasta que haces otra cosa**:

- El asa de arrastre lleva el número de la tecla, así que se lee como una etiqueta y no como un asa; del décimo en adelante ni siquiera se ve hasta que el puntero pasa por encima.
- Las flechas `◂ ▸` solo existen cuando el enlace está enfocado — y con ratón el foco de un enlace llega **después de pulsarlo**, es decir, después de abrirlo en otra pestaña. La vía sin ratón para ordenar funciona; la vía con ratón exige abrir un panel para descubrirla.
- El lápiz no existe.

El carril de áreas ya tiene resuelto lo que a la rejilla le falta: un área activa enseña en fila sus cuatro acciones —subir, bajar, renombrar, eliminar— y su borrado avisa antes con la cuenta de lo que se pierde. Esto no estrena vocabulario, termina de aplicar el que ya hay.

Y al ir a escribirlo aparece un hueco de verdad: **la spec no dice en ninguna parte que un enlace se pueda borrar**. `deleteLink` existe sin que ningún requisito lo pida ni lo gobierne, y borra sin preguntar nada. Mientras el formulario era inalcanzable eso no se notaba; en cuanto cada baldosa lleva un lápiz, perder un enlace pasa a estar a dos clics.

## What Changes

- **Cada enlace enseña cómo se edita.** Un `✎` en su baldosa que abre el formulario del enlace, el mismo que abre la tecla `E`. Y nada más: el lápiz abre el formulario y se acaba ahí.
- **Las acciones de una baldosa se enseñan al acercarse.** Se ven cuando el puntero pasa por encima **o** cuando el enlace está enfocado, no solo al enfocarlo. Esto arregla de paso las flechas de mover, que hoy hay que abrir un enlace para descubrir.
- **La tabulación no cambia.** Solo la baldosa enfocada aporta paradas, como hoy. Ver un control al pasar por encima no puede convertir la rejilla en treinta y seis paradas de tabulador.
- **Borrar un enlace pasa a ser un requisito, y pide confirmación.** El aviso no dice qué enlace se va —eso ya se sabe, el formulario lleva su nombre en la cabecera— sino **que los de detrás cambian de tecla**. Es el mismo coste que la spec protege al reordenar, entrando por la puerta de atrás.
- **El borrado en el formulario, como ya estaba**, y no en la rejilla. La rejilla es la superficie de apuntar y abrir; meter destrucción ahí es pedir un accidente a las cuatro de la mañana. La asimetría con el carril —donde el `✕` sí está a la vista— es deliberada y va explicada.

Fuera de alcance:

- Deshacer un borrado.
- Duplicar un enlace.
- Borrar varios a la vez.
- Un menú contextual con el botón derecho.
- Tocar el carril de áreas, que ya tiene todo esto.

## Capabilities

### Modified Capabilities

- `links-hub`: el requisito de personalización gana la obligación de ofrecer una vía con puntero y no solo la tecla; el del orden gana que las acciones de una baldosa se alcanzan sin abrir el enlace; y se añade el requisito que faltaba, el de eliminar un enlace con confirmación que advierte del cambio de teclas.

## Impact

- `src/lib/components/links/LinkTile.svelte`: el botón nuevo, el grupo de abajo que lo contiene junto a las flechas, y la regla de cuándo se ve. Las flechas dejan de montarse y desmontarse con el foco y pasan a gobernarse con `tabindex`.
- `src/lib/components/links/LinkForm.svelte`: el botón rojo se convierte en aviso y confirmación, con el pie del panel siguiendo el patrón del carril.
- `src/lib/links/ui.svelte.ts`: un estado más para el borrado pendiente, hermano del que ya existe para las áreas, y que `reset()` y el cierre del formulario tienen que limpiar.
- `src/lib/components/links/LinksApp.svelte`: nada de fondo; el formulario ya se abre por `linksUi.openEdit` y el lápiz usa esa misma puerta.
- `src/lib/links/keyboard.ts`: nada. `E` sigue siendo `E`, y `ownsKey` ya trata correctamente un botón enfocado dentro de la baldosa.
