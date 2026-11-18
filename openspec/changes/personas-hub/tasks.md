## 1. Dominio

- [x] 1.1 Escribir `personas/model.ts` con los tipos de D2, las constantes (tipos de ausencia y su marca, catálogo de tecnologías de partida) y las fábricas, y verificar con tests que una aplicación nueva parte del árbol APP / WEB / BACKEND.
- [x] 1.2 Escribir `personas/normalize.ts`, que lee null, versiones anteriores o ficheros tocados a mano y descarta lo que no tiene id o apunta a algo que no existe, y verificarlo con tests de referencias rotas, rangos y fechas inválidas.
- [x] 1.3 Escribir `personas/capacity.ts` (motor puro de D4) y verificar con tests los escenarios de `personas-capacidad`: fines de semana, festivos de la localidad propia y de otra, ausencias completas y parciales, parcial mayor que la jornada, solapes, festivo dentro de vacaciones, dedicación de por defecto y sustituida, reserva, y los ejemplos 80 → 64 → 32 h, 400 → 340 h y 720 → 552 → 469,2 h.
- [x] 1.4 Añadir al motor tests de propiedades (nunca negativo, más ausencias nunca aumentan, más reserva nunca aumenta lo planificable, las cifras cuadran) y uno de tamaño (100 personas y 31 días en menos de 500 ms), y verificar que pasan.
- [x] 1.5 Escribir `personas/breakdown.ts` (desglose por línea, persona, fecha y causa) y `personas/format.ts` (horas con un decimal y coma), y verificar con tests que cada desglose suma su cifra.
- [x] 1.6 Escribir `personas/holidays.ts` (pegar festivos, D10) y `personas/sprint-defaults.ts` (nombre, inicio, duración y reserva propuestos), y verificar sus escenarios con tests.

## 2. Almacén y persistencia

- [x] 2.1 Escribir `personas/storage.ts` (clave `personas:appdata:v1`) y `personas/store.svelte.ts` con las operaciones de catálogos, equipos, personas, ausencias y sprints, las reglas de borrar frente a inactivar y las validaciones de rango, y verificarlas con tests del almacén.
- [x] 2.2 Escribir `personas/folder-format.ts` (D6) y verificar con tests la ida y vuelta, que cambiar una ausencia toca solo el fichero del equipo, que cambiar un sprint toca solo el suyo, y que un fichero con conflicto deja la aplicación no disponible nombrándolo.
- [x] 2.3 Escribir `personas/folder.svelte.ts` (conexión con un participante) y verificar con un test sobre la carpeta en memoria que conectar a una carpeta vacía vuelca los datos del navegador.
- [x] 2.4 Escribir `personas/io.ts` (documento de D8, restaurar solo en vacío y rechazar entero lo que no se lee) y enseñar el `kind` a `hub/documents.ts`, y verificar con tests la ida y vuelta, el rechazo sobre datos, el documento a medias y el rechazo cruzado con las demás aplicaciones.

## 3. Registro en el hub

- [x] 3.1 Añadir Personas Hub a `hub/apps.ts` y `hub/identity.ts`, y su glifo a `AppIcon.svelte`, y verificar que el test de contraste de identidades pasa con el par nuevo.
- [x] 3.2 Escribir `personas/summary.ts` (tres cifras y «PRÓXIMOS SPRINTS») y verificarlo con tests.
- [x] 3.3 Cablear Personas Hub en `hub/registry.ts` (resumen, acciones, apertura de un sprint desde la landing, inicio en el primer equipo activo), en `hub/folders.ts` (con el aviso de datos personales), en `main.ts` y en el volcado de `App.svelte`, y verificar con los tests del registro.

## 4. Pantallas

- [x] 4.1 Escribir `personas/ui.svelte.ts` (qué está abierto y los formularios en curso) y `PersonasApp.svelte` con la columna de equipos y catálogo, los estados de carga, no disponible y sin equipos, y verificar en el navegador que se entra en el primer equipo activo.
- [x] 4.2 Escribir la vista de equipo (sprints con su capacidad planificable, personas, ausencias) con sus formularios, y verificar en el navegador el alta, la edición, la inactivación y los rechazos por rango.
- [x] 4.3 Escribir la vista de sprint (resumen con desglose que se abre, personas con dedicación del sprint, matriz diaria con registro de ausencias desde una celda), y verificar en el navegador que el resumen cambia al momento al registrar una ausencia.
- [x] 4.4 Escribir las vistas de catálogo (roles y tecnologías, localidades y festivos con pegado) y verificar en el navegador el pegado con una línea inválida.

## 5. Comprobar

- [x] 5.1 Recorrer en el navegador el flujo completo: crear equipo, localidad con festivos, personas, sprint y ausencias. Comprobar el resumen con un caso conocido, conectar a una carpeta, exportar, restaurar en vacío, en tema claro y oscuro, y verificar que la matriz se lee sin color.
  - Comprobado en Chromium (Playwright) con un equipo de nueve personas que reproduce el resumen del PRD: 720 h teóricas, −24 h de festivos, −64 h de ausencias, −80 h de dedicación, 552 h disponibles y 469,2 h planificables, y cada desglose suma su cifra. También: ausencia parcial registrada desde la matriz (el sprint baja a 76 h al momento), dedicación del sprint sustituida y rechazada fuera de rango, sprint siguiente propuesto, pegado de festivos con una línea inválida, tarjeta de la landing con la fila que abre su sprint, diálogo de carpeta con el aviso, aviso del export, y temas claro y oscuro.
  - Corregido al verificar: una dedicación rechazada se quedaba escrita en la casilla como si se hubiera guardado (ahora vuelve a lo guardado y el error nombra a la persona), la marca de parcial no cabía en la celda y el ejemplo del pegado no saltaba de línea.
  - No comprobado en el navegador: conectar una carpeta real (el selector nativo no se automatiza; lo cubren los tests sobre la carpeta en memoria) y restaurar desde un fichero (lo cubren los tests del documento y del almacén).
- [x] 5.2 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 5.3 Ejecutar `openspec validate personas-hub --strict` y verificar que pasa.
