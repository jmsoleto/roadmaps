## REMOVED Requirements

### Requirement: Aplicación de escritorio empaquetada

**Reason**: El empaquetado de escritorio nunca llegó a ser una vía de reparto. Su propia formulación, corregida en `web-distribution`, ya reconocía que el binario no está firmado ni notarizado, que macOS lo bloquea por cuarentena fuera de la máquina donde se compila, y que la vía soportada para repartir la aplicación es la web app. Un empaquetado cuyo único usuario posible es quien lo compila no justifica un toolchain de Rust, dos dependencias npm y una segunda implementación completa de la capa de persistencia. El escenario "Arranque offline" no se pierde: `web-distribution` ya lo cubre con "Arranque sin conexión", que promete lo mismo para la vía que sobrevive.

**Migration**: La aplicación se usa abriendo su URL pública. Deja de existir el binario de escritorio y con él los comandos `npm run tauri dev` y `npm run tauri build`. Quien tuviera datos únicamente en la base SQLite del escritorio (`~/Library/Application Support/com.roadmaps.app/roadmaps.db`) debe exportarlos a JSON **antes** de aplicar este cambio e importarlos en la aplicación web; después el archivo queda inalcanzable, porque no queda código capaz de leerlo.

### Requirement: Persistencia del estado de ventana y sesión

**Reason**: El requisito no era de escritorio pese a vivir en esta capacidad: recordar el roadmap activo y el nivel de zoom es comportamiento vigente en la aplicación web. Se traslada a `local-persistence`, que es donde vive el almacén de preferencias, reescrito sin la referencia a la ventana nativa.

**Migration**: Ninguna. El comportamiento no cambia; solo cambia la capacidad que lo describe. Ver el requisito "Persistencia del estado de sesión" en `local-persistence`.

### Requirement: Guardado seguro al cerrar

**Reason**: Como el anterior, describe comportamiento vigente en la web y se traslada a `local-persistence`, donde acompaña al autosave del que es la garantía terminal. Al mudarlo se acota a lo que la plataforma web garantiza de verdad: la formulación original prometía persistir cualquier cambio pendiente "sin pérdida de datos", garantía que el shell nativo sí podía dar interceptando el cierre de ventana, pero que en un navegador no se sostiene cuando la pestaña se descarta sin previo aviso.

**Migration**: Ninguna en el comportamiento observable: en el cierre normal de una pestaña o ventana el volcado sigue completándose, porque la escritura en el almacén del navegador es síncrona y termina dentro del propio manejador de cierre. Ver el requisito "Guardado de cambios pendientes al cerrar" en `local-persistence`.
