## ADDED Requirements

### Requirement: Una acción del topbar puede devolver un aviso neutro

Una acción declarada por una aplicación MUST poder devolver una frase que el topbar presenta al usuario, y el topbar MUST retirarla sola al cabo de unos segundos, sin exigir que el usuario la cierre.

El topbar MUST distinguir ese aviso del error de una acción rechazada: el error dice que algo no se hizo, y el aviso dice qué se hizo. Presentarlos igual los convierte en el mismo mensaje —uno rojo que a veces no significa nada— y el usuario deja de leerlos.

Devolver un aviso MUST ser opcional. Una acción que no devuelve nada MUST comportarse exactamente como hoy, sin aviso, para que este carril no obligue a que las aplicaciones existentes digan algo por decirlo.

El aviso pertenece a la aplicación y su presentación al topbar, igual que la etiqueta de una acción: la aplicación declara **qué** frase, y el topbar decide dónde y cómo se ve, para que la barra siga leyéndose como una sola.

#### Scenario: Una acción que informa de lo que hizo

- **WHEN** el usuario ejecuta una acción de topbar que devuelve un aviso
- **THEN** el sistema presenta esa frase en la barra y la retira sola pasados unos segundos

#### Scenario: Un aviso no se confunde con un error

- **WHEN** una acción devuelve un aviso y otra es rechazada con un error
- **THEN** el sistema los presenta de forma distinguible, de modo que el usuario sabe cuál informa y cuál advierte de que algo no se hizo

#### Scenario: Una acción que no informa de nada

- **WHEN** el usuario ejecuta una acción de topbar que no devuelve ningún aviso
- **THEN** el sistema la ejecuta sin presentar ningún mensaje

#### Scenario: El aviso no sobrevive al cambio de aplicación

- **WHEN** el usuario ejecuta una acción que deja un aviso y cambia de aplicación antes de que se retire
- **THEN** el topbar deja de mostrarlo, porque la acción que lo produjo ya no está en la barra

## MODIFIED Requirements

### Requirement: Las acciones del topbar pertenecen a la aplicación abierta

El sistema MUST mostrar en el topbar únicamente las acciones de la aplicación en la que se está. Las acciones propias de Roadmaps —crear, importar y exportar— MUST NOT aparecer en el hub ni dentro de otra aplicación.

Cada aplicación MUST declarar sus acciones de topbar en el registro, y el topbar MUST construirse a partir de esa declaración sin conocer a ninguna aplicación por su nombre. El topbar MUST seguir decidiendo cómo se presentan: una aplicación declara qué acciones tiene y qué hacen, no cómo se dibujan, para que **todas** se vean como una sola barra, sean las que sean y sean cuantas sean. Contar aquí las aplicaciones que hay sería fijar en el requisito un número que caduca con la siguiente.

Las acciones que pertenecen al contenedor, y no a ninguna aplicación, MUST estar disponibles en todas las pantallas. El tema es una de ellas.

#### Scenario: Acciones de Roadmaps en el hub

- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema no ofrece en el topbar crear, importar ni exportar roadmaps

#### Scenario: El tema es accesible desde el hub

- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema ofrece la acción de tema y abre el editor de temas sin salir del hub

#### Scenario: Las acciones cambian al cambiar de aplicación

- **WHEN** el usuario pasa de una aplicación a otra
- **THEN** el topbar deja de ofrecer las acciones de la primera y ofrece las de la segunda

#### Scenario: Una aplicación sin acciones propias

- **WHEN** el usuario está dentro de una aplicación que no declara ninguna acción de topbar
- **THEN** el topbar muestra solo la marca, el conmutador y las acciones del contenedor
