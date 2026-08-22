## Context

El almacén de Decisions se eligió en su día pensando en este momento: IndexedDB, y no `localStorage`, precisamente porque *"el almacén se elige por dónde va a acabar, no por dónde empieza"*. Acaba aquí.

Dos restricciones heredadas mandan:

1. **El documento se guarda entero en cada escritura.** `IndexedDbBackend.save` hace un `put` del documento completo bajo una sola clave, y eso es deliberado: un guardado es todo o nada. Con los bytes dentro, cada tecla reescribiría megabytes.
2. **El export es la única copia de seguridad que existe.** No hay servidor. Lo que no viaje en el JSON no se puede recuperar en otra máquina.

## Goals / Non-Goals

**Goals:**

- Que pegar una captura cueste `⌘V` y nada más.
- Que las imágenes no ralenticen el guardado del texto.
- Que un export sin bytes no parezca completo al importarlo.
- Que ningún byte quede ocupando espacio sin una decisión que lo reclame.

**Non-Goals:**

- Reescalar o recomprimir lo que el usuario guarda.
- Adjuntos que no sean imagen.
- Decidir qué se proyecta en la fase 3.
- Sincronizar imágenes entre navegadores.

## Decisions

### D1 — Los bytes en su propio almacén de objetos, la ficha en el documento

```
  tech-lead-hub (IndexedDB)
   ├── decisions      doc:v1  → { decisions: [ … fichas … ] }   se reescribe entero
   └── attachments    <id>    → Blob                            se escribe una vez
```

La razón no es de orden, es de coste. Con los bytes dentro del documento, escribir una coma en una nota reescribiría todas las imágenes de todas las decisiones. Separados, el documento sigue siendo pequeño y cada blob se escribe una vez y no se vuelve a tocar.

De regalo, la ficha —nombre, tamaño, tipo, fecha— vive en el documento, y eso hace que **el manifiesto del export salga gratis**: el export ya lleva el documento, así que ya lleva la lista de lo que había.

*Alternativa descartada:* base64 dentro del documento. Es lo que haría `localStorage` si siguiéramos allí, y además de inflar un 33% convierte cada guardado en una serialización de megabytes.

### D2 — Pegar es la vía principal

El gesto real es capturar la pantalla y pegar. Ni pasa por el disco ni obliga a nombrar un archivo, y es lo que se hace en mitad de un análisis.

Se ofrecen también arrastrar y el selector de archivos, porque un diagrama que ya existe llega por ahí. Pero el bloque escucha `paste` mientras la decisión está abierta, sin que haya que enfocar nada.

Una imagen pegada no trae nombre. Se le pone uno derivado del momento (`captura-<fecha>-<hora>.png`) en lugar de dejarlo vacío: el nombre es lo único que identifica al adjunto en un export que no lleva sus bytes.

### D3 — El export lleva el manifiesto y el hueco se ve al importar

```
  export.json
    attachments: [ { id, name, size, mime, addedAt } ]      ← viaja
    (bytes)                                                 ← no viaja

  al importar
    ┌──────────────────────────────────┐
    │ 🖼 flujo-psp.png · 402 KB         │
    │    no viene en este export       │
    └──────────────────────────────────┘
```

Omitir los bytes fue una decisión explícita —un documento de decisiones con imágenes dentro son decenas de megas—, pero omitirlos **en silencio** convertiría una pérdida en una sorpresa. La ficha viaja, y el que importa ve exactamente qué le falta y cuánto pesaba.

Un adjunto sin bytes no es un error: es una ficha cuya imagen está en otra máquina. Se muestra como tal y no se puede abrir.

*Alternativa descartada:* incluir los bytes en base64 y que el usuario elija. Duplica el formato de export y obliga a decidir en el peor momento, cuando lo que quieres es una copia de seguridad rápida.

### D4 — Los huérfanos se recogen al cargar

Borrar una decisión borra sus bytes. Pero entre dos operaciones puede caerse la pestaña, y un blob sin dueño no lo reclama nadie ni se ve en ninguna parte.

Al arrancar, tras leer el documento, se recorren las claves del almacén de bytes y se borra lo que ninguna ficha menciona. Es barato —son claves, no contenidos— y evita la única forma que tiene esta aplicación de acumular basura invisible.

La dirección importa: **se borran bytes sin ficha, nunca fichas sin bytes**. Una ficha sin bytes es exactamente lo que produce un import (D3), y borrarla destruiría la información de que esa imagen existió.

### D5 — Tamaño: se avisa, se rechaza lo desmesurado, y no se reescala

Se muestra el peso de cada adjunto y el total ocupado por la aplicación, porque el usuario no tiene otra forma de saberlo.

Un archivo por encima del límite se rechaza diciendo cuánto pesa y cuál es el tope, en lugar de aceptarlo y degradar el almacén. El límite es generoso: un pantallazo de pantalla completa en un Retina anda por los pocos megas, y el tope tiene que dejar pasar eso sin pensarlo.

No se reescala: cambiar el archivo que alguien decidió guardar es una decisión suya, no de la aplicación. Si el espacio llega a molestar de verdad, reescalar es un change propio y con su propio aviso.

## Risks / Trade-offs

- **Subir la versión del esquema de IndexedDB abre la puerta al fallo por "otra pestaña con la versión anterior"** → Ya está contemplado: ese caso es el `unavailable` que la aplicación sabe distinguir de un almacén vacío, y que muestra en lugar de arrancar en blanco.
- **Las URL de objeto se filtran si no se revocan** → Cada miniatura revoca la suya al desmontarse. Es la única fuga posible aquí y es local a un componente.
- **Un export deja de ser una copia de seguridad completa** → Se acepta y se dice. El manifiesto es lo que impide que la pérdida sea silenciosa, y la alternativa —exports de decenas de megas— hace que nadie los haga.
- **La recogida de huérfanos borra datos** → Solo bytes que ninguna ficha menciona, y solo después de haber leído el documento con éxito. Si el documento no se pudo leer, la aplicación está en `unavailable` y no se recoge nada.

## Migration Plan

La base sube de versión y estrena un almacén de objetos. Las decisiones existentes no se tocan: sin fichas de adjunto, la lista nace vacía.

**Rollback:** una versión anterior abre la base con su número de versión más bajo, que IndexedDB rechaza — la aplicación mostraría el estado de almacén no disponible en lugar de perder nada. Conviene exportar antes de desplegar, que es lo mismo que valía para el change anterior.

## Open Questions

- **¿Debería el export ofrecer una variante con bytes?** Hoy no, por lo que dice D3. Si mover decisiones entre máquinas resulta ser algo que pasa de verdad, se plantea con su propio formato.
- **¿Un adjunto debería poder colgar de una alternativa concreta**, y no solo de la decisión? El boceto solo enseña lo segundo. Colgarlo de la alternativa encajaría con la matriz, pero multiplica la interfaz por el número de columnas.
