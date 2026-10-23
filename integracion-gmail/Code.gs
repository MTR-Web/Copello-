/**
 * Copello — registro gratuito de comprobantes recibidos desde Gmail.
 *
 * Uso manual: ejecutá prepararCopelloGmail() una vez y luego
 * procesarCorreosCopello() cuando quieras actualizar el registro.
 *
 * Guarda los adjuntos en Drive y anota cada comprobante en una planilla
 * de Google Sheets compatible con Excel. No crea ni envía correos.
 */
const COPPELLO_CONFIG = {
  paymentLabel: "Copello_Pagos",
  processedLabel: "Copello_Procesado",
  driveFolder: "Copello_Comprobantes",
  spreadsheetName: "Copello_Registro_Comprobantes",
  sheetName: "Comprobantes recibidos"
};

function prepararCopelloGmail() {
  getOrCreateLabel_(COPPELLO_CONFIG.paymentLabel);
  getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  getOrCreateRegister_();
  Logger.log(
    'Preparado. Aplicá la etiqueta "' +
      COPPELLO_CONFIG.paymentLabel +
      '" en Gmail a los correos que contienen comprobantes.'
  );
}

function procesarCorreosCopello() {
  const processedLabel = getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  const folder = getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  const register = getOrCreateRegister_();
  const sheet = register.getSheetByName(COPPELLO_CONFIG.sheetName);
  const query =
    "label:" + COPPELLO_CONFIG.paymentLabel +
    " has:attachment -label:" + COPPELLO_CONFIG.processedLabel;
  const threads = GmailApp.search(query, 0, 50);
  let messagesProcessed = 0;
  let attachmentsSaved = 0;
  let rowsAdded = 0;
  const errors = [];

  threads.forEach(function(thread) {
    let threadHadError = false;
    let threadHadReceipt = false;

    thread.getMessages().forEach(function(message) {
      try {
        const attachments = message.getAttachments({
          includeInlineImages: false,
          includeAttachments: true
        }).filter(isSupportedReceipt_);

        if (!attachments.length) return;
        threadHadReceipt = true;

        attachments.forEach(function(attachment) {
          const safeName = makeSafeName_(
            Utilities.formatDate(
              message.getDate(),
              Session.getScriptTimeZone(),
              "yyyyMMdd_HHmmss"
            ) + "_" + attachment.getName()
          );
          const file = folder.createFile(attachment.copyBlob()).setName(safeName);
          attachmentsSaved++;

          sheet.appendRow([
            new Date(),
            message.getDate(),
            message.getFrom() || "",
            message.getSubject() || "(sin asunto)",
            attachment.getName() || "",
            attachment.getContentType() || "",
            file.getUrl(),
            "Recibido — pendiente de verificar",
            message.getId()
          ]);
          rowsAdded++;
        });
        messagesProcessed++;
      } catch (err) {
        threadHadError = true;
        errors.push(
          (message.getSubject() || "(sin asunto)") + ": " +
          (err && err.message ? err.message : String(err))
        );
      }
    });

    // Solo etiqueta el hilo si hubo comprobantes y no hubo errores.
    // Así no se marca como procesado un correo sin adjuntos compatibles.
    if (threadHadReceipt && !threadHadError) thread.addLabel(processedLabel);
  });

  const summary = [
    "Copello terminó la revisión manual de Gmail.",
    "Hilos encontrados: " + threads.length,
    "Mensajes con comprobantes: " + messagesProcessed,
    "Adjuntos guardados en Drive: " + attachmentsSaved,
    "Filas agregadas al registro: " + rowsAdded,
    "Planilla: " + register.getUrl(),
    errors.length ? "Errores:\n- " + errors.join("\n- ") : "Errores: ninguno",
    "",
    "No se crearon ni enviaron correos."
  ].join("\n");

  Logger.log(summary);
  return summary;
}

function getOrCreateRegister_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty("COPPELLO_REGISTER_ID");
  let spreadsheet = null;

  if (storedId) {
    try {
      spreadsheet = SpreadsheetApp.openById(storedId);
    } catch (err) {
      spreadsheet = null;
    }
  }

  if (!spreadsheet) {
    const files = DriveApp.getFilesByName(COPPELLO_CONFIG.spreadsheetName);
    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
    } else {
      spreadsheet = SpreadsheetApp.create(COPPELLO_CONFIG.spreadsheetName);
    }
    properties.setProperty("COPPELLO_REGISTER_ID", spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName(COPPELLO_CONFIG.sheetName);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(COPPELLO_CONFIG.sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Fecha de registro",
      "Fecha del correo",
      "Remitente",
      "Asunto",
      "Nombre del adjunto",
      "Tipo de archivo",
      "Archivo en Drive",
      "Estado",
      "ID del mensaje"
    ]);
    sheet.setFrozenRows(1);
  }

  return spreadsheet;
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
