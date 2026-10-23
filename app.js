(() => {
  "use strict";
  const config = window.COPELLO_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "copello.demo.buildings.v1";
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
    return '<article class="building-card"><div class="building-card-head"><div class="building-symbol" style="--building-color:'+color+';--building-tint:'+color+'1A">▤</div><button class="building-menu" data-edit="'+escapeHtml(b.id)+'" aria-label="Editar '+escapeHtml(b.name)+'" title="Editar consorcio">⋯</button></div><h3>'+escapeHtml(b.name)+'</h3><p class="building-address">'+escapeHtml(b.address || "Dirección sin cargar")+'</p><div class="building-meta"><span>Unidades</span><strong>'+Number(b.units || 0)+'</strong></div><button class="open-building" data-open="'+escapeHtml(b.id)+'">Abrir consorcio →</button></article>';
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
    $("#app-content").innerHTML = '<div class="detail-header"><div class="building-symbol" style="--building-color:'+color+';--building-tint:'+color+'1A">▤</div><div><p class="eyebrow">FICHA DEL CONSORCIO</p><h1>'+escapeHtml(b.name)+'</h1><p class="muted">'+escapeHtml(b.address || "Dirección sin cargar")+'</p></div></div><section class="detail-block"><h2>Datos generales</h2><div class="detail-grid"><div class="detail-item"><small>Nombre</small><strong>'+escapeHtml(b.name)+'</strong></div><div class="detail-item"><small>Unidades</small><strong>'+Number(b.units || 0)+'</strong></div><div class="detail-item"><small>Dirección</small><strong>'+escapeHtml(b.address || "Sin cargar")+'</strong></div><div class="detail-item"><small>Color identificador</small><strong>'+color.toUpperCase()+'</strong></div></div></section><section class="detail-block"><h2>Notas</h2><p class="muted">'+escapeHtml(b.notes || "Todavía no hay notas para este consorcio.")+'</p><div class="form-actions"><button class="secondary-button" data-view="buildings">Volver a consorcios</button><button class="primary-button" data-edit="'+escapeHtml(b.id)+'">Editar ficha</button></div></section><section class="note-panel"><span class="note-icon">i</span><div><strong>Próximos módulos</strong><p>Unidades y propietarios, expensas, pagos, documentación e integración con Gmail se conectarán en etapas posteriores.</p></div></section>';
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
    $("#app-content").innerHTML = '<section class="welcome"><div><p class="eyebrow">CONTROL ADMINISTRATIVO</p><h1>Pagos y comprobantes</h1><p class="muted">Este módulo se conectará con el procesamiento de comprobantes y Gmail.</p></div></section><section class="detail-block"><h2>Preparado para la siguiente etapa</h2><p class="muted">La integración leerá comprobantes autorizados, extraerá datos para revisión y podrá crear borradores de respuesta en Gmail. No enviará mensajes automáticamente ni modificará el Excel maestro original.</p></section><section class="note-panel"><span class="note-icon">i</span><div><strong>Requiere un servidor seguro</strong><p>La conexión con Gmail y el registro compartido entre computadora y celular no deben implementarse guardando credenciales en el navegador o en el repositorio.</p></div></section>';
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