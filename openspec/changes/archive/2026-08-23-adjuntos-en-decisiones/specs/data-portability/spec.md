## ADDED Requirements

### Requirement: El documento de decisiones lleva el manifiesto de adjuntos, no sus bytes
El documento exportado MUST incluir, por cada adjunto, su nombre, su peso, su tipo y cuándo se añadió, y MUST NOT incluir su contenido binario.

Omitir el contenido es deliberado: un documento con imágenes dentro pesa decenas de megas y deja de hacerse. Lo que MUST NOT ocurrir es que se omita en silencio — el manifiesto viaja precisamente para que quien importe vea qué falta y cuánto pesaba.

#### Scenario: Exportar decisiones con adjuntos
- **WHEN** el usuario exporta decisiones que tienen imágenes adjuntas
- **THEN** el documento incluye la ficha de cada imagen y no su contenido

#### Scenario: El tamaño del documento no depende de las imágenes
- **WHEN** se exportan dos conjuntos iguales salvo por el peso de sus adjuntos
- **THEN** los dos documentos tienen un tamaño equivalente

#### Scenario: Importar un documento con manifiesto
- **WHEN** el usuario importa un documento cuyas decisiones declaran adjuntos
- **THEN** el sistema conserva las fichas y las presenta como ausencias, sin dar la decisión por completa
