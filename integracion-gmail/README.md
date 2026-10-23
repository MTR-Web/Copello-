# Registro gratuito de comprobantes de Gmail para Copello

Este script usa Google Apps Script, Gmail, Google Drive y Google Sheets de la propia cuenta. No requiere Superhuman ni una suscripción externa.

## Qué hace

- Solo revisa correos a los que vos les apliques la etiqueta `Copello_Pagos`.
- Busca adjuntos PDF e imágenes.
- Guarda cada adjunto en una carpeta de Google Drive llamada `Copello_Comprobantes`.
- Agrega una fila por cada adjunto compatible a la planilla `Copello_Registro_Comprobantes`.
- La fila registra fecha de recepción, fecha del correo, remitente, asunto, nombre y tipo del archivo, enlace al adjunto en Drive y el estado `Recibido — pendiente de verificar`.
- Marca el hilo con `Copello_Procesado` para evitar volver a registrarlo en ejecuciones normales.
- **No crea borradores ni envía correos.**

La planilla se crea en Google Sheets y se puede descargar desde Archivo → Descargar → Microsoft Excel (.xlsx). El script registra que llegó un comprobante; no interpreta el importe, no asigna una unidad automáticamente, no confirma que el pago esté acreditado y no modifica el Excel maestro de expensas.

## Instalación o actualización

1. Iniciá sesión en la cuenta Gmail que recibe los comprobantes.
2. Abrí [Google Apps Script](https://script.google.com/) y entrá al proyecto que ya habías creado para Copello.
3. Reemplazá el contenido de `Code.gs` con la versión de este repositorio y guardá.
4. En el selector de funciones, ejecutá `prepararCopelloGmail`. Autorizá los permisos de Gmail, Drive y Sheets si Google te los solicita.
5. En Gmail, aplicá la etiqueta `Copello_Pagos` a uno o dos correos de prueba que tengan comprobantes PDF o imágenes.
6. Ejecutá `procesarCorreosCopello`.
7. En el registro de ejecución, abrí el enlace de la planilla. También podés buscar en Drive la carpeta `Copello_Comprobantes` para revisar los adjuntos guardados.
8. Revisá el resultado antes de usarlo con correos reales.

Si ya habías procesado un correo de prueba, puede tener la etiqueta `Copello_Procesado` y no volverá a aparecer en la búsqueda normal. Para probarlo otra vez, quitá esa etiqueta de ese hilo y volvé a ejecutar la función.

## Seguridad y límites

- No publiques el proyecto como una aplicación web ni compartas el proyecto con terceros.
- Ejecutalo manualmente; no se configura ningún envío automático.
- Solo procesa los correos que tengan la etiqueta `Copello_Pagos` y adjuntos compatibles.
- Protegé el acceso a la carpeta y la planilla porque pueden contener datos personales y financieros.
- El Excel maestro de expensas no se modifica.
- Si ocurre un error parcial, revisá la planilla y la carpeta de Drive antes de volver a ejecutar: un archivo o una fila podría haberse creado antes del error.
