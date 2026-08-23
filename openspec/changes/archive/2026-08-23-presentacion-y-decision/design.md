## Context

El change de las tres fases dejó los criterios tipados precisamente para esto: `esfuerzo` en semanas, `coste` en importe, `tiempo hasta valor` en fecha, `riesgo` en nivel y `beneficio` en una apreciación de 1 a 5. Nada de eso servía todavía a nadie. Aquí empieza a servir.

Conviene recordar qué era el boceto. Los cuatro gráficos de la pantalla `4d` están **dibujados a mano** —polígonos estáticos, sin datos detrás—. Enseñaban a qué se aspiraba. Este change decide de qué salen, y decide también que no salen los cuatro.

Dos restricciones del proyecto mandan:

1. **Cero dependencias de ejecución.** `package.json` no declara ninguna. Dos gráficos no justifican estrenar esa cuenta.
2. **El tema es configurable y auditado.** Los gráficos se pintan con tokens, no con literales, o dejarían de leerse al cambiar de tema.

## Goals / Non-Goals

**Goals:**

- Que negocio conteste "qué me llevo por lo que cuesta" y "cuándo lo tengo" sin leer una tabla.
- Que lo que no se puede enseñar **no se pueda enseñar**, ni por accidente.
- Que un gráfico nunca invente una posición para algo que nadie cuantificó.
- Que la decisión se tome y se cierre sin salir de la pantalla.

**Non-Goals:**

- Barras de coste y radar.
- Exportar la presentación.
- Que la aplicación opine cuál elegir. Sigue prohibido el total, el ranking y la sugerencia automática.
- Firma en el acta.

## Decisions

### D1 — Dos gráficos, y por qué esos dos

El boceto pedía cuatro. Se construyen dos:

```
  ESFUERZO FRENTE A BENEFICIO      contesta "qué me llevo por lo que cuesta"
     x = semanas, y = apreciación   el cuadrante bueno es arriba-izquierda

  CUÁNDO LO TENDRÍA EL CLIENTE     contesta "y cuándo"
     una línea de meses, un punto por alternativa, hoy marcado

  ── descartados ──
  BARRAS DE COSTE Y PLAZO          repite los dos ejes del primero
  RADAR CRITERIO A CRITERIO        el más caro de construir y el que exige
                                   que te expliquen cómo se lee, en el peor
                                   momento para explicar nada
```

El radar además obligaría a normalizar los seis criterios a una escala común, y cuatro de ellos no tienen escala: `deuda que deja` es texto, `riesgo` es un nivel, `coste` y `esfuerzo` van en unidades distintas. Normalizarlos sería inventarse una puntuación por criterio, que es justo lo que la spec prohíbe.

### D2 — Un gráfico dibuja lo cuantificado y **declara** lo que no

El caso frecuente no es que falten datos: es que falten **algunos**. Una alternativa sin `esfuerzo` no tiene sitio en el eje X, y ponerla en el origen la enseñaría como "cuesta cero", que es una mentira que negocio se creería.

```
  con ambos valores    → punto en el plano
  a falta de uno       → fuera del plano, nombrada bajo el gráfico:
                         "C · vale de compra — sin cuantificar"
  ninguna cuantificada → no se dibuja el gráfico; se dice por qué
```

La regla vale para los dos gráficos y es la misma que gobernaba la matriz: **el texto siempre, el valor cuando lo hay**. Un gráfico es una lectura del valor, y donde no hay valor no hay lectura, no un cero.

### D3 — Lo que no se puede enseñar no se pinta

En este modo **no existen** en el árbol: la duda de origen, su contexto, la nota interna y el motivo de la recomendación.

No basta con ocultarlos por CSS ni con ponerlos detrás de un desplegable. Se pinta la presentación desde un subconjunto explícito de la decisión, de modo que proyectarlos requeriría cambiar el código y no un descuido en una reunión.

**La recomendación sí se marca**, porque negocio tiene derecho a saber qué opinas y porque señalarla es parte de tu trabajo. Lo que no se enseña es *el argumento escrito*: ese se dice en voz alta, que es para lo que se escribió.

### D4 — Pantalla completa de verdad, y que se pueda salir

Se usa la API de pantalla completa del navegador. Cuando no está disponible o se rechaza, la vista ocupa la ventana entera igualmente: la presentación no depende de un permiso.

`Esc` sale siempre, y hay una salida visible: una pantalla sin salida evidente delante de gente es una trampa.

### D5 — Gráficos en SVG propio

Sin librería. Los dos son geometría elemental —escalar un número a un eje, colocar un círculo, dibujar unos ticks— y una dependencia de ejecución en un proyecto que no tiene ninguna es un precio desproporcionado.

Todo el color sale de tokens del tema. Los tamaños de letra suben respecto a la aplicación: esto se lee a metro y medio.

### D6 — El acta registra lo que es verdad, y nada más

Qué se decidió, cuándo, y quién decidía —que ya es un campo de la decisión—. La firma se descarta: en una aplicación local sin cuentas cualquiera dibuja cualquier firma en su propio navegador, y ofrecer la apariencia de una garantía que no existe es peor que no ofrecerla. El valor está en cerrar delante de todos, no en el trazo.

No se añade lista de asistentes: es un campo más que rellenar en el peor momento, y el registro que de verdad se consulta a los seis meses es qué se decidió y por qué se ofrecía lo que se ofrecía.

## Risks / Trade-offs

- **Dos gráficos pueden quedarse cortos** → Se acepta y se dice en la propuesta. Añadir el tercero es un change pequeño una vez que la vista existe; construir cuatro antes de haber presentado ninguna decisión es adivinar.
- **`beneficio` es subjetivo y ocupa medio gráfico** → Ya se decidió que sí, y la vista lo dice: el eje se rotula como apreciación, no como medida.
- **Pantalla completa puede fallar o estar prohibida** → La vista funciona igual sin ella (D4).
- **Una decisión sin ningún valor cuantificado da una presentación pobre** → Es información verdadera sobre el estudio, no un fallo de la vista. Se enseñan las alternativas con sus frases, que es lo que hay.

## Migration Plan

No hay migración: ni modelo nuevo ni almacén nuevo. La vista lee lo que ya existe.

**Rollback:** revertir y desplegar; nada de lo escrito por este change queda huérfano, porque no escribe nada que no escribiera ya la fase 3.

## Open Questions

- **¿Debería la presentación poder abrirse en una ventana aparte**, para dejar el estudio en la primera pantalla? Con dos monitores sería lo natural, pero exige coordinar dos vistas sobre el mismo store.
- **¿Y los adjuntos?** Son apoyo del estudio y puede que alguno merezca proyectarse. Se decide viendo la fase 3 en uso, no antes.
