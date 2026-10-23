/**
 * Copello — puente gratuito para Gmail (Google Apps Script)
 *
 * Uso manual: ejecutá procesarCorreosCopello() desde Apps Script.
 * Solo procesa hilos con la etiqueta Gmail "Copello_Pagos" y adjuntos.
 * Guarda adjuntos en una carpeta de Drive y crea borradores de respuesta.
 * NUNCA envía correos automáticamente.
 */
const COPPELLO_CONFIG = {
  paymentLabel: "Copello_Pagos",
  processedLabel: "Copello_Procesado",
  driveFolder: "Copello_Comprobantes",
  acknowledgement:
    "Hola, recibimos tu comprobante. Gracias. Este mensaje confirma únicamente la recepción del archivo y no la acreditación del pago."
};

function prepararCopelloGmail() {
  getOrCreateLabel_(COPPELLO_CONFIG.paymentLabel);
  getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  Logger.log(
    'Preparado. En Gmail, aplicá la etiqueta "' +
      COPPELLO_CONFIG.paymentLabel +
      '" a los correos que quieras procesar.'
  );
}

function procesarCorreosCopello() {
  const paymentLabel = getOrCreateLabel_(COPPELLO_CONFIG.paymentLabel);
  const processedLabel = getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  const folder = getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  const query =
    "label:" + COPPELLO_CONFIG.paymentLabel +
    " has:attachment -label:" + COPPELLO_CONFIG.processedLabel;
  const threads = GmailApp.search(query, 0, 50);
  let messagesProcessed = 0;
  let attachmentsSaved = 0;
  let draftsCreated = 0;
  const errors = [];

  threads.forEach(function(thread) {
    let threadHadError = false;
    thread.getMessages().forEach(function(message) {
      try {
        const attachments = message.getAttachments({
          includeInlineImages: false,
          includeAttachments: true
        }).filter(isSupportedReceipt_);

        if (!attachments.length) return;

        attachments.forEach(function(attachment) {
          const safeName = makeSafeName_(
            Utilities.formatDate(
              message.getDate(),
              Session.getScriptTimeZone(),
              "yyyyMMdd_HHmmss"
            ) + "_" + attachment.getName()
          );
          folder.createFile(attachment.copyBlob()).setName(safeName);
          attachmentsSaved++;
        });

        // Crea un borrador de respuesta asociado al mensaje original; no lo envía.
        message.createDraftReply(COPPELLO_CONFIG.acknowledgement);
        draftsCreated++;
        messagesProcessed++;
      } catch (err) {
        threadHadError = true;
        errors.push(
          (message.getSubject() || "(sin asunto)") + ": " +
          (err && err.message ? err.message : String(err))
        );
      }
    });

    // Solo marca el hilo si se completó sin errores.
    if (!threadHadError) thread.addLabel(processedLabel);
  });

  const summary = [
    "Copello terminó la revisión manual de Gmail.",
    "Hilos encontrados: " + threads.length,
    "Mensajes procesados: " + messagesProcessed,
    "Adjuntos guardados: " + attachmentsSaved,
    "Borradores creados: " + draftsCreated,
    errors.length ? "Errores:\n- " + errors.join("\n- ") : "Errores: ninguno",
    "",
    "No se envió ningún correo."
  ].join("\n");

  Logger.log(summary);
  return summary;
}

function isSupportedReceipt_(attachment) {
  const name = (attachment.getName() || "").toLowerCase();
  const type = (attachment.getContentType() || "").toLowerCase();
  return (
    type === "application/pdf" ||
    type.indexOf("image/") === 0 ||
    /\.(pdf|png|jpe?g|webp|tif?f|bmp)$/i.test(name)
  );
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function makeSafeName_(name) {
  return String(name || "comprobante")
    .replace(/[\\/:*?"<>|\r\n]+/g, "_")
    .slice(0, 180);
}
