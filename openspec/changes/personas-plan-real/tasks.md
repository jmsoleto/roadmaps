## 1. Dominio

- [x] 1.1 Añadir al modelo los estados `activo` y `cerrado`, el `CapacitySnapshot`, el ajuste en el sprint y el campo `adjustment` en `TeamCapacity`. Llevar el ajuste al motor (D3) y verificar con tests que la identidad sigue cuadrando, también con un ajuste negativo mayor que lo disponible.
- [x] 1.2 Escribir `personas/snapshot.ts` (`takeSnapshot`, `capacityFromSnapshot`, `realCapacity` según D2) y verificar con tests que editar personas, ausencias y festivos después de congelar no cambia el plan, que una baja sobrevenida solo cambia lo real, y que el recálculo coincide con `totals`.
- [x] 1.3 Escribir `compare` (D4) y verificar con tests el escenario 469,2 → 455,6 h, las ausencias sobrevenidas y retiradas y la ausencia editada.
- [x] 1.4 Ampliar `normalize` con los snapshots, el ajuste y la degradación de D6, y verificarlo con tests en modo tolerante y en modo estricto.

## 2. Almacén, carpeta y documento

- [x] 2.1 Añadir al almacén `activateSprint`, `closeSprint`, `setAdjustment` y los bloqueos de D5, y hacer que `capacityOf` devuelva plan y real según el estado. Verificarlo con tests del almacén.
- [x] 2.2 Verificar con tests que el formato de carpeta y el documento llevan y devuelven los snapshots, y que cerrar un sprint solo cambia su fichero.

## 3. Pantallas y landing

- [x] 3.1 Cabecera del sprint con su estado y su acción (activar con confirmación en línea, cerrar), el conmutador plan | real y los bloqueos en la pestaña Personas, y verificarlo en el navegador.
- [x] 3.2 Pestaña «Plan vs real» con las líneas, las personas y las ausencias sobrevenidas y retiradas, el ajuste con su motivo en lo real, y verificarlo en el navegador.
- [x] 3.3 Estado en la lista de sprints del equipo y en la tarjeta de la landing (sprints activos, «en curso»), y verificarlo con los tests del resumen.

## 4. Comprobar

- [x] 4.1 Recorrer en el navegador activar → registrar una baja imprevista → ajustar → cerrar → editar la persona, y comprobar que el plan no cambia en ningún paso y que lo real se congela al cerrar.
  - Comprobado en Chromium (Playwright) sobre el Sprint 19 del change anterior: al activarlo, el plan queda en 435,2 h. Después se registra desde la matriz una baja de dos días de Gloria y un ajuste de −16 h («incidencia de pagos»), y la comparación da 435,2 h planificadas, 408 h reales y −27,2 h, con la baja como sobrevenida y Gloria en −16 h. Al cerrar, lo real queda en 408 h con su ajuste. Con el sprint ya cerrado, cambiar a Gloria a 4 h/día no mueve ni el plan ni lo real. Una recarga en caliente durante la prueba no perdió nada.
  - Corregido al verificar: en la comparación, más ausencias se pintaban como buena noticia (ahora el color sigue al efecto sobre la capacidad, y la reserva va sin color), los negativos usaban guion en vez de signo menos (y ahora se acepta escribir cualquiera de los dos), y una edición había dejado la pantalla sin la matriz (se recuperó antes de probar).
- [x] 4.2 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 4.3 Ejecutar `openspec validate personas-plan-real --strict` y verificar que pasa.
