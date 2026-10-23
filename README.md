# Copello — Administración de consorcios

Aplicación interna para administrar varios edificios desde computadora o celular.

## Archivos principales
- `index.html`: estructura de la interfaz.
- `styles.css`: estilos visuales y adaptación a celular.
- `config.js`: **archivo principal para personalizar** nombre, colores y edificios iniciales.
- `app.js`: navegación, tarjetas de edificios, formularios y almacenamiento local de demostración.

## Personalizar fácilmente
Abrí `config.js`:
- Cambiá `COPELLO_CONFIG.colors` para cambiar los colores.
- Agregá un edificio dentro de `COPELLO_CONFIG.buildings`, copiando un objeto existente y cambiando sus datos.
- Editá el nombre de la aplicación en `brand`.

## Ejecutar
Abrí `index.html` en un navegador o usá Live Server desde Visual Studio Code.

## Importante sobre los datos
Esta primera versión es una interfaz funcional de demostración y guarda los cambios en el almacenamiento local del navegador del dispositivo. **No es todavía una base de datos sincronizada** entre celular y computadora. No cargues datos personales reales ni información financiera sensible hasta conectar un backend con autenticación y base de datos. GitHub Pages por sí solo no proporciona backend. El Excel maestro original no se modifica.

La integración de Gmail, comprobantes y respuestas en borrador se implementará como un módulo de servidor separado; las credenciales nunca deben guardarse en el frontend ni en GitHub.
