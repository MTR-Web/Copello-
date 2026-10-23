# Puente gratuito de Gmail para Copello

Este pequeño script usa Google Apps Script, Gmail y Google Drive de la propia cuenta. No requiere Superhuman ni una suscripción externa.

## Qué hace esta primera versión

- Solo procesa correos a los que vos les apliques la etiqueta `Copello_Pagos`.
- Busca adjuntos PDF e imágenes.
- Copia los adjuntos a una carpeta de Google Drive llamada `Copello_Comprobantes`.
- Crea un borrador de respuesta en Gmail con un acuse de recibo que aclara que no confirma la acreditación del pago.
- Marca el hilo con `Copello_Procesado` para no volver a procesarlo en ejecuciones normales.
- **Nunca envía correos automáticamente.**

Esta primera versión no interpreta todavía los importes ni los números de operación, no detecta duplicados entre comprobantes, no concilia contra el banco y no integra directamente los archivos con la página de Copello. Es el puente inicial de correo; esas funciones requieren una siguiente etapa y pruebas con comprobantes reales anonimizados.

## Instalación

1. Iniciá sesión en la cuenta Gmail que recibe los comprobantes.
2. Abrí [Google Apps Script](https://script.google.com/) y creá un proyecto nuevo.
3. Reemplazá el contenido de `Code.gs` con el código de este repositorio.
4. Guardá el proyecto.
5. En el selector de funciones, ejecutá `prepararCopelloGmail`. Google te pedirá autorizar el acceso a Gmail y Drive. Revisá los permisos antes de aceptar.
6. En Gmail, identificá un correo de prueba y aplicale la etiqueta `Copello_Pagos`. No etiquetes toda la bandeja.
7. Volvé a Apps Script y ejecutá `procesarCorreosCopello`.
8. Revisá la carpeta `Copello_Comprobantes` en Drive y la carpeta Borradores en Gmail. Confirmá que el texto y los archivos sean correctos antes de usarlo con correos reales.

## Seguridad y límites

- No publiques el proyecto de Apps Script como una aplicación web ni compartas el proyecto con terceros.
- Ejecutalo manualmente y probá primero con un correo propio de prueba.
- El script solo considera correos etiquetados por vos; no rastrea toda la bandeja.
- Los adjuntos se copian a Google Drive. Protegé el acceso a esa carpeta porque puede contener datos personales y financieros.
- El código no modifica ni sobrescribe el Excel maestro.
- Si una ejecución falla parcialmente, revisá los registros antes de volver a ejecutarla, porque un borrador o un archivo podría haberse creado antes del error.
