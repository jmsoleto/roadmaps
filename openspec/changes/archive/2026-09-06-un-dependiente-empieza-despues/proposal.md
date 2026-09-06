## Why

Un item que depende de otro puede empezar el mismo día en que su predecesor sigue trabajando. `getMinStart` devuelve la fecha de fin del predecesor tal cual, y bajo la convención de fin inclusivo —el último día es un día ocupado— eso es un día de solape que la herramienta autoriza y quien planifica no ve.

El cambio de la carga de sprint lo destapó y lo dejó anotado a propósito: corregirlo mueve fechas, y eso es una decisión de producto y no un arreglo de paso.

Debajo hay algo peor. Ninguna spec dice cuándo puede empezar un dependiente. La regla nunca se escribió, y por eso el cambio de convención no tenía nada que desmentir.

## What Changes

- **Un dependiente empieza el siguiente día laborable al último de su predecesor.** Hoy `getMinStart` devuelve el fin del predecesor; pasa a devolver el día siguiente, y el desplazamiento automático que ya existe lo salta al lunes cuando cae en fin de semana, como ya hace.
- **La regla se escribe.** `roadmap-editor` gana el requisito que le faltaba: cuál es el arranque más temprano de un dependiente y que el sistema desplaza hacia delante lo que no lo cumpla. Que la regla viviera solo en el código es la razón de que sobreviviera al cambio de convención, y escribirla es la mitad del valor de este change.
- **Un hito se rige por la misma regla.** Un dependiente de un hito arranca al día siguiente, no el mismo día. El hito ocupa su columna desde que el fin es inclusivo, y darle un trato aparte reintroduciría por el otro lado la ambigüedad que este cambio cierra.
- **El límite del arrastre se corrige solo**, porque el Gantt ya pregunta por `getMinStart` para saber hasta dónde dejar arrastrar un dependiente. Deja de poder soltarse encima del último día del predecesor.
- **Ningún dato se reescribe al cargar.** No hay migración, ni pase de normalización, ni nada que toque un roadmap por el hecho de abrirlo.

Fuera de alcance:

- **Un desfase configurable entre predecesor y dependiente** —el *lag* de las herramientas de planificación, «B empieza tres días después de A»—. Hoy la única relación es fin-a-inicio sin holgura, y añadir un número por dependencia es un modelo nuevo, no una corrección.
- **Los otros tres tipos de relación** (inicio-a-inicio, fin-a-fin, inicio-a-fin). La herramienta solo ha tenido nunca fin-a-inicio y este change no lo cambia.
- **Avisar de los solapes que ya existen en un roadmap guardado.** Ver el impacto: se corrigen al editar, por el mecanismo que ya existe, y montar un aviso para algo que se arregla solo sería ruido.

## Capabilities

### Modified Capabilities

- `roadmap-editor`: se escribe por primera vez cuándo puede empezar un item que depende de otro, y que el sistema desplaza hacia delante los que no lo cumplan. El requisito de dependencias existente solo hablaba de la flecha.

### Sin cambios

- `completion`: su `## Purpose` ya menciona el desplazamiento automático y sigue siendo cierto. Lo congelado se sigue saltando en la cascada, y el argumento por el que ese salto nunca es determinante —los predecesores de un completado están completados, luego congelados— no depende de cuánto separe a un dependiente de su predecesor.
- `timeline-config`: el salto de fin de semana ya está escrito allí y este change lo usa tal cual, sin tocarlo.
- `blockers`: una dependencia externa nunca toca el calendario. Esto es de `dependsOn`, que es la otra cosa.
- `local-persistence`: no hay formato nuevo ni normalización nueva. Un documento exportado antes y después de este change es el mismo documento.

## Impact

**El cálculo**

- `src/lib/model/constraints.ts`: `getMinStart` devuelve el día siguiente al fin del predecesor. Es una línea, y es todo el arreglo.
- `src/lib/model/constraints.test.ts`: dos tests fijan hoy el comportamiento equivocado —`getMinStart` de un predecesor que acaba el 30 devuelve el 30— y pasan a fijar el correcto. Ese es el sitio donde se ve que esto era un defecto y no una preferencia.

**Lo que se mueve, y cuándo**

- `enforceConstraints` ya se ejecuta en cada edición de fechas o de dependencias, nunca al cargar. Un roadmap con un solape guardado no cambia por abrirlo: cambia la primera vez que se toca una fecha de esa fase, que es exactamente el contrato que la cascada ya tenía. Este change no le da permisos nuevos, corrige lo que hace cumplir.
- La consecuencia sí hay que decirla: en esa primera edición, una cadena de dependencias se desplaza un día por eslabón. Un plan con línea base fijada mostrará esa desviación. No es desviación nueva —el solape estaba ahí— es desviación que por fin se mide.

**La pantalla**

- `Gantt.svelte` no se toca. Consulta `getMinStart` para el tope del arrastre y hereda la corrección.

**Sin impacto**

- El modelo de datos, la exportación y la importación.
- Las otras tres aplicaciones del contenedor.
