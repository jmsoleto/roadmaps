## 1. El campo del árbol

- [x] 1.1 En `TreeNode.svelte`, sustituir el `<button class="req">*</button>` (línea ~196) por un `<label class="req">` con `<input type="checkbox">` y el texto `obl.`, conservando el mismo sitio en la fila —fuera de `.tools`— y el mismo `onchange` sobre `node.required` seguido de `apiContracts.touch()`. Verificar en la aplicación que marcar y desmarcar un campo sigue persistiendo tras recargar.
- [x] 1.2 Dar a la casilla `aria-label="obligatorio"` y `title="obligatorio"`, y retirar el `aria-pressed`, que era del botón. Verificar con el inspector de accesibilidad que el control se anuncia como casilla llamada «obligatorio» y no como «obl.».
- [x] 1.3 Reescribir la regla `.req` como etiqueta (`inline-flex`, `align-items: center`, `gap`, `flex-shrink: 0`, fuente pequeña, `color: var(--text-dim)`) y **eliminar `.req.on`**, añadiendo `accent-color: var(--accent)` a la casilla. Verificar que un campo opcional enseña una caja vacía sin pasar el puntero por encima, y que el estado marcado se pinta con el color de acento del tema.
- [x] 1.4 Reservar en la fila de una hoja el hueco del botón `+` que solo tienen los contenedores, con un `<span class="icon ghost" aria-hidden="true">` oculto por `visibility`, para que el control quede alineado en todas las filas. Verificar a ojo que la columna de controles no se desplaza entre filas de objeto y filas escalares, y que el hueco no añade una parada de tabulador.

## 2. El parámetro del endpoint

- [x] 2.1 En `EndpointEditor.svelte`, aplicar el mismo cambio en la fila de parámetros (línea ~198), conservando `checked={param.in === 'path' || param.required}`, el `disabled` del caso `path` y su `title` explicativo. Verificar que un parámetro de `query` se marca y desmarca, y que uno de `path` aparece marcado y no deja desmarcarse.
- [x] 2.2 Adaptar las reglas `.req`, `.req.on` y `.req:disabled` de este fichero igual que en 1.3, pasando la deshabilitada a `.req:has(:disabled)`. Verificar que el parámetro de `path` se ve atenuado y con cursor normal, y que el resto se ve idéntico al control del árbol.

## 3. Comprobar

- [x] 3.1 Recorrer un árbol anidado a profundidad 4 o 5 con comentarios escritos y verificar que la fila no desborda ni estruja el comentario: lo que cede son los campos flexibles, no el control.
- [x] 3.2 Recorrer la fila entera con el tabulador y con la barra espaciadora en los dos sitios, y verificar que el control se enfoca, se conmuta y que el de `path` se salta o no responde, sin que el foco salte a otra fila.
- [x] 3.3 Comprobar los dos sitios en tema claro y en tema oscuro, y con un tema personalizado de acento distinto, verificando que la casilla marcada sigue el acento y la apagada se distingue del fondo.
- [x] 3.4 Exportar un contrato con dos campos obligatorios y uno opcional en un objeto, y un parámetro de `path` sin marcar a mano, y verificar que el documento OpenAPI es idéntico al que salía antes del cambio.
- [x] 3.5 Ejecutar `npm test` y `npm run lint`, y verificar que pasan sin tocar ningún test: la lógica no se ha movido.
