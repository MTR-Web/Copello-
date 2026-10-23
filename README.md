# Copello — Administración de consorcios

Aplicación interna para administrar varios edificios desde computadora o celular.

## Archivos principales
- `index.html`: estructura de la interfaz.
- `styles.css`: estilos visuales y adaptación a celular.
- `config.js`: **archivo principal para personalizar** nombre, colores y edificios iniciales.
- `app.js`: navegación, fichas, registro acumulativo de comprobantes, edición/eliminación y exportación CSV.

## Personalizar fácilmente
Abrí `config.js`:
- Cambiá `COPELLO_CONFIG.colors` para cambiar los colores.
- Agregá un edificio dentro de `COPELLO_CONFIG.buildings`, copiando un objeto existente y cambiando sus datos.
- Editá el nombre de la aplicación en `brand`.

## Ejecutar
Abrí `index.html` en un navegador o usá Live Server desde Visual Studio Code.

## Importante sobre los datos
Esta versión es una interfaz funcional de demostración. Permite crear, editar y eliminar consorcios; registrar comprobantes en una lista acumulativa; eliminar registros de prueba y exportar los pagos a CSV. Los cambios se guardan en el almacenamiento local del navegador del dispositivo. **No es todavía una base de datos sincronizada** entre celular y computadora. No cargues datos personales reales ni información financiera sensible hasta conectar un backend con autenticación y base de datos. GitHub Pages por sí solo no proporciona backend. El Excel maestro original no se modifica.

La integración con Gmail todavía no está implementada: la lista de comprobantes es manual en esta versión. El siguiente paso es conectar Gmail desde un backend seguro para extraer fecha, importe y nombre, usar el remitente si falta el nombre y crear borradores que digan que se recibió el comprobante. No se deben enviar respuestas automáticamente; las credenciales nunca deben guardarse en el frontend ni en GitHub.
