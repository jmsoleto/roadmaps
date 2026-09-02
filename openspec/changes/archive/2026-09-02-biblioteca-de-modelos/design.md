## Context

Este es el último change del PRD, y llega con casi todo lo que necesita ya puesto por decisiones anteriores:

```
  change 1   el almacén `apiLibrary`, creado y vacío       "se elige por donde acaba"
  change 4   `modelDependencies`, escrito directo          "la biblioteca lo necesitará entero"
  change 4   `reissueIds` remapeando referencias           duplicar un contrato
  change 5   ese reemisor sacado a su propio módulo        importar es duplicar
  change 5   el patrón de documento propio                 kind, versión, identidad nueva
```

Ninguna de esas cinco se tomó pensando en este change; todas se tomaron porque eran correctas en su momento. Que ahora encajen es lo que hace que aquí no haya que migrar nada ni reescribir nada.

Lo que sí es nuevo es un problema que no ha aparecido antes: **fusionar dos conjuntos de modelos que pueden llamarse igual**.

## Goals / Non-Goals

**Goals:**

- Que un `Paginacion` escrito una vez se use en la siguiente API sin volver a teclearlo.
- Que traer un modelo no deje nunca una referencia rota.
- Que la colisión de nombres —que es el caso interesante, no el borde— se decida y no se esconda.
- Que la biblioteca pueda salir del navegador, porque si no, no converge nada entre personas.

**Non-Goals:**

- Enlace vivo entre contratos. Es decisión del PRD y sigue siendo correcta: ver D2.
- Versionar una entrada. Guardar reemplaza.
- Detectar bloques idénticos ya escritos y ofrecer unificarlos. Buena idea, change entero.
- Una biblioteca común al contenedor: ni Roadmaps ni Decisions tienen nada que hacer con un schema.

## Decisions

### D1 — Se guarda un bundle, no un modelo

Guardar `ItemProducto` guarda también todo lo que necesita para significar algo:

```
   ItemProducto ──ref──▶ Paginacion ──ref──▶ Moneda

   entrada de la biblioteca: los tres
```

`modelDependencies` se vuelve transitivo, con el conjunto de visitados que ya se usa para cortar la recursión en el ejemplo — un modelo que se referencia a sí mismo se guarda una vez y no cuelga nada.

La alternativa —una biblioteca plana de modelos sueltos, y resolver las dependencias al traer— parece más simple y no lo es: obliga a decidir qué pasa cuando la dependencia que falta también colisiona, y a hacerlo dos niveles por debajo de donde el usuario está mirando.

**Y se dice qué se lleva.** Guardar un modelo y que aparezcan tres en la biblioteca sin avisar es un efecto invisible, y los efectos invisibles son los que hacen que la gente deje de fiarse de un botón.

### D2 — Copia, nunca enlace, y no es una limitación temporal

La tentación es evidente: si el `Paginacion` de la biblioteca cambia, que cambie en los cinco contratos que lo usan. Y es exactamente lo que no se puede ofrecer sin backend.

Un enlace vivo obliga a responder qué pasa cuando dos contratos han cambiado el mismo modelo compartido, y esa pregunta no tiene respuesta local: hace falta versionar, detectar el conflicto y resolverlo, que es un servidor. Un enlace que en realidad es «el último que guardó gana, en silencio» es peor que una copia que se sabe copia.

Así que traer copia. Y por eso la colisión de nombres es un problema de verdad y no un detalle: es el único momento en que las dos versiones se miran a la cara.

### D3 — La colisión se decide, y solo cuando la hay

El prototipo renombra a `Paginacion2` sin preguntar. Eso produce **la divergencia que la biblioteca existe para evitar**, y la produce sin que nadie la decida. Reutilizar en silencio es el error simétrico: cambia lo que el bloque traído describía.

```
   Traer «ItemProducto»
   trae también: Paginacion

   ⚠ Ya tienes un modelo llamado Paginacion
     ( ) el tuyo — 3 campos          (•) el de la biblioteca — 4 campos, como Paginacion2
```

Una línea por modelo que colisiona, dos salidas, y **algo de cada uno para poder elegir**. El recuento de campos no es un diff, y no pretende serlo: es lo mínimo que distingue «son el mismo» de «no lo son» sin abrir una pantalla de comparación en mitad de un refinamiento.

Sin colisión no hay pregunta. Traer es un clic, que es el caso normal.

Por defecto, **reutilizar el que ya está**: es lo que la biblioteca persigue. Pero por defecto en un control visible, no por omisión invisible.

### D4 — La fusión es una función pura, y es la pieza con aristas

`bringBundle(contract, bundle, decisiones)` devuelve los modelos a añadir y el remapeo de referencias. Nada de esto toca el store, y por eso se puede probar la matriz entera —colisión y no colisión, reutilizar y traer aparte, dependencia que colisiona pero el modelo pedido no— sin montar un componente.

El remapeo es lo delicado: un modelo traído apunta a los identificadores **de la biblioteca**, y cada uno tiene que acabar apuntando o a su copia recién creada, o al modelo del contrato que se decidió reutilizar. Una sola tabla de traducción, construida antes de insertar nada.

### D5 — La biblioteca tiene su propio store, y no se reescribe con el contrato

Está en su propio almacén desde el primer change por una razón que ahora se cobra: el documento de contratos se reescribe **entero** en cada guardado, y con la biblioteca dentro, escribir una letra en un campo reescribiría todos los modelos guardados.

Así que un store aparte, con su propio `flush`. Y como el de contratos: carga de tres desenlaces y mutaciones que se niegan si el almacén no abrió.

Su carga va **al lado** del arranque, no dentro, por el mismo motivo que las otras dos: un almacén colgado no puede impedir que monte el contenedor.

### D6 — El nombre es la clave de la biblioteca

Dos entradas llamadas `Paginacion` no tienen sentido en una biblioteca cuyo objetivo es que todos usen el mismo `Paginacion`. Así que guardar sobre un nombre que ya está reemplaza, avisando.

Es lo contrario de lo que decidimos para los contratos, donde dos pueden llamarse igual porque el título es un nombre para reconocerlos y no una clave. Aquí el nombre **es** el acuerdo: es lo que dos squads comparten.

### D7 — Exportar la biblioteca sigue el patrón del contrato

Mismo `kind`/`version`/`exportedAt`, mismo rechazo que nombra la aplicación dueña, misma reasignación de identidad al entrar. `hub/documents.ts` gana un formato más, y con él la respuesta a «intentar importar una biblioteca donde va un contrato».

Importar **añade**, y una entrada cuyo nombre ya está se resuelve como al guardar: avisando. Es la misma pregunta y merece la misma respuesta.

## Risks / Trade-offs

- **La pantalla de colisiones es un paso más en caliente.** Se acota a que solo aparezca cuando hay colisión, que en el caso normal es nunca. Si resulta que colisiona siempre —porque todo el mundo llama `Paginacion` a lo mismo, que es el éxito de la herramienta— habrá que revisar si «reutilizar» merece ser un clic todavía más corto.
- **El recuento de campos puede engañar.** Dos `Paginacion` de tres campos pueden ser distintos. Es una ayuda, no una garantía, y la spec dice «algo que permita distinguirlos», no «la diferencia».
- **Un cuarto almacén con estado propio** en una aplicación que ya tiene contratos, interfaz y biblioteca. Es el precio de que guardar un modelo no reescriba todos los contratos.
- **La biblioteca no cuenta en la tarjeta del hub.** Deliberado: un modelo guardado no es trabajo pendiente, y las tres cifras hablan de lo que hay por hacer.

## Open Questions

- **Si guardar debería ofrecer también actualizar la entrada desde el contrato.** Hoy guardar reemplaza. La pregunta es si merece decir «tu `Paginacion` y el de la biblioteca ya no coinciden» cuando abres el modelo, y eso empieza a parecerse a versionar sin serlo.
- ~~**Si la biblioteca debería sembrarse con algo.**~~ **Decidido: arranca vacía.** Se llena con lo que se acuerde de verdad en un refinamiento, no con lo que alguien supuso que se acordaría. Y una biblioteca sembrada tiene el problema de que nadie sabe cuáles de sus entradas están vivas.
