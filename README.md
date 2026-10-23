# Copello — Administración de consorcios

Aplicación de demostración para organizar fichas de consorcios y procesar comprobantes de pago.

## Archivos principales
- `index.html`, `styles.css`, `config.js), `app.js`: interfaz general, fichas y registro manual.
- `procesar.html` y `procesar-comprobantes.js`: importación del Excel maestro, lectura de comprobantes PDF/imagen mediante extracción de texto y OCR, sugerencia conservadora de unidad, detección de posibles duplicados por número de operación, revisión manual y exportación.

## Procesar comprobantes
1. Abrí `procesar.html` desde Live Server (también hay un acceso en el menú lateral de la aplicación).
2. Cargá una copia del Excel maestro y elegí la hoja que contiene las unidades. Revisá las columnas seleccionadas.
3. Cargá los comprobantes PDF o imágenes y ejecutá el análisis.
4. Revisá y corregí los campos reconocidos. Los casos dudosos y duplicados se marcan para revisión.
5. Descargá una copia del Excel con una nueva hoja `Pagos recibidos`, o exportá el seguimiento como CSV.

El Excel maestro original no se sobrescribe ni se alteran balances/celdas existentes. La salida es una copia descargada con una hoja adicional. Los resultados de OCR no son prueba de acreditación bancaria y deben revisarse contra el extracto bancario al cierre de mes.

## Límites y seguridad
- La lectura OCR usa bibliotecas CDN y necesita conexión a internet. El procesamiento de archivos ocurre en el navegador; los archivos no se suben a un servidor de Copello.
- La sugerencia de unidad no se hace por importe solamente. Si no se encuentra un identificador claro, queda pendiente de revisión.
- El botón “Ver texto” muestra un texto de acuse de recibo. No crea ni envía un correo real.
- La conexión automática a Gmail/Outlook, lectura de adjuntos desde la bandeja, creación de borradores de respuesta dentro del correo, autenticación, base de datos compartida y sincronización entre equipos todavía requieren una integración de servidor segura.
- No guardes credenciales ni tokens en archivos del repositorio o en el frontend.
- Los registros de la página principal se guardan en el almacenamiento local del navegador y no se sincronizan entre dispositivos.

## Ejecutar
Abrí `index.html` o `procesar.html` con Live Server en Visual Studio Code. Para probar la lectura de comprobantes, usá primero copias de archivos de prueba sin datos personales reales.
