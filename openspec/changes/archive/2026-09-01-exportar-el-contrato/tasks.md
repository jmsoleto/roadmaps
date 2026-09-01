## 1. El emisor de YAML

- [x] 1.1 `api/yaml.ts`: objetos, arrays, cadenas, números y booleanos. Nada más — D1
- [x] 1.2 El entrecomillado: vacío, espacios al principio o al final, `:` `#` y demás indicadores, saltos de línea, lo que parezca número, y `true`/`false`/`null`/`yes`/`no`/`on`/`off`/`~` en cualquier caja
- [x] 1.3 Arrays de objetos con el guion en la primera línea del elemento, que es donde un emisor ingenuo se rompe
- [x] 1.4 Objetos y arrays vacíos como `{}` y `[]`, no como nada
- [x] 1.5 Tests con tabla de casos ambiguos y **ida y vuelta contra un parser real**. Para eso entra `js-yaml` como **devDependency** —igual que `fake-indexeddb`, que está solo para probar el almacén—: leer lo emitido con un parser que no es el nuestro es la única forma de probar un emisor cuyo fallo es silencioso. Las dependencias de ejecución siguen siendo cero

## 2. El documento OpenAPI

- [x] 2.1 `api/openapi.ts`: `schemaOf(node)` — tipo, formato, enumeración, `nullable`, ejemplo, `description` desde el comentario, y `required` del objeto
- [x] 2.2 El caso `ref` y el `itemType: 'ref'`, con `allOf` cuando la referencia lleva comentario. Hoy no se puede producir; se escribe igual — D2
- [x] 2.3 `prune`: fuera `undefined` y cadena vacía; `false` y `0` se quedan, que son valores — D3
- [x] 2.4 `operationId` derivado del método y la ruta
- [x] 2.5 Parámetros: los declarados más los marcadores de la ruta que nadie declaró, sin duplicar, y los de path siempre obligatorios
- [x] 2.6 Respuestas: descripción por defecto según el código cuando no hay ninguna escrita, y una respuesta de éxito genérica si el endpoint no tiene ninguna
- [x] 2.7 Cuerpos de petición y de respuesta con su schema y su ejemplo
- [x] 2.8 `components/schemas` cuando haya modelos — hoy ausente, escrito igual (D2)
- [x] 2.9 Tests: el comentario llega a `description`, los obligatorios se listan, lo vacío no se emite, los marcadores implícitos salen, ninguna referencia externa

## 3. El briefing y los ejemplos

- [x] 3.1 `api/brief.ts`: la API, sus endpoints, sus parámetros y sus cuerpos campo a campo con comentarios, tipo y si es opcional
- [x] 3.2 Que diga de sí mismo que el OpenAPI adjunto es la fuente de verdad
- [x] 3.3 Los ejemplos JSON del endpoint abierto, cada uno identificado por lo que es, reutilizando `example.ts`
- [x] 3.4 Tests del briefing sobre un contrato con anidamiento

## 4. El validador

- [x] 4.1 `api/validate.ts`: las cinco comprobaciones de D4, cada aviso con el sitio donde ocurre, no solo el texto
- [x] 4.2 Un contrato sin endpoints no produce aviso; un cuerpo declarado y vacío sí — D5
- [x] 4.3 Una sola función, consumida por el panel y por el hub. Dos listas acabarían diciendo cosas distintas — D4
- [x] 4.4 Tests de cada comprobación, y de que un contrato coherente no produce ninguna

## 5. El panel de exportación

- [x] 5.1 `components/api/ExportDialog.svelte`: cuatro pestañas, siguiendo el patrón de `PasteJsonDialog` (trampa de foco, Escape) — D8
- [x] 5.2 Los avisos del validador **encima de las pestañas**, siempre visibles, y el mensaje explícito cuando no hay ninguno — D8
- [x] 5.3 Copiar al portapapeles con confirmación, y descargar con nombre y extensión acordes
- [x] 5.4 **Extraído** a `hub/download.ts` en vez de reutilizado en el sitio: estaba dentro de `registry.ts` y ya iba a haber tres copias de un object URL que hay que revocar. Roadmaps y Decisions pasan a usarlo, y el tipo MIME sale de la extensión
- [x] 5.5 La acción de exportar en el topbar de API Hub, deshabilitada sin contrato abierto
- [x] 5.6 Todo con tokens del tema

## 6. Los avisos en el hub

- [x] 6.1 `api/summary.ts`: un aviso por contrato con problemas, con su nombre y cuántos tiene — D7
- [x] 6.2 Las tres cifras no cambian — D7. Anotar por qué, que la open question del primer change preguntaba lo contrario
- [x] 6.3 Tests: contrato con problemas, contrato vacío que no avisa, contrato coherente que no avisa

## 7. Verificación

- [x] 7.1 Describir un endpoint con anidamiento, exportar a YAML y comprobar a ojo que es OpenAPI plausible
- [x] 7.2 Hecho con `redocly lint --extends=spec` sobre un documento emitido por los módulos reales: **válido**. Encontró un fallo que ningún test mío podía cazar —el ejemplo de un parámetro `integer` se emitía como texto `'1'`, y mi test daba esa salida por buena— y está corregido. Lo que Redocly sigue señalando con su ruleset por defecto son reglas de estilo suyas (exigir `summary`, seguridad, licencia, un 4xx), no incumplimientos de la especificación
- [x] 7.3 Que el comentario de un campo aparece como `description` en las dos salidas
- [x] 7.4 Que una ruta con `{marcadores}` sin declarar sale con sus parámetros de path
- [x] 7.5 Que una respuesta sin descripción sale con la suya por defecto
- [x] 7.6 Que copiar y descargar funcionan en las cuatro pestañas
- [x] 7.7 Que los avisos se ven en el panel y que exportar sigue siendo posible con ellos
- [x] 7.8 Que un contrato con problemas aparece en la tira de avisos del hub, y uno recién creado no
- [x] 7.9 `npm run check`, `npm run lint` y `npm run test` en verde
