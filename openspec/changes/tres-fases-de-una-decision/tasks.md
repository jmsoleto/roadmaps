## 1. Migración, antes que nada

- [ ] 1.1 Fijar documentos de prueba con el formato anterior: ejes con dirección, `raisedAt`, recomendación congelada
- [ ] 1.2 `normalizeDecisions()`: `raisedAt` → `readyAt`, y cada eje a su criterio con la dirección trasladada al texto (D6)
- [ ] 1.3 Los criterios que el modelo anterior no tenía nacen vacíos; ningún valor numérico se inventa
- [ ] 1.4 Aplicar la normalización en los dos sitios por los que entran datos: al cargar del almacén y al importar
- [ ] 1.5 Test: un documento anterior se lee entero, con el texto de cada eje conservado y sin valores
- [ ] 1.6 Test: la recomendación congelada sobrevive a la conversión y sigue sin poder cambiarse
- [ ] 1.7 Test: normalizar dos veces no altera nada la segunda (idempotencia)

## 2. Modelo

- [ ] 2.1 Catálogo de criterios con su tipo de valor: esfuerzo, coste, tiempo hasta valor, riesgo, beneficio, deuda (D3). Sustituye a `model/axes.ts`
- [ ] 2.2 `Assessment` con texto obligatorio y valor opcional, tipado por criterio
- [ ] 2.3 `Decision`: `raisedAt` → `readyAt`; nuevos `internalNote`, `capturedAt` y vía de entrada del texto
- [ ] 2.4 `Option.effects` → `Option.assessments`
- [ ] 2.5 Test: el valor admite vacío con texto puesto, y el texto vacío con valor puesto

## 3. Fases derivadas

- [ ] 3.1 `phaseOf()`: las tres fases más cerrada y caducada, con `today` como parámetro (D1)
- [ ] 3.2 Una decisión que no llegó a la fase 3 no caduca nunca
- [ ] 3.3 `studyChecklist()`: qué está hecho y qué no, para el cierre de la fase 2
- [ ] 3.4 `canMarkReady()`: exige pregunta a negocio y nada más
- [ ] 3.5 Test: las cinco situaciones, incluida la de fase 2 con la fecha pasada, que **no** caduca
- [ ] 3.6 Test: la lista de comprobación refleja los tres pasos por separado

## 4. Store

- [ ] 4.1 `markReady()` sustituye a `raise()`: registra la fecha y congela la recomendación (D2)
- [ ] 4.2 La congelación pasa a mirar `readyAt`; recomendar y retirar se rechazan a partir de ahí
- [ ] 4.3 Valorar un criterio de una alternativa: texto, valor, o ambos
- [ ] 4.4 Resolver exige estar en fase 3
- [ ] 4.5 Nota interna, procedencia y su registro en la captura
- [ ] 4.6 Test: la recomendación es editable en fase 2 y no lo es en fase 3
- [ ] 4.7 Test: la fecha de congelación es la de declararla lista, no la de recomendar
- [ ] 4.8 Test: no se resuelve nada que no esté en fase 3

## 5. Portabilidad

- [ ] 5.1 El documento exportado lleva criterios, nota interna, procedencia y `readyAt`
- [ ] 5.2 El import acepta el formato anterior aplicando la conversión del grupo 1
- [ ] 5.3 Test: ida y vuelta del formato nuevo, y entrada del formato anterior

## 6. Interfaz

- [ ] 6.1 Indicador de fase en el detalle: en cuál está y qué queda
- [ ] 6.2 Fase 1 en el detalle: lo capturado en técnico, con su procedencia
- [ ] 6.3 Fase 2: la pregunta a negocio señalada como lo único que se presentará
- [ ] 6.4 Matriz criterio a criterio, reescribiendo `OptionsEditor.svelte`: alternativas en columnas, criterios en filas, cada celda con su texto y su valor
- [ ] 6.5 Editores de valor por tipo: duración, importe, fecha, nivel de riesgo y apreciación de beneficio
- [ ] 6.6 Nota interna, visiblemente marcada como no presentable
- [ ] 6.7 Cierre de la fase con su lista de comprobación y el botón de declararla lista, diciendo antes qué congela
- [ ] 6.8 Reflejar las fases en la lista y en los filtros, que hoy hablan de borradores y planteadas

## 7. Hub

- [ ] 7.1 Ajustar el resumen a las fases: las cifras y los avisos siguen saliendo por el mismo contrato, pero cuentan otra cosa
- [ ] 7.2 **Comprobar que `hub-landing` y `hub-shell` siguen sin necesitar un requisito nuevo.** Segunda vez que se prueba el contrato; la primera se le escapó un rótulo

## 8. Verificación

- [ ] 8.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [ ] 8.2 Exportar desde la versión desplegada, importar en la nueva y comprobar que no se pierde nada
- [ ] 8.3 Recorrido manual: capturar, traducir, valorar tres alternativas criterio a criterio, recomendar, cerrar el estudio
- [ ] 8.4 Recorrido manual: comprobar que tras declararla lista la recomendación ya no se deja tocar
- [ ] 8.5 Recorrido manual: una decisión en fase 2 con la fecha pasada no aparece caducada
- [ ] 8.6 Comprobar sobre los datos reales del navegador que las decisiones anteriores se leen sin pérdida
