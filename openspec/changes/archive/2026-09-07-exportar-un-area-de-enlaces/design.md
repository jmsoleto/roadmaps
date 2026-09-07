## Context

Esta es la cuarta vez que se escribe un export/import en este repositorio, y la primera en la que no hay casi nada que inventar. `hub/download.ts` ya entrega un fichero y revoca su URL. `hub/documents.ts` ya reconoce a quién pertenece un JSON. `Topbar.svelte` ya tiene un único input de fichero al que apunta la acción que lo pidió. `decisions/io.ts` y `api/library/io.ts` ya fijaron la forma: un sobre que se declara suyo, un rechazo que nombra la aplicación de verdad, e identidad reasignada a la entrada. Este change es en gran medida el ejercicio de esa forma por cuarta vez.

Lo que sí es propio de Links Hub son tres cosas, y las tres tiran en la misma dirección:

- **El modelo ya guarda los colores como posiciones de paleta**, por la decisión de que el color de un enlace sigue al tema. Roadmaps tiene una requirement entera para convertir colores absolutos al importar; aquí no hay conversión que hacer.
- **`normalize()` ya existe y ya es tolerante**, porque la carga de esta aplicación no puede fallar. El importador no tiene que volver a decidir qué es un enlace legible.
- **El documento es un área**, y un área no tiene nada a lo que apuntar. Decisions remapea opciones, recomendaciones y resoluciones; API Hub remapea referencias a modelos dentro de árboles. Aquí no hay integridad referencial: hay una lista.

La consecuencia es que el trabajo real de este change no está en `links/io.ts`, que es el fichero más corto de los cuatro. Está en el carril de aviso del topbar, que es contrato del contenedor, y en la cuarta entrada de `documents.ts`, que es deuda que ya estaba.

Ver `proposal.md` para el porqué y `specs/` para los requisitos.

## Goals / Non-Goals

**Goals:**

- Que el documento se lea con la misma función que lee el almacén, para que un fichero exportado hoy siga entrando dentro de dos versiones.
- Que el carril de aviso sirva a las cuatro aplicaciones y no solo a esta, y que no obligue a ninguna a usarlo.
- Que ningún rechazo diga «no es válido» cuando puede decir de quién es.

**Non-Goals:**

- Un documento de catálogo. Se decide su forma cuando se escriba, no ahora.
- Adoptar el carril de aviso en Decisions, Roadmaps o API Hub. El contrato queda disponible; usarlo es de cada una.
- Tocar el formato ni la clave del almacén. El documento lleva su propia versión.

## Decisions

### D1 — El documento no lleva ids, y los enlaces no llevan área

El área viaja con su nombre; los enlaces, con lo suyo. Ningún `id` en ninguno de los dos, y ningún `areaId` en un enlace.

Los ids se reasignan al entrar —lo exige la requirement de importar dos veces— así que llevarlos sería llevarlos para tirarlos, y encima invitaría a que alguien confiase en ellos. El `areaId` sobra por construcción: un documento es un área, así que la pertenencia de cada enlace ya está dicha por estar en el fichero. Efecto lateral que vale la pena: **no se puede escribir a mano un fichero de dos áreas por accidente**, porque el formato no tiene dónde ponerlas.

```json
{
  "kind": "tech-lead-hub/links",
  "version": 1,
  "exportedAt": "2026-09-06T04:12:00.000Z",
  "area": { "name": "Pagos" },
  "links": [
    { "name": "Grafana checkout", "description": "latencia p99",
      "url": "https://…", "monogram": "GC", "from": 2, "to": 5, "wide": true }
  ]
}
```

**Alternativa descartada:** llevar los ids «por si acaso», como hace el documento de decisiones. Allí tienen función —`normalizeDecision` los exige y hay referencias internas que resolver— y aquí no la tendrían.

### D2 — La lectura del documento es `normalize()`, con ids provisionales sellados antes

`normalize()` exige un `id` en cada área y en cada enlace, y con razón: en la carga, una entrada sin id significa que el almacén está corrupto. En la importación no significa nada —el documento nunca los trajo, por D1— así que el importador sella ids provisionales, llama a `normalize({ areas: [área], links })` y reasigna identidad definitiva después.

Es literalmente lo que hace `withProvisionalIds` en `decisions/io.ts`, y por el mismo motivo. Lo que se compra es que las reglas de qué es un enlace legible —nombre no vacío, URL absoluta `http`/`https`, monograma sin emoji, slots dentro de la paleta— existan en **un** sitio. El día que cambie una, el documento exportado con la regla vieja sigue entrando sin que este fichero se entere.

```
enlaces-pagos.json
  │
  ├─ JSON.parse ················· falla → «El archivo no es un JSON válido.»
  ├─ ownerOf() ·················· otra app → «Esto es un documento de Roadmaps, no de esta aplicación.»
  ├─ kind !== tech-lead-hub/links → «El archivo no es un documento de enlaces.»
  ├─ !Array.isArray(links) ······ → «El documento no contiene enlaces.»
  │                                          ↑ estricto en el sobre: no entra nada
  ├─ sellar ids provisionales
  ├─ normalize({ areas:[área], links })
  │     caen: sin nombre · URL no http(s) · id repetido
  │                                          ↑ tolerante dentro: entra el resto
  ├─ uid('area') + uid('link') ·············· dos importaciones = dos áreas
  │
  └→ { area, links, descartados: n }  →  store.importArea()  →  área activa
```

**Alternativa descartada:** un lector propio del importador, más estricto que el de la carga, que rechace el documento entero si un enlace está roto. Suena más limpio y es peor: obliga a mantener dos definiciones de «enlace legible» y convierte un fichero con una URL mal pegada en un fichero inservible.

### D3 — El parte de descartados viaja por un carril nuevo del topbar, y el carril es genérico

El topbar sabe pintar exactamente una cosa: la frase de una acción que lanzó, en rojo, durante cuatro segundos. No hay dónde decir «7 enlaces importados, 2 descartados» sin que parezca que algo falló.

La firma de la acción pasa a poder devolver una frase:

```ts
run: (text: string) => void   →   run: (text: string) => string | void
```

Lo devuelto se pinta atenuado, con la tinta de `guardado ✓`, y se retira solo. No devolver nada es lo que hacen hoy las siete acciones existentes, así que el cambio es compatible sin tocarlas.

Genérico y no propio de Links Hub por el mismo argumento que hizo nacer `documents.ts` y `download.ts`: es el cuarto sitio donde haría falta. Decisions importa un número de decisiones y no lo dice; API Hub importa una biblioteca y no lo dice. Meterlo en `linksUi` sería el cuarto invento del mismo mensaje, y el primero que además no se vería en la barra donde el usuario acaba de pulsar.

**Alternativa descartada:** reutilizar el hueco rojo con un tono distinto según el caso. Ahorra una línea de contrato y gasta la distinción que hace útil al rojo — el usuario que ve rojo a veces por cosas que salieron bien deja de leer el rojo.

### D4 — El aviso de qué contiene el fichero va al exportar, no antes

Un área de guardia es un mapa de la infraestructura interna. El change anterior dejó comprometido decirlo «donde se exporta», y hay dos sitios donde cabe: una confirmación antes de descargar, o el aviso del carril de D3 después.

Va después. El carril ya está pagado por D3, la frase llega en el momento en que el usuario tiene el fichero delante y va a decidir qué hacer con él, y la aplicación entera está construida sobre no ponerse en medio: un modal delante de una descarga es exactamente el gesto que esta aplicación existe para no tener.

**Riesgo asumido, y es real:** el aviso llega con el fichero ya bajado. Si lo que se quisiera evitar es la descarga misma, esto no lo evita. Se acepta porque lo que hay que evitar no es descargar —es adjuntarlo sin pensar— y eso pasa después del aviso, no antes.

### D5 — Importar añade un área nueva aunque el nombre coincida

Las cuatro importaciones existentes añaden, y tres specs distintas tienen ya el escenario de importar dos veces. Fundir por nombre sería la excepción, y una excepción cara: mete enlaces dentro de un área que el usuario no ha abierto, y deshacerlo son tantos gestos como enlaces entraron. Deshacer un área de más es un gesto.

Ninguna de las dos rompe la memoria de las teclas `1`–`9`, porque las dos añaden al final. Ese era el argumento que parecía decidir y no decide.

**Alternativa descartada:** preguntar. La biblioteca de modelos de API Hub sí avisa antes de reemplazar una entrada con el mismo nombre, pero allí reemplazar es el desenlace natural —una biblioteca compartida converge— y aquí no hay nada que converja: dos personas con un área «Pagos» tienen dos áreas «Pagos» distintas.

### D6 — El área importada queda activa

`store.importArea()` la deja abierta, igual que `addArea()` deja activa la que se acaba de crear.

Es la prueba visible de que la importación ocurrió, en la única aplicación del contenedor cuya pantalla entera es «la unidad abierta». Un import que no cambia nada en pantalla y solo deja una línea de texto en la barra es indistinguible de uno que no hizo nada.

### D7 — `enlaces-<área>.json`, saneado

Prefijo que dice de qué aplicación es —«enlaces»—, sufijo que dice de qué área. El nombre del área se sanea con la misma regla que ya usa el export de Roadmaps (`/[^\w.-]+/g → _`).

Tres exportaciones seguidas dejan `enlaces-pagos.json`, `enlaces-infra.json` y `enlaces-terceros.json`. Con `enlaces.json` a secas dejarían `enlaces.json`, `enlaces (2).json` y `enlaces (3).json`, y averiguar cuál era Pagos exige abrirlos.

### D8 — `documents.ts` reconoce `tech-lead-hub/links` en este change y no en el siguiente

La requirement modificada lo dice ahora explícitamente: una aplicación que estrena documento queda reconocida por las demás **en el mismo cambio**. Un formato que unas aplicaciones reconocen y otras no es peor que uno que no reconoce nadie, porque el mensaje que recibes depende de por dónde entres — y eso es indepurable para quien lo sufre.

Coste: una rama de una línea. El comentario de cabecera del fichero, que cuenta seis combinaciones equivocadas, pasa a contar doce.

## Risks / Trade-offs

- **El aviso de contenido llega tarde por diseño (D4)** → Se acepta con su motivo escrito arriba. Si la práctica demuestra que hace falta antes, la requirement de `data-portability` que prohíbe la confirmación previa es lo único que hay que cambiar; el carril y el resto siguen valiendo.

- **`links/io.ts` depende de la tolerancia de `normalize()` (D2)** → Si alguien endurece `normalize()` para la carga, endurece la importación sin darse cuenta. Mitigación: los tests de `io.test.ts` cubren el caso del enlace descartado y el del documento sin ninguno legible, así que un endurecimiento que rompa la importación rompe una prueba con nombre.

- **`AppAction.run` cambia de firma (D3)** → Es ampliación, no ruptura: `=> void` sigue satisfaciendo `=> string | void`. Las siete acciones existentes compilan sin tocarse. El riesgo real es de disciplina —que alguien devuelva una frase donde debería lanzar un error— y lo acota la requirement de `hub-shell` que exige que se distingan.

- **Sigue sin haber respaldo del catálogo entero** → Es lo que dice ahora `local-persistence`, en vez de prometer lo contrario. Un usuario con seis áreas que quiera copia hace seis ficheros. Es peor que un botón, y es mejor que una spec que miente.

- **Un enlace importado pierde su historial de aperturas** → Deliberado, y es la verdad: llegó la ficha, no llegó la guardia. Mismo argumento que la ficha de un adjunto de Decisions que viaja sin sus bytes.

## Migration Plan

No hay migración. El formato almacenado no cambia, la clave `links:appdata:v1` no cambia, y la base IndexedDB no sube de versión. Un usuario que no exporte ni importe no nota nada salvo dos botones más en la barra de Links Hub.

Marcha atrás: quitar las dos acciones de `linksActions()`. Los documentos ya exportados quedan huérfanos, que es la misma marcha atrás que tendría cualquiera de las otras tres.
