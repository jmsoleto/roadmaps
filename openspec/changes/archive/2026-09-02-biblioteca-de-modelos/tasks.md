## 1. Las dependencias, enteras

- [x] 1.1 `modelDependencies` se vuelve transitivo, con conjunto de visitados — D1. Era directo desde el change de los modelos, con la nota de que esto llegaría
- [x] 1.2 Un modelo que se referencia a sí mismo se resuelve una vez y no cuelga
- [x] 1.3 Tests: cadena de tres, ciclo `A→B→A`, modelo sin dependencias

## 2. El bundle

- [x] 2.1 `api/library/types.ts`: una entrada es `{ id, name, description, updated, models }`, con el modelo pedido primero
- [x] 2.2 `api/library/bundle.ts`: `bundleOf(contract, modelId)` — el modelo y sus dependencias transitivas, como copias planas
- [x] 2.3 Qué se lleva además del elegido, para poder decirlo antes de guardar — D1
- [x] 2.4 Tests: se lleva la cadena entera, no se lleva lo que no depende, el recursivo sale una vez

## 3. Traer, que es la pieza con aristas

- [x] 3.1 `api/library/bring.ts`: `collisionsOf(contract, bundle)` — qué nombres del bundle ya existen, con algo de cada uno para poder elegir (recuento de campos) — D3
- [x] 3.2 `bringBundle(contract, bundle, decisiones)`: los modelos a añadir y **una sola tabla de traducción** de identificadores, construida antes de insertar nada — D4
- [x] 3.3 Reutilizar: no se añade, y lo que apuntaba al del bundle apunta al del contrato
- [x] 3.4 Traer aparte: se añade con nombre que no choca, y lo que venía con él apunta al recién traído
- [x] 3.5 Identidad nueva en todo lo que entra, con las referencias remapeadas — reutiliza lo que ya hace `reissueIds`
- [x] 3.6 Tests de la matriz: sin colisión, con colisión reutilizando, con colisión trayendo aparte, colisión en una dependencia pero no en el modelo pedido, dos colisiones a la vez

## 4. El almacén y el store

- [x] 4.1 `api/storage.ts`: acceso al almacén `apiLibrary`, que lleva creado y vacío desde el primer change
- [x] 4.2 `api/library.svelte.ts`: store propio, con carga de tres desenlaces y mutaciones que se niegan si no abrió — D5
- [x] 4.3 Guardar en la biblioteca **no** reescribe el documento de contratos, y al revés — D5
- [x] 4.4 `main.ts`: su carga al lado del arranque, no dentro
- [x] 4.5 `save`, `remove`, y el reemplazo por nombre avisando — D6
- [x] 4.6 Tests del store con `fake-indexeddb`: guardar, reemplazar, borrar, y que no toca los contratos

## 5. Sacar y traer la biblioteca

- [x] 5.1 `api/library/io.ts`: exportar e importar, siguiendo el patrón del contrato — D7
- [x] 5.2 `hub/documents.ts` gana el formato de biblioteca, y con él el rechazo cruzado contra el contrato
- [x] 5.3 Importar añade; una entrada cuyo nombre ya está se resuelve como al guardar
- [x] 5.4 Identidad nueva en las entradas importadas
- [x] 5.5 Tests: ciclo completo, importar añade, nombre que ya existe, documento equivocado en las dos direcciones

## 6. La interfaz

- [x] 6.1 `LibraryDialog.svelte`: las entradas, con su fecha y lo que contiene cada una; traer y borrar
- [x] 6.2 El paso de colisiones: una línea por modelo, dos salidas, y algo de cada uno. Por defecto reutilizar, en un control visible — D3
- [x] 6.3 Sin colisión no hay paso: traer es un clic
- [x] 6.4 «Guardar en la biblioteca» en `ModelEditor`, diciendo qué se lleva además
- [x] 6.5 «Traer de la biblioteca» en la sección de modelos del raíl
- [x] 6.6 Exportar e importar la biblioteca desde el propio diálogo, que es donde se está mirando
- [x] 6.7 Todo con tokens del tema

## 7. Verificación

- [x] 7.1 Guardar `ItemProducto` con dependencias y ver que dice que se lleva las tres
- [x] 7.2 Traerlo a un contrato limpio de un clic, y que sus referencias resuelven
- [x] 7.3 Traerlo a un contrato que ya tiene `Paginacion`, reutilizar, y comprobar que no hay dos
- [x] 7.4 Lo mismo trayendo aparte, y comprobar que lo traído apunta al nuevo
- [x] 7.5 Editar el modelo traído y ver que la biblioteca no cambia
- [x] 7.6 Que guardar en la biblioteca no toca el documento de contratos
- [x] 7.7 Que la biblioteca sobrevive a cerrar el navegador
- [x] 7.8 Exportar la biblioteca, borrarla, importarla y comprobar que vuelve
- [x] 7.9 Meter un contrato donde va una biblioteca y ver que lo dice — y la biblioteca donde va un contrato, que decía sólo que no era un contrato
- [x] 7.10 `npm run check`, `npm run lint` y `npm run test` en verde
