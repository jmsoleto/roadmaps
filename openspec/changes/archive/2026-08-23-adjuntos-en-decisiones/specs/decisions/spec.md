## ADDED Requirements

### Requirement: Apoyo visual en la fase de estudio
El sistema MUST permitir asociar imágenes a una decisión durante la fase de estudio, pegándolas desde el portapapeles, arrastrándolas o eligiéndolas con el selector de archivos. Pegar MUST funcionar con la decisión abierta, sin exigir enfocar ningún campo.

El sistema MUST mostrarlas como miniaturas, MUST permitir verlas a tamaño completo y MUST permitir quitarlas.

El sistema MUST admitir únicamente imágenes, y MUST rechazar lo demás diciendo por qué.

Una imagen pegada no trae nombre; el sistema MUST asignarle uno derivado del momento en que se pegó. El nombre es lo único que identifica a un adjunto en un documento exportado, que no lleva sus bytes.

#### Scenario: Pegar una captura
- **WHEN** el usuario copia una captura de pantalla y pega con la decisión abierta
- **THEN** el sistema la adjunta a esa decisión y la muestra como miniatura

#### Scenario: Arrastrar un diagrama
- **WHEN** el usuario suelta un archivo de imagen sobre el bloque de apoyo visual
- **THEN** el sistema lo adjunta conservando su nombre

#### Scenario: Algo que no es una imagen
- **WHEN** el usuario intenta adjuntar un archivo que no es una imagen
- **THEN** el sistema no lo adjunta e indica que solo admite imágenes

#### Scenario: Ver a tamaño completo
- **WHEN** el usuario activa una miniatura
- **THEN** el sistema muestra la imagen a tamaño completo y permite volver

#### Scenario: Quitar un adjunto
- **WHEN** el usuario quita un adjunto
- **THEN** el sistema deja de mostrarlo y libera el espacio que ocupaba

### Requirement: Peso de los adjuntos
El sistema MUST mostrar el peso de cada adjunto y el total que ocupan los de una decisión.

El sistema MUST rechazar un archivo que supere el límite admitido, indicando cuánto pesa y cuál es el tope. El sistema MUST NOT reescalar ni recomprimir lo que el usuario adjunta: cambiar el archivo que alguien decidió guardar es decisión suya.

#### Scenario: Un archivo desmesurado
- **WHEN** el usuario intenta adjuntar una imagen que supera el límite
- **THEN** el sistema no la adjunta e indica su peso y el máximo admitido

#### Scenario: Saber cuánto se está ocupando
- **WHEN** una decisión tiene adjuntos
- **THEN** el sistema muestra el peso de cada uno y su total

### Requirement: Un adjunto sin bytes se declara como ausente
El sistema MUST distinguir un adjunto cuya imagen tiene de uno cuya ficha conoce pero cuyos bytes no están —el caso de un documento importado— y MUST mostrar el segundo como una ausencia declarada, con su nombre y su peso original.

El sistema MUST NOT ofrecer abrir un adjunto sin bytes, y MUST NOT borrar su ficha: es el registro de que esa imagen existió y de dónde vino.

#### Scenario: Importar una decisión con adjuntos
- **WHEN** el usuario importa un documento cuyas decisiones declaraban adjuntos
- **THEN** el sistema muestra cada uno con su nombre y su peso, indicando que no venía en el documento

#### Scenario: Una ausencia no se puede abrir
- **WHEN** el usuario activa un adjunto sin bytes
- **THEN** el sistema no muestra ninguna imagen y mantiene la ficha
