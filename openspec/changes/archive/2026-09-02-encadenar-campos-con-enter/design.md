## Context

Ver `proposal.md — Why` para el motivo. Cuatro hechos del código mandan sobre el resto.

**El primero: Enter está libre y el hueco es exactamente el que hace falta.** Una fila del árbol no está dentro de un `<form>`, así que Enter en la caja de la clave hoy no dispara nada. No hay que quitarle la tecla a nadie.

**El segundo: ya hay dos verbos para crear un campo, y el que falta es un tercero.**

```
                 QUÉ CREA              DÓNDE LO PONE
  addChild       campo nuevo, string   al FINAL del padre
  duplicateNode  copia con hijos       JUSTO DEBAJO del original
  ────────────────────────────────────────────────────────────
  Enter          campo nuevo, mismo    JUSTO DEBAJO del original
                 tipo
```

Toma el contenido de uno y la posición del otro. No es un parámetro de `addChild`: es un método suyo.

Y `tree.ts` ya había separado las dos claves que corresponden a esos dos contenidos, con la distinción escrita en su comentario: `uniqueKey` numera (`campo`, `campo2`) *«para un campo que se **añade**»*, `copyKey` sufija (`direccion_copia`) porque *«en mitad de un refinamiento, `direccion2` se lee como una segunda dirección y `direccion_copia` como trabajo en curso»*. El verbo nuevo cae del lado de `uniqueKey`.

**El tercero: el árbol tiene un componente por fila; los parámetros, no.**

```
  ÁRBOL                              PARÁMETROS
  TreeNode.svelte  (recursivo)       EndpointEditor.svelte  (474 líneas)
   └ es dueño de su <input>           └ {#each params}  ← el <input> es de un each
                                                          en línea, de nadie
```

Es toda la diferencia de coste entre los dos sitios del cambio, y la única decisión de fontanería que aparece por incluir los parámetros.

**El cuarto: los métodos de crear ya devuelven lo creado, y ese retorno hoy solo lo usan los tests.** `addChild` y `duplicateNode` devuelven `ApiNode | null` y ningún componente lo mira (`TreeNode.svelte:166`, `:170`). La costura para «y ahora enfoca esto» estaba puesta desde el principio; este cambio es su primer cliente.

## Goals / Non-Goals

**Goals:**

- Que describir diez campos cueste diez nombres y ningún viaje al ratón.
- Que el foco lo decida la interfaz y no el store: el store se sigue probando sin navegador, como todo lo demás de la aplicación.
- Que el árbol y los parámetros compartan **un** mecanismo de foco, no dos parecidos.
- Que un objeto siga naciendo de una sola manera en toda la aplicación.

**Non-Goals:**

- Pilotar el árbol entero a teclado (Tab entre filas, flechas para navegar). Es la continuación natural y es una capacidad aparte.
- Reordenar `EndpointEditor`. El cambio se apoya en cómo está hoy; partirlo es trabajo de otro día.
- Deshacer. La aplicación no tiene, y este cambio no es motivo para estrenarlo.

## Decisions

### D1 — Dos métodos nuevos en el store, no un parámetro de los que hay

`addSiblingAfter(nodeId): ApiNode | null` y `addParamAfter(endpointId, paramId): ApiParam | null`.

Ambos pasan por `structural`, con lo que heredan gratis las dos invariantes del store: nada se muta con el almacén no disponible, y todo lo que muta programa el guardado. Y ambos devuelven lo creado, siguiendo a `addChild` y `duplicateNode`.

Ambos devuelven `null` cuando no hay sobre qué encadenar. El caso real es la **raíz de un cuerpo**: no tiene padre ni hermanos, así que no se le puede añadir un hermano. Desde la interfaz no puede ocurrir —la raíz vive en la barra de `TreeBlock` y no tiene caja de clave— pero el método debe ser total igualmente, porque el store se prueba directamente.

*Alternativa descartada*: `addChild(parentId, afterId?)`. Habría dado un método con dos comportamientos y una firma que no dice cuál es cuál, y habría obligado al llamante a subir al padre para pedir algo sobre el hijo.

### D2 — El store crea, el componente enfoca

El store no sabe qué es el foco. Devuelve el elemento creado; quien encadenó coge su id y lo deja apuntado en `apiUi`.

Es la misma línea que ya separa `store.svelte.ts` de `ui.svelte.ts`, escrita en la cabecera de esta última: *«lo que merece persistirse va al store; lo transitorio vive aquí»*. Un id de foco es lo más transitorio que hay — recargar la página y aterrizar en un foco pendiente sería un bug, no una función.

Beneficio concreto: las dos operaciones nuevas se prueban en `store.svelte.test.ts` como todas las demás, sin montar un componente. La aplicación no tiene pruebas de componente y este cambio no las introduce.

### D3 — Un solo id de foco pendiente, para los dos sitios

Un campo en `apiUi` con el id de aquello cuya caja de nombre debe recibir el foco. Sirve para nodos y para parámetros sin distinguirlos, porque los identificadores ya son únicos en toda la aplicación (`uid('nod')`, `uid('par')`). Se consume una vez y se limpia.

*Alternativa descartada*: pasar un `autofocus` como prop. `TreeNode` es recursivo, así que la prop tendría que bajar por todos los niveles hasta la fila que la necesita, y `EndpointEditor` necesitaría la suya aparte. Dos mecanismos para una idea.

*Alternativa descartada*: buscar el elemento en el DOM tras el `tick`. No es ajeno a la casa —los tres diálogos usan `querySelectorAll` para su trampa de foco— pero ahí se busca *cualquier* elemento enfocable dentro de un panel, y aquí se busca **uno concreto** que un componente ya tiene en la mano.

### D4 — `TreeNode` se enfoca solo; los parámetros, con un mapa

En el árbol, cada fila hace `bind:this` de su caja de clave y tiene un efecto que la enfoca cuando el id apuntado es el suyo. Es el patrón que la aplicación ya usa para el campo de contrato nuevo (`ApiApp.svelte:50`), y el `select()` de propina hace que la clave provisional se pueda sobreescribir escribiendo, sin borrarla antes.

En los parámetros no hay componente por fila, así que `EndpointEditor` guarda `bind:this` en un mapa por id de parámetro y tiene **un** efecto para toda la lista.

*Alternativa descartada*: extraer `ParamRow.svelte`. Es mejor código —cada fila volvería a poseer su elemento, simétrico con `TreeNode`, y `EndpointEditor` adelgazaría— pero convierte una mejora de usabilidad en una reestructuración. El momento de partir `EndpointEditor` es cuando duela por sí solo, y hoy no duele.

### D5 — El campo nuevo se asienta con `applyType`, no se construye a mano

`newNode(uniqueKey(hermanos), tipoDelOrigen)` y después `applyType`. Con eso, un objeto encadenado recibe su primer hijo y un array queda con `itemType` coherente, sin escribir aquí ninguna regla.

Es la consecuencia de una decisión ya tomada y ya escrita en `coerce.ts`: *«un contenedor con cero hijos no dice nada y cuesta un clic en el peor momento posible»*. Si Enter no la respetara, la aplicación tendría **dos** maneras de nacer un objeto y habría que justificar por qué difieren.

El coste está aceptado y es visible: encadenar desde un objeto pinta dos filas de una pulsación. El caso es raro —encadenar `string` es el 95%— y la alternativa cuesta una incoherencia permanente para arreglar un caso poco frecuente.

Lo que `applyType` deja limpio de propina es justo lo que no debe heredarse: al no copiarse nunca del origen, el campo nuevo llega sin comentario, sin ejemplo, sin enumeración, sin formato y sin `ref`.

Los parámetros no tienen `applyType` ni lo necesitan: son planos. `newParam()` y se le fijan `in` y `type` del origen.

### D6 — Solo la caja de la clave, y solo Enter pelado

Reclamar Enter en el comentario o en el ejemplo sería igual de barato y no está claro que sea igual de correcto: escribiendo un comentario largo, Enter se parece más a un salto de línea que a «siguiente campo». Se empieza por donde el gesto es inequívoco.

Enter con Shift, Meta o Ctrl no hace nada, para dejar libre la lectura «campo hijo, no hermano» por si aparece.

Se llama a `preventDefault()` aunque hoy no haya nada que prevenir: es la guarda para el día en que alguien envuelva la fila en un `<form>`.

Se ignora el Enter que llega con `isComposing` activo. Con teclado español los acentos son teclas muertas y no composición, así que en la práctica no cambia nada; es una guarda de una palabra para quien escriba con otro método de entrada.

## Risks / Trade-offs

**El efecto que lee el id de foco también lo limpia** → Escribir el estado que el propio efecto acaba de leer lo hace volver a correr. No es un bucle —la segunda vuelta lee `null` y no hace nada— pero la limpieza va dentro de `untrack`, como ya hace `TreeNode` para sembrar su caja de enumeración.

**Una pulsación de Enter mantenida repite** → El autorepetido del teclado crearía una tirada de campos. Se acepta: pasa lo mismo con cualquier botón mantenido con Intro, cada campo se quita con una `✕`, y ponerle freno significaría inventar un concepto de «campo sin tocar» que en esta aplicación no existe, porque un campo nuevo nunca llega vacío sino llamado `campo2`.

**Encadenar desde un objeto pinta dos filas** → Consecuencia aceptada de D5, explicada allí.

**El campo nuevo puede caer fuera de la pantalla** → No hace falta hacer nada: el navegador desplaza hasta el elemento que recibe el foco.

**`EndpointEditor` engorda** → El mapa y su efecto son unas seis líneas en un archivo de 474. Es el precio consciente de no extraer `ParamRow` (D4), y queda anotado como la primera razón concreta para hacerlo cuando llegue el momento.

**Sin plan de migración** → No lo necesita. No hay campo nuevo en `ApiNode` ni en `ApiParam`, así que no hay pase de normalización, ni puerta de importación que tocar, ni documento guardado que se lea distinto. Un campo nacido de un Enter es indistinguible de uno nacido de un `+`, también al exportar.
