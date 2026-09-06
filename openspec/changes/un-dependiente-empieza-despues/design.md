## Context

El cambio de la carga de sprint pasó el fin de una barra de exclusivo a inclusivo: el `endDate` de un item es ahora el último día que ocupa. Aquella conversión recorrió nueve sitios donde vivía la convención vieja y dejó anotado el décimo, que es este.

`getMinStart` toma el fin del predecesor y lo devuelve como arranque mínimo del dependiente. Bajo la convención vieja eso significaba «justo después», porque el fin era el primer día libre. Bajo la nueva significa «el mismo día en que el otro sigue trabajando».

Lo que hace este change algo más que una línea es lo que hay debajo. `roadmap-editor` tiene un requisito de dependencias que habla de la flecha, de dónde arranca y de que un item completado no puede declarar una respecto a uno pendiente. No dice en ninguna parte cuándo puede empezar un dependiente. El desplazamiento automático tampoco está escrito: aparece de pasada en el `## Purpose` de `completion`, como algo que existe, para justificar otra cosa. La regla vivía solo en el código, y por eso el cambio de convención no tenía nada que desmentir y nadie lo revisó.

## Goals / Non-Goals

**Goals:**

- Que un dependiente no pueda solaparse con su predecesor.
- Escribir la regla y el desplazamiento donde se puedan volver a revisar.
- No reescribir ningún plan guardado por el hecho de abrirlo.

**Non-Goals:**

- Un desfase configurable entre predecesor y dependiente.
- Los otros tres tipos de relación entre items.
- Detectar y avisar de los solapes que ya existen en los datos.

## Decisions

### D1 — El arreglo va en `getMinStart` y no en `enforceConstraints`

`getMinStart` responde a «¿cuál es el arranque más temprano de este item?» y `enforceConstraints` a «¿qué muevo para que se cumpla?». La equivocada es la primera, así que se corrige ahí.

No es una preferencia de estilo. `Gantt.svelte` consulta `getMinStart` por su cuenta para saber hasta dónde dejar arrastrar un dependiente; arreglarlo en la cascada dejaría el arrastre permitiendo un solape que la siguiente edición desharía sola, que es la peor de las dos incoherencias posibles —la que el usuario ve hacer y deshacer.

El salto de fin de semana se queda donde está. `enforceConstraints` ya aplica `snapForward` sobre lo que `getMinStart` devuelve, así que `getMinStart` devuelve el día natural siguiente y no se entera del calendario laboral. Meterle el salto sería tener la regla del fin de semana en dos sitios.

### D2 — Un hito se rige por la misma regla

Un hito es un instante, y de ahí sale la tentación de dejar que un dependiente arranque el mismo día: «la release es el viernes, el trabajo que la sigue empieza el viernes».

Se descarta. Desde el fin inclusivo, el rombo de un hito posee su columna igual que una barra posee la suya; ese fue explícitamente uno de los tres puntos que aquel cambio no pudo arreglar sumando uno. Un calendario con granularidad de día no puede sostener a la vez que el hito ocupa el viernes y que el viernes está libre para su dependiente. Y la incoherencia sería visible: dos flechas idénticas en pantalla, una permitiendo el solape y otra no, según el predecesor lleve rombo o barra.

Si algún día hace falta la otra semántica, lo que hace falta es el desfase configurable —un lag de cero contra uno—, no una excepción escondida en `getMinStart`.

### D3 — Sin migración, y sin aviso

Un roadmap guardado con un solape no cambia por abrirlo. `enforceConstraints` corre desde `commit()`, y `commit()` solo lo llaman las ediciones de fechas y de dependencias: nunca la carga. Eso ya era así y se queda así.

De modo que el solape preexistente se corrige la primera vez que se toca una fecha de esa fase. No es un permiso nuevo —la cascada ya movía dependientes en esa misma situación, con el umbral equivocado—; lo que cambia es el umbral, no quién puede mover.

Se consideró un pase de normalización al cargar y se descarta por lo que este repositorio viene sosteniendo: los datos son el plan del usuario, y reescribirlos sin que haya tocado nada es lo que el change anterior se cuidó de no hacer cuando dijo «ninguna fecha guardada cambia». Se consideró también avisar de los solapes existentes, y es peor: un aviso de algo que se arregla solo en cuanto tocas la fase es ruido con fecha de caducidad.

Lo que sí hay que decir es la consecuencia, y va en la propuesta: en esa primera edición una cadena se desplaza un día por eslabón, y un plan con línea base fijada mostrará esa desviación. No es desviación nueva; es desviación que por fin se mide, porque el solape ya estaba.

### D4 — Los tests que había fijaban el error

`constraints.test.ts` afirma hoy que el arranque mínimo tras un predecesor que acaba el 30 de enero es el 30 de enero. No es un test que se rompa: es un test que decía lo que la aplicación hacía mal, escrito cuando eso era correcto.

Se corrige en lugar de añadirle otro al lado, y merece un comentario en el sitio: un test que cambia de valor cuando cambia una convención es la señal que faltó la vez anterior.

## Risks / Trade-offs

- **Un plan se mueve por una edición que no lo pedía.** Arrastras un item y otro de la misma fase salta un día. Es el comportamiento que la cascada siempre tuvo y no es nuevo, pero la primera vez que ocurra tras este change habrá cadenas enteras moviéndose. La alternativa —no cascadear lo preexistente— exigiría distinguir qué solapes son viejos y cuáles nuevos, y eso es un estado que no existe y que habría que inventar.
- **Un item de un día pegado a su predecesor ya no cabe donde cabía.** Con el umbral corregido hay planes apretados que dejan de ser legales, y la aplicación los abrirá tal cual y los moverá al editarlos. Es correcto y va a sorprender.
- **No queda nadie comprobando la convención de fin.** Este era el décimo sitio y el que estaba anotado; nada garantiza que no haya un undécimo. Escribir la regla en la spec es lo único que se puede hacer al respecto desde aquí.

## Open Questions

- **¿Hará falta el desfase configurable?** El caso que lo pediría es «B no puede empezar hasta tres días después de A» —un despliegue con ventana de estabilización—. Hoy se apaña metiendo un item de espera, que además se ve. Si aparece dos veces, es su propio change.
