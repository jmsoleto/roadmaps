## MODIFIED Requirements

### Requirement: El almacén de Links Hub vive fuera del de las demás aplicaciones

Las áreas y los enlaces de Links Hub MUST guardarse bajo una clave propia del almacenamiento local, separada de la de Roadmaps y del almacén de documentos de Decisions y API Hub, de modo que ninguna aplicación pueda corromper ni desalojar los datos de otra.

Mientras Links Hub no esté conectado a una carpeta, el almacenamiento MUST ser síncrono y estar disponible antes del primer fotograma. Es la excepción declarada frente a Decisions y API Hub, y la razón es el día en que se usa: en una guardia no puede haber un desenlace «el almacén no responde» entre el usuario y el enlace que necesita, y el volumen —unas decenas de enlaces— no justifica pagar ese riesgo.

Con una carpeta conectada, la excepción no vale, y es una decisión de quien conecta: leer una carpeta es asíncrono y puede depender de un permiso. Links Hub MUST entonces mostrar que se está abriendo mientras lee la carpeta, y MUST distinguir una carpeta que no se puede leer de una vacía, con las mismas reglas que las demás aplicaciones. El almacén del navegador MUST quedar intacto hasta que se desconecte.

El sistema MUST tolerar un contenido ilegible o escrito por una versión anterior arrancando con lo que sí pueda interpretar, en lugar de no arrancar.

#### Scenario: Los enlaces sobreviven a cerrar el navegador

- **WHEN** el usuario crea áreas y enlaces, cierra el navegador y vuelve a abrir la aplicación
- **THEN** el sistema muestra las mismas áreas y los mismos enlaces, con su orden, su tamaño y sus colores

#### Scenario: Un contenido ilegible no impide arrancar

- **WHEN** la clave de Links Hub contiene algo que el sistema no puede interpretar
- **THEN** la aplicación arranca igualmente, con lo que haya podido recuperar o vacía, y el resto del contenedor no se ve afectado

#### Scenario: Los datos de una aplicación no tocan los de otra

- **WHEN** el usuario elimina todos los enlaces de Links Hub
- **THEN** los roadmaps, las decisiones y los contratos siguen intactos

#### Scenario: Sin carpeta, nunca hay espera

- **WHEN** el usuario abre Links Hub sin ninguna carpeta conectada
- **THEN** los enlaces están en pantalla desde el primer fotograma, sin ningún estado de «abriendo»

#### Scenario: Con carpeta, la espera se dice

- **WHEN** el usuario abre Links Hub conectado a una carpeta que todavía se está leyendo, o sobre la que falta el permiso
- **THEN** el sistema indica que se está abriendo o que falta el permiso, y no muestra un panel vacío
