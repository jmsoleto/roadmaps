## Context

La captura rápida ya está resuelta: un campo, un Enter, y sigue abierta para la siguiente. Lo que no resuelve es el caso en que no puedes teclear porque estás escuchando.

El modelo ya lo esperaba: `captureSource` existe desde el change de las tres fases, con el comentario de que se registraba *"desde ya aunque dictar llegue después, para que las decisiones capturadas entretanto no queden sin poder decir cómo entraron"*. Aquí empieza a tener dos valores de verdad.

Y hay una tensión que este change no puede esquivar. La topbar dice `local`, y esa palabra se eligió deliberadamente: D10 del change del hub la justificó porque *"dice la verdad: los datos están en este navegador"*. Dictar la rompe a medias, y lo honrado es decirlo donde se dicta.

## Goals / Non-Goals

**Goals:**

- Que apuntar una duda mientras alguien habla no obligue a dejar de escuchar.
- Que quede claro, en el momento, que el audio sale de la máquina.
- Que no se guarde audio en ninguna parte.
- Que donde no hay transcripción la captura siga siendo exactamente la de hoy.

**Non-Goals:**

- Transcribir en el dispositivo.
- Guardar el audio, ni siquiera temporalmente.
- Dictar fuera de la captura.
- Corregir la transcripción automáticamente.

## Decisions

### D1 — La interfaz de reconocimiento del navegador, con su coste dicho

```
  reconocimiento del navegador   Chrome y Safari · el audio va al fabricante
                                 Firefox no lo implementa
  modelo en el dispositivo       nada sale · decenas de MB de descarga
  grabar sin transcribir         nada sale · pero el boceto pide texto
```

Se usa la primera, que era la decisión ya tomada. Lo que este diseño añade es **dónde se dice**: no en un aviso legal que nadie lee, sino en el propio panel mientras se graba, junto al indicador de que está escuchando. Es el único instante en que la advertencia sirve de algo.

Lo que sí queda garantizado es lo segundo del boceto: la aplicación **nunca toca el audio**. La transcripción la hace el navegador y lo que llega al código son cadenas. No hay nada que guardar ni que descartar.

### D2 — Se marcan fragmentos, no palabras

El boceto dibuja *"2 palabras con baja confianza · toca para corregir"*. No se puede.

La interfaz del navegador entrega **resultados por fragmento** —lo dicho entre pausas— y cada uno trae su confianza. No hay confianza por palabra. Pintar palabras sueltas exigiría repartir la confianza del fragmento entre ellas, que es fabricar un dato con apariencia de medida.

Así que se marca el fragmento entero, que es lo que el navegador realmente afirma, y el texto sigue siendo editable como cualquier otro. Menos vistoso y verdadero.

### D3 — Donde no hay, no se ofrece

En Firefox la captura queda exactamente como hoy. Ni botón deshabilitado ni explicación: un control que no puede funcionar es ruido en la única pantalla que no admite ruido.

Lo mismo si el usuario deniega el micrófono: se dice una vez, en el sitio, y la captura por teclado sigue funcionando.

### D4 — El texto dictado entra en el mismo campo

No hay un modo aparte. Lo que se transcribe aparece en el campo de la duda, mezclándose con lo que ya hubiera escrito, y se puede corregir antes de guardar.

Es lo que hace que dictar sea una vía de entrada más y no una funcionalidad paralela: el resto de la captura —Enter guarda, Esc descarta, el contexto opcional— sigue funcionando igual.

### D5 — La parte pura, separada del navegador

El envoltorio del reconocimiento no se puede ejecutar en los tests: la interfaz no existe en Node. Lo que sí se puede es sacar de él lo que es lógica y no navegador —unir fragmentos, decidir qué confianza es baja, formatear el tiempo— y probarlo.

El envoltorio recibe su fábrica de reconocedores por parámetro, como `IndexedDbBackend` recibe la suya, de modo que también sus estados se puedan ejercitar sin hablarle a nadie.

## Risks / Trade-offs

- **El audio sale de la máquina y la topbar dice `local`** → Se acepta, y se advierte donde se dicta (D1). Es la contrapartida de no descargar un modelo.
- **La transcripción de términos técnicos será mala** → Por eso el texto entra editable y los fragmentos dudosos se marcan. Una duda mal transcrita pero capturada vale más que una bien redactada que se perdió.
- **La interfaz de reconocimiento no es estándar** y está prefijada en algunos navegadores → Se detecta y se degrada (D3), que es la única defensa razonable.
- **Sesiones largas se cortan solas** en algunas implementaciones → Se reinicia mientras el usuario siga grabando, y lo transcrito hasta ahí ya está en el campo.

## Migration Plan

Nada que migrar: ni modelo, ni almacén, ni formato. `captureSource` ya existe y las decisiones anteriores ya valen `tecleado`.

**Rollback:** revertir y desplegar. Las decisiones dictadas quedan como cualquier otra, con su `captureSource` que una versión anterior simplemente ignora.

## Open Questions

- **¿Debería avisarse también fuera del momento de dictar?** Hoy no: un aviso permanente sobre algo que solo pasa al pulsar un botón se convierte en ruido y deja de leerse.
- **¿Y el idioma?** Se usa el del documento. Si aparecen dudas dictadas en dos idiomas, elegirlo es un ajuste más y merece verse antes de añadirlo.
