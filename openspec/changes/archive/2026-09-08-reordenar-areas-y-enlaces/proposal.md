## Why

Los enlaces de un área no se pueden ordenar. El orden es el de creación y no hay forma de cambiarlo: `moveLink` está en el store, con prueba, y no lo llama nadie. Y no es una preferencia de presentación —el orden de los enlaces es qué número abre cada panel, que es justo lo que se memoriza en guardia.

Las áreas sí se ordenan, con ↑↓ en la fila activa. Los dos changes anteriores aparcaron el gesto con el argumento de que el orden ya se podía fijar sin él. Era verdad a medias: para los enlaces no lo fue nunca, y para las áreas deja de serlo en cuanto se intenta sin ratón, porque con un enlace enfocado los atajos de la rejilla se quedan las teclas de los botones del carril. La aplicación promete usarse entera sin ratón y aquí no cumple.

## What Changes

- **Arrastrar para ordenar, en las dos superficies.** El carril de áreas y la rejilla de enlaces. Lo que el requisito debe fijar es la propiedad observable —el orden lo pone el usuario y se cambia con un gesto directo sobre la cosa que se mueve—, no la técnica: por dónde se agarra y cómo los píxeles se vuelven un índice es del design.
- **La rejilla no es el problema ya resuelto.** El núcleo compartido que sirvió a fases, items y roadmaps es vertical y de fila uniforme. El carril casi encaja; la rejilla no encaja en absoluto —dos dimensiones, número de columnas que depende del ancho de la ventana, y baldosas que ocupan una casilla o dos a elección del usuario—. Que el gesto no se copie por tercera vez es una decisión ya tomada en el change de roadmaps, y este es el que la pone a prueba.
- **La vía sin ratón, arreglada antes que extendida.** Los ↑↓ del carril se quedan, y el enlace enfocado gana su propio par, igual que ya gana la personalización con `E`. Pero primero hay que hacer que esa vía funcione: hoy un botón enfocado no llega a recibir su propia tecla porque los atajos de la rejilla van armados sobre toda la ventana y solo se apartan ante un campo de texto. Un botón también tiene derecho a su `Enter`.
- **El gesto no saca un enlace de su área.** Arrastrar hacia el carril frena la baldosa en el borde de la rejilla, sin mensaje y sin zona de destino, que es como el gesto enseña sus límites en el resto de la aplicación. Hoy no existe ninguna forma de mover un enlace entre áreas —`updateLink` excluye `areaId` a propósito— y este change no la inventa.
- **Reordenar reasigna los números, y eso es lo que se ha pedido.** Sigue prohibido que el sistema reordene por su cuenta; lo que cambia es que el usuario pueda. El riesgo, que un gesto accidental mueva en silencio la tecla que alguien tiene memorizada, es del design y se paga en cómo se agarra la baldosa.

`data-portability` ya promete que el orden de los enlaces viaja en el documento de área —«en el mismo orden que tienen en la rejilla»—. No hay que tocarla: este change es lo que hace que esa promesa signifique algo, porque hasta ahora ese orden era el de creación y nadie podía cambiarlo.

Fuera de alcance:

- **Mover un enlace de un área a otra.** Es estrenar una capacidad, no ordenar: trae sus propias preguntas —qué pasa con el foco, con la cuenta del área, con el número que el enlace tenía— y ninguna se contesta de paso.
- **Deshacer.** No lo hay en ninguna parte de esta aplicación, y este change no es el sitio para estrenarlo.
- **Desplazamiento automático contra el borde**, fuera desde el change de fases e items y fuera también aquí.
- **Cualquier orden que no ponga el usuario.** Ordenar por uso o por recencia ya está prohibido por un requisito vigente, y sigue estándolo.

## Capabilities

### Modified Capabilities

- `links-hub`: el orden de los enlaces dentro de un área pasa a ser una propiedad que el usuario fija, con el gesto y con la vía sin ratón; el requisito de las áreas gana el gesto junto a los botones que ya tiene; y el requisito de teclado deja de hablar solo de campos de texto, porque hoy promete una aplicación usable sin ratón que en el carril no lo es.

## Impact

- `src/lib/interactions/reorder.svelte.ts`: el núcleo del gesto, hoy atado a una dimensión y a una altura de fila constante. Hay que decidir si se generaliza por debajo o si la rejilla estrena el suyo, sabiendo que Gantt y `MetaView` no deberían enterarse.
- `src/lib/components/links/LinksApp.svelte` y `LinkTile.svelte`: la rejilla es donde vive lo nuevo de verdad —colocar las baldosas durante el gesto y decidir dónde cae la que está en mano, con los dobles de por medio.
- `src/lib/components/links/AreaRail.svelte`: el gesto junto a los botones que se quedan. Las filas cambian de altura al renombrar y al confirmar un borrado, así que el design tiene que decir qué pasa si eso coincide con un arrastre.
- `src/lib/links/keyboard.ts`: `isTyping` pregunta si el usuario está escribiendo, y lo que hace falta preguntar es si el foco está en un control que ya responde a esa tecla.
- `src/lib/links/store.svelte.ts`: nada. `moveArea` y `moveLink` ya están, ya están probados, y `moveLink` reordena dentro del área sin tocar los enlaces de las demás.
