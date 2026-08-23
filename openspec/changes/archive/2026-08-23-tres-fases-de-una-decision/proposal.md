## Why

Decisions se construyó alrededor de un ciclo de vida derivado, y eso sigue siendo correcto. Pero se construyó sin nombrar lo que en realidad hace un tech lead con una decisión, que son **tres trabajos distintos en tres momentos distintos**: apuntarla en diez segundos donde surge, estudiarla a solas hasta convertirla en algo que negocio pueda responder, y ponerla delante de negocio para que se decida allí mismo.

La aplicación de hoy los trata como una sola pantalla con más o menos campos rellenos. El resultado es que nada te dice **en qué fase estás ni qué te falta para pasar a la siguiente**, y que la única puerta que existe —plantear— mezcla dos cosas: declarar que el estudio está terminado y ponerla encima de la mesa.

Hay además un problema de fondo con las alternativas. Los tres ejes cualitativos actuales (`coste ↑`, `plazo →`, `riesgo ↓`) dicen la dirección pero no la magnitud, y una conversación con negocio no se sostiene sobre flechas: se sostiene sobre *"140 k€ y catorce semanas frente a 75 k€ y ocho"*. Sin magnitudes no hay nada que enseñar en la fase 3, y la fase 3 es donde esta aplicación se gana el sueldo.

## What Changes

- **Las tres fases pasan a ser explícitas**, con un indicador que dice en cuál está cada decisión y qué falta para cerrarla: `captura` → `estudio y evaluación` → `presentación y decisión`.
- **Una única puerta entre la fase 2 y la 3: "lista para presentar".** Cerrar el estudio es un gesto propio, con su lista de comprobación —la duda traducida, las alternativas evaluadas, la recomendación marcada— y es lo que habilita la fase 3.
- **BREAKING — la recomendación se congela antes que ahora.** Deja de congelarse al plantear y pasa a congelarse al marcar *lista para presentar*. Es más estricto y más fiel a lo que se quería medir: te mojas al declarar terminado el estudio, no al entrar en la sala. `raisedAt` pasa a llamarse `readyAt` y conserva su significado —el instante en que la recomendación dejó de poder discutirse—, así que las decisiones ya guardadas migran sin perder nada.
- **BREAKING — los tres ejes cualitativos se sustituyen por seis criterios tipados.** Esfuerzo, coste, tiempo hasta valor, riesgo, beneficio y deuda que deja. Cada alternativa responde a cada criterio con **un texto siempre y un valor cuando lo hay**: el texto es lo que se lee en voz alta, el valor es lo que un gráfico podrá dibujar. Los ejes actuales migran a texto, conservando lo que dijeran, sin inventar magnitudes que nadie escribió.
- **El sistema sigue sin calcular quién gana.** El requisito que prohibía puntuaciones se **estrecha**, no se revoca: quedan prohibidos el total, el ranking y la recomendación automática; se permite el valor por criterio, que es un dato que tú escribes y no una conclusión que la aplicación deduce.
- **Nota interna de recomendación**, separada de la recomendación misma y marcada como lo que es: no se enseña en la fase 3.
- **Procedencia de la captura**: cuándo se capturó y de dónde salió, y si se tecleó o se dictó. El indicador de dictado se registra desde ya aunque dictar llegue después, para que las decisiones capturadas entretanto no queden sin poder decir cómo entraron.
- **La pregunta a negocio queda marcada como lo único que la fase 3 enseña.** Todo lo demás —el texto técnico, la nota interna, los criterios sin traducir— es material de trabajo.

Fuera de alcance, y son los changes siguientes:

- **Adjuntos**: el "apoyo visual" de la fase 2. Ya estaba acordado como change propio.
- **La vista de presentación y sus gráficos**: la fase 3 completa. Depende de que los criterios de este change existan, y por eso va después.
- **Dictado por voz**: independiente a propósito, porque el audio sale de la máquina hacia un servicio de terceros y esa decisión merece su propio registro.

Fuera de alcance, sin fecha:

- Firma en el acta. Se descarta explícitamente: en una aplicación local sin cuentas una firma no acredita nada ante nadie, y presentarla como si lo hiciera sería peor que no tenerla.
- Cualquier vínculo con Roadmaps.

## Capabilities

### Modified Capabilities

- `decisions`: el ciclo de vida pasa a expresarse en tres fases con una puerta explícita; el punto de congelación de la recomendación se adelanta; las alternativas cambian de modelo de valoración; y aparecen la nota interna y la procedencia de la captura.

### Sin cambios

- `hub-landing` y `hub-shell`: las cifras, la lista y los avisos de Decisions siguen saliendo por el mismo contrato. Las fases cambian qué se cuenta, no cómo se reporta.
- `local-persistence`: el almacén de Decisions no cambia de sitio ni de forma. Sí gana una normalización al cargar, que es el mecanismo que esa capability ya define para los datos que llegan de una versión anterior.
- `data-portability`: el documento de decisiones cambia de contenido, pero no de reglas. Sigue siendo autocontenido, sigue reemitiendo identidad y sigue rechazando los documentos de la otra aplicación.

## Impact

**Modelo**

- `src/lib/decisions/model/types.ts`: `raisedAt` → `readyAt`; `Option.effects` → valoraciones por criterio; nuevos campos para la nota interna y la procedencia de la captura.
- `src/lib/decisions/model/axes.ts` desaparece y lo sustituye un catálogo de criterios con su tipo de valor.
- `src/lib/decisions/model/state.ts`: los estados derivados pasan a expresarse como fases, y la comprobación de "listo para presentar" se une a ellos.

**Migración**

- Normalización al cargar y al importar, con el mismo patrón que `normalizeBlockers` y `normalizeCompletion` en Roadmaps. Las decisiones guardadas con el modelo anterior se leen sin pérdida: el eje pasa a texto, la dirección se conserva en palabras y ningún valor numérico se inventa.

**Interfaz**

- El indicador de fase y el cierre de la fase 2 son nuevos.
- `OptionsEditor.svelte` se reescribe: deja de ser una rejilla de flechas y pasa a ser la matriz criterio a criterio.
- `DecisionDetail.svelte` se reorganiza por fases en lugar de por bloques sueltos.

**Sin impacto**

- Roadmaps, en cualquiera de sus partes.
- El backend de almacenamiento de Decisions: cambia lo que se guarda, no dónde ni cómo.
