## Why

La fase de estudio produce cosas que no se pueden escribir: el diagrama del flujo actual, el pantallazo del panel del proveedor, la captura del error que originó la duda. Hoy no tienen sitio, así que viven en una carpeta aparte y se buscan a mano justo cuando hacen falta —delante de negocio— o directamente se pierden.

El boceto lo llama `APOYO VISUAL`, y lo pone donde corresponde: en la fase 2, junto a las alternativas, porque es material de estudio y no adorno.

Este change existe separado del anterior a propósito. El almacén de Decisions era infraestructura con riesgo propio y convenía verla aguantar datos reales antes de meterle encima megabytes de imágenes. Ya los aguanta.

## What Changes

- **Adjuntos de imagen en una decisión**, pegados desde el portapapeles, arrastrados o elegidos con el selector de archivos. Pegar es la vía principal: capturar la pantalla y pegar es el gesto real, y no pasa por el disco.
- **Los bytes viven en su propio almacén de objetos**, aparte del documento. El documento se escribe entero en cada guardado, así que meter los bytes dentro haría reescribir megabytes en cada tecla.
- **En el documento queda solo la ficha**: nombre, tamaño, tipo y cuándo se añadió. Es lo que hace que el manifiesto del export salga gratis.
- **El export lleva el manifiesto y no los bytes.** Y al importar, **el hueco se ve**: una decisión que traía tres capturas las enseña como ausencias con su nombre y su tamaño, en lugar de llegar aparentando estar completa.
- **Los bytes huérfanos se recogen al cargar.** Un adjunto cuya decisión ya no existe se borra, para que un fallo a medio camino no deje ocupando espacio algo que nadie puede ver.
- **Aviso de tamaño**: cada adjunto y el total ocupado se muestran, y un archivo desmesurado se rechaza diciendo por qué.

Fuera de alcance:

- **Reducir la resolución al guardar.** Un pantallazo de Retina puede pesar varios megas y reescalarlo ahorraría espacio, pero cambia el archivo que el usuario decidió guardar. Si el espacio llega a molestar, se plantea entonces.
- **Adjuntos que no sean imagen.** Un PDF o un CSV no se pueden enseñar en una reunión de un vistazo, que es para lo que existe este apoyo.
- **Enseñar los adjuntos en la fase 3.** La vista de presentación es el change siguiente y decidirá qué de esto se proyecta.

## Capabilities

### Modified Capabilities

- `decisions`: una decisión puede llevar adjuntos de imagen, con su ficha, y el sistema dice cuáles no viajaron en un documento importado.
- `local-persistence`: el almacén de Decisions gana un segundo almacén de objetos para los bytes, y la recogida de huérfanos al cargar.
- `data-portability`: el documento de decisiones lleva el manifiesto de adjuntos y explícitamente no sus bytes.

### Sin cambios

- `hub-landing` y `hub-shell`: los adjuntos no cambian nada de lo que Decisions reporta.

## Impact

**Persistencia**

- `src/lib/decisions/storage.ts`: segundo almacén de objetos en la misma base, subida de versión del esquema, y las operaciones de leer, escribir y borrar bytes.

**Modelo**

- `Decision` gana la lista de fichas de adjunto. Los bytes nunca entran en el modelo.

**Interfaz**

- Bloque de apoyo visual en la fase de estudio: pegar, arrastrar, elegir archivo, miniaturas, ver a tamaño completo y quitar.
- Las fichas sin bytes se muestran como ausencias declaradas.

**Sin impacto**

- Roadmaps, en cualquiera de sus partes.
- El ciclo de vida de una decisión, sus criterios y su recomendación.
