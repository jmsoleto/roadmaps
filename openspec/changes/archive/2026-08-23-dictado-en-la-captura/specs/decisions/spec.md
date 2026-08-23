## ADDED Requirements

### Requirement: Dictar la duda en la captura
El sistema MUST permitir dictar la duda desde la captura rápida, transcribiéndola al mismo campo de texto que se usa al teclear, donde MUST poder corregirse antes de guardar.

Mientras se dicta, el sistema MUST indicar que está escuchando y cuánto lleva.

El sistema MUST permitir parar y quedarse con lo transcrito, y MUST permitir descartar sin crear ninguna decisión.

El resto de la captura MUST seguir funcionando igual: confirmar guarda y deja lista la siguiente, y descartar cierra.

#### Scenario: Apuntar una duda mientras alguien habla
- **WHEN** el usuario dicta una duda y para
- **THEN** el sistema deja el texto transcrito en el campo de la duda, editable, sin haber creado nada todavía

#### Scenario: Corregir antes de guardar
- **WHEN** el usuario edita el texto transcrito y confirma
- **THEN** el sistema guarda lo que quedó en el campo, no lo que se transcribió

#### Scenario: Descartar lo dictado
- **WHEN** el usuario descarta mientras dicta o después
- **THEN** el sistema no crea ninguna decisión

#### Scenario: Dictar sobre algo ya escrito
- **WHEN** el usuario dicta con texto ya en el campo
- **THEN** el sistema añade lo transcrito a lo que había, sin borrarlo

### Requirement: Solo se guarda el texto, y se advierte de a dónde va el audio
El sistema MUST NOT guardar audio en ninguna parte, ni siquiera de forma temporal: lo que la aplicación maneja es el texto que el navegador le entrega.

Como la transcripción del navegador **envía el audio a un servicio ajeno a la máquina**, el sistema MUST advertirlo mientras se dicta, junto al indicador de que está escuchando. Es el único momento en que esa advertencia sirve para decidir algo.

#### Scenario: Advertencia en el momento
- **WHEN** el usuario está dictando
- **THEN** el sistema indica que el audio se envía a un servicio externo para transcribirlo

#### Scenario: No queda audio
- **WHEN** el usuario termina de dictar, guarde o descarte
- **THEN** el sistema no conserva ninguna grabación

### Requirement: Los fragmentos dudosos se señalan
El sistema MUST señalar los fragmentos que el navegador transcribió con poca confianza, para que se revisen antes de guardar, e MUST indicar cuántos son.

El sistema MUST NOT señalar palabras sueltas: la transcripción da confianza por fragmento y no por palabra, y repartirla entre palabras sería fabricar un dato con apariencia de medida.

#### Scenario: Un fragmento dudoso
- **WHEN** el navegador transcribe un fragmento con poca confianza
- **THEN** el sistema lo señala e indica cuántos fragmentos hay así

#### Scenario: Todo claro
- **WHEN** todos los fragmentos se transcriben con confianza suficiente
- **THEN** el sistema no señala ninguno

### Requirement: Donde no hay transcripción, no se ofrece dictar
Cuando el navegador no ofrece transcripción, el sistema MUST NOT mostrar el control de dictado, y la captura MUST comportarse exactamente como cuando solo se teclea.

Cuando el usuario no concede el micrófono, el sistema MUST decirlo en la propia captura y MUST seguir permitiendo escribir.

#### Scenario: Un navegador sin transcripción
- **WHEN** el usuario abre la captura en un navegador que no la implementa
- **THEN** el sistema no muestra ningún control de dictado y la captura funciona como siempre

#### Scenario: Micrófono denegado
- **WHEN** el usuario deniega el acceso al micrófono
- **THEN** el sistema lo indica en la captura y sigue permitiendo teclear la duda

### Requirement: Queda registrado que la duda se dictó
El sistema MUST registrar como dictada la decisión cuya duda entró por transcripción, y como tecleada la que se escribió.

#### Scenario: Procedencia de una duda dictada
- **WHEN** el usuario guarda una duda que dictó
- **THEN** el sistema registra que su texto entró por dictado

#### Scenario: Procedencia de una duda escrita
- **WHEN** el usuario guarda una duda que tecleó
- **THEN** el sistema registra que su texto entró tecleado
