## 1. La parte que se puede probar

- [x] 1.1 Unir fragmentos transcritos en un texto, respetando lo que ya hubiera escrito (D4)
- [x] 1.2 Umbral de confianza y recuento de fragmentos dudosos (D2)
- [x] 1.3 Formato del tiempo que lleva grabando
- [x] 1.4 Test: fragmentos que llegan sueltos se unen en orden y con espacios sensatos
- [x] 1.5 Test: se cuentan los dudosos y no se marca ninguna palabra
- [x] 1.6 Test: dictar sobre texto existente lo conserva

## 2. Envoltorio del reconocimiento

- [x] 2.1 Detectar si el navegador ofrece transcripción (D3)
- [x] 2.2 Envoltorio con su fábrica de reconocedores inyectable, como el backend de almacenamiento (D5)
- [x] 2.3 Estados: escuchando, parado, denegado, no disponible
- [x] 2.4 Reiniciar mientras el usuario siga grabando, para las implementaciones que se cortan solas
- [x] 2.5 Test: los cuatro estados, con un reconocedor de mentira
- [x] 2.6 Test: el error de permiso llega como denegado y no como fallo genérico

## 3. Interfaz

- [x] 3.1 Botón de dictar en la captura, solo si el navegador puede
- [x] 3.2 Estado de grabación: que está escuchando, cuánto lleva, y parar o descartar
- [x] 3.3 **El aviso de que el audio sale de la máquina**, junto al indicador de escucha (D1)
- [x] 3.4 El texto transcrito entra en el campo de siempre y se puede corregir
- [x] 3.5 Los fragmentos dudosos, señalados y contados
- [x] 3.6 Micrófono denegado: dicho en la captura, sin bloquear el teclado
- [x] 3.7 Guardar registra la procedencia

## 4. Verificación

- [x] 4.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 4.2 Comprobar que no se ha añadido ninguna dependencia de ejecución
- [x] 4.3 Comprobar que en ningún sitio del código se guarda audio
- [x] 4.4 Recorrido manual: la captura sin dictado sigue igual de rápida
- [x] 4.5 Recorrido manual: con la transcripción real, el texto entra, se corrige y se guarda como dictado — verificado por Jose en Chrome, con micrófono y permiso concedido. La transcripción de castellano técnico resulta utilizable, así que la marca de fragmentos dudosos se queda como el detalle que se diseñó y no como pieza central
