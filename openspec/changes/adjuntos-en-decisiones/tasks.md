## 1. Almacén de bytes

- [x] 1.1 Subir la versión del esquema y crear el almacén de objetos de adjuntos en la misma base (D1)
- [x] 1.2 Operaciones de contenido: leer, escribir, borrar y listar claves
- [x] 1.3 Recogida de huérfanos al cargar, solo tras leer el documento con éxito, y solo en la dirección segura (D4)
- [x] 1.4 Test: ida y vuelta de un blob, y que borrar la decisión se lleve su contenido
- [x] 1.5 Test: un contenido sin ficha se recoge; una ficha sin contenido se conserva
- [x] 1.6 Test: con el almacén no disponible no se recoge nada

## 2. Modelo

- [x] 2.1 `Attachment` en el modelo: id, nombre, peso, tipo y fecha. Los bytes nunca entran aquí
- [x] 2.2 `Decision.attachments`, y su normalización al cargar y al importar
- [x] 2.3 Nombre derivado del momento para lo que se pega sin nombre (D2)
- [x] 2.4 Validación: solo imágenes, y tope de peso con su mensaje (D5)
- [x] 2.5 Test: normalizar tolera documentos sin adjuntos y descarta fichas malformadas

## 3. Store

- [x] 3.1 `attach()`: valida, escribe el blob, añade la ficha
- [x] 3.2 `detach()`: quita la ficha y borra el blob
- [x] 3.3 Borrar una decisión se lleva los blobs de todos sus adjuntos
- [x] 3.4 Acceso al contenido de un adjunto, y saber cuándo no está
- [x] 3.5 Test: adjuntar, quitar, y que borrar la decisión limpie detrás

## 4. Portabilidad

- [x] 4.1 El export lleva el manifiesto y ningún byte (D3)
- [x] 4.2 El import conserva las fichas como ausencias declaradas
- [x] 4.3 Test: el peso del documento no depende del de las imágenes
- [x] 4.4 Test: una decisión importada declara sus adjuntos y ninguno tiene contenido

## 5. Interfaz

- [x] 5.1 Bloque de apoyo visual en la fase de estudio, con su zona de arrastre
- [x] 5.2 Pegar con la decisión abierta, sin enfocar nada
- [x] 5.3 Selector de archivos como tercera vía
- [x] 5.4 Miniaturas con su nombre y su peso, revocando la URL de objeto al desmontar (D-riesgo)
- [x] 5.5 Ver a tamaño completo, y volver
- [x] 5.6 Quitar un adjunto
- [x] 5.7 Las ausencias, señaladas como tales y no abribles
- [x] 5.8 Total ocupado por la decisión
- [x] 5.9 Rechazos con su motivo: no es imagen, o pesa de más

## 6. Verificación

- [x] 6.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 6.2 Recorrido manual: pegar una captura, verla, quitarla
- [x] 6.3 Recorrido manual: exportar con adjuntos, comprobar que el JSON no crece, importar y ver las ausencias
- [x] 6.4 Comprobar que editar texto en una decisión con adjuntos no reescribe sus blobs
