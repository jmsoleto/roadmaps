## Why

La captura ya cuesta un campo y un Enter, y aun así hay un momento en que teclear no es una opción: mientras alguien está hablando. Una duda que sale a mitad de una explicación se pierde si hay que dejar de escuchar para escribirla.

Dictarla resuelve eso, y el boceto lo plantea bien: *"el navegador la escucha y la transcribe. Solo se guarda el texto."*

## What Changes

- **Dictar la duda desde la captura rápida.** Se pulsa, se habla, y el texto aparece en el mismo campo de siempre, editable antes de guardar.
- **Solo queda el texto.** No se guarda audio en ninguna parte, ni siquiera temporalmente: la transcripción la hace el navegador y lo que llega a la aplicación ya son palabras.
- **BREAKING para la promesa de `local`** — y por eso va con aviso. La transcripción del navegador **envía el audio a un servicio del fabricante**. Es la única forma de transcribir sin descargar un modelo de decenas de megas, y se acepta a sabiendas, pero la aplicación dice `local` en su topbar porque hasta ahora era verdad del todo. Mientras se dicta, la interfaz lo advierte.
- **Los fragmentos dudosos se señalan**, para revisarlos antes de guardar. **No las palabras**: la interfaz del navegador da confianza por fragmento reconocido, no por palabra, así que marcar palabras sueltas —como pedía el boceto— sería inventarse un dato.
- **Donde no hay transcripción, no hay botón.** Firefox no la implementa; allí la captura sigue siendo exactamente la de hoy, sin un control que no haría nada.
- **La procedencia queda registrada.** Una decisión dictada se marca como tal, en el campo que el change de las tres fases ya dejó preparado.

Fuera de alcance:

- **Transcribir en el propio dispositivo.** Evitaría que el audio saliera, a cambio de descargar un modelo grande y de complicar el funcionamiento sin conexión. Si la privacidad pesa más que la comodidad, es un change propio y con su propia decisión.
- **Guardar el audio.** Ni como respaldo de la transcripción.
- **Dictar en cualquier otro sitio de la aplicación.**

## Capabilities

### Modified Capabilities

- `decisions`: la captura admite dictado, con lo que eso implica sobre dónde va el audio, qué se guarda y qué pasa donde no hay transcripción.

### Sin cambios

- `local-persistence`: no se guarda nada nuevo. El texto dictado es texto.
- `data-portability`, `hub-landing`, `hub-shell`.

## Impact

**Interfaz**

- `QuickCapture.svelte`: el botón de dictar, el estado mientras se graba, y el aviso de a dónde va el audio.
- Nuevo: el envoltorio de la interfaz de reconocimiento del navegador, con su parte pura separada para poder probarla.

**Sin impacto**

- El modelo: `captureSource` ya existe desde el change de las tres fases, previendo exactamente esto.
- El almacén, Roadmaps y el hub.
