## Context

La aplicación desplegada ya acertó en lo estructural: el estado se deriva y nunca se guarda (D2 del change anterior), y lo que no debe reescribirse se congela en el instante en que deja de poder discutirse (D3). Este change no toca ninguno de esos dos principios; los aplica a una estructura que no estaba nombrada.

El boceto de diseño (`Tech Lead Hub.dc.html`, pantallas `4a`–`4d`) es la referencia. Conviene saber qué es y qué no: **los cuatro gráficos de la fase 3 están dibujados a mano** —cero plantillas, cero repeticiones, polígonos estáticos—. Enseñan el aspecto al que se aspira; nadie había decidido de qué datos salen. Averiguarlo es el trabajo de este change, y por eso los criterios entran aquí y los gráficos en el siguiente.

Hay un requisito vigente que este change tiene que mirar de frente. La spec de `decisions` dice hoy:

> El sistema MUST NOT calcular puntuaciones, totales ni recomendaciones automáticas a partir de los ejes.

Y el boceto quiere un radar cuyo texto dice *"cuanto más lejos del centro, mejor puntúa esa alternativa en ese criterio"*. Eso hay que resolverlo, no rodearlo (D3 de este documento).

## Goals / Non-Goals

**Goals:**

- Que en cualquier momento se sepa en qué fase está una decisión y qué le falta para pasar a la siguiente.
- Que cerrar el estudio sea un acto deliberado y no la consecuencia de haber rellenado campos.
- Que las alternativas lleven magnitudes cuando existan, porque una conversación con negocio se sostiene sobre cifras y no sobre flechas.
- Que la aplicación siga sin opinar quién gana.
- Que ninguna decisión ya guardada pierda nada al migrar.

**Non-Goals:**

- Los gráficos y la vista de presentación. Son el change siguiente, y dependen de lo que aquí se defina.
- Adjuntos y dictado. Changes propios.
- Firma en el acta. Descartada, y por qué en D7.
- Puntuar automáticamente, ordenar alternativas por bondad o sugerir una recomendación.

## Decisions

### D1 — Tres fases derivadas, con una sola puerta explícita

Las fases se derivan como todo lo demás; lo único que se guarda es el gesto de cerrar el estudio.

```
  question === ''                       →  FASE 1  captura
  hay question, readyAt === null        →  FASE 2  estudio y evaluación
  readyAt !== null, resolution === null →  FASE 3  lista para presentar
  resolution !== null                   →          cerrada
  fase 3 y deadline < hoy               →          caducada
```

Una sola puerta, y deliberadamente en medio: entre la 1 y la 2 no hay gesto —escribir la pregunta a negocio *es* haber entrado en el estudio— y entre la 3 y el cierre tampoco, porque resolver ya es el gesto.

La puerta va donde va porque es la única transición que **no puede inferirse de los datos**. Que haya tres alternativas escritas no significa que hayas terminado de pensar. Declararlo tiene que costar un clic, o no significa nada.

*Qué desaparece:* el estado `planteada` como algo distinto de `lista`. En el modelo nuevo se presenta y se decide en la misma sesión, así que "puesta delante de negocio y esperando" deja de ser un estado que dure. Cuando la reunión acaba sin decisión, la decisión simplemente sigue lista para volver a presentarse, que es la verdad.

### D2 — La recomendación se congela al declararla lista, no al plantearla

El change anterior la congelaba al plantear, y el argumento era que ese es el instante en que te mojas delante de negocio. Con la puerta de D1, ese instante se mueve hacia atrás: te mojas al **declarar terminado el estudio**, antes de entrar en la sala.

Es más estricto, y cierra un hueco que el modelo anterior dejaba abierto: entre terminar el análisis y presentarlo podían pasar días, y en esos días la recomendación seguía siendo editable con la reunión ya convocada.

Por eso `raisedAt` **se renombra a `readyAt` en lugar de añadirse un campo nuevo**: significan lo mismo —el instante en que la recomendación dejó de poder discutirse— y solo cambia dónde cae. Las decisiones guardadas migran con un renombrado, sin pérdida y sin ambigüedad.

### D3 — Seis criterios tipados: siempre texto, valor cuando lo haya

El modelo actual (tres ejes × `sube`/`igual`/`baja` + nota) dice dirección y no dice magnitud. El nuevo:

```
  criterio            tipo de valor          para qué sirve el valor
  ─────────────────────────────────────────────────────────────────
  esfuerzo            semanas + personas     eje X del scatter
  coste               importe                barras
  tiempo hasta valor  fecha                  línea temporal
  riesgo              alto | medio | bajo    color y orden
  beneficio           apreciación 1–5        eje Y del scatter
  deuda que deja      — solo texto           nada, se lee
```

**El texto es obligatorio y el valor opcional.** Es la parte importante del diseño: en la sala se lee la frase —*"conciliación diaria propia: cualquier descuadre es dinero real"*— y el valor solo existe para que un gráfico pueda dibujarlo. Una alternativa que nadie ha cuantificado sigue enseñando lo que se sabe de ella en vez de desaparecer del panel.

**`beneficio` es el único que obliga a puntuar a ojo**, porque no hay ninguna cifra objetiva que lo dé y el scatter necesita un eje Y. Se acepta a sabiendas: es una apreciación declarada por quien prepara, no un cálculo. Que sea 1–5 y no 1–100 es a propósito — una escala fina invita a discutir si algo es un 63 o un 67.

*Alternativa descartada:* deducir el beneficio de los demás criterios. Sería exactamente la puntuación automática que D4 prohíbe, disfrazada.

### D4 — Se estrecha la prohibición de puntuar, no se revoca

El requisito vigente prohíbe "puntuaciones, totales y recomendaciones automáticas". Leído al pie de la letra, prohíbe también el valor por criterio, y con él la fase 3 entera. Pero lo que aquel requisito defendía, y sigue mereciendo defensa, era esto:

> una matriz de criterios con pesos y total calculado […] cuando se rellena, la conversación se va a discutir el número en vez de la decisión

Lo que produce esa patología es el **agregado**: un número único por alternativa que invita a compararlas como si el número fuera la respuesta. Un valor por criterio no lo es — es un dato que tú escribes, del mismo tipo que la frase que va al lado.

Así que la línea se redibuja:

```
  PERMITIDO                        PROHIBIDO
  valor por criterio               total o puntuación global por alternativa
  gráficos que lo dibujan          ordenar alternativas por bondad
  la recomendación, marcada a mano  sugerir cuál recomendar
```

La aplicación sigue sin opinar. Solo dibuja lo que le has dicho.

### D5 — La nota interna vive separada y se marca como no presentable

El boceto pone *"POR QUÉ RECOMIENDO B"* con la coletilla *"Nota interna: no se presenta"*. Es un campo distinto del `why` de la recomendación, y la diferencia importa: el `why` es el argumento que sí dices en voz alta; la nota es lo que piensas y no cuentas —que el equipo A no llega, que el proveedor está de salida—.

Guardarlos juntos garantizaría que un día se proyecte lo que no debía proyectarse. Van separados y el campo lleva escrito lo que es.

### D6 — Migración por normalización al cargar, sin inventar magnitudes

Mismo patrón que `normalizeBlockers` y `normalizeCompletion` ya usan en Roadmaps: al cargar y al importar, un documento anterior se lee y se completa.

```
  raisedAt              →  readyAt                       renombrado, mismo significado
  effect{axis,dir,note} →  valoración{criterio, texto}   dirección en palabras
     coste              →  coste
     plazo              →  tiempo hasta valor
     riesgo             →  riesgo
```

La dirección pasa al texto (`"sube · <nota>"`) y **el valor queda vacío**. Es la decisión importante de la migración: nadie escribió 140 k€ en el modelo viejo, y rellenar un número plausible sería fabricar datos que después alguien enseñaría a negocio como si los hubiera dicho.

Los criterios que el modelo anterior no tenía —esfuerzo, beneficio, deuda— nacen vacíos.

### D7 — Sin firma en el acta

El boceto pide `firma aquí` y `cerrar decisión y firmar`. Se descarta.

En una aplicación local sin cuentas ni servidor, cualquiera dibuja cualquier firma en su propio navegador: no acredita nada ante nadie. Como **ritual** —negocio se moja delante de los demás— tendría valor; como **prueba** no lo tiene, y el vocabulario de firmar sugiere lo segundo. Ofrecer la apariencia de una garantía que no existe es peor que no ofrecerla.

Cerrar la decisión seguirá registrando lo que sí es verdad: qué se decidió, cuándo y quién decidía.

## Risks / Trade-offs

- **Es un cambio de modelo sobre datos que ya existen en producción** → La normalización se prueba con documentos del formato anterior antes de tocar la interfaz, y no borra nada que no sepa traducir. El export previo al cambio sigue siendo importable.
- **Seis criterios × N alternativas es mucho que rellenar, y lo poco rellenado empobrece la fase 3** → Todos son opcionales y el cierre de fase enseña qué falta sin obligar a nada. Es la vía intermedia entre exigirlos —y provocar que se rellenen de trámite, que es lo que arruina la medida— y no pedirlos nunca.
- **`beneficio` es subjetivo y va a un eje de un gráfico** → Se acepta explícitamente (D3). Lo que se evita es que parezca objetivo: es una apreciación de quien prepara, y la vista de presentación tendrá que decirlo.
- **Adelantar la congelación deja menos margen para rectificar** → Es el objetivo. Y no hay pérdida real: mientras el estudio no se cierra, la recomendación se cambia cuantas veces haga falta.
- **`planteada` desaparece como estado** → Una decisión presentada y no decidida vuelve a quedar simplemente *lista*. Se pierde el rastro de cuántas veces se intentó presentarla; si eso resulta valer, es un campo y un change propio.

## Migration Plan

No hay migración de claves ni de almacén: el mismo IndexedDB, el mismo documento. Lo que migra es la forma del contenido, y lo hace al leerlo.

1. Normalización y sus tests, contra documentos del formato anterior, **antes** que cualquier interfaz.
2. Modelo y derivaciones.
3. Interfaz.

**Rollback:** revertir y desplegar. Una versión anterior leería `readyAt` como campo desconocido y las decisiones migradas aparecerían sin congelar, que es un estado recuperable y no destructivo. Conviene exportar antes de desplegar, que además es la única copia de seguridad que existe.

## Open Questions

- **¿La escala de `beneficio` debería tener etiquetas en vez de números?** "Marginal / apreciable / grande" se discute peor que un 3, que es justamente lo que se busca. Pero un eje de gráfico con etiquetas es más difícil de dibujar bien.
- **¿El cierre de fase debería impedir pasar si falta algo, en vez de solo enseñarlo?** Hoy se inclina por enseñar y no bloquear, porque a veces se presenta con lo que hay. Si en uso real resulta que se cruza esa puerta con el estudio a medias, el bloqueo se plantea entonces.
