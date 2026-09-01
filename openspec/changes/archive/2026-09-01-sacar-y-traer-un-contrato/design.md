## Context

Este es el tercer intercambio que se escribe en el repo, y el más simple de los tres. La comparación explica por qué:

```
  Roadmaps    el roadmap  +  responsables  +  dependencias externas
              └─ hay que fusionar dos catálogos y podar las asignaciones
                 que no resuelvan tras la fusión

  Decisions   las decisiones  +  manifiesto de adjuntos
              └─ los bytes viven fuera del documento; una ficha sin bytes
                 es un estado normal al llegar

  API Hub     el contrato
              └─ y ya
```

Un contrato es autocontenido **por construcción**. Fue la decisión del primer change —definir el documento entero desde el principio— y los modelos viven dentro de él desde el cuarto. Así que exportar es serializar, y no hay ninguna de las dos complicaciones que tienen los otros dos.

Lo que sí hay que hacer bien es la identidad. Y resulta que ya está hecha.

## Goals / Non-Goals

**Goals:**

- Que un contrato pueda salir de este navegador y volver, o llegar a otro.
- Que importar dos veces dé dos contratos, no uno pisado.
- Que meter el fichero equivocado en la aplicación equivocada se corrija en un segundo, en las tres aplicaciones.
- Que «exportar» siga significando una sola cosa.

**Non-Goals:**

- Importar un OpenAPI ajeno, que es el R15 y es parsear un documento que no ha escrito esta herramienta.
- Fusionar el contrato importado con alguno de los que ya están.
- La biblioteca, que es el change siguiente y se apoya en esto.

## Decisions

### D1 — Importar es duplicar desde un fichero, así que es la misma función

`duplicateContract` ya reemite todos los identificadores de un contrato —modelos, nodos de cada árbol, endpoints, parámetros, respuestas— y remapea las referencias internas para que la copia apunte a sus propios modelos. Es exactamente lo que hay que hacerle a un contrato que llega de fuera.

Así que `reissueIds` sale de `store.svelte.ts` a un módulo propio y lo usan los dos. No es aseo: si importar escribiera su propia reemisión, el día que los modelos ganen otro campo con una referencia dentro —lo cual pasará, porque el PRD tiene `oneOf` en P2— una de las dos se actualizaría y la otra no, y el fallo sería un contrato importado que apunta en silencio a los modelos de otro.

### D2 — «Exportar» es una sola cosa, y el JSON es su quinta pestaña

Añadir una segunda acción llamada «exportar» al topbar sería tener dos cosas distintas con la misma palabra, y a mitad de una reunión eso se elige mal.

El diálogo pasa a tener cinco salidas del mismo contrato: **cuatro para quien lo consume** —OpenAPI en dos formatos, los ejemplos, el briefing— y **una para volver**. Lo que se elige sigue siendo el formato, no la operación.

Una consecuencia que conviene tener escrita: el aviso del validador vive encima de las pestañas y también se ve sobre esta. Es correcto —lo que se está guardando es un contrato con problemas— pero la copia de seguridad de un contrato a medias sigue siendo una copia perfectamente válida, así que el aviso ahí informa y desde luego no impide nada.

### D3 — Importar se empareja con exportar en el topbar

`↓ importar` junto a `↑ exportar`, que es donde están en Roadmaps y en Decisions. Las tres barras pasan a leerse igual: crear, traer, sacar.

No hace falta nada nuevo para ello. El armazón declara desde el primer change un tipo de acción `file` que abre el único input oculto del topbar y entrega el texto; se escribió entonces precisamente para no dejarle un caso especial a la tercera aplicación.

### D4 — Qué NO viaja en el documento

| | Viaja | Por qué |
| --- | --- | --- |
| Título, versión, descripción, servidor | ✓ | es el contrato |
| Modelos, endpoints, árboles, comentarios | ✓ | es el contrato |
| `colorSlot` | ✓, si lo trae | es identidad del contrato, no su sitio en una lista |
| `view` —qué se estaba editando | ✗ | es de quien exportó, no de quien recibe |
| `openId` —qué contrato estaba abierto | ✗ | no es del contrato, es de la aplicación |
| La biblioteca | ✗ | es otro documento, y es el change siguiente |

El `colorSlot` sigue la regla que Roadmaps ya fijó: se respeta el que traiga el documento, y si no trae ninguno se le da el que le toque **por su lugar de llegada**. Dentro de un documento la posición es siempre cero y no dice nada.

### D5 — Un documento del hub se identifica antes de leerse

Los tres formatos se reconocen por lo que declaran de sí mismos:

```
  { "format": "roadmaps.v1", "roadmap": … }        Roadmaps
  { "kind": "tech-lead-hub/decisions", … }         Decisions
  { "kind": "tech-lead-hub/api-contract", … }      API Hub
  { "rows": [ … ] }                                Roadmaps, formato heredado
```

Un módulo del contenedor mira un JSON y dice de qué aplicación es, o de ninguna. Cada importador lo consulta antes de rechazar, y así el mensaje nombra la aplicación de verdad en lugar de decir «no es el mío».

Vive en `hub/` y no en ninguna aplicación porque **ninguna puede ser la dueña**: la respuesta que necesita Decisions es sobre documentos de las otras dos. Que cada importador conociera los formatos ajenos sería tres copias de la misma tabla, y con la cuarta aplicación serían cuatro.

Lo que ese módulo hace es **reconocer, no parsear**. Decide de quién es el documento; leerlo sigue siendo cosa de su dueño.

### D6 — Añadir, nunca reemplazar

Como los otros dos. Un import que sustituyera lo que hay sería irreversible y no hay servidor del que volver.

Y todo o nada: un documento que se rompe a la mitad no deja medio contrato dentro. Es fácil aquí, porque el contrato se construye entero en memoria antes de tocar el documento — el mismo patrón que el pegado de JSON.

## Risks / Trade-offs

- **`reissueIds` pasa a tener dos llamadores.** Es el objetivo, pero significa que un fallo ahí ahora rompe dos cosas en vez de una. A cambio, deja de poder haber dos comportamientos distintos para el mismo problema, que es el fallo peor y más callado.
- **Tocar el rechazo de Roadmaps y de Decisions** es modificar dos aplicaciones que funcionan por una mejora de mensaje. Está acotado a la rama de error de sus importadores y sus tests ya cubren el caso de documento ajeno.
- **La quinta pestaña cambia un poco lo que el diálogo es.** Era «el contrato para quien lo consume» y pasa a ser «el contrato saliendo». Es la lectura que el propio nombre del diálogo ya admitía.

## Open Questions

- **Si el nombre del fichero debería llevar la versión de la API.** Hoy sería `catalogo-contrato.json`; con la versión dentro, dos copias de momentos distintos no se pisan en la carpeta de descargas. Se decide viendo un par de ellas.
- **Si importar debería abrir el contrato importado.** Roadmaps lo hace —el importado pasa a ser el activo—. Aquí abrirlo interrumpe lo que estuvieras editando; no abrirlo obliga a buscarlo en la lista. Me inclino por abrirlo, que es lo que hace la otra, pero no lo tengo claro.
