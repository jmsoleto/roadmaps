## ADDED Requirements

### Requirement: Un contrato tiene bloques reutilizables con nombre

El sistema MUST permitir describir dentro de un contrato N modelos, cada uno con un nombre, una descripción y su propio árbol de campos, editado igual que el cuerpo de una respuesta.

El sistema MUST ofrecer crear, renombrar, describir, duplicar y borrar modelos, y MUST listarlos junto a los endpoints para poder elegir cuál se está editando.

Un modelo MUST poder existir sin que nadie lo use todavía: se crea antes de referenciarlo.

#### Scenario: Crear un modelo

- **WHEN** el usuario crea un modelo en un contrato
- **THEN** el sistema lo añade con un nombre editable y su árbol vacío, y lo abre

#### Scenario: Duplicar un modelo

- **WHEN** el usuario duplica un modelo con tres campos
- **THEN** el sistema crea otro con los mismos campos y un nombre que no choca, y editar cualquiera de los dos deja intacto al otro

#### Scenario: Renombrar un modelo

- **WHEN** el usuario cambia el nombre de un modelo al que apuntan dos campos
- **THEN** los dos campos siguen apuntando a él, y el documento exportado usa el nombre nuevo

### Requirement: Un campo puede apuntar a un modelo

El sistema MUST admitir que un campo sea una referencia a un modelo, y que un array declare que sus elementos son de un modelo.

Un campo que es una referencia MUST NOT pedir ni ejemplo ni hijos: su forma es la del modelo. MUST conservar su clave, su comentario y su obligatoriedad, que son suyos y no del modelo.

El sistema MUST permitir ir del campo al modelo que referencia, para poder mirarlo sin buscarlo en la lista.

#### Scenario: Un campo que es una referencia

- **WHEN** el usuario da a un campo `paginacion` el tipo referencia y elige el modelo `Paginacion`
- **THEN** el campo deja de pedir ejemplo e hijos, y el ejemplo JSON muestra la forma de ese modelo

#### Scenario: Un array de un modelo

- **WHEN** el usuario declara un campo `items` como array cuyos elementos son el modelo `ItemProducto`
- **THEN** el ejemplo muestra un array con un elemento con la forma de ese modelo

#### Scenario: El comentario del campo es del campo

- **WHEN** el usuario escribe un comentario en un campo que es una referencia
- **THEN** el sistema lo conserva en el campo, sin tocar la descripción del modelo

#### Scenario: Ir al modelo

- **WHEN** el usuario pide abrir el modelo que un campo referencia
- **THEN** el sistema muestra ese modelo en edición

### Requirement: Extraer un bloque a modelo sin cambiar lo que describe

El sistema MUST permitir convertir un objeto ya escrito en un modelo con nombre, dejando el campo original como una referencia a él.

**El ejemplo JSON generado MUST ser idéntico antes y después.** Es lo que hace que la operación se pueda hacer en directo delante de alguien: extraer un bloque reorganiza el contrato, no lo cambia.

El nombre propuesto MUST derivarse de la clave del campo, y MUST NOT chocar con el de otro modelo.

#### Scenario: Extraer un bloque repetido

- **WHEN** el usuario extrae a modelo un objeto `paginacion` con tres campos
- **THEN** el sistema crea un modelo con esos tres campos, el campo original pasa a referenciarlo, y el JSON de ejemplo sigue siendo el mismo

#### Scenario: Extraer un array de objetos

- **WHEN** el usuario extrae a modelo un campo `items` que es un array de objetos
- **THEN** el sistema crea un modelo con la forma del elemento y el campo pasa a ser un array de ese modelo

### Requirement: Deshacer una referencia en el sitio

El sistema MUST permitir expandir una referencia: el campo deja de apuntar al modelo y pasa a describir sus campos directamente.

Expandir MUST **copiar**, no mover: el modelo original MUST quedar intacto, y los demás campos que lo referencian MUST seguir haciéndolo.

#### Scenario: Expandir una referencia

- **WHEN** el usuario expande un campo que referencia al modelo `Paginacion`
- **THEN** el campo pasa a ser un objeto con una copia de los campos del modelo

#### Scenario: El modelo sobrevive a que lo expandan

- **WHEN** el usuario expande una de las tres referencias a un modelo
- **THEN** el modelo sigue existiendo y las otras dos referencias siguen apuntando a él

### Requirement: Saber quién usa un modelo antes de tocarlo

El sistema MUST mostrar en qué sitios se usa cada modelo, nombrándolos, y MUST decirlo también donde se elige borrarlo.

Borrar un modelo que está en uso MUST advertir de cuántas referencias van a quedar rotas, y MUST NOT borrarlo sin confirmación. Un modelo que no usa nadie se puede borrar con la confirmación normal.

Romper un contrato sin enterarse es el fallo que esta pantalla existe para evitar: una referencia rota no se ve hasta que alguien exporta.

#### Scenario: Dónde se usa

- **WHEN** el usuario abre un modelo referenciado desde dos respuestas y un cuerpo de petición
- **THEN** el sistema nombra esos tres sitios

#### Scenario: Borrar un modelo en uso

- **WHEN** el usuario pide borrar un modelo usado en tres sitios
- **THEN** el sistema advierte de que quedarán tres referencias rotas y solo lo borra si se confirma

#### Scenario: Un modelo que no usa nadie

- **WHEN** el usuario abre un modelo al que no apunta ningún campo
- **THEN** el sistema lo dice, en lugar de no mostrar nada

### Requirement: Un modelo recursivo no cuelga la aplicación

El sistema MUST admitir que un modelo se referencie a sí mismo, directa o indirectamente: un árbol de categorías es un contrato legítimo y frecuente.

Al generar el **ejemplo**, el sistema MUST cortar la recursión, mostrando la forma sin intentar desarrollarla infinitamente. El ejemplo es ilustrativo, no exhaustivo.

Al generar el **schema**, el sistema MUST conservar la referencia recursiva. Es válida en OpenAPI y es la forma correcta de describir un árbol; cortarla ahí produciría un contrato que dice algo distinto de lo acordado.

#### Scenario: Un modelo que se contiene a sí mismo

- **WHEN** el usuario crea un modelo `Categoria` con un campo `hijas` que es un array de `Categoria`
- **THEN** el sistema genera el ejemplo sin bloquearse, cortando la recursión

#### Scenario: El schema conserva la recursión

- **WHEN** el usuario exporta un contrato con un modelo recursivo
- **THEN** el documento conserva la referencia a sí mismo

#### Scenario: Un ciclo entre dos modelos

- **WHEN** un modelo `A` referencia a `B` y `B` referencia a `A`
- **THEN** el sistema genera el ejemplo sin bloquearse

### Requirement: Los modelos viajan dentro del documento exportado

El sistema MUST emitir cada modelo del contrato como un schema con nombre dentro del documento, y MUST hacer que las referencias apunten a él **dentro del mismo documento**.

El sistema MUST NOT emitir referencias a ficheros externos, ni siquiera para los modelos. La reutilización de esta herramienta es de diseño, no de fichero: un `$ref` externo es legal y los generadores y los agentes lo resuelven mal o lo ignoran.

Un campo que es una referencia **y tiene comentario** MUST emitirse de forma que el comentario sobreviva. En OpenAPI 3.0.x los hermanos de un `$ref` se ignoran por especificación, así que emitir los dos al mismo nivel perdería en silencio justo lo que esta herramienta aporta.

#### Scenario: Modelos incrustados

- **WHEN** el usuario exporta un contrato con dos modelos referenciados desde tres endpoints
- **THEN** los dos modelos aparecen como schemas con nombre en el documento y todas las referencias son internas

#### Scenario: Comentario sobre una referencia

- **WHEN** el usuario exporta un campo que es una referencia y tiene comentario
- **THEN** el documento conserva a la vez la referencia y el comentario

#### Scenario: Dos modelos cuyo nombre se normaliza igual

- **WHEN** un contrato tiene un modelo `paginación` y otro `Paginacion`
- **THEN** el documento les da nombres de schema distintos, sin que uno pise al otro

## MODIFIED Requirements

### Requirement: El árbol de campos

El sistema MUST describir el cuerpo de una petición o de una respuesta como un árbol de campos. Un campo MUST tener clave, tipo, comentario, ejemplo y obligatoriedad; y según su tipo, formato, enumeración y si admite nulo.

Los tipos MUST ser `string`, `number`, `integer`, `boolean`, `object`, `array`, `null` y **referencia a un modelo**. Un `array` MUST declarar además qué contiene —un escalar, un objeto o un modelo—, y MUST NOT poder contener otro array: es un caso raro en un contrato real que duplicaría la forma de cada campo sin aportar a la conversación.

El sistema MUST permitir añadir y borrar campos, y plegar y desplegar los que tienen hijos. El estado de plegado MUST persistir con el contrato: forma parte de cómo se dejó el trabajo.

**El comentario es el motivo de la herramienta**, no un adorno: es lo que se dice en voz alta al lado de un campo y lo que acaba siendo la documentación que lee quien implementa. El sistema MUST darle sitio en la propia fila del campo, no escondido tras una opción avanzada.

#### Scenario: Añadir un campo a un objeto

- **WHEN** el usuario añade un campo a un objeto
- **THEN** el sistema crea un campo de texto con una clave que no choca con las de sus hermanos

#### Scenario: Escribir no reorganiza el árbol

- **WHEN** el usuario escribe en la clave, el ejemplo o el comentario de un campo
- **THEN** el árbol no se reconstruye y el foco no salta a otro sitio

#### Scenario: El comentario es documentación

- **WHEN** el usuario escribe «Total de elementos, no de páginas» en el comentario de un campo
- **THEN** el sistema lo conserva como la documentación de ese campo

#### Scenario: El plegado sobrevive

- **WHEN** el usuario pliega una rama del árbol y vuelve más tarde al contrato
- **THEN** esa rama sigue plegada

#### Scenario: Un campo que apunta a un modelo

- **WHEN** el usuario elige el tipo referencia en un campo
- **THEN** el sistema le deja elegir a qué modelo del contrato apunta

### Requirement: El contrato se comprueba antes de entregarlo

El sistema MUST comprobar la coherencia del contrato y mostrar lo que encuentre **en el propio panel de exportación**, junto a lo que se va a entregar y no en otra pantalla.

Las comprobaciones MUST cubrir: rutas que no empiezan por `/`, endpoints sin ninguna respuesta, claves repetidas dentro de un mismo objeto, campos sin nombre, cuerpos declarados sin ningún campo dentro, **referencias a un modelo que no existe**, **arrays de un modelo que no existe**, **dos modelos cuyo nombre se normaliza al mismo nombre de schema**, y **modelos que no usa nadie**.

Las cuatro últimas MUST distinguirse por su gravedad: una referencia rota entrega un contrato que describe algo que no está, y un modelo huérfano solo entrega uno con un bloque de más. El sistema MUST NOT presentarlas como el mismo problema.

Cada aviso MUST decir **dónde** ocurre, no solo qué ocurre: «hay una clave duplicada» sin decir en qué respuesta de qué endpoint obliga a buscarla a mano.

El validador MUST NOT impedir exportar. A mitad de una reunión, un contrato incompleto entregado es más útil que ninguno, y quien exporta ya está viendo lo que le falta.

#### Scenario: Una clave duplicada

- **WHEN** un objeto de la respuesta 200 de un endpoint tiene dos campos llamados `nombre`
- **THEN** el sistema lo avisa diciendo en qué endpoint y en qué respuesta ocurre

#### Scenario: Una ruta mal escrita

- **WHEN** un endpoint tiene la ruta `catalogo/productos`
- **THEN** el sistema avisa de que debe empezar por `/`

#### Scenario: Avisar no impide exportar

- **WHEN** el contrato tiene avisos
- **THEN** el sistema los muestra y permite copiar y descargar igualmente

#### Scenario: Un contrato coherente

- **WHEN** el contrato no tiene ningún problema de los comprobados
- **THEN** el sistema lo dice, en lugar de no mostrar nada

#### Scenario: Una referencia rota

- **WHEN** un campo apunta a un modelo que ya no existe
- **THEN** el sistema lo avisa diciendo dónde está ese campo

#### Scenario: Un modelo huérfano

- **WHEN** un contrato tiene un modelo al que no apunta ningún campo
- **THEN** el sistema lo avisa como algo menor, distinto de una referencia rota

#### Scenario: Nombres de schema que colisionan

- **WHEN** un contrato tiene un modelo `paginación` y otro `Paginacion`
- **THEN** el sistema avisa de que los dos generan el mismo nombre de schema
