## Why

Marcar un campo como obligatorio es de las pocas decisiones que se toman fila a fila mientras se describe un cuerpo, y el control que la recoge es un `*` de 14 px pintado al 40 % de opacidad. Apagado se confunde con el fondo: no es que el estado «opcional» se lea mal, es que no se ve, y con él se pierde que ahí hay algo que se puede pulsar. Encendido es un asterisco del color de acento, que tampoco levanta la voz. La única palabra que explica qué es vive en el `title`, a un hover de distancia de quien todavía no sabe que existe.

Dos filas más abajo, en la tira de opciones avanzadas, «admite nulo» ya es una casilla con su etiqueta al lado. El asterisco no es el patrón de la aplicación: es la excepción que quedó.

## What Changes

- **El asterisco pasa a ser una casilla con etiqueta**, `obl.`, en los dos sitios donde hoy vive el mismo botón: la fila de un campo del árbol y la fila de un parámetro de endpoint. Es el patrón que la aplicación ya usa para lo booleano, y el que resuelve el problema de raíz: una casilla vacía **sigue siendo una caja visible**, mientras que un asterisco apagado es el fondo.
- **Casilla nativa**, teñida con `accent-color` como la del cajón. Se descarta pintar una a mano: lo que se quiere aquí es justamente que se reconozca como una casilla de verdad, y una imitación devuelve el problema por otra puerta.
- **La etiqueta se abrevia en pantalla y se dice entera al oído.** `obl.` es lo que cabe en una fila que se repite por campo; el nombre completo va en `aria-label` y en el `title`, para quien navega con lector de pantalla o se para encima. La etiqueta es clicable, así que el blanco al que apuntar crece de 24 px a la casilla más su palabra.
- **Un parámetro de `path` sale mejor parado que hoy.** Ya era un asterisco encendido y deshabilitado; una casilla marcada y deshabilitada dice lo mismo sin tener que descifrarlo: es obligatorio y no lo decides tú. El `title` que lo explica se queda.
- **Nada del modelo ni de la salida se entera.** `node.required` y `param.required` son el mismo booleano, y el documento OpenAPI se emite exactamente igual. Es un cambio de cómo se dice, no de qué se dice.

Un efecto que conviene declarar antes de verlo: un campo hijo nace obligatorio. Con el asterisco eso pasaba desapercibido; con la casilla, **todo campo nuevo aparecerá visiblemente marcado**. Es información correcta que hasta ahora estaba escondida, y el cambio de percepción es real aunque el comportamiento no se toque.

Fuera de alcance:

- **Revisar si un campo nuevo debe nacer obligatorio.** Sacarlo a la luz y cambiarlo a la vez sería dos decisiones en un mismo commit, y la primera es requisito para juzgar la segunda.
- **Tocar «admite nulo»**, ni el resto de la tira avanzada. Ya está bien dicho.
- **Una cabecera de columna o una leyenda por bloque.** Se consideró y se descarta: con la etiqueta en cada fila no hay nada que leyendar.
- **Los formularios de las otras aplicaciones.** El asterisco no vive en ninguna.

## Capabilities

### Modified Capabilities

- `api-contracts`: se añade el requisito que faltaba sobre cómo se marca la obligatoriedad —el control se ve en sus dos estados, dice su nombre y vive en la fila—, y cubre por igual el campo del árbol y el parámetro de endpoint, que hoy comparten widget sin que ninguna spec lo diga.

### Sin cambios

- `local-persistence`, `data-portability`, `hub-shell`, `hub-landing`, `theming`: no se toca ni lo que se guarda, ni lo que se exporta, ni el registro del contenedor. El único token del tema que entra en juego, `--accent`, ya gobernaba el asterisco encendido.

## Impact

- `src/lib/components/api/TreeNode.svelte`: el `<button class="req">*</button>` de la fila pasa a `<label>` con casilla y etiqueta. La regla `.req` deja de dar tamaño a un botón y pasa a componer una etiqueta; `.req.on` desaparece, porque el estado ya lo pinta la casilla.
- `src/lib/components/api/EndpointEditor.svelte`: el mismo cambio en la fila de parámetros, conservando el `disabled` y el `title` del caso `path`. Su `.req:disabled` sigue haciendo falta, ahora sobre la etiqueta.
- `src/lib/api/model/`, `src/lib/api/openapi.ts`: nada. El booleano y su emisión son los de antes.
- Tests: ninguno se toca. En `api/` los tests viven en los stores y en la salida, y ninguno afirma nada sobre el asterisco.
