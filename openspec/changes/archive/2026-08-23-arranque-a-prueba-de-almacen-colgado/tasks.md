## 1. Registro retroactivo

- [x] 1.1 Límite de espera en la apertura del almacén, con su motivo explicado
- [x] 1.2 Decisions se inicializa fuera del arranque, no dentro
- [x] 1.3 Estado de "abriendo", distinto del de vacío y del de no disponible
- [x] 1.4 Test: una base que no dispara ningún evento se rinde en lugar de esperar siempre
- [x] 1.5 Test: se reporta como no disponible, no como vacía
- [x] 1.6 Comprobado en producción: la app monta, Decisions dice por qué no está, y el hub y Roadmaps funcionan
