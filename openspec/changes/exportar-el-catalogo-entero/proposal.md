## Why

Links Hub se saca y se trae por áreas, y eso deja sin dueño la copia de seguridad. Es la única de las cuatro aplicaciones que vive en `localStorage` —el almacén que muere al borrar los datos del sitio— y guardar todo su contenido son hoy tantos ficheros como áreas haya. Un respaldo que hay que hacer seis veces no se hace.

El change que trajo el documento de área lo dejó fuera a propósito y corrigió `local-persistence` para que dejara de prometerlo: hoy esa spec dice explícitamente que una aplicación cuyo documento es una unidad no está respaldada por completo mientras no declare un documento de conjunto. Esto es ese documento.

## What Changes

- **Un segundo documento de Links Hub**, el catálogo entero, junto al de área que ya existe. Tiene precedente exacto en API Hub, que también acabó con dos —el contrato y la biblioteca— y que por eso tuvo que aprender a decir cuál de los dos es un fichero que llega, en lugar de limitarse a decir que no es el otro.
- **Su propio `kind`**, distinto del de área, y el rechazo cruzado en las dos direcciones con la frase que dice qué es en realidad.
- **La pregunta que hay que contestar antes de escribir nada**: qué pasa al importar un catálogo sobre uno que ya tiene áreas. El documento de área añade, y ahí es evidente. Un catálogo entero admite dos lecturas —restaurar una copia, que es reemplazar, y traerse el catálogo de otro, que es añadir— y son incompatibles. Elegir mal aquí es lo caro del change: reemplazar sin querer no tiene deshacer.
- **Revertir el matiz de `local-persistence`** una vez exista, para que vuelva a decir sin condiciones que el export/import es el mecanismo de copia de seguridad.

Fuera de alcance, salvo que la respuesta a la pregunta anterior lo exija:

- Sincronización, cuentas o cualquier cosa que necesite servidor.
- Un formato que mezcle catálogo y área en el mismo fichero.

## Capabilities

### Modified Capabilities

- `data-portability`: exportar e importar el catálogo entero de Links Hub, con la resolución de qué ocurre al importar sobre un catálogo que ya tiene áreas, y el rechazo que distingue este documento del de área en las dos direcciones.
- `local-persistence`: la promesa de respaldo vuelve a valer sin condiciones para Links Hub.

## Impact

- `src/lib/links/io.ts`: un segundo par de funciones, o un fichero hermano si el sobre acaba siendo bastante distinto.
- `src/lib/hub/documents.ts`: quinta entrada en `ownerOf`, y el reconocedor pasa a tener que distinguir dos documentos de la misma aplicación, como ya hace con contrato y biblioteca.
- `src/lib/hub/registry.ts`: cómo se ofrecen cuatro acciones sin que la barra de Links Hub deje de leerse. Puede que la respuesta sea un diálogo como el de API Hub y no dos botones más.
