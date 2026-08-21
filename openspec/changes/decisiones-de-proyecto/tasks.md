## 1. Almacén, antes que nada

- [x] 1.1 Backend IndexedDB tras el `Storage` seam existente: apertura, versión de esquema, un almacén de objetos para las decisiones (D1)
- [x] 1.2 Distinguir "abrió y está vacío" de "no se pudo abrir", como estados distintos y no como el mismo
- [x] 1.3 Test: primer arranque sin base, lectura y escritura con ida y vuelta, y fallo de apertura reportado como fallo y no como vacío
- [x] 1.4 Test: el backend de Roadmaps no se toca — sus claves de `localStorage` siguen siendo las mismas antes y después de escribir decisiones

## 2. Modelo y derivaciones puras

- [x] 2.1 Tipos: `Decision` con sus dos textos y el contexto, `Option` con sus efectos por eje, `Recommendation`, `Resolution`
- [x] 2.2 Los tres ejes fijos (coste, plazo, riesgo) y las tres direcciones, en un módulo propio para que añadir un cuarto sea una línea (D5)
- [x] 2.3 `decisionState()`: los cinco estados derivados, con `today` como parámetro para que quede puro (D2)
- [x] 2.4 `outcome()`: coincidió / se decidió otra / fuera de las alternativas, y `null` cuando no hubo recomendación (D3)
- [x] 2.5 Orden por urgencia: caducadas, luego límite más próximo, luego sin fecha
- [x] 2.6 Sugerencias de proyecto a partir de los valores ya usados (D6)
- [x] 2.7 Test: los cinco estados, incluido resuelta-fuera-de-plazo y planteada-sin-límite
- [x] 2.8 Test: los tres desenlaces y el caso sin recomendación
- [x] 2.9 Test: el orden por urgencia con las tres clases de fecha mezcladas

## 3. Store de Decisions

- [x] 3.1 Store reactivo con carga asíncrona, autosave con agrupación y volcado al cerrar, siguiendo la forma del de Roadmaps
- [x] 3.2 Alta rápida: crea un borrador solo con la duda de origen (D7)
- [x] 3.3 Preparar: escribe la pregunta a negocio, propuesta con el texto de origen la primera vez (D4)
- [x] 3.4 Alternativas: añadir, reordenar, editar y borrar, con sus efectos por eje
- [x] 3.5 Recomendar, y **plantear** como gesto explícito que registra su fecha y congela la recomendación (D3)
- [x] 3.6 Rechazar cualquier cambio de recomendación en una decisión ya planteada
- [x] 3.7 Resolver: por alternativa o por texto libre, con su fecha
- [x] 3.8 Campos de acompañamiento: proyecto, responsable, límite, impacto, notas
- [x] 3.9 Test: la recomendación es editable antes de plantear y no lo es después
- [x] 3.10 Test: el alta rápida no exige ningún campo más y rechaza el texto vacío
- [x] 3.11 Test: la pregunta se propone con el origen solo la primera vez, y no vuelve a pisar lo escrito

## 4. Portabilidad

- [x] 4.1 Export de decisiones a JSON autocontenido, independiente del de roadmaps
- [x] 4.2 Import con identidad nueva, todo-o-nada, y rechazo explicado de lo que no se reconoce
- [x] 4.3 Rechazar un documento de roadmaps importado en Decisions, y al revés
- [x] 4.4 Test: ida y vuelta completa, reconstruyendo estado y desenlace sin datos añadidos
- [x] 4.5 Test: importar dos veces convive en lugar de pisar

## 5. La aplicación

- [x] 5.1 Diálogo de captura rápida: un campo, Enter, y listo para el siguiente
- [x] 5.2 Lista de decisiones con su estado, proyecto, responsable, límite e impacto, ordenada por urgencia
- [x] 5.3 Bandeja de borradores, visible y contada, no escondida (D7)
- [x] 5.4 Filtro por proyecto y por estado
- [x] 5.5 Panel de detalle: los dos textos con su contexto, alternativas con ejes, recomendación, resolución y notas
- [x] 5.6 Editor de alternativas con los ejes en rejilla, comparables entre sí de un vistazo
- [x] 5.7 Acción de plantear, con lo que congela dicho de forma explícita antes de confirmarlo
- [x] 5.8 Acción de resolver, por alternativa o por texto, y presentación del desenlace
- [x] 5.9 Estado de almacén no disponible, en lugar de una lista vacía (D-riesgo)
- [x] 5.10 Autocompletado de proyecto

## 6. Entrada en el hub

- [x] 6.1 Decisions pasa a `live` en `apps.ts`, con su ruta
- [x] 6.2 Resumen de Decisions en `registry.ts`: cifras, lista corta con su etiqueta propia y avisos (D8)
- [x] 6.3 Acciones de la tarjeta: abrir, capturar y abrir una decisión concreta desde una fila
- [x] 6.4 Acciones propias de Decisions en el topbar, por la vía condicional que ya existe
- [x] 6.5 Rehacer los casos de `apps.test.ts` y `routes.test.ts` que se apoyaban en que existía una aplicación anunciada: la regla sigue, el ejemplo pasa a ser una definición de prueba
- [x] 6.6 Test: las cifras cuentan abiertas y no el total histórico, y la caducada lleva tono solo si es mayor que cero
- [x] 6.7 **Comprobar que `hub-landing` y `hub-shell` no han necesitado ni un requisito nuevo.** Es la prueba del contrato del change anterior; si hiciera falta tocarlos, hay que parar y entender por qué

## 7. Verificación

- [x] 7.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 7.2 Recorrido manual: capturar tres decisiones seguidas en modo reunión y comprobar que no estorba nada
- [x] 7.3 Recorrido manual: traducir, valorar alternativas, recomendar, plantear, y comprobar que la recomendación ya no se deja editar
- [x] 7.4 Recorrido manual: resolver por alternativa distinta y por texto libre, y leer los dos desenlaces
- [x] 7.5 Recorrido manual: dejar vencer una decisión y verla caducada sin tocar nada; aplazarla y verla volver
- [x] 7.6 Recorrido manual: export, borrar todo, import, y comprobar que vuelve idéntico
- [x] 7.7 Comprobar sobre datos reales que los roadmaps siguen guardando con decisiones en el almacén
