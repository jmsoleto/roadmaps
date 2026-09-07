## Why

Un área de guardia se construye una vez y luego no se puede mover. Vive en el `localStorage` de un perfil de un navegador: desaparece entera si el usuario borra los datos del sitio, no llega al portátil nuevo, y no hay manera de dársela al compañero que entra en la rotación. Y como Links Hub no trae nada de fábrica —el catálogo es entero del usuario, por decisión escrita—, ese compañero empieza su primera guardia con la pantalla vacía y un Confluence viejo.

Las otras tres aplicaciones ya se sacan y se traen en JSON. Esta es la única que no, y es la única que vive en el almacén que muere más fácil. El change que trajo la aplicación dejó esto fuera de alcance a propósito, para el siguiente. Este es el siguiente.

## What Changes

- **Un documento es un área, no el catálogo.** Se exporta el área activa, igual que Roadmaps exporta el roadmap activo y API Hub el contrato abierto. Es la unidad que la pantalla ya tiene abierta, y la que se comparte de verdad: lo que se le pasa al compañero es «los enlaces de pagos», no la organización entera de otra persona. Consecuencia útil: los enlaces del documento no llevan área a la que apuntar, así que no hay integridad referencial que preservar y no se puede escribir a mano un fichero de dos áreas por accidente.

- **Importar añade un área nueva**, con identidad nueva para ella y para cada enlace, como hacen las cuatro importaciones que ya existen. Importar dos veces el mismo fichero deja dos áreas independientes en lugar de que la segunda pise a la primera. Un área importada cuyo nombre ya esté no se funde con la que estaba: fundir mete enlaces dentro de un área que el usuario no ha mirado, y deshacer eso son N gestos frente al único que cuesta borrar un área de más.

- **El área importada queda activa.** Es la prueba visible de que la importación funcionó, en la aplicación cuyo trabajo entero es enseñar una rejilla.

- **La importación dice qué no entró.** Estricto en el sobre y tolerante en el contenido: un fichero que no es nuestro se rechaza con su motivo y no entra nada, pero dentro de un documento reconocido un enlace sin nombre o con una dirección que no es `http`/`https` se cae y el resto entra —la misma tolerancia que la carga, que es la que impide que esta aplicación falle al arrancar. La diferencia con la carga es quién mira: al importar hay alguien delante que puede arreglar el fichero, así que descartar en silencio deja de ser aceptable. «7 enlaces importados, 2 descartados».

- **El topbar estrena carril de aviso neutro.** Hoy solo sabe pintar el error rojo de una importación que lanza, así que no hay dónde decir lo anterior. Una acción pasa a poder devolver una frase, que la barra pinta atenuada y retira sola. Genérico y no propio de Links Hub: es el cuarto sitio donde haría falta, no devolver nada sigue siendo el comportamiento de hoy, y las otras tres pueden adoptarlo sin que este change las toque.

- **Exportar dice qué lleva el fichero.** Un área de guardia es un mapa de la infraestructura interna: URLs de paneles corporativos, nombres de servicios, a veces la topología deducible de cómo están agrupados. Eso no puede quedar implícito en un botón que descarga en silencio, y el aviso al exportar es el sitio donde decirlo. Compromiso que el change anterior dejó escrito al aplazar este.

- **`documents.ts` estrena su cuarta entrada.** Meter un fichero de enlaces en Roadmaps se contesta hoy con «no lo reconozco» en lugar de con «esto es un documento de Links Hub», porque el reconocedor se quedó en tres aplicaciones. Con la cuarta viva, las combinaciones equivocadas pasan de seis a doce, que es justo el argumento por el que ese reconocedor existe.

- **El fichero se llama `enlaces-<área>.json`.** Prefijo que dice de qué aplicación es, sufijo que dice de qué área: tres exportaciones seguidas dejan tres ficheros distinguibles en Descargas y no `enlaces (2).json`.

Fuera de alcance:

- **Exportar el catálogo entero como copia de seguridad.** Es un documento distinto, no una variante de este, y trae su propia pregunta —qué pasa al restaurar sobre un catálogo que ya tiene cosas— que no se contesta de paso. Tiene precedente exacto en API Hub, que también acabó con dos documentos, el contrato y la biblioteca. Mientras no exista, `local-persistence` deja de prometer que el export/import es la copia de seguridad de esta aplicación, porque hoy no lo es.
- **Reordenar áreas y enlaces arrastrando**, que sigue siendo el mismo problema ya resuelto para fases e items y no hay que resolverlo dos veces a la vez.
- **Fundir áreas por nombre al importar**, descartado arriba con su motivo.

## Capabilities

### New Capabilities

Ninguna. Todo el export/import de las otras tres aplicaciones vive en `data-portability` y no en la spec de cada una; esta sigue el mismo reparto.

### Modified Capabilities

- `data-portability`: se añaden exportar un área de enlaces e importar un área de enlaces —con la identidad nueva, el parte de descartados y el aviso de lo que el fichero contiene—, y se corrige el requisito de que un documento equivocado se nombre por lo que es, que hoy habla de tres aplicaciones y de seis combinaciones cuando ya son cuatro y doce. El `Purpose` de la capability también está caducado: enumera roadmaps, temas y decisiones, y hace un change que cubre además contratos y biblioteca.
- `hub-shell`: una acción del topbar puede devolver un aviso neutro, que la barra presenta sin confundirlo con el error de una importación rechazada.
- `local-persistence`: la frase que declara el export/import como mecanismo de copia de seguridad se matiza para Links Hub, cuyo documento es un área y no el catálogo.

### Sin cambios

- `links-hub`: no cambia nada de lo que un área o un enlace son, ni de cómo se crean, se abren o se personalizan. Un enlace importado es un enlace, y esa capability ya dice qué es uno.
- `theming`: los colores viajan como posiciones de paleta porque así se guardan ya, por la decisión de que el color de un enlace sigue al tema. Un área exportada en tema claro e importada en tema oscuro sale recoloreada y correcta, sin conversión y sin que esta capability tenga que enterarse. Es el rendimiento de aquella decisión, no una modificación de ella.
- `hub-landing`: la tarjeta no cambia. Las aperturas no viajan en el documento —son de quien exportó, no de quien recibe—, así que un enlace importado llega con historial limpio, que es la verdad.
- `roadmap-editor`, `decisions`, `api-contracts`, `blockers`, `completion`, `timeline-config`, `web-distribution`: intactas.

## Impact

**Aplicación**

- `src/lib/links/io.ts`: nuevo. `exportArea` y `parseAreaImport`, con la misma forma que `decisions/io.ts` y `api/library/io.ts`: el documento se declara suyo, el rechazo nombra la aplicación a la que un fichero ajeno pertenece de verdad, y la identidad se reasigna al entrar. La lectura de un enlace no se repite aquí: es `normalize`, la misma función que usa la carga, que es lo que hace importable mañana un documento exportado hoy.
- `src/lib/links/io.test.ts`: nuevo. Ciclo completo, documento ajeno, documento de otra aplicación, dos importaciones seguidas, parte de descartados.
- `src/lib/links/store.svelte.ts`: `importArea`, que añade el área con sus enlaces y la deja activa.

**Contenedor**

- `src/lib/hub/documents.ts`: la rama `tech-lead-hub/links` en `ownerOf`, y el comentario de cabecera, que cuenta seis combinaciones equivocadas cuando ya son doce.
- `src/lib/hub/types.ts`: `AppAction.run` pasa a poder devolver una frase. Compatible con lo que hay: no devolver nada es lo que hacen hoy las siete acciones existentes.
- `src/lib/components/Topbar.svelte`: el carril del aviso, en el hueco donde ya vive `guardado ✓` y con su misma tinta atenuada, para que no se confunda con el error.
- `src/lib/hub/registry.ts`: `linksActions()` pasa de una acción a tres, con el mismo reparto que Roadmaps: crear, importar, exportar. Exportar se deshabilita sin área abierta, igual que se deshabilita sin roadmap activo.

**Reutilizado sin tocar**

- `hub/download.ts`, que ya sabe entregar un JSON y revocar su URL.
- `normalize()` de `links/model.ts`, que ya descarta lo ilegible y ya adopta huérfanos.
- `util/id.ts`, para la identidad nueva.

**Sin impacto**

- El formato almacenado ni la clave `links:appdata:v1`. El documento lleva su propia versión, independiente de la del almacén, como los otros tres.
- Las dependencias: sigue sin haber ninguna en tiempo de ejecución.
