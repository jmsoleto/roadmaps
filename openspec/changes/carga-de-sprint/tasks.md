## 1. Parte A · Las primitivas de la convención

- [ ] 1.1 En `time/timeline.ts`, `spanDays(startIso, endIso)` = días que ocupa un rango con fin inclusivo (D1). Tests: un día (inicio == fin) da 1; lunes a viernes da 5; un rango invertido da 0
- [ ] 1.2 En `time/timeline.ts`, `endEdgeX(endIso, originIso, dayW)` = el borde derecho en píxeles del día de fin (D1). Test: el borde de un item que acaba el día `n` coincide con el inicio del día `n+1`
- [ ] 1.3 Dejar escrito en el propio fichero que estas dos son **el** sitio donde vive la convención, y que el `+1` no debe reaparecer suelto en ninguna otra parte. Es la lección de que estaba repetido en nueve sitios

## 2. Parte A · Geometría, gestos y las dos vistas

- [ ] 2.1 `barGeom` de `Gantt.svelte` reescrita sobre `spanDays` (D1). Verificar en la aplicación que un item de lunes a viernes cubre el viernes entero y que su borde derecho cae en la línea que separa viernes de sábado
- [ ] 2.2 `barGeom` de `MetaView.svelte` reescrita sobre la misma primitiva (D1). Verificar que el mismo trabajo ocupa los mismos días en las dos vistas, comparándolas con el mismo zoom. Anotar en el comentario que ésta es la tercera razón concreta para extraer la geometría a un sitio común, sin hacerlo aquí
- [ ] 2.3 Parámetro de modo en `clientToDayOffset` (`interactions/drag.ts`), con `round` por defecto y `floor` disponible (D2). Tests del helper en sus bordes: justo sobre una frontera, justo antes y justo después, en el zoom más pequeño y en el más grande
- [ ] 2.4 El extremo derecho de `startResize` pasa a pedir el modo `floor`; mover, crear y el extremo izquierdo se quedan como están (D2). Verificar arrastrando: soltar el borde derecho sobre un día deja el fin en **ese** día, a cualquier zoom
- [ ] 2.5 El guard de `startResize` pasa de `fin > inicio` a `fin ≥ inicio` (D3). Verificar que se puede estirar un item hasta dejarlo en un solo día, que su barra ocupa esa única columna, y que sigue siendo un item y no un hito
- [ ] 2.6 El clamp de `startMove` deja de permitir que la barra se salga por el borde derecho de la ventana ahora que ocupa un día más. Verificar arrastrando un item hasta el final de la ventana temporal: se detiene con su último día dentro
- [ ] 2.7 Retirar el `Math.max((hi − lo) * dayW, dayW)` de `startCreate`, que era el parche para que un arrastre corto no pintara una previsualización de cero píxeles. Verificar que crear arrastrando sobre un solo día sigue pintando una previsualización de un día
- [ ] 2.8 `milestoneLeft` pasa a centrar el rombo sobre la columna de su día, y los anclajes ±15 de las flechas cuelgan del mismo centro nuevo (D4). Verificar que el rombo queda alineado con la columna que le corresponde en la cabecera de meses, a zoom 4 y a zoom 26
- [ ] 2.9 El origen de las flechas de dependencia pasa por `endEdgeX` (D1, D4). Verificar que una flecha arranca del borde derecho de la barra predecesora y no desde dentro de ella

## 3. Parte A · Verificación, antes de empezar la Parte B

- [ ] 3.1 Comprobar que la ayuda emergente del arrastre y lo que se pinta dicen ya lo mismo: mover, estirar por cada extremo y crear arrastrando anuncian el rango que la barra acaba ocupando
- [ ] 3.2 Comprobar que un roadmap creado antes del cambio se abre con sus barras un día más largas, y que exportarlo produce exactamente las mismas fechas que producía antes: abrir, exportar, comparar con una exportación previa
- [ ] 3.3 Comprobar que las restricciones de dependencia siguen colocando los sucesores donde deben con la duración recalculada, y que completar y descompletar un item no mueve nada que no deba moverse
- [ ] 3.4 `npm run check`, `npm run lint` y `npm run test` en verde con la Parte A sola. A partir de aquí el trabajo es separable en dos commits si se prefiere ese historial

## 4. Parte B · El tiempo y la carga, en puro

- [ ] 4.1 `workdaysBetween(a, b)` en `time/timeline.ts`, cerrada por los dos extremos y en forma cerrada (D6). Tests de los bordes: empezar en sábado, terminar en domingo, un rango de un solo día laborable, un rango de un solo día en fin de semana, un fin de semana entero (0), dos semanas naturales (10), y `b < a` (0)
- [ ] 4.2 `sprintRange(num)` en `time/segments.ts`: el rango verdadero del sprint desde su número, sin ventana de por medio (D5). Tests: el ancla devuelve el ancla; el sprint anterior y el siguiente caen a 14 días; todo rango empieza en lunes; todo rango tiene 10 días laborables
- [ ] 4.3 Comprobar que `sprintRange` y `getSprintSegments` coinciden en el número de sprint para una fecha dada, para que la etiqueta que se pincha y el rango que se cuenta no puedan referirse a sprints distintos
- [ ] 4.4 `model/sprint-load.ts`: dado un roadmap, los responsables y un número de sprint, devuelve el reparto por responsable y la pertenencia de fases e items (D11). Tests del solape: item que cruza el sprint entero (10); item que entra a medias; item que no toca (ausente); item cuyo solape cae entero en fin de semana (0 pero presente); item que termina el último viernes (ese viernes cuenta)
- [ ] 4.5 Tests de la herencia: item sin responsable dentro de fase con responsable (va a la fase); item con responsable propio dentro de fase con otro (gana el del item); item sin responsable en fase sin responsable (va a la entrada sin responsable); y que la entrada sin responsable queda siempre al final del reparto
- [ ] 4.6 Tests del reparto: tres items simultáneos de la misma persona suman treinta contra una capacidad de diez; un único item que ocupa el sprint suma diez y no dispara aviso; el orden es de más días a menos
- [ ] 4.7 Tests de los casos que no suman pero sí aparecen: un hito dentro del sprint se lista con cero días; una fase sin items no aporta carga en ningún sprint aunque tenga fechas y responsable propios
- [ ] 4.8 Tests de completados: un sprint con todos sus items cerrados devuelve la misma carga que si estuvieran abiertos, y devuelve además cuántos están cerrados
- [ ] 4.9 Test de independencia de la ventana: el mismo roadmap con dos `windowDays` distintos que recortan el sprint de forma distinta devuelve la misma capacidad y la misma carga (D5)
- [ ] 4.10 Test de los items fuera de la ventana visible: un item dentro del sprint pero fuera de `[0, windowDays)` aparece en el resultado, marcado como tal

## 5. Parte B · El estado del foco

- [ ] 5.1 `selectedSprint` en `store/ui.svelte.ts`, como campo propio y no como variante de `DrawerState`, con el número absoluto del sprint (D7). Documentar la razón junto a la que ya justifica a `newRoadmap`: son dos cosas que pueden estar a la vez, y tienen que poder
- [ ] 5.2 Método de selección con alternancia: elegir el mismo sprint lo suelta, elegir otro traslada el foco sin pasar por ningún estado intermedio. Tests de store para los tres caminos
- [ ] 5.3 Soltar el foco cuando el sprint elegido no interseca la ventana temporal del roadmap activo (D7). Test: elegir un sprint, cambiar a un roadmap cuya ventana no lo contiene, y comprobar que queda sin foco
- [ ] 5.4 Comprobar que la elección no se persiste ni viaja: recargar la aplicación abre el roadmap sin foco, y exportar no menciona nada de esto

## 6. Parte B · El foco visual

- [ ] 6.1 Las etiquetas de `.sprint-header` pasan de `div` a `button`, con `aria-pressed`, nombre accesible que diga número y fechas, y foco visible. Verificar que se puede elegir un sprint solo con el teclado y que el lector anuncia que queda elegido
- [ ] 6.2 Los dos velos en `.rows` en z-index 3, con `pointer-events: none` (D8). Verificar lo que el velo **no** hace: arrastrar, estirar y crear una barra de fuera del sprint funciona exactamente igual que sin foco
- [ ] 6.3 El tono del velo resuelto desde los tokens del tema, comprobado con `theme/contrast.ts` y `theme/audit.ts`, con el listón de que lo atenuado se sigue leyendo (D9). Verificar en un tema claro además de en uno oscuro
- [ ] 6.4 Apagar las demás etiquetas de la cabecera de sprints mientras hay foco. Verificar que la cabecera deja de competir con la banda
- [ ] 6.5 Distinguir «elegido» de «actual», que pueden coincidir en la misma etiqueta o no (D8). Verificar los tres casos: elegido y actual son el mismo, son distintos, y no hay ninguno elegido
- [ ] 6.6 Atenuar la marca de HOY cuando el sprint elegido no es el actual, con su propia clase por estar en z-index 5 (D8). Verificar que cuando el elegido **sí** es el actual, la bandera de HOY sigue por encima del velo
- [ ] 6.7 Apagar en la columna de nombres las filas sin nada dentro del sprint, usando la pertenencia que devuelve `sprint-load` y no un segundo cálculo (D11). Verificar que ninguna fila apagada tiene un item listado en el panel, y al revés
- [ ] 6.8 Comprobar el sprint recortado por el borde de la ventana: el velo pinta la parte visible sin desbordar la rejilla, mientras el panel sigue declarando los diez días del sprint completo

## 7. Parte B · El panel

- [ ] 7.1 `SprintPanel.svelte`, aparte de `Drawer.svelte` (D10). Cabecera con el nombre del sprint, sus fechas y sus días laborables, y el recuento de personas e items
- [ ] 7.2 El reparto por responsable: barra, días sobre capacidad, orden de más a menos, aviso al superarla, y el trabajo sin responsable siempre al final. Verificar contra los casos de 4.5 y 4.6 en la aplicación
- [ ] 7.3 Marcar cuándo un responsable es heredado de la fase, para que la diferencia con la rejilla —que sigue pintando solo el badge del item— quede dicha y no descubierta (Riesgos)
- [ ] 7.4 La lista de items agrupada por fase, con los días de cada uno; hitos con cero; completados atenuados con el recuento de cerrados; y los que caen fuera de la ventana señalados como tales
- [ ] 7.5 Rotular el panel en términos de ocupación de calendario, no de esfuerzo ni de capacidad (D12). Revisar cada etiqueta del panel contra ese criterio
- [ ] 7.6 La regla de convivencia con el drawer: el panel del sprint se muestra cuando no hay otro panel abierto, y el detalle lo tapa mientras dura (D10). Verificar el ciclo: elegir sprint, abrir un item desde el panel, comprobar que el velo sigue, cerrar el detalle, y encontrar el panel del sprint donde estaba
- [ ] 7.7 Comprobar un sprint vacío: elegir un sprint sin nada dentro deja el panel diciendo que no hay trabajo, con la columna de nombres entera apagada, y sin fingir un reparto de cero personas

## 8. Verificación final

- [ ] 8.1 Recorrer el caso que motiva el cambio de punta a punta: un roadmap con una persona con tres items simultáneos, elegir el sprint, y comprobar que el panel lo dice sin tener que contar nada a mano
- [ ] 8.2 Comprobar el mismo sprint en dos roadmaps con ventanas distintas: la capacidad declarada es la misma en los dos y solo cambia el trabajo de cada uno
- [ ] 8.3 Comprobar que elegir un sprint no impide nada: editar nombres, reordenar filas, crear fases e items, cambiar responsables y completar items funcionan igual con foco que sin él
- [ ] 8.4 Comprobar con un tema claro y con uno oscuro: el velo, las filas apagadas, la etiqueta elegida y la barra de carga se leen en los dos
- [ ] 8.5 `npm run check`, `npm run lint` y `npm run test` en verde
