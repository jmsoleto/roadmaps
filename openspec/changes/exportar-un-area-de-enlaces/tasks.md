## 1. El carril de aviso del contenedor

Va primero porque es contrato: `links/io.ts` no puede informar de descartados hasta que exista dónde decirlo.

- [x] 1.1 `hub/types.ts`: `AppAction.run` de ambos tipos pasa a `=> string | void` — D3. Verificar que `npx tsc --noEmit` pasa sin tocar ninguna de las siete acciones existentes, que es lo que demuestra que la ampliación es compatible
- [x] 1.2 `Topbar.svelte`: recoger lo devuelto por `action.run()` en un estado `notice`, pintarlo en el hueco donde vive `guardado ✓` con `--text-dim`, y retirarlo solo. Verificar visualmente que no se confunde con `.import-error`, que sigue en `--danger`
- [x] 1.3 `Topbar.svelte`: limpiar `notice` y `importError` al cambiar de aplicación, para que un aviso no sobreviva a la barra que lo produjo — escenario «El aviso no sobrevive al cambio de aplicación»
- [x] 1.4 **Punto de verificación**: ejecutar una acción existente que no devuelve nada (importar decisiones) y comprobar que no aparece ningún aviso. Si aparece uno vacío, la comprobación de 1.2 está mirando la verdad y no la ausencia

## 2. Reconocer el documento en el contenedor

- [x] 2.1 `hub/documents.ts`: `DocumentOwner` gana `LINKS_ID` y `ownerOf()` la rama `doc.kind === 'tech-lead-hub/links'` — D8
- [x] 2.2 `hub/documents.ts`: el comentario de cabecera cuenta doce combinaciones equivocadas y no seis, que es lo que hay con cuatro aplicaciones
- [x] 2.3 `documents.test.ts`: un documento de enlaces se atribuye a Links Hub, y `foreignDocumentMessage` de un documento de enlaces contra Roadmaps, Decisions y API Hub devuelve la frase que nombra a Links Hub — escenario «Un área de enlaces en otra aplicación»

## 3. El documento y su lectura

- [x] 3.1 `links/io.ts`: `exportArea(area, links): string` con el sobre `kind: 'tech-lead-hub/links'`, `version: 1`, `exportedAt`, `area: { name }` y los enlaces sin `id` ni `areaId` — D1. Verificar con un test que el JSON generado no contiene la cadena `"id"` ni `"areaId"`
- [x] 3.2 `links/io.ts`: `AREA_FILENAME(name)` → `enlaces-<área>.json`, saneando con la misma regla que el export de Roadmaps (`/[^\w.-]+/g → _`) — D7. Test con un nombre con espacios y acentos
- [x] 3.3 `links/io.ts`: el sobre de entrada — `JSON.parse` fallido, `foreignDocumentMessage`, `kind` distinto, `links` que no es array. Cada uno lanza `ImportError` con su frase. Test por rama, cuatro mensajes distintos
- [x] 3.4 `links/io.ts`: sellar ids provisionales sobre el área y cada enlace, llamar a `normalize({ areas: [área], links })` y reasignar identidad con `uid()` — D2. Verificar que dos llamadas seguidas sobre el mismo texto devuelven ids distintos
- [x] 3.5 `links/io.ts`: `parseAreaImport` devuelve además cuántos enlaces se descartaron —la diferencia entre los del documento y los que sobreviven a `normalize`— y lanza cuando no sobrevive ninguno. Test con un documento de tres enlaces donde uno no tiene URL válida y otro no tiene nombre: entra uno, descartados dos

## 4. La entrada al store

- [x] 4.1 `links/store.svelte.ts`: `importArea(area, links)` añade el área con sus enlaces al final de ambas listas, la deja activa, limpia el foco y programa el guardado — D6
- [x] 4.2 Test: importar dos veces el mismo documento deja dos áreas, y renombrar una no toca a la otra — escenario «Importar dos veces»
- [x] 4.3 Test: importar un área cuyo nombre ya existe no altera los enlaces de la que estaba — escenario «Un nombre que ya existe»

## 5. Las acciones en la barra

- [x] 5.1 `hub/registry.ts`: `linksActions()` gana `↓ importar` (kind `file`, accept JSON) que llama a `parseAreaImport` + `links.importArea` y **devuelve** el parte de descartados — D3
- [x] 5.2 `hub/registry.ts`: `linksActions()` gana `↑ exportar`, deshabilitada con `!links.activeArea`, que descarga el área abierta y **devuelve** el aviso de que el fichero lleva las direcciones internas — D4
- [x] 5.3 `registry.test.ts`: con un área abierta las tres acciones están presentes y exportar está habilitada; sin área abierta, exportar está deshabilitada — escenario «Sin área abierta no hay nada que exportar»

## 6. Verificación de extremo a extremo

- [x] 6.1 Ciclo completo en el navegador: crear un área con varios enlaces de tamaños y colores distintos, exportar, borrar el área, importar el fichero, y comprobar que la rejilla vuelve idéntica en orden, monogramas, colores y tamaños — escenario «El ciclo completo»
- [x] 6.2 Exportar bajo el tema oscuro e importar bajo uno claro de distinta paleta: los botones salen con los colores del tema de destino y cada enlace conserva su posición en la paleta — escenario «Los colores se traen al tema de destino». Esta es la prueba de que guardar slots y no hexadecimales valía
- [x] 6.3 Meter el fichero de enlaces en Roadmaps, en Decisions y en API Hub: las tres lo rechazan nombrando a Links Hub. Y meter en Links Hub un roadmap, unas decisiones, un contrato y una biblioteca: los cuatro se rechazan nombrando su aplicación — escenarios de «Un documento equivocado se nombra por lo que es»
- [x] 6.4 Editar a mano un fichero exportado para romper la URL de un enlace, importarlo, y comprobar que el resto entra y la barra dice cuántos se descartaron — escenario «Un enlace con la dirección rota»
- [x] 6.5 `npm test` y `npx tsc --noEmit` en verde, y `npm run build` sin avisos nuevos

## 7. Cerrar el change

- [x] 7.1 `openspec validate exportar-un-area-de-enlaces --strict` en verde
- [x] 7.2 `openspec archive exportar-un-area-de-enlaces`. Sin sincronizar las deltas a mano antes: el comando las aplica él mismo y sincronizarlas lo hace fallar con `already exists`
- [x] 7.3 **Después de archivar**, actualizar a mano el `## Purpose` de `openspec/specs/data-portability/spec.md`, que enumera roadmaps, temas y decisiones e ignora contratos, biblioteca y enlaces. Los deltas no tocan el Purpose de una capability existente, y hacerlo antes se perdería al reconstruir la spec
