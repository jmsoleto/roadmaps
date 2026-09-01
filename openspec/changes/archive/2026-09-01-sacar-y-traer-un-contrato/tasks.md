## 1. La identidad sale del store

- [x] 1.1 `api/model/identity.ts`: `reissueIds(contract)` sale de `store.svelte.ts` — y con él `reissueNodeIds`, que duplicar un endpoint y duplicar un modelo también usan. Son la misma preocupación: reemitir identidad, con o sin remapeo de modelos
- [x] 1.2 `duplicateContract` pasa a llamarla desde allí. Comprobar que sus tests siguen pasando **antes** de que aparezca el segundo llamador
- [x] 1.3 Tests propios de la función: reemite modelos, nodos, endpoints, params y respuestas, y remapea `ref` e `itemRef` a los modelos del contrato copiado

## 2. Reconocer de quién es un documento

- [x] 2.1 `hub/documents.ts`: dado un JSON ya parseado, de qué aplicación es, o de ninguna — D5
- [x] 2.2 Reconoce los tres formatos y el heredado de Roadmaps. **Reconoce, no parsea**: decide el dueño y nada más
- [x] 2.3 Vive en `hub/` porque ninguna aplicación puede ser la dueña de una tabla sobre las otras — D5
- [x] 2.4 Tests: los cuatro formatos, y un JSON que no es de nadie

## 3. El documento de contrato

- [x] 3.1 `api/io.ts`: `exportContract(contract)` → JSON con `kind`, `version`, `exportedAt` y el contrato
- [x] 3.2 Fuera `view`; el `colorSlot` viaja si lo trae — D4
- [x] 3.3 `parseContractImport(text, fallbackSlot)`: todo o nada, identidad nueva, y el slot por el lugar de llegada cuando el documento no trae ninguno — D4, D6
- [x] 3.4 El rechazo nombra la aplicación dueña consultando `hub/documents.ts`
- [x] 3.5 Reutiliza `normalizeApiData` para leer el contrato, en vez de escribir una segunda lectura que se separe de la del almacén
- [x] 3.6 Tests: ciclo completo, importar dos veces, referencias que resuelven dentro del importado, documento ajeno, JSON inválido, slot por posición

## 4. El store y la pantalla

- [x] 4.1 `importContract(text)` en el store: añade, nunca reemplaza, y se niega con el almacén no disponible
- [x] 4.2 **Decidido: se abre.** Roadmaps hace lo mismo con un roadmap importado, y pedir un fichero y que no pase nada visible obliga a buscarlo en la lista
- [x] 4.3 `ExportDialog`: quinta pestaña «Contrato JSON», con su nombre de fichero y su nota — D2
- [x] 4.4 La acción `↓ importar` en el registro de API Hub, del tipo `file` que ya existe — D3
- [x] 4.5 Las tres declaran una acción de fichero `↓ importar` que acepta JSON, leídas del registro real en la página

## 5. Las otras dos aplicaciones

- [x] 5.1 `decisions/io.ts`: el rechazo nombra la aplicación dueña, contratos incluidos
- [x] 5.2 `io/portability.ts`: lo mismo para Roadmaps
- [x] 5.3 Que un JSON de nadie siga diciendo que no se reconoce, sin atribuirlo a ninguna aplicación
- [x] 5.4 Que los tests de importación de las dos sigan pasando

## 6. Verificación

- [x] 6.1 Exportar un contrato con modelos, borrarlo, importarlo y comprobar que vuelve entero
- [x] 6.2 Que el OpenAPI del contrato importado describe la misma API que el del original
- [x] 6.3 Importar dos veces y editar uno sin que el otro cambie
- [x] 6.4 Y arreglado lo que solo se ve leyéndolo: decía «un documento de API», que en español suena a sustantivo común. Pasa a usar el nombre completo, «API Hub»
- [x] 6.5 Meter un contrato en Roadmaps y en Decisions y ver lo mismo
- [x] 6.6 Meter un JSON cualquiera y ver que no se lo atribuye a nadie
- [x] 6.7 **Cerrado por fin, y en las tres.** Ejecutando la acción de fichero de cada aplicación tal y como el input se la entrega: la decisión y el roadmap importados aparecieron en los datos reales y sobrevivieron a la recarga. Lo único que sigue sin conducirse es el selector nativo del sistema, que va del clic al `run(text)`
- [x] 6.8 `npm run check`, `npm run lint` y `npm run test` en verde
