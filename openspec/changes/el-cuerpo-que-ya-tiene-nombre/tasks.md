## 1. Lo que el store ya sabe, fijado con tests

- [x] 1.1 Añadir a `store.svelte.test.ts` el caso de `extractToModel` sobre la **raíz de un cuerpo** de respuesta: verificar que el cuerpo queda como referencia al modelo creado, sin hijos propios, y que el modelo se lleva los campos. Verificar que pasa sin tocar el store (D5); si hiciera falta tocarlo, el test ha encontrado algo que el diseño no previó.
- [x] 1.2 Añadir el caso de `expandRef` sobre la raíz de un cuerpo que referencia a un modelo: el cuerpo vuelve a ser un objeto con una copia de los campos, y el modelo queda intacto. Verificar que pasa sin tocar el store.
- [x] 1.3 Añadir el caso de `setNodeRef` y `setNodeItemRef` sobre una raíz, incluido que apuntar a un modelo un cuerpo que tenía tres campos los deja fuera (D3). Verificar que el ejemplo JSON del cuerpo pasa a ser el del modelo.

## 2. Lo que el documento y el validador ya hacen, fijado con tests

- [x] 2.1 Añadir a `openapi.test.ts` que un cuerpo que es una referencia sale como `$ref` al schema del modelo, y que un cuerpo que es un array de un modelo sale como `array` cuyos `items` lo referencian. Verificar que pasa sin tocar `openapi.ts`.
- [x] 2.2 Añadir a `validate.test.ts` que un cuerpo que es una referencia **no** se acusa de «el cuerpo está declarado y no tiene ningún campo», y que una referencia rota en la raíz sí se avisa. Verificar que pasa sin tocar `validate.ts`.
- [x] 2.3 Añadir el caso que hoy nadie cubre: un cuerpo `array` + `de ref` **sin modelo elegido**. Verificar que el validador lo marca como «rompe» diciendo dónde, que es el aviso que protege al usuario mientras el selector exista.

## 3. La barra del cuerpo

- [x] 3.1 En `TreeBlock.svelte`, añadir `'ref'` a `ROOT_TYPES`. Verificar en la aplicación que el selector de un cuerpo ofrece los tres y que elegir `ref` deja el cuerpo pidiendo a qué modelo apunta.
- [x] 3.2 Añadir a la barra el selector de modelo, con el mismo `aria-label` que usa la fila de un campo, visible cuando el cuerpo es `ref` y cuando es `array` de `ref`, llamando a `setNodeRef` o a `setNodeItemRef` según el caso. Verificar que un cuerpo que es un array de `Pedido` emite `items` con su `$ref`, y que el aviso del validador de la tarea 2.3 desaparece al elegir modelo.
- [x] 3.3 Añadir «expandir aquí» e «ir al modelo» cuando el cuerpo apunta a uno, con las mismas palabras que la fila (D2). Verificar que expandir devuelve el cuerpo a objeto con los campos del modelo y que el modelo sigue en la lista.
- [x] 3.4 Arreglar el mensaje de debajo: hoy un cuerpo que no es contenedor dice «un array de valores sueltos no tiene campos que describir», que es falso para una referencia. Verificar que un cuerpo que apunta a un modelo dice lo que es y no lo que no es.
- [x] 3.5 Verificar que un cuerpo que ya era una referencia —creado con «extraer a modelo» antes de este change— se abre declarado como referencia y no como `object`, que es lo que la barra enseñaba.

## 4. Comprobar

- [x] 4.1 Describir un contrato con un modelo `Error`, apuntar a él los cuerpos de `400`, `404` y `409`, y verificar en el documento exportado que los tres emiten el mismo `$ref` y que `components/schemas` trae el modelo una sola vez.
- [x] 4.2 Apuntar a un modelo el cuerpo de la petición de un `POST`, y verificar que sale como `$ref` igual que en una respuesta.
- [x] 4.3 Apuntar a un modelo un cuerpo que tenía tres campos escritos y verificar que el cuerpo queda limpio; después usar «extraer a modelo» sobre otro cuerpo con campos y verificar que esa es la salida que los conserva (D3).
- [x] 4.4 Mirar la barra a 1400 px con el panel de ejemplo abierto, con el cuerpo en sus cuatro estados —objeto, array de objetos, array de un modelo y referencia— y verificar que los controles caben y que la barra no se descoloca entre estados.
- [x] 4.5 Borrar un modelo al que apunta el cuerpo de una respuesta y verificar que el aviso de uso lo nombra, porque un cuerpo cuenta como uso igual que un campo.
- [x] 4.6 Pasar el documento por `redocly lint` y verificar que no hay violaciones de schema, con atención a los `$ref` de los cuerpos y a `components/schemas`.
- [x] 4.7 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
