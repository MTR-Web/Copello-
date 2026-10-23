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
  // Recorre los hilos por lotes para que una bandeja con más de 100 hilos no deje
  // los más antiguos sin procesar. Las claves únicas hacen segura la revisión repetida.
  const properties = PropertiesService.getScriptProperties();
  let offset = Math.max(0, Number(properties.getProperty("COPPELLO_THREAD_OFFSET") || 0));
  let threads = GmailApp.search(query, offset, 100);
  if (!threads.length && offset > 0) {
    offset = 0;
    threads = GmailApp.search(query, 0, 100);
  }
  if (threads.length === 100) properties.setProperty("COPPELLO_THREAD_OFFSET", String(offset + threads.length));
  else properties.deleteProperty("COPPELLO_THREAD_OFFSET");
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
            "_" + message.getId().slice(-7) + "_a" + attachmentIndex + "_" + originalName
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
          const signature = getDefaultGmailSignature_();
          const htmlBody = "<p>" + escapeHtmlForHtml_(COPPELLO_CONFIG.acknowledgement).replace(/\\n/g, "<br>") + "</p>" + signature;
          message.createDraftReply(COPPELLO_CONFIG.acknowledgement, { htmlBody: htmlBody });
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


/** Lee la firma predeterminada de Gmail si el servicio avanzado Gmail API está habilitado. */
function getDefaultGmailSignature_() {
  try {
    const response = Gmail.Users.Settings.SendAs.list("me");
    const sendAs = response && response.sendAs ? response.sendAs : [];
    const sender = sendAs.find(function(item) { return item.isDefault; }) || sendAs[0];
    return sender && sender.signature ? sender.signature : "";
  } catch (err) {
    // Si no se habilitó Gmail API avanzada, el borrador se crea sin firma para evitar bloquear el proceso.
    Logger.log("No se pudo leer la firma de Gmail. Si querés conservarla, habilitá el servicio avanzado Gmail API. " + err);
    return "";
  }
}

function escapeHtmlForHtml_(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
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
    try {
      spreadsheet = SpreadsheetApp.openById(storedId);
      const attachmentFolders = DriveApp.getFoldersByName(COPPELLO_CONFIG.driveFolder);
      const attachmentFolderId = attachmentFolders.hasNext() ? attachmentFolders.next().getId() : "";
      if (attachmentFolderId) {
        const parents = DriveApp.getFileById(storedId).getParents();
        while (parents.hasNext()) {
          if (parents.next().getId() === attachmentFolderId) {
            spreadsheet = null;
            properties.deleteProperty("COPPELLO_REGISTER_ID");
            break;
          }
        }
      }
    } catch (err) { spreadsheet = null; }
  }
  if (!spreadsheet) {
    const files = DriveApp.getFilesByName(COPPELLO_CONFIG.spreadsheetName);
    const attachmentFolders = DriveApp.getFoldersByName(COPPELLO_CONFIG.driveFolder);
    const attachmentFolderId = attachmentFolders.hasNext() ? attachmentFolders.next().getId() : "";
    let reusableFile = null;
    while (files.hasNext()) {
      const candidate = files.next();
      let isInsideAttachmentsFolder = false;
      const parents = candidate.getParents();
      while (parents.hasNext()) {
        if (parents.next().getId() === attachmentFolderId && attachmentFolderId) {
          isInsideAttachmentsFolder = true;
        }
      }
      if (!isInsideAttachmentsFolder) { reusableFile = candidate; break; }
    }
    // Si solo hay una planilla dentro de la carpeta de adjuntos, no reutilizarla:
    // crear una nueva en Mi unidad para mantener separados el registro y los archivos.
    spreadsheet = reusableFile
      ? SpreadsheetApp.openById(reusableFile.getId())
      : SpreadsheetApp.create(COPELLO_CONFIG.spreadsheetName);
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
  if (sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, 1, Math.max(10, sheet.getLastColumn()))
      .setFontWeight("bold").setBackground("#e9efff");
    sheet.setFrozenRows(1);
    if (!sheet.getFilter()) {
      sheet.getRange(1, 1, sheet.getLastRow(), Math.max(10, sheet.getLastColumn())).createFilter();
    }
    sheet.autoResizeColumns(1, Math.max(10, sheet.getLastColumn()));
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
