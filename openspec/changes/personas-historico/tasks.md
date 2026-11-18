## 1. Dominio

- [x] 1.1 Añadir `results` al sprint (modelo, `normalize` tolerante y estricto, formato de carpeta y documento), y verificar con tests la ida y vuelta, los números negativos rechazados y las familias inexistentes.
- [x] 1.2 Escribir `personas/delivery.ts` (cumplimiento, velocidad, rendimiento del sprint y por familia, D2) y verificar con tests el escenario 26 → 22 SP con 408 h, las divisiones por cero y la capacidad por familia.
- [x] 1.3 Escribir el histórico (sprints cerrados en orden, medias de 3 y 5) y el forecast (D4, total y por familia, con sus bases) y verificar con tests la regla de tres del PRD (22 SP, 408 h → 469,2 h da 25,3), el cociente de sumas y la ausencia de histórico.

## 2. Almacén

- [x] 2.1 Añadir al almacén la edición de resultados con los bloqueos de D3 y verificarlos con tests.

## 3. Pantallas y landing

- [x] 3.1 Pestaña Resultados del sprint con las familias, los totales y las cifras de entrega, editable según su estado, y verificarla en el navegador.
- [x] 3.2 SP recomendados en el resumen de un sprint en planificación, con sus bases, y verificarlo en el navegador.
- [x] 3.3 Pestaña Histórico del equipo con las medias, y los SP recomendados en la tarjeta de la landing, y verificarlo con los tests del resumen y en el navegador.

## 4. Comprobar

- [x] 4.1 Recorrer en el navegador comprometer → activar → terminar → cerrar dos sprints, y comprobar el histórico y el forecast del tercero.
  - Comprobado en Chromium (Playwright). En el Sprint 20 se comprometieron APP 18 SP en 6 historias y BACKEND 8 SP en 3. Se activó, se apuntaron 15 y 7 SP terminados y se cerró: 84,6 % de cumplimiento y 4,3 SP por cada 100 h, con 5,5 en APP y 6,9 en BACKEND. El Sprint 21, nuevo, propone ~20 SP (20,2), que es 22 × 469,2 h ÷ 510 h, también por familia y con sus bases. El histórico lista el 20 y el 19, y la tarjeta muestra «469,2 h · ~20 SP».
  - Solo se recorrieron dos sprints, no los dos con resultados que pedía la tarea: el 19 se cerró en el change anterior, antes de que existieran los resultados. Las medias de varios sprints las cubren los tests (cociente de sumas con dos sprints).
  - Corregido al verificar: en planificación el cumplimiento salía como «0 %» antes de entregar nada (ahora «—»). Un sprint cerrado sin resultados contaba en las medias como 0 SP (ahora se queda fuera, y la spec lo dice). Los sprints cerrados salían en «PRÓXIMOS SPRINTS» si sus fechas no habían pasado. La etiqueta decía «media de los 1 últimos», y las casillas tenían etiquetas accesibles en inglés.
- [x] 4.2 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 4.3 Ejecutar `openspec validate personas-historico --strict` y verificar que pasa.
