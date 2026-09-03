## Why

Un sprint no se puede leer. Para saber qué cae dentro de las dos semanas de S12 hay que recorrer la rejilla con el dedo, cruzar a ojo qué barras la atraviesan y sumar de cabeza quién lleva cuántas. La pregunta que se hace de verdad al planificar —¿cabe esto?, ¿hay alguien con tres cosas a la vez que no las va a poder sacar?— no tiene respuesta en la pantalla.

Y hay algo debajo que hay que arreglar antes, porque contar días obliga a decidir qué días son. Hoy una barra que va del lunes al viernes se pinta hasta el jueves: el sistema trata el fin como exclusivo y quien teclea la fecha lo piensa inclusivo. Mientras solo se pintaba, la diferencia era medio píxel de nada. En cuanto se cuenta, es un día de error por item, y en el borde de un sprint es un item que el panel cuenta y la pantalla no enseña.

## What Changes

Son dos partes y van juntas porque la segunda no se puede escribir sin la primera: no se puede especificar «días laborables de un item dentro de un sprint» mientras la aplicación no tenga decidido qué días ocupa un item.

**Parte A — El fin de una fecha es inclusivo**

- **Una barra cubre su último día.** Un item de lunes a viernes se pinta hasta el final del viernes, no hasta el principio. Es lo que ya dice la ayuda emergente durante el arrastre, y lo que piensa cualquiera que teclea esas dos fechas.
- **Un item puede durar un día.** Hoy es imposible: el redimensionado fuerza que el fin sea posterior al inicio, porque con pintado exclusivo un item de un día sería una barra de cero píxeles. Con la convención inclusiva, inicio y fin en el mismo día es el item más corto legal, y lo que lo distingue de un hito es lo que siempre lo ha distinguido: ser o no ser un hito.
- **Un hito se centra sobre su día**, no sobre la frontera entre dos. Mientras las barras también vivían entre fronteras, el rombo estaba en su sitio; en cuanto una barra posee la columna de su último día, el rombo queda medio día a la izquierda de su propia fecha.
- **Las flechas de dependencia salen del borde real de la barra origen**, que ahora está un día más a la derecha.
- **El extremo derecho se agarra al día que señala el puntero**, no a la frontera más cercana.
- **BREAKING (visual, no de datos):** todas las barras existentes crecen un día. Ninguna fecha guardada cambia, ni se migra nada, ni se toca la exportación: cambia cómo se pinta y cómo se cuenta lo que ya hay.
- La misma convención en la vista "Todos", que tiene su propia copia de la geometría. Si solo se arregla una, las dos vistas dejan de decir lo mismo del mismo item.

**Parte B — La carga de un sprint**

- **Pinchar un sprint en la cabecera lo selecciona**; volver a pincharlo lo suelta.
- **El resto del roadmap se atenúa.** El sprint elegido queda recortado en vertical sobre la rejilla y todo lo demás baja de tono: las barras de fuera, las demás etiquetas de la cabecera, la marca de HOY cuando el sprint elegido no es el actual, y —en la columna de nombres— las filas que no tienen nada dentro. El velo dice *cuándo* es el foco; las filas apagadas dicen *quién y qué* participa.
- **Atenuado no es desactivado.** Se sigue pudiendo arrastrar, estirar y editar cualquier barra de fuera del sprint. Es un foco visual, no un modo.
- **Un panel lateral con la carga**: nombre del sprint, sus fechas, sus días laborables, y el desglose de días por responsable ordenado de mayor a menor, con aviso cuando alguien pasa de la capacidad del sprint.
- **Lo que se quiere cazar es el solape.** Una persona con un solo item que ocupa el sprint entero va llena y es realista. Tres items simultáneos de dos semanas son treinta días de calendario en un sprint de diez: eso es lo que hoy no se ve y lo que el panel enseña de un vistazo.
- **Los items del sprint, agrupados por su fase**, con los días que cada uno aporta. Los hitos se listan y suman cero.
- **Los items sin responsable se marcan, en su propia fila.** «No sabemos quién hace tres de los cinco items de S12» responde a la pregunta tanto como «esa persona va al 120%».
- **Un responsable puesto en la fase cuenta para sus items que no tengan uno propio.** Es una regla de herencia que hoy no existe en ninguna parte del sistema y que nace aquí.
- **Los completados cuentan la carga**, se muestran atenuados y con un contador de cuántos van cerrados: el panel sirve tanto para planificar un sprint que viene como para revisar uno que pasó.
- **El foco del sprint es independiente del panel de detalle.** Abrir un item desde el panel no apaga el foco, que es justo cuando más falta hace.

Fuera de alcance, registrado como trabajo futuro:

- **La carga cruzada entre roadmaps.** Un sprint de *un* roadmap no es la vida de una persona: quien está en tres roadmaps puede salir holgado aquí y estar al triple en total. Los responsables son globales y la numeración de sprints es absoluta, así que el cálculo cruzado es casi el mismo; lo que falta es decidir la vista, y eso pertenece al metaroadmap.
- **El esfuerzo real de una tarea.** Esto mide ocupación de calendario, no esfuerzo: un item de diez días puede ser media hora al día. La interfaz debe llamarlo por su nombre y no dar a entender que planifica capacidad.
- **Los días festivos.** Laborable es de lunes a viernes y nada más. No hay fuente fiable, y habría que lidiar con los autonómicos y los locales antes de poder restar ni uno. Es una decisión, no un olvido.
- **Sprints en la vista "Todos".** Esa vista pinta trimestres, no sprints, y no participa del foco.
- **Una capability propia para la carga de sprint.** Vive de momento en `roadmap-editor`, que ya es dueño de los sprints, del drawer y de la rejilla. Si crece —carga cruzada, capacidad por persona, ausencias— tendrá motivos para mudarse.

## Capabilities

### Modified Capabilities

- `roadmap-editor`: gana la convención de que el fin de una fecha es inclusivo, con lo que arrastra —barras que cubren su último día, items de un día, hitos centrados sobre el suyo—; gana la selección de un sprint con su foco visual y su panel de carga; y obliga a matizar «Cabeceras temporales de sprints y trimestres», que hoy solo promete mostrar la cabecera y resaltar el periodo actual: pasa a ser además el sitio desde el que se elige un sprint, con dos estados que pueden coincidir en la misma etiqueta.

## Impact

**Tiempo y modelo (derivación pura, con tests, sin navegador)**

- `src/lib/time/timeline.ts`: nueva cuenta de días laborables entre dos fechas, apoyada en el `isWeekend` que ya está ahí.
- `src/lib/time/segments.ts`: nueva forma de obtener el rango **verdadero** de un sprint a partir de su número. `getSprintSegments` recorta contra la ventana del roadmap, y ese recorte sirve para pintar pero no para contar.
- `src/lib/model/sprint-load.ts`: módulo nuevo, al estilo de `derive.ts` y `completion.ts`. Quién carga cuánto en un sprint, y con qué items.
- `src/lib/interactions/drag.ts`: la conversión de coordenada a día pasa a poder devolver la columna señalada, no solo la frontera más cercana.

**Estado**

- `src/lib/store/ui.svelte.ts`: el sprint seleccionado, como campo propio y no como una variante más de `DrawerState`. Guarda el **número absoluto** del sprint, no un desplazamiento en días. Es estado transitorio, que es exactamente lo que ese fichero declara ser.

**Interfaz**

- `src/lib/components/Gantt.svelte`: la geometría de barras, hitos y flechas; las etiquetas de sprint, que pasan de ser texto a ser botones; los velos del foco; y el apagado de las filas sin trabajo en el sprint.
- `src/lib/components/MetaView.svelte`: su copia de la geometría de barras, por la Parte A. No participa del foco ni del panel.
- Un componente propio para el panel del sprint. `Drawer.svelte` ronda las 1150 líneas y ya reparte cuatro paneles distintos.
- `src/lib/theme/`: el velo tiene que atenuar sin borrar —el resto del roadmap se sigue leyendo, más bajo— y eso se decide con las herramientas de contraste que ya existen, no con un valor de opacidad puesto a ojo.

**Sin impacto**

- El documento persistido, la exportación y la importación. No hay campo nuevo en `AppData`, ni migración, ni puerta de importación que tocar: la Parte A no cambia ninguna fecha guardada y la Parte B no guarda nada.
- `local-persistence` y `data-portability`: sin requisitos que tocar, por lo mismo.
- Los datos de un roadmap ya existente. Se ven distintos; no son distintos.
