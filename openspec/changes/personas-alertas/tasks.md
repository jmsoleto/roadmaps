## 1. Dominio

- [x] 1.1 Añadir `criticalRoleIds` y `dropThreshold` al equipo (modelo, `normalize`, carpeta y documento) y verificar con tests la ida y vuelta y los valores por defecto.
- [x] 1.2 Escribir `personas/alerts.ts` con las reglas de D3 y verificar con tests cada escenario de `personas-alertas`: dos QA ausentes, la parcial que no cuenta, la cobertura, el rol que nadie tiene, el rol no crítico, la caída del 22 % frente a la del 15 %, los festivos que faltan de 2027 y la persona sin localidad.
- [x] 1.3 Llevar las alertas al resumen de la landing (sprints en planificación y activos, con su origen) y verificarlo con los tests del resumen.

## 2. Almacén y pantallas

- [x] 2.1 Añadir al almacén la edición de los roles críticos y del umbral, y a la vista del equipo sus controles, y verificarlo con tests y en el navegador.
- [x] 2.2 Pestaña Alertas del sprint (severidad con glifo y palabra, detalle con las personas) y el contador en el resumen, y verificarlo en el navegador.

## 3. Comprobar

- [x] 3.1 Recorrer en el navegador: marcar QA como crítico, dejar a todos los QA ausentes un día, ver la alerta en el sprint y en la landing, cambiar la ausencia y ver que desaparece, en tema claro y oscuro.
  - Comprobado en Chromium (Playwright) sobre el Sprint 21, del 28 de diciembre al 8 de enero, con QA marcado como crítico en Pagos. Desde la matriz, Ana y Eva se quedan de vacaciones el 4 de enero. Aparecen la alerta crítica «No hay disponibilidad QA el 4 de enero.», que se abre con Ana y Eva, y el aviso «El 4 de enero hay 2 QA ausentes.». También salen los dos avisos reales de Sevilla, que no tiene ningún festivo, uno de 2026 y otro de 2027. Las cuatro alertas llegan a la tira de la landing como «Personas · Pagos · Sprint 21». Al borrar las vacaciones de Eva desaparecen la alerta crítica y el solapamiento, y el resumen pasa a decir «Alertas: 2 avisos». Probado en tema oscuro y claro.
  - El único fallo encontrado estaba en un test, que esperaba una sola alerta de cobertura cuando el 6 de enero, festivo en Madrid, también se queda sin QA: el comportamiento era el correcto.
- [x] 3.2 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 3.3 Ejecutar `openspec validate personas-alertas --strict` y verificar que pasa.
