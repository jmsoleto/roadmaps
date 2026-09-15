## 1. El grupo de acciones de una baldosa

Va primero: el lápiz es un botón más dentro de un grupo que todavía no existe, y las flechas se mudan a él.

- [ ] 1.1 `LinkTile.svelte`: un contenedor para las acciones en el borde inferior de la baldosa, con el lápiz a la izquierda y las flechas a la derecha, hermano del ancla como ya lo son el asa y las flechas — D1
- [ ] 1.2 `LinkTile.svelte`: el contenedor a `pointer-events: none` y cada botón a `auto`, o el borde inferior de la baldosa deja de abrir el enlace — D4
- [ ] 1.3 `LinkTile.svelte`: las flechas dejan de montarse con `{#if focused}` y pasan a existir siempre, con `tabindex={focused ? 0 : -1}` — D3
- [ ] 1.4 `LinkTile.svelte`: el grupo se ve con `.cell:hover` o con el enlace enfocado, y con el mismo desvanecido corto que ya usa `.grip.plain`; en reposo no se ve — D2
- [ ] 1.5 **Punto de verificación**: con el puntero encima de una baldosa **no** enfocada aparecen lápiz y flechas; al sacarlo desaparecen; el centro y el borde inferior de la baldosa siguen abriendo el enlace

## 2. El lápiz

- [ ] 2.1 `LinkTile.svelte`: el botón de editar, con `tabindex={focused ? 0 : -1}` como sus vecinos, llamando a `oncustomize` — la misma puerta que ya usa la tecla `E` — D5
- [ ] 2.2 `LinkTile.svelte`: nombre accesible propio del enlace, al estilo del que ya llevan el asa y las flechas, para que la rejilla no sea una fila de «editar» idénticos
- [ ] 2.3 `LinksApp.svelte`: nada que cambiar; `oncustomize` ya llega a `linksUi.openEdit(link.id)`. Comprobarlo y dejarlo

## 3. El borrado que pregunta

- [ ] 3.1 `links/ui.svelte.ts`: `deletingLink`, con `askDeleteLink` / `cancelDeleteLink`, hermano de `deletingArea`, incluido en `reset()` — D7
- [ ] 3.2 `links/ui.svelte.ts`: `closeForm()` cancela el borrado pendiente, que es lo que el carril aprendió al tener que cancelarlo antes de arrastrar — D7
- [ ] 3.3 `LinkForm.svelte`: el botón rojo pide confirmación en vez de borrar, y el pie enseña el aviso con la confirmación y la salida, siguiendo el patrón del carril
- [ ] 3.4 `LinkForm.svelte`: el aviso cuenta **cuántos enlaces de detrás cambian de tecla**, y no lo anuncia cuando no hay ninguno detrás — D6
- [ ] 3.5 `links/store.svelte.test.ts`: eliminar un enlace corre a los de detrás un puesto dentro de su área y no toca los de las demás áreas

## 4. Verificación

- [ ] 4.1 `npm test`, `npx tsc --noEmit` y `npm run lint` en verde
- [ ] 4.2 En el navegador, sin tocar el teclado: pasar el puntero por una baldosa, pulsar el lápiz, cambiar algo y guardar — escenario «Llegar a la personalización sin el teclado»
- [ ] 4.3 Pasar el puntero por una baldosa sin enfocarla y mover el enlace con las flechas sin haberlo abierto — escenario «El puntero descubre las acciones»
- [ ] 4.4 Con el puntero fuera de la rejilla y sin enlace enfocado, ninguna baldosa enseña acciones — escenario «En reposo la rejilla está limpia»
- [ ] 4.5 Pulsar el borde inferior de una baldosa que no tiene el puntero encima: abre el enlace — escenario «Lo escondido no se come la pulsación» — D4
- [ ] 4.6 Contar las paradas del tabulador al cruzar un área de varios enlaces y comprobar que son las mismas que antes del change: una por enlace, más las acciones del enfocado — escenario «Tabular por la rejilla no se alarga» — D3
- [ ] 4.7 Con el foco en el lápiz, pulsar `E`: abre la personalización y no pasa nada raro; con el foco en una flecha, pulsar `Enter`: mueve el enlace y no lo abre. `ownsKey` ya lo cubre, y esto lo confirma
- [ ] 4.8 Eliminar el tercero de seis: el aviso dice que tres cambian de tecla; confirmar y comprobar que el que era `4` se abre ahora con el `3` — escenarios del borrado
- [ ] 4.9 Eliminar el último de su área: el aviso no anuncia ningún cambio de teclas — escenario «Eliminar el último de su área»
- [ ] 4.10 Pedir un borrado, cerrar el panel con el fondo, y volver a abrir la personalización del mismo enlace: sigue existiendo y no hay borrado pendiente — escenario «Un borrado sin confirmar no ocurre»
