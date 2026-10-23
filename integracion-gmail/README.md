# Integración Gmail de Copello: comprobantes, borradores y planilla

Esta integración gratuita usa Google Apps Script, Gmail, Google Drive y Google Sheets de tu propia cuenta. Mantiene el procesador de comprobantes de la página Copello y agrega un flujo para registrar los adjuntos que llegan por Gmail.

## Qué hace el script

- Solo busca correos con la etiqueta de Gmail `Copello_Pagos` y adjuntos compatibles.
- Guarda los adjuntos PDF e imágenes en la carpeta de Drive `Copello_Comprobantes`.
- Agrega una fila por cada adjunto a la planilla `Copello_Registro_Comprobantes`, con fecha, remitente, asunto, nombre/tipo de archivo, enlace al archivo, estado y referencia del mensaje.
- Crea un borrador de respuesta al mensaje original con un acuse de recepción y, si se habilita el servicio avanzado Gmail API, intenta conservar la firma predeterminada de Gmail.
- Marca el hilo como `Copello_Procesado` cuando el procesamiento termina sin errores; la etiqueta es informativa y no impide detectar mensajes nuevos en hilos antiguos.
- Evita registrar dos veces un mismo adjunto mediante una clave única, incluso al volver a ejecutar el proceso.
- **No envía correos automáticamente.**
- Puede ejecutarse manualmente o mediante un disparador opcional cada 15 minutos, una vez instalado y autorizado.

El borrador dice que se recibió el comprobante, pero aclara que eso no significa que el pago esté acreditado. La planilla de Google Sheets se puede descargar como Excel desde Archivo → Descargar → Microsoft Excel (.xlsx).

## Qué sigue haciendo la página Copello

La página `procesar.html` conserva el flujo existente para cargar una copia del Excel maestro, elegir hoja y columnas, analizar comprobantes PDF/imágenes, extraer importe/fecha/operación/pagador cuando el texto lo permite, sugerir unidad solo por coincidencia exacta, revisar y corregir campos, marcar posibles duplicados, exportar CSV y descargar una copia del Excel con la hoja `Pagos recibidos`. Esas lecturas son heurísticas: revisá los resultados manualmente.

La página tiene una opción para importar el CSV exportado desde la planilla de Gmail. Esa transferencia sigue siendo manual; no hay conexión en vivo entre la página y Gmail. El script se ejecuta desde Google Apps Script; la página está alojada como sitio estático y no debe recibir una URL pública que dé acceso abierto a tu Gmail.

## Pasos para configurarlo

1. Entrá a la cuenta Gmail que recibe los comprobantes.
2. Abrí [Google Apps Script](https://script.google.com/) y entrá al proyecto existente de Copello. Si no existe, creá uno nuevo.
3. Abrí `Code.gs`, reemplazá todo su contenido por el archivo de este repositorio y guardá.
4. En el selector de funciones elegí `prepararCopelloGmail` y presioná Ejecutar. Revisá y autorizá los permisos de Gmail, Drive y Sheets.
5. Para intentar conservar la firma habitual en los borradores, abrí **Servicios** (+) en el editor de Apps Script y agregá **Gmail API**. Si no la habilitás, el script seguirá funcionando, pero los borradores podrían quedar sin firma; revisalos antes de enviar.
5. En Gmail, elegí uno o dos correos de prueba que tengan comprobantes PDF o imágenes y aplicales la etiqueta `Copello_Pagos`.
6. Volvé a Apps Script, elegí `procesarCorreosCopello` y presioná Ejecutar.
7. En el registro de ejecución, abrí el enlace de la planilla que aparece en el resultado. La planilla se crea en `Mi unidad` (raíz de Google Drive), fuera de la carpeta `Copello_Comprobantes`, que solo guarda los adjuntos. También podés revisar esa carpeta y los borradores en Gmail.
8. Revisá las filas, los archivos guardados y el borrador. El borrador no se envía solo.
9. Cuando confirmes que la prueba salió bien, aplicá la etiqueta `Copello_Pagos` a los correos reales que quieras registrar.
10. Si querés automatizar las revisiones, elegí `instalarTriggerCopello` y ejecutala una vez. El script revisará cada 15 minutos los correos etiquetados, guardará adjuntos nuevos y creará borradores, pero nunca enviará respuestas automáticamente. Para detenerlo, ejecutá `quitarTriggerCopello`.

## Importante

- No publiques Apps Script como aplicación web abierta ni compartas el proyecto con terceros.
- La integración se ejecuta manualmente desde Google Apps Script. Para pasar los registros a la página Copello: abrí `Copello_Registro_Comprobantes`, descargala como CSV (Archivo → Descargar → Valores separados por comas), entrá en Pagos y comprobantes en Copello y usá `Importar CSV de Gmail`. La página evita importar registros repetidos. Esta transferencia sigue siendo manual; no hay conexión en vivo entre la página y Gmail.
- La etiqueta `Copello_Procesado` es informativa. El script vuelve a revisar los hilos etiquetados, pero omite adjuntos ya registrados. La clave única permite distinguir adjuntos con el mismo nombre dentro de un mismo mensaje; las filas históricas se deduplican con la clave disponible en la versión anterior.
- Si hay un error parcial, revisá la planilla, Drive y Borradores antes de volver a ejecutar para evitar registros duplicados.
- El script no lee importes ni asigna unidades en la planilla. La lectura de importes, fecha, operación, unidad y comparación contra el Excel maestro se hace en `procesar.html`, con heurísticas que deben revisarse manualmente. El registro significa “se recibió un archivo”, no “se confirmó el pago”.
- El disparador automático solo procesa mensajes que tengan la etiqueta `Copello_Pagos`; no se recomienda etiquetar automáticamente todo correo con adjuntos. Probá primero con correos controlados.
- Para leer la firma predeterminada, el script usa el servicio avanzado Gmail API. Si no se habilita, el proceso sigue sin detenerse, pero el borrador puede no incluir la firma; revisalo y agregala antes de enviar si hace falta.
- El Excel maestro de expensas no se modifica. La página descarga una copia cuando usás el botón correspondiente.
