## 1. Lo que se puede enseñar

- [x] 1.1 `presentableOf()`: el subconjunto de una decisión que la presentación pinta — pregunta, alternativas, criterios y cuál se recomienda (D3)
- [x] 1.2 Test: el resultado no contiene origen, contexto, nota interna ni motivo de la recomendación, en ninguna profundidad
- [x] 1.3 Test: la alternativa recomendada sí viene señalada

## 2. Datos de los gráficos

- [x] 2.1 `effortBenefitPoints()`: alternativas con esfuerzo y beneficio, y aparte las que no (D2)
- [x] 2.2 `timelinePoints()`: alternativas con fecha de valor, y aparte las que no
- [x] 2.3 Escalas: de semanas y apreciación a coordenadas, y de fechas a posición en la línea
- [x] 2.4 Test: a quien le falta una magnitud queda fuera y aparece declarada
- [x] 2.5 Test: sin ninguna cuantificada, el gráfico no tiene datos y se dice por qué
- [x] 2.6 Test: nadie acaba en el origen por no tener valor

## 3. Gráficos en SVG

- [x] 3.1 Dispersión esfuerzo/beneficio: ejes, zona favorable señalada, un punto por alternativa con su letra (D5)
- [x] 3.2 El eje de beneficio rotulado como apreciación declarada, no como medida
- [x] 3.3 Línea temporal con meses, hoy marcado y un punto por alternativa
- [x] 3.4 Todo el color por tokens del tema; tipografía a tamaño de sala

## 4. La vista

- [x] 4.1 Pantalla de presentación: pregunta grande, alternativas con sus criterios, recomendación señalada
- [x] 4.2 Pantalla completa del navegador, con la vista funcionando igual si se rechaza (D4)
- [x] 4.3 Salida visible y por tecla de escape
- [x] 4.4 Las alternativas no cuantificadas, declaradas bajo cada gráfico
- [x] 4.5 Entrada desde el detalle, solo en fase 3

## 5. Decidir y cerrar

- [x] 5.1 Elegir una alternativa desde la presentación
- [x] 5.2 Escribir una resolución que no era ninguna
- [x] 5.3 Acta: qué se decidió, cuándo y quién decidía. Sin firma (D6)
- [x] 5.4 Test: cerrar desde la presentación deja la decisión igual que cerrarla desde el estudio — es literalmente el mismo método del store, ya cubierto por sus tests; comprobado además en el navegador

## 6. Verificación

- [x] 6.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 6.2 Comprobar que no se ha añadido ninguna dependencia de ejecución
- [x] 6.3 Recorrido manual: presentar, leer los dos gráficos, decidir y ver el acta
- [x] 6.4 Recorrido manual: una decisión con alternativas a medio cuantificar enseña lo que hay y declara lo que falta
- [x] 6.5 Comprobar en el DOM que la nota interna y el motivo no están presentes durante la presentación
