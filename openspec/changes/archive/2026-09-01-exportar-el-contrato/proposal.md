## Why

El contrato ya se puede describir, pero está atrapado en el navegador. Nadie fuera de la pantalla puede leerlo: ni quien lo implementa, ni el agente de codificación, que es el consumidor no humano para el que se diseñó todo esto.

Eso es lo que cierra la fase 1 del PRD. Con la exportación, salir de un refinamiento significa salir con un OpenAPI válido en la mano en lugar de con la promesa de escribirlo luego —que es el momento exacto en que hoy se pierde el matiz y se acaba abriendo el Word.

Y hace falta la otra mitad: **saber si lo que se va a entregar es coherente antes de entregarlo**. Una clave duplicada o un endpoint sin respuestas no se ven leyendo un árbol, se ven en integración dos semanas después.

## What Changes

- **Cuatro salidas, con copiar y descargar en todas**: OpenAPI 3.0.3 en **YAML**, el mismo en **JSON**, los **ejemplos JSON** del endpoint abierto, y un **briefing en Markdown** legible por una persona.
- **El emisor de YAML es propio**, sin dependencias. Es lo que mantiene el proyecto en cero dependencias de ejecución, y un subconjunto de YAML es mucho más pequeño que la especificación entera.
- **Los marcadores de la ruta se emiten como parámetros de path obligatorios** aunque nadie los haya declarado, que es lo que la pantalla ya anuncia desde el change anterior.
- **Toda respuesta sale con descripción**, tomando una por defecto según su código cuando no se escribió ninguna: `description` es obligatoria en OpenAPI y un 404 sin describir haría inválido el documento entero.
- **Un validador que se muestra en el propio panel de exportación y no bloquea**: rutas que no empiezan por `/`, endpoints sin respuestas, claves duplicadas dentro de un mismo objeto, campos sin nombre y cuerpos sin ningún campo. Se ve lo que está mal y se exporta igual, porque a mitad de una reunión un contrato incompleto sigue siendo mejor que ninguno.
- **Los avisos llegan a la tarjeta del hub.** El resumen de API Hub prometía desde su primer change que «los aportará el validador cuando exista»: ahora existe.

Fuera de alcance, y es el change siguiente:

- **Los modelos reutilizables.** Sin ellos no hay `components/schemas` que emitir, ni `$ref` que resolver, ni el `allOf` que el PRD razona para no perder el comentario sobre una referencia. El exportador **contempla los tres** desde ya —son casos que hoy no se pueden producir, no casos que no existan— pero el documento que sale de aquí describe sus objetos en línea.
- Con ellos quedan fuera cuatro comprobaciones del validador: referencias a modelos inexistentes, arrays de un modelo inexistente, colisión de nombres de schema al normalizar a PascalCase, y modelos huérfanos.

Fuera de alcance, sin fecha:

- **Importar o comparar un OpenAPI existente.** El diff contra un contrato ya publicado es P1 en el PRD y tiene su propio change.
- **Mock server, cliente HTTP y generación de código.** Son no objetivos del PRD: la herramienta produce el contrato, ejecutarlo es otro problema y generar código es justo lo que hace el agente al recibirlo.
- **OpenAPI 3.1.** 3.0.3 es lo que digieren bien los generadores y los agentes de hoy.

## Capabilities

### Modified Capabilities

- `api-contracts`: el contrato se puede sacar de la aplicación en cuatro formatos, se comprueba su coherencia antes de entregarlo, y lo que el validador encuentra llega a la tarjeta del hub, que lo tenía prometido.

### Sin cambios

- `hub-landing`: el contrato de la tarjeta no cambia. Que API Hub pase de aportar cero avisos a aportar los suyos es exactamente lo que ese contrato ya contemplaba.
- `local-persistence`: exportar no escribe nada. Es una lectura del documento que ya está guardado.
- `data-portability`: sigue sin haber import/export **del proyecto** en el formato propio de la aplicación, que es lo que esa capability cubre. Lo de aquí es una salida hacia un formato de terceros, en una sola dirección y sin vuelta.
- `hub-shell`: exportar es una acción de la aplicación abierta y se declara en el registro como las demás.

## Impact

**Lógica pura, con su test al lado**

- `src/lib/api/openapi.ts`: árbol → schema de OpenAPI, y contrato → documento completo. Incluye el `prune` que quita lo vacío, el `operationId` derivado de la ruta, la mezcla de parámetros declarados con los marcadores de la ruta, y la descripción por defecto de cada respuesta.
- `src/lib/api/yaml.ts`: emisor propio del subconjunto de YAML que hace falta, con el entrecomillado de lo que sería ambiguo sin comillas.
- `src/lib/api/brief.ts`: el briefing en Markdown.
- `src/lib/api/validate.ts`: las comprobaciones, cada una con el sitio donde ocurre.

Sigue siendo la mayor parte del change y no necesita montar un componente para probarse.

**Interfaz**

- `src/lib/components/api/ExportDialog.svelte`: las cuatro salidas en pestañas, con copiar, descargar y los avisos del validador siempre a la vista.
- Una acción de exportar en el topbar de API Hub, que hasta ahora solo declaraba «+ nuevo contrato».

**Resumen del hub**

- `src/lib/api/summary.ts`: los avisos dejan de ser una lista vacía.

**Sin impacto**

- El modelo de datos y el almacén: exportar solo lee.
- Roadmaps, Decisions y el armazón.
- Las dependencias: ni un emisor de YAML de terceros, ni un validador de OpenAPI.
