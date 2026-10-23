# Integración Gmail de Copello: comprobantes, borradores y planilla

Esta integración gratuita usa Google Apps Script, Gmail, Google Drive y Google Sheets de tu propia cuenta. Mantiene el procesador de comprobantes de la página Copello y agrega un flujo para registrar los adjuntos que llegan por Gmail.

## Qué hace el script

- Solo busca correos con la etiqueta de Gmail `Copello_Pagos` y adjuntos compatibles.
- Guarda los adjuntos PDF e imágenes en la carpeta de Drive `Copello_Comprobantes`.
- Agrega una fila por cada adjunto a la planilla `Copello_Registro_Comprobantes`, con fecha, remitente, asunto, nombre/tipo de archivo, enlace al archivo, estado y referencia del mensaje.
- Crea un borrador de respuesta al mensaje original con un acuse de recepción.
- Marca el hilo como `Copello_Procesado` cuando el procesamiento termina sin errores.
- **No envía correos automáticamente.**

El borrador dice que se recibió el comprobante, pero aclara que eso no significa que el pago esté acreditado. La planilla de Google Sheets se puede descargar como Excel desde Archivo → Descargar → Microsoft Excel (.xlsx).

## Qué sigue haciendo la página Copello

La página `procesar.html` conserva el flujo existente para cargar una copia del Excel maestro, elegir hoja y columnas, analizar comprobantes PDF/imágenes, extraer importe/fecha/operación/pagador cuando el texto lo permite, sugerir unidad solo por coincidencia exacta, revisar y corregir campos, marcar posibles duplicados, exportar CSV y descargar una copia del Excel con la hoja `Pagos recibidos`. Esas lecturas son heurísticas: revisá los resultados manualmente.

El flujo de Gmail y el procesador de archivos son dos partes relacionadas, pero aún no están conectadas en vivo dentro de la misma página. El script se ejecuta desde Google Apps Script; la página está alojada como sitio estático y no debe recibir una URL pública que dé acceso abierto a tu Gmail.

## Pasos para configurarlo

1. Entrá a la cuenta Gmail que recibe los comprobantes.
2. Abrí [Google Apps Script](https://script.google.com/) y entrá al proyecto existente de Copello. Si no existe, creá uno nuevo.
3. Abrí `Code.gs`, reemplazá todo su contenido por el archivo de este repositorio y guardá.
4. En el selector de funciones elegí `prepararCopelloGmail` y presioná Ejecutar. Revisá y autorizá los permisos de Gmail, Drive y Sheets.
5. En Gmail, elegí uno o dos correos de prueba que tengan comprobantes PDF o imágenes y aplicales la etiqueta `Copello_Pagos`.
6. Volvé a Apps Script, elegí `procesarCorreosCopello` y presioná Ejecutar.
7. En el registro de ejecución, abrí el enlace de la planilla que aparece en el resultado. También podés buscar en Drive `Copello_Comprobantes` y en Gmail la carpeta Borradores.
8. Revisá las filas, los archivos guardados y el borrador. El borrador no se envía solo.
9. Cuando confirmes que la prueba salió bien, aplicá la etiqueta `Copello_Pagos` a los correos reales que quieras registrar y ejecutá la función cuando necesites actualizar la planilla.

## Importante

- No publiques Apps Script como aplicación web abierta ni compartas el proyecto con terceros.
- La integración se ejecuta manualmente; no hay sincronización automática ni botón en Copello que la ejecute todavía.
- Si un hilo ya tiene la etiqueta `Copello_Procesado`, no volverá a entrar en la búsqueda normal. Para repetir una prueba, quitale esa etiqueta al hilo.
- Si hay un error parcial, revisá la planilla, Drive y Borradores antes de volver a ejecutar para evitar registros duplicados.
- El script no lee importes ni asigna unidades en la planilla. El registro significa “se recibió un archivo”, no “se confirmó el pago”.
- El Excel maestro de expensas no se modifica. La página descarga una copia cuando usás el botón correspondiente.
