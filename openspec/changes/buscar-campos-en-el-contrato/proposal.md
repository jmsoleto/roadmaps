## Why

En un contrato de verdad, el mismo dato aparece en muchos sitios: `codigoCliente` está en la petición de un endpoint, en la respuesta de otro, en un parámetro de consulta y dentro de un modelo. Hoy, para saber dónde, hay que abrir los endpoints uno a uno y desplegar los árboles a mano. Y en mitad de un refinamiento, cuando alguien pregunta «¿dónde más usamos esto?» o «¿esto ya lo teníamos con otro nombre?», nadie hace eso: se responde de memoria.

Las grafías empeoran el problema. Un mismo dato se escribe `codigo_cliente` en un endpoint y `codigoCliente` en otro, y la diferencia solo se ve si alguien busca las dos.

Y el único «buscar referencias» que ya existe, el «Usado en» de un modelo, nombra los sitios pero no deja ir a ellos.

## What Changes

- **Un buscador de campos en la columna del contrato.** Busca en el contrato abierto y filtra en vivo mientras se escribe. Mientras tenga texto, ocupa el lugar de las listas de endpoints y modelos; al vaciarlo, las listas vuelven.
- **La comparación ignora la grafía.** No distingue tildes, mayúsculas, guiones bajos, guiones ni espacios, y busca por «contiene». `codigo cliente` encuentra `codigoCliente`, `codigo_cliente` y `CodigoClienteOrigen`. Es lo que se pregunta en voz alta: dónde está este dato, no dónde está esta cadena exacta.
- **Se busca en**:
  - las claves de los campos de los cuerpos de petición, de respuesta y de los modelos;
  - los nombres de los parámetros (consulta, ruta y cabecera) y los marcadores de la ruta aunque no estén declarados;
  - las descripciones de campos y parámetros.
- **Cada resultado dice dónde y por qué ha coincidido.** Dice dónde está (`GET /pedidos/{id} · 200`, `· consulta`, `modelo Cliente`), la ruta del campo dentro del cuerpo (`data.cliente.email`) y su tipo. Si la coincidencia está en la descripción, enseña el fragmento de texto: sin él, un resultado que coincide por el comentario parecería un error.
- **Las referencias no se siguen.** Un campo que vive en un modelo sale una vez, en el modelo, aunque cinco endpoints lo referencien. Para ir del modelo a quien lo usa ya está «Usado en», que pasa a navegar (siguiente punto).
- **«Usado en» pasa a ser una lista de enlaces.** Cada sitio que usa un modelo abre el endpoint o el modelo correspondiente y lleva hasta el campo que lo referencia.
- **Ir a un resultado lleva hasta el campo.** Abre el endpoint o el modelo, despliega los campos que lo contienen si estaban plegados y resalta el campo un momento. Los resultados siguen a la vista para poder recorrerlos uno detrás de otro.
- **⌘K / Ctrl+K lleva el foco al buscador** desde cualquier sitio de API Hub, también desde dentro de un campo. Esc lo vacía y devuelve el foco a donde estaba.

Un efecto que conviene declarar antes de verlo: **saltar a un resultado despliega campos que alguien plegó a propósito**, y ese plegado se guarda como preferencia de cada persona. Al volver, esos campos siguen desplegados. Se acepta: un campo que no se ve no se ha encontrado.

Fuera de alcance:

- **Buscar en varios contratos a la vez.** Encontrar el mismo dato en todas las APIs y destapar tipos que no casan es otro cambio, con su propia pregunta sobre dónde vive la interfaz.
- **Buscar en la biblioteca de modelos**, en las fuentes de valores del mock o en los ejemplos escritos.
- **Comparación difusa** (`codCliente` para `codigoCliente`). Mete más ruido que aciertos en un árbol de nombres cortos.
- **Seguir las referencias**: listar como resultado los endpoints que contienen un campo solo a través de un modelo (decisión tomada al explorar el cambio).
- **Buscar en la ruta, el resumen o la descripción de un endpoint.** Para eso ya está su lista. El buscador encuentra variables, no endpoints.

## Capabilities

### New Capabilities

Ninguna. El buscador forma parte de editar un contrato, no es una aplicación aparte.

### Modified Capabilities

- `api-contracts`: entran tres requisitos y cambia uno.
  - **Nuevo** «Buscar un campo en el contrato abierto»: qué se busca, cómo se compara y qué dice cada resultado.
  - **Nuevo** «Ir a un resultado lleva hasta el campo»: abrir, desplegar, resaltar, y que los resultados sigan a la vista.
  - **Nuevo** «El buscador se alcanza con el teclado»: ⌘K / Ctrl+K y Esc.
  - **Modificado** «Saber quién usa un modelo antes de tocarlo»: los sitios nombrados pasan a ser enlaces que llevan hasta el campo que referencia al modelo.

### Sin cambios

- `local-persistence`, `data-portability`, `folder-persistence`: no cambia nada de lo que se guarda en el contrato. Lo único que se escribe al buscar es el plegado, que ya era una preferencia de cada persona y sigue siéndolo.
- `hub-shell`, `hub-landing`, `theming`: el atajo vive dentro de API Hub, y el resaltado usa los colores que ya existen.

## Impact

- `src/lib/api/model/`: un módulo nuevo y puro con la búsqueda. Normaliza, recorre lo que ya recorre `contractBodies` más los parámetros y los marcadores de la ruta, y devuelve los resultados con su destino, su ruta, su tipo y su motivo. Se prueba sin interfaz.
- `src/lib/api/model/models.ts`: `ContractBody` y `usesOf` pasan a llevar el destino navegable (endpoint o modelo, y el campo que referencia), además del texto `where` que ya llevaban.
- `src/lib/api/store.svelte.ts`: una operación nueva que, dado un resultado, abre su vista y quita del plegado a los campos que contienen al buscado.
- `src/lib/api/ui.svelte.ts`: el texto de la búsqueda y el campo por resaltar. Son estado de la sesión, como `focusing`: recargar no debe devolver una búsqueda a medias.
- `src/lib/components/api/ContractRail.svelte`: la caja de búsqueda y la lista de resultados, en el sitio de las dos listas mientras haya texto.
- `src/lib/components/api/TreeNode.svelte` y la fila de parámetro de `EndpointEditor.svelte`: aparecer en pantalla cuando se les pide (desplazarse hasta ellos) y resaltarse un momento.
- `src/lib/components/api/ModelEditor.svelte`: «Usado en» con enlaces.
- `src/lib/components/api/ApiApp.svelte`: el atajo ⌘K / Ctrl+K.
- Tests: los de la búsqueda pura, los de `usesOf` con su destino, y los del store para el despliegue de ancestros.
