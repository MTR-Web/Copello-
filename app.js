(() => {
  "use strict";
  const config = window.COPELLO_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "copello.demo.buildings.v1";
  const PAYMENTS_KEY = "copello.demo.payments.v1";
  let payments = (() => { try { const v = JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (_) { return []; } })();
  let currentView = "dashboard";
  let selectedBuildingId = null;
  let toastTimer;

  function validColor(value) { return /^#[0-9a-f]{6}$/i.test(value || "") ? value : "#3978f6"; }
  const themeMap = { primary:"--primary", primaryDark:"--primary-dark", page:"--page", surface:"--surface", sidebar:"--sidebar", text:"--text", muted:"--muted", accent:"--accent" };
  function applyTheme(colors = config.colors || {}) {
    Object.entries(themeMap).forEach(([key, variable]) => {
      if (colors[key]) document.documentElement.style.setProperty(variable, validColor(colors[key]));
    });
  }
  function applyBrand() {
    const name = config.brand || "Copello";
    $("#brand-name").textContent = name;
    document.title = name + " | Consorcios";
    $$(".avatar,.brand-mark").forEach(el => el.textContent = name.trim().charAt(0).toUpperCase());
  }
  function loadBuildings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) { console.warn("No se pudo leer el almacenamiento local.", error); }
    return Array.isArray(config.buildings) ? config.buildings.map(item => ({...item})) : [];
  }
  let buildings = loadBuildings();
  function saveBuildings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings)); return true; }
    catch (error) { showToast("No se pudieron guardar los cambios en este navegador."); return false; }
  }
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  }
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }
  function go(view) {
    currentView = view;
    $$(".nav-item[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    $("#page-label").textContent = ({dashboard:"Resumen",buildings:"Consorcios",payments:"Pagos y comprobantes",settings:"Apariencia y ajustes",detail:"Ficha del consorcio"})[view] || "Copello";
    $("#sidebar").classList.remove("open");
    render();
  }
  function statCard(title, value, foot, symbol) {
    return '<article class="stat-card"><div class="stat-top"><span>'+title+'</span><span class="stat-symbol">'+symbol+'</span></div><div class="stat-number">'+value+'</div><div class="stat-foot">'+foot+'</div></article>';
  }
  function buildingCard(b) {
    const color = validColor(b.color);
    return '<article class="building-card"><div class="building-card-head"><div class="building-symbol" style="--building-color:'+color+';--building-tint:'+color+'1A">▤</div><div class="building-actions"><button class="building-menu" data-edit="'+escapeHtml(b.id)+'" aria-label="Editar '+escapeHtml(b.name)+'" title="Editar consorcio">✎</button><button class="building-delete" data-delete="'+escapeHtml(b.id)+'" aria-label="Eliminar '+escapeHtml(b.name)+'" title="Eliminar consorcio">×</button></div></div><h3>'+escapeHtml(b.name)+'</h3><p class="building-address">'+escapeHtml(b.address || "Dirección sin cargar")+'</p><div class="building-meta"><span>Unidades</span><strong>'+Number(b.units || 0)+'</strong></div><button class="open-building" data-open="'+escapeHtml(b.id)+'">Abrir consorcio →</button></article>';
  }
  function renderDashboard() {
    const units = buildings.reduce((sum, b) => sum + (Number(b.units) || 0), 0);
    $("#app-content").innerHTML = '<section class="welcome"><div><p class="eyebrow">PANEL DE ADMINISTRACIÓN</p><h1>Todo bajo control.</h1><p class="muted">Consultá tus edificios y mantené la gestión organizada en un solo lugar.</p></div><button class="primary-button" id="add-building-top">＋ Agregar consorcio</button></section><section class="stats-grid">'+statCard("Consorcios registrados",buildings.length,"Edificios en este espacio","▤")+statCard("Unidades totales",units,"Según las fichas cargadas","▦")+statCard("Módulos disponibles","2","Consorcios y ficha básica","◈")+'</section><section class="section-heading"><div><h2>Tus consorcios</h2><p class="muted">Seleccioná un edificio para ver su ficha.</p></div><button class="text-button" data-view="buildings">Ver todos →</button></section><section class="building-grid">'+(buildings.length?buildings.map(buildingCard).join(""):'<div class="empty-state">Todavía no hay consorcios. Usá “Agregar consorcio” para crear el primero.</div>')+'</section><section class="note-panel"><span class="note-icon">i</span><div><strong>Versión inicial</strong><p>Los cambios se guardan en este navegador. La sincronización entre equipos requiere un servidor y una base de datos.</p></div></section>';
  }
  function renderBuildings() {
    $("#app-content").innerHTML = '<section class="welcome"><div><p class="eyebrow">REGISTRO GENERAL</p><h1>Consorcios</h1><p class="muted">Creá fichas y mantené los datos generales de cada edificio.</p></div><button class="primary-button" id="add-building-top">＋ Agregar consorcio</button></section><section class="building-grid">'+(buildings.length?buildings.map(buildingCard).join(""):'<div class="empty-state">No hay consorcios registrados todavía.</div>')+'</section>';
  }
  function renderDetail() {
    const b = buildings.find(item => item.id === selectedBuildingId);
    if (!b) { go("buildings"); return; }
    const color = validColor(b.color);
    const unitRecords = Array.isArray(b.unitRecords) ? b.unitRecords : [];
    const unitRows = unitRecords.map(u => '<tr><td><strong>'+escapeHtml(u.label)+'</strong></td><td>'+escapeHtml(u.floor || '—')+'</td><td>'+escapeHtml(u.owner || 'Sin titular cargado')+'</td><td>'+escapeHtml(u.contact || '—')+'</td><td>'+escapeHtml(u.coefficient || '—')+'</td><td><button class="row-delete" data-unit-delete="'+escapeHtml(u.id)+'" title="Eliminar unidad" aria-label="Eliminar unidad">×</button></td></tr>').join('');
    $("#app-content").innerHTML = '<div class="detail-header"><div class="building-symbol" style="--building-color:'+color+';--building-tint:'+color+'1A">▤</div><div><p class="eyebrow">FICHA DEL CONSORCIO</p><h1>'+escapeHtml(b.name)+'</h1><p class="muted">'+escapeHtml(b.address || "Dirección sin cargar")+'</p></div></div><section class="detail-block"><h2>Datos generales</h2><div class="detail-grid"><div class="detail-item"><small>Nombre</small><strong>'+escapeHtml(b.name)+'</strong></div><div class="detail-item"><small>Unidades declaradas</small><strong>'+Number(b.units || 0)+'</strong></div><div class="detail-item"><small>Unidades cargadas</small><strong>'+unitRecords.length+'</strong></div><div class="detail-item"><small>Dirección</small><strong>'+escapeHtml(b.address || "Sin cargar")+'</strong></div><div class="detail-item"><small>Color identificador</small><strong>'+color.toUpperCase()+'</strong></div></div></section><section class="detail-block"><div class="table-heading"><div><h2>Unidades y titulares</h2><p class="muted">Cargá departamentos, locales u otras unidades funcionales y sus datos de contacto.</p></div></div><form id="unit-form"><div class="detail-grid"><div><label for="unit-label">Unidad / departamento *</label><input id="unit-label" name="label" required maxlength="40" placeholder="Ej. 4° B o Local 2"></div><div><label for="unit-floor">Piso / ubicación</label><input id="unit-floor" name="floor" maxlength="40" placeholder="Ej. 4.º piso"></div><div><label for="unit-owner">Titular / propietario</label><input id="unit-owner" name="owner" maxlength="100" placeholder="Nombre y apellido"></div><div><label for="unit-contact">Contacto</label><input id="unit-contact" name="contact" maxlength="120" placeholder="Correo o teléfono"></div><div><label for="unit-coefficient">Coeficiente (%)</label><input id="unit-coefficient" name="coefficient" inputmode="decimal" placeholder="Ej. 2,35"></div></div><div class="form-actions"><button type="submit" class="primary-button">＋ Agregar unidad</button></div></form><div class="table-wrap"><table class="payments-table"><thead><tr><th>Unidad</th><th>Piso</th><th>Titular</th><th>Contacto</th><th>Coeficiente</th><th></th></tr></thead><tbody>'+(unitRows || '<tr><td colspan="6" class="table-empty">Todavía no hay unidades cargadas.</td></tr>')+'</tbody></table></div></section><section class="detail-block"><h2>Notas</h2><p class="muted">'+escapeHtml(b.notes || "Todavía no hay notas para este consorcio.")+'</p><div class="form-actions"><button class="secondary-button" data-view="buildings">Volver a consorcios</button><button class="primary-button" data-edit="'+escapeHtml(b.id)+'">Editar ficha</button></div></section><section class="note-panel"><span class="note-icon">i</span><div><strong>Datos guardados localmente</strong><p>Las unidades y titulares se guardan en este navegador junto con la ficha del consorcio. Todavía no se sincronizan con otros equipos ni generan expensas automáticamente.</p></div></section>';
    $("#unit-form").addEventListener("submit", event => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      const label = String(fd.get("label") || "").trim();
      if (!label) return;
      if (!Array.isArray(b.unitRecords)) b.unitRecords = [];
      if (b.unitRecords.some(u => String(u.label).toLowerCase() === label.toLowerCase())) {
        showToast("Ya existe una unidad con ese nombre en este consorcio.");
        return;
      }
      b.unitRecords.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), label, floor:String(fd.get("floor")||"").trim(), owner:String(fd.get("owner")||"").trim(), contact:String(fd.get("contact")||"").trim(), coefficient:String(fd.get("coefficient")||"").trim()});
      saveBuildings();
      renderDetail();
      showToast("Unidad agregada.");
    });
  }
  function renderSettings() {
    const colors = config.colors || {};
    const fields = [["primary","Color principal"],["primaryDark","Color principal oscuro"],["page","Fondo general"],["surface","Tarjetas"],["sidebar","Menú lateral"],["text","Texto principal"],["muted","Texto secundario"],["accent","Fondo de acento"]];
    $("#app-content").innerHTML = '<section class="welcome"><div><p class="eyebrow">PERSONALIZACIÓN</p><h1>Apariencia y ajustes</h1><p class="muted">Probá una combinación de colores sin editar CSS.</p></div></section><section class="detail-block"><h2>Colores de la interfaz</h2><p class="muted">Para guardar la combinación de forma permanente en el proyecto, editá los valores de <strong>config.js</strong>.</p><form id="theme-form"><div class="detail-grid">'+fields.map(([key,label])=>'<div><label for="theme-'+key+'">'+label+'</label><input id="theme-'+key+'" name="'+key+'" type="color" value="'+validColor(colors[key])+'"></div>').join("")+'</div><div class="form-actions"><button class="secondary-button" type="button" id="reset-theme">Restaurar colores de config.js</button><button class="primary-button" type="submit">Aplicar colores</button></div></form></section><section class="detail-block"><h2>Edificios iniciales</h2><p class="muted">Para cambiar los edificios de ejemplo iniciales, editá la lista <strong>buildings</strong> en <strong>config.js</strong>. Los edificios creados desde la interfaz se guardan en este navegador.</p></section>';
    $("#theme-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const colorsNow = {};
      Object.keys(themeMap).forEach(key => colorsNow[key] = validColor(form.get(key)));
      applyTheme(colorsNow);
      showToast("Colores aplicados a esta sesión.");
    });
    $("#reset-theme").addEventListener("click", () => { applyTheme(); renderSettings(); showToast("Se restauraron los colores de config.js."); });
  }
  function renderPayments() {
    const rows = payments.slice().reverse().map(p => '<tr><td>'+escapeHtml(p.date || '—')+'</td><td><strong>'+escapeHtml(p.amount || 'Sin importe')+'</strong></td><td>'+escapeHtml(p.payer || 'No identificado')+'</td><td>'+escapeHtml(p.sender || '—')+'</td><td><span class="payment-status">'+escapeHtml(p.status || 'Comprobante recibido')+'</span></td><td><button class="row-delete" data-payment-delete="'+escapeHtml(p.id)+'" title="Eliminar registro" aria-label="Eliminar registro">×</button></td></tr>').join('');
    $("#app-content").innerHTML = '<section class="welcome"><div><p class="eyebrow">CONTROL ADMINISTRATIVO</p><h1>Pagos y comprobantes</h1><p class="muted">Una sola lista para registrar cada comprobante recibido.</p></div><div class="processor-actions"><button class="secondary-button" id="import-gmail-register">Importar CSV de Gmail</button><input id="gmail-register-file" type="file" accept=".csv,text/csv" hidden><button class="secondary-button" id="export-payments">Exportar CSV</button></div></section><section class="detail-block"><h2>Importar registro de Gmail</h2><p class="muted">Desde Google Sheets, descargá la planilla como CSV y cargala acá. Se agregan los comprobantes que todavía no estén en esta lista; no se confirma la acreditación del pago.</p><p class="small-note">La importación es manual. La página todavía no se conecta directamente a tu Gmail o Drive.</p></section><section class="detail-block"><h2>Registrar comprobante manualmente</h2><p class="muted">También podés cargar un registro a mano.</p><form id="payment-form" class="payment-form"><div class="detail-grid"><div><label for="payment-date">Fecha del pago</label><input id="payment-date" name="date" type="date"></div><div><label for="payment-amount">Importe (ARS)</label><input id="payment-amount" name="amount" inputmode="decimal" placeholder="Ej. 5000"></div><div><label for="payment-payer">Nombre del pagador</label><input id="payment-payer" name="payer" placeholder="Si falta, usar remitente"></div><div><label for="payment-sender">Remitente del correo</label><input id="payment-sender" name="sender" placeholder="Nombre o correo electrónico"></div></div><label for="payment-file">Nombre del archivo (opcional)</label><input id="payment-file" name="file" placeholder="comprobante.jpg o comprobante.pdf"><div class="form-actions"><button type="submit" class="primary-button">＋ Guardar en la lista</button></div></form></section><section class="detail-block"><div class="table-heading"><div><h2>Registro acumulado</h2><p class="muted">'+payments.length+' comprobante(s) registrado(s) en este navegador.</p></div></div><div class="table-wrap"><table class="payments-table"><thead><tr><th>Fecha / recepción</th><th>Importe</th><th>Nombre del pagador</th><th>Remitente</th><th>Estado</th><th></th></tr></thead><tbody>'+(rows || '<tr><td colspan="6" class="table-empty">Todavía no hay comprobantes registrados.</td></tr>')+'</tbody></table></div></section><section class="note-panel"><span class="note-icon">i</span><div><strong>Importante</strong><p>“Comprobante recibido” no significa que el pago esté acreditado. Los registros importados o cargados a mano se guardan en este navegador. Para traer los correos nuevos, exportá la planilla de Gmail como CSV e importala acá.</p></div></section>';
    $("#payment-form").addEventListener("submit", event => {
      event.preventDefault(); const fd = new FormData(event.currentTarget);
      const payer = String(fd.get("payer") || "").trim(); const sender = String(fd.get("sender") || "").trim();
      payments.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), date:String(fd.get("date")||""), amount:String(fd.get("amount")||"").trim(), payer:payer || sender || "No identificado", sender, file:String(fd.get("file")||"").trim(), status:"Comprobante recibido"});
      try { localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments)); } catch (_) { showToast("No se pudo guardar en este navegador."); return; }
      renderPayments(); showToast("Comprobante agregado a la lista.");
    });
    $("#import-gmail-register").addEventListener("click", () => $("#gmail-register-file").click());
    $("#gmail-register-file").addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const raw = (await file.text()).replace(/^\uFEFF/, "");
        const parseCsv = text => {
          const firstLine = text.split(/\r?\n/, 1)[0];
          const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
          const rows = []; let row = [], cell = "", quoted = false;
          for (let i = 0; i < text.length; i++) {
            const ch = text[i], next = text[i + 1];
            if (ch === '"' && quoted && next === '"') { cell += '"'; i++; }
            else if (ch === '"') quoted = !quoted;
            else if (ch === delimiter && !quoted) { row.push(cell); cell = ""; }
            else if ((ch === "\n" || ch === "\r") && !quoted) {
              if (ch === "\r" && next === "\n") i++;
              row.push(cell); if (row.some(v => v.trim())) rows.push(row);
              row = []; cell = "";
            } else cell += ch;
          }
          if (cell || row.length) { row.push(cell); rows.push(row); }
          return rows;
        };
        const parsed = parseCsv(raw);
        if (parsed.length < 2) throw new Error("El CSV no contiene filas para importar.");
        const headers = parsed[0].map(v => v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        const find = (...names) => headers.findIndex(h => names.some(n => h.includes(n)));
        const idx = {
          date: find("fecha del correo", "fecha de registro", "fecha del pago"),
          sender: find("remitente"),
          subject: find("asunto"),
          file: find("nombre del adjunto", "archivo"),
          link: find("archivo en drive"),
          status: find("estado"),
          message: find("id del mensaje")
        };
        if (idx.file < 0 && idx.sender < 0) throw new Error("No reconozco las columnas de la planilla Copello.");
        const existing = new Set(payments.map(p => p.sourceKey).filter(Boolean));
        let added = 0, skipped = 0;
        for (const values of parsed.slice(1)) {
          const get = key => idx[key] >= 0 ? String(values[idx[key]] || "").trim() : "";
          const fileName = get("file");
          const sender = get("sender");
          const messageId = get("message");
          const sourceKey = messageId ? messageId + "|" + fileName : [get("date"), sender, get("subject"), fileName].join("|");
          if (!fileName && !sender) continue;
          if (existing.has(sourceKey)) { skipped++; continue; }
          existing.add(sourceKey);
          payments.push({
            id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
            sourceKey,
            date: get("date"),
            amount: "",
            payer: sender || "No identificado",
            sender,
            file: fileName + (get("link") ? " — " + get("link") : ""),
            status: get("status") || "Recibido — pendiente de verificar",
            subject: get("subject")
          });
          added++;
        }
        localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
        renderPayments();
        showToast("Importados: " + added + ". Omitidos por repetición: " + skipped + ".");
      } catch (error) {
        showToast("No se pudo importar: " + error.message);
      } finally {
        event.target.value = "";
      }
    });
    $("#export-payments").addEventListener("click", () => {
      const cols = ["Fecha / recepción","Importe (ARS)","Nombre del pagador","Remitente del correo","Archivo","Estado"];
      const csvCell = value => '"' + String(value ?? "").replace(/"/g, '""') + '"';
      const lines = [cols, ...payments.map(p => [p.date,p.amount,p.payer,p.sender,p.file,p.status])].map(row => row.map(csvCell).join(";")).join("\r\n");
      const blob = new Blob(["\uFEFF", lines], {type:"text/csv;charset=utf-8;"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="Seguimiento_Comprobantes.csv"; a.click(); URL.revokeObjectURL(url);
    });
  }
  function render() {
    if (currentView === "dashboard") renderDashboard();
    else if (currentView === "buildings") renderBuildings();
    else if (currentView === "detail") renderDetail();
    else if (currentView === "settings") renderSettings();
    else if (currentView === "payments") renderPayments();
  }
  function openModal(b = null) {
    const form = $("#building-form"); form.reset();
    $("#modal-title").textContent = b ? "Editar consorcio" : "Agregar consorcio";
    $("#building-color").value = b ? validColor(b.color) : validColor((config.colors || {}).primary);
    $("#building-name").value = b?.name || "";
    $("#building-address").value = b?.address || "";
    $("#building-units").value = b?.units ?? 0;
    $("#building-notes").value = b?.notes || "";
    form.dataset.editId = b?.id || "";
    $("#modal-backdrop").hidden = false;
    setTimeout(() => $("#building-name").focus(), 30);
  }
  function closeModal() { $("#modal-backdrop").hidden = true; }
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) { $("#building-name").focus(); return; }
    const editId = event.currentTarget.dataset.editId;
    const data = {name, address:String(form.get("address")||"").trim(), units:Math.max(0,Number(form.get("units"))||0), color:validColor(form.get("color")), notes:String(form.get("notes")||"").trim()};
    if (editId) buildings = buildings.map(item => item.id === editId ? {...item,...data} : item);
    else buildings.push({id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)), ...data});
    saveBuildings(); closeModal(); render();
    showToast(editId ? "Consorcio actualizado." : "Consorcio agregado.");
  }
  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) { go(viewButton.dataset.view); return; }
    if (event.target.closest("#add-building-top")) { openModal(); return; }
    const paymentDelete = event.target.closest("[data-payment-delete]");
    if (paymentDelete) {
      const p = payments.find(item => item.id === paymentDelete.dataset.paymentDelete);
      if (!p || !window.confirm("¿Eliminar este registro de práctica?")) return;
      payments = payments.filter(item => item.id !== p.id);
      try { localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments)); } catch (_) {}
      renderPayments(); showToast("Registro eliminado."); return;
    }
    const unitDelete = event.target.closest("[data-unit-delete]");
    if (unitDelete) {
      const b = buildings.find(item => item.id === selectedBuildingId);
      if (!b || !Array.isArray(b.unitRecords)) return;
      const unit = b.unitRecords.find(item => item.id === unitDelete.dataset.unitDelete);
      if (!unit || !window.confirm('¿Eliminar la unidad "' + unit.label + '"?')) return;
      b.unitRecords = b.unitRecords.filter(item => item.id !== unit.id);
      saveBuildings(); renderDetail(); showToast("Unidad eliminada."); return;
    }
    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      const b = buildings.find(item => item.id === deleteButton.dataset.delete);
      if (!b) return;
      const confirmed = window.confirm('¿Eliminar el consorcio "' + b.name + '" de esta demostración? Esta acción no se puede deshacer.');
      if (!confirmed) return;
      buildings = buildings.filter(item => item.id !== b.id);
      if (selectedBuildingId === b.id) selectedBuildingId = null;
      saveBuildings();
      if (currentView === "detail") currentView = "buildings";
      render();
      showToast("Consorcio eliminado de este navegador.");
      return;
    }
    const editButton = event.target.closest("[data-edit]");
    if (editButton) { const b = buildings.find(item => item.id === editButton.dataset.edit); if (b) openModal(b); return; }
    const openButton = event.target.closest("[data-open]");
    if (openButton) { selectedBuildingId = openButton.dataset.open; go("detail"); return; }
    if (event.target.closest("#close-modal") || event.target.closest("#cancel-modal")) closeModal();
    if (event.target.id === "modal-backdrop") closeModal();
    if (event.target.closest("#mobile-menu")) $("#sidebar").classList.toggle("open");
    if (event.target.closest("#brand-link")) { event.preventDefault(); go("dashboard"); }
  });
  $("#building-form").addEventListener("submit", handleSubmit);
  document.addEventListener("keydown", event => { if (event.key === "Escape") { closeModal(); $("#sidebar").classList.remove("open"); } });
  applyTheme(); applyBrand(); render();
})();