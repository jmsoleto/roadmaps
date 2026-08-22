## Why

Las dos primeras fases preparan; la tercera es donde la aplicación se gana el sueldo. Es el único momento en que la pantalla la mira alguien que no es el tech lead, y ese alguien tiene que decidir en la reunión, no llevarse el asunto a pensar.

Hoy esa fase no existe como pantalla. Una decisión lista para presentar se enseña en el mismo panel de estudio, que está lleno de material de trabajo —la duda técnica, la nota interna, los campos a medio rellenar— y que es ilegible a metro y medio de distancia.

Y hay algo que solo se resuelve con gráficos. La matriz criterio a criterio es excelente para pensar y mala para decidir en voz alta: obliga a leer dieciocho celdas para contestar *"¿qué me llevo por lo que cuesta?"*. Un punto en un plano contesta eso de un vistazo, que es exactamente lo que el change anterior dejó preparado al tipar los criterios.

## What Changes

- **Modo presentación a pantalla completa**, para una decisión que está en la fase 3. Fuera la lista, fuera los filtros, fuera la interfaz de estudio.
- **Solo se enseña lo que se puede enseñar.** La pregunta a negocio, las alternativas y sus criterios. El texto técnico de origen, la nota interna y el motivo de la recomendación **no se pintan nunca** en este modo.
- **Dos gráficos, no los cuatro del boceto**:
  - **Esfuerzo frente a beneficio**, que contesta "qué me llevo por lo que cuesta".
  - **Cuándo lo tendría el cliente**, que contesta "y cuándo".

  Las barras de coste repiten un eje que el primero ya lleva, y el radar es el más caro de construir y el más difícil de leer para quien no lo ha visto antes. Si en uso real se echan de menos, se añaden con su propio change.
- **Los gráficos dibujan lo que hay y dicen lo que falta.** Una alternativa sin cuantificar no se pinta en el origen: se declara aparte, con su nombre, para que nadie la lea como "cuesta cero".
- **La decisión se toma en la reunión**: elegir una alternativa o escribir una respuesta que no era ninguna, y cerrar.
- **Acta de lo que pasó**: qué se decidió, cuándo y quién decidía. **Sin firma**: en una aplicación local sin cuentas, una firma no acredita nada ante nadie, y aparentar una garantía que no existe es peor que no ofrecerla.
- **Los gráficos se dibujan en SVG, sin librería.** La aplicación no tiene ni una dependencia de ejecución y no la va a estrenar por dos gráficos.

Fuera de alcance:

- El gráfico de barras de coste y el radar criterio a criterio.
- Enseñar los adjuntos durante la presentación. Son apoyo del estudio; qué se proyecta de ellos merece verse con la fase 3 ya en uso.
- Exportar la presentación a PDF o a diapositivas.
- Dictado, que es el change siguiente.

## Capabilities

### Modified Capabilities

- `decisions`: aparece el modo de presentación, con qué muestra y qué no, los dos gráficos y su degradación cuando faltan magnitudes, y el acta que queda al cerrar.

### Sin cambios

- `local-persistence`: el acta se guarda en la resolución que ya existe, más quién decidía, que ya es un campo de la decisión.
- `data-portability`: nada nuevo que exportar.
- `hub-landing` y `hub-shell`: la presentación es una vista dentro de Decisions.

## Impact

**Interfaz**

- Nuevo: la vista de presentación y los dos gráficos, en SVG propio.
- `DecisionsApp.svelte`: la presentación releva a la pantalla de estudio cuando se entra en ella.
- `DecisionDetail.svelte`: desde la fase 3 se ofrece presentar.

**Modelo**

- Ninguno nuevo. Los gráficos leen los valores que los criterios ya tienen, y el acta sale de la resolución y del responsable de negocio.

**Sin impacto**

- Roadmaps, el almacén, y el ciclo de vida de una decisión.
