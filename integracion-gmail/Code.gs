/**
 * Copello — Gmail + Drive + registro de comprobantes.
 *
 * 1) Ejecutá prepararCopelloGmail() una vez.
 * 2) Aplicá la etiqueta Gmail "Copello_Pagos" a los mensajes.
 * 3) Ejecutá procesarCorreosCopello() para actualizar el registro.
 * 4) Opcional: ejecutá instalarTriggerCopello() para revisar la etiqueta cada 15 minutos.
 *
 * El registro de Google Sheets se crea en Mi unidad (raíz de Drive),
 * separado de la carpeta Copello_Comprobantes. Nunca envía correos.
 */
const COPPELLO_CONFIG = {
  paymentLabel: "Copello_Pagos",
  processedLabel: "Copello_Procesado",
  driveFolder: "Copello_Comprobantes",
  spreadsheetName: "Copello_Registro_Comprobantes",
  sheetName: "Comprobantes recibidos",
  acknowledgement: "Hola, recibimos tu comprobante. Gracias. Este mensaje confirma únicamente la recepción del archivo y no la acreditación del pago."
};

function prepararCopelloGmail() {
  getOrCreateLabel_(COPPELLO_CONFIG.paymentLabel);
  getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  const spreadsheet = getOrCreateRegister_();
  Logger.log('Preparado. Planilla (en Mi unidad, fuera de la carpeta de adjuntos): ' + spreadsheet.getUrl());
  Logger.log('Aplicá la etiqueta "' + COPPELLO_CONFIG.paymentLabel + '" a los correos con comprobantes.');
}

function procesarCorreosCopello() {
  const processedLabel = getOrCreateLabel_(COPPELLO_CONFIG.processedLabel);
  const folder = getOrCreateFolder_(COPPELLO_CONFIG.driveFolder);
  const register = getOrCreateRegister_();
  const sheet = register.getSheetByName(COPPELLO_CONFIG.sheetName);
  // No excluimos hilos ya procesados: Gmail etiqueta conversaciones enteras y
  // podría ocultar mensajes nuevos dentro de un hilo anterior. La clave única evita duplicados.
  const query = "label:" + COPPELLO_CONFIG.paymentLabel + " has:attachment";
  const threads = GmailApp.search(query, 0, 100);
  const knownKeys = getKnownAttachmentKeys_(sheet);
  let messagesProcessed = 0, attachmentsSaved = 0, rowsAdded = 0, draftsCreated = 0, duplicatesSkipped = 0;
  const errors = [];

  threads.forEach(function(thread) {
    let threadHadError = false, threadHadReceipt = false;
    thread.getMessages().forEach(function(message) {
      try {
        const attachments = message.getAttachments({
          includeInlineImages: false,
          includeAttachments: true
        }).filter(isSupportedReceipt_);
        if (!attachments.length) return;
        threadHadReceipt = true;
        let newAttachmentsForMessage = 0;

        attachments.forEach(function(attachment, attachmentIndex) {
          const originalName = attachment.getName() || "comprobante";
          const uniqueKey = [message.getId(), attachmentIndex, originalName, attachment.getSize()].join("|");
          if (knownKeys.has(uniqueKey) || knownKeys.has(message.getId() + "|" + originalName)) {
            duplicatesSkipped++;
            return;
          }

          const safeName = makeSafeName_(
            Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") +
            "_" + message.getId().slice(-7) + "_" + originalName
          );
          const file = folder.createFile(attachment.copyBlob()).setName(safeName);
          attachmentsSaved++;
          sheet.appendRow([
            new Date(), message.getDate(), message.getFrom() || "",
            message.getSubject() || "(sin asunto)", originalName,
            attachment.getContentType() || "", file.getUrl(),
            "Recibido — pendiente de verificar", message.getId(), uniqueKey
          ]);
          knownKeys.add(uniqueKey);
          rowsAdded++;
          newAttachmentsForMessage++;
        });

        // Solo crea un borrador si encontró adjuntos nuevos. Nunca envía el mensaje.
        if (newAttachmentsForMessage > 0) {
          message.createDraftReply(COPPELLO_CONFIG.acknowledgement);
          draftsCreated++;
          messagesProcessed++;
        }
      } catch (err) {
        threadHadError = true;
        errors.push((message.getSubject() || "(sin asunto)") + ": " +
          (err && err.message ? err.message : String(err)));
      }
    });
    // Etiqueta informativa; la siguiente ejecución puede revisar el hilo, pero no duplicará filas.
    if (threadHadReceipt && !threadHadError) thread.addLabel(processedLabel);
  });

  const summary = [
    "Copello terminó la revisión manual de Gmail.",
    "Hilos encontrados: " + threads.length,
    "Mensajes con adjuntos nuevos: " + messagesProcessed,
    "Adjuntos guardados en Drive: " + attachmentsSaved,
    "Filas nuevas en la planilla: " + rowsAdded,
    "Adjuntos ya registrados omitidos: " + duplicatesSkipped,
    "Borradores creados: " + draftsCreated,
    "Planilla en Mi unidad: " + register.getUrl(),
    errors.length ? "Errores:\n- " + errors.join("\n- ") : "Errores: ninguno",
    "",
    "No se envió ningún correo."
  ].join("\n");
  Logger.log(summary);
  return summary;
}


/** Instala una revisión automática cada 15 minutos. Ejecutar y autorizar una vez. */
function instalarTriggerCopello() {
  const triggers = ScriptApp.getProjectTriggers();
  const exists = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === "procesarCorreosCopello";
  });
  if (!exists) {
    ScriptApp.newTrigger("procesarCorreosCopello").timeBased().everyMinutes(15).create();
  }
  Logger.log(exists ? "Ya existía el disparador automático." : "Revisión automática instalada: cada 15 minutos.");
}

/** Elimina únicamente los disparadores de procesamiento de Copello. */
function quitarTriggerCopello() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === "procesarCorreosCopello") ScriptApp.deleteTrigger(trigger);
  });
  Logger.log("Se quitaron los disparadores automáticos de Copello.");
}

function getKnownAttachmentKeys_(sheet) {
  const keys = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return keys;
  // J contiene la clave nueva; E e I permiten reconocer filas de la versión anterior.
  sheet.getRange(2, 1, lastRow - 1, Math.max(10, sheet.getLastColumn())).getValues().forEach(function(row) {
    if (row[9]) keys.add(String(row[9]));
    // Las filas antiguas no tenían clave única; usar la clave histórica solo para ellas.
    else if (row[8] && row[4]) keys.add(String(row[8]) + "|" + String(row[4]));
  });
  return keys;
}

function getOrCreateRegister_() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty("COPPELLO_REGISTER_ID");
  let spreadsheet = null;
  if (storedId) {
    try { spreadsheet = SpreadsheetApp.openById(storedId); } catch (err) { spreadsheet = null; }
  }
  if (!spreadsheet) {
    const files = DriveApp.getFilesByName(COPPELLO_CONFIG.spreadsheetName);
    spreadsheet = files.hasNext()
      ? SpreadsheetApp.openById(files.next().getId())
      : SpreadsheetApp.create(COPPELLO_CONFIG.spreadsheetName);
    properties.setProperty("COPPELLO_REGISTER_ID", spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName(COPPELLO_CONFIG.sheetName);
  if (!sheet) {
    sheet = spreadsheet.getSheets()[0];
    sheet.setName(COPPELLO_CONFIG.sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Fecha de registro", "Fecha del correo", "Remitente", "Asunto",
      "Nombre del adjunto", "Tipo de archivo", "Archivo en Drive",
      "Estado", "ID del mensaje", "Clave única del adjunto"
    ]);
    sheet.setFrozenRows(1);
  } else {
    // Compatibilidad con la planilla creada por la versión anterior.
    const lastColumn = sheet.getLastColumn();
    if (lastColumn < 10) sheet.getRange(1, 10).setValue("Clave única del adjunto");
  }
  return spreadsheet;
}

function isSupportedReceipt_(attachment) {
  const name = (attachment.getName() || "").toLowerCase();
  const type = (attachment.getContentType() || "").toLowerCase();
  return type === "application/pdf" || type.indexOf("image/") === 0 ||
    /\.(pdf|png|jpe?g|webp|tif?f|bmp)$/i.test(name);
}
function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}
function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}
function makeSafeName_(name) {
  return String(name || "comprobante").replace(/[\\/:*?"<>|\r\n]+/g, "_").slice(0, 180);
}
