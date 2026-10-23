(() => {
"use strict";
const $ = s => document.querySelector(s);
let workbook = null, masterBytes = null, masterName = "", masterRows = [], receipts = [];
const ACK = "Hola, recibimos tu comprobante. Gracias. Este mensaje confirma únicamente la recepción del archivo y no la acreditación del pago.";
const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800);}
function setProgress(p,msg){$("#progress-fill").style.width=Math.max(0,Math.min(100,p))+"%";$("#process-status").textContent=msg;}
function setOptions(sel,headers,includeBlank=false){sel.innerHTML=(includeBlank?'<option value="">— No especificar —</option>':"")+headers.map((h,i)=>'<option value="'+i+'">'+esc(h || ("Columna "+(i+1)))+'</option>').join("");}
$("#master-file").addEventListener("change",async e=>{
 const f=e.target.files[0]; if(!f)return;
 try{
  if(!window.XLSX)throw Error("No se pudo cargar el lector Excel. Revisá la conexión a internet y recargá la página.");
  masterBytes=await f.arrayBuffer();masterName=f.name;workbook=XLSX.read(masterBytes,{type:"array",cellDates:true});
  $("#sheet-select").disabled=false;$("#sheet-select").innerHTML=workbook.SheetNames.map(s=>'<option>'+esc(s)+'</option>').join("");
  $("#master-status").textContent="Excel cargado: "+f.name+" ("+workbook.SheetNames.length+" hojas).";
  $("#column-controls").classList.remove("hidden");populateColumns();toast("Excel cargado sin modificar el original.");
 }catch(err){$("#master-status").textContent=err.message;workbook=null;}
});
function populateColumns(){
 if(!workbook)return;
 const sheet=workbook.Sheets[$("#sheet-select").value];const data=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});
 const headers=(data[0]||[]).map((v,i)=>String(v||("Columna "+(i+1))));
 setOptions($("#unit-column"),headers);setOptions($("#name-column"),headers,true);setOptions($("#building-column"),headers,true);setOptions($("#expected-column"),headers,true);
 const find=terms=>headers.findIndex(h=>terms.some(t=>norm(h).includes(norm(t))));
 const unit=find(["unidad","uf","departamento","depto"]);if(unit>=0)$("#unit-column").value=unit;
 const name=find(["propietario","titular","nombre"]);if(name>=0)$("#name-column").value=name;
 const building=find(["consorcio","edificio","direccion"]);if(building>=0)$("#building-column").value=building;const expected=find(["saldo","importe esperado","a pagar","deuda","balance"]);if(expected>=0)$("#expected-column").value=expected;
 masterRows=data.slice(1).filter(r=>r.some(v=>String(v??"").trim())).map(r=>({unit:String(r[Number($("#unit-column").value)]??"").trim(),name:$("#name-column").value===""?"":String(r[Number($("#name-column").value)]??"").trim(),building:$("#building-column").value===""?"":String(r[Number($("#building-column").value)]??"").trim(),raw:r}));
}
$("#sheet-select").addEventListener("change",populateColumns);
["unit-column","name-column","building-column","expected-column"].forEach(id=>$("#"+id).addEventListener("change",populateColumns));
$("#receipt-files").addEventListener("change",()=>{
 const files=[...$("#receipt-files").files];$("#file-list").innerHTML=files.length?files.map(f=>"<li>"+esc(f.name)+" ("+Math.round(f.size/1024)+" KB)</li>").join(""):"<li>No se seleccionaron archivos.</li>";
 $("#process-files").disabled=!files.length;setProgress(0,files.length+" archivo(s) listo(s) para analizar.");
});
$("#clear-files").addEventListener("click",()=>{$("#receipt-files").value="";receipts=[];render();$("#file-list").innerHTML="<li>No se seleccionaron archivos.</li>";$("#process-files").disabled=true;setProgress(0,"Esperando archivos.");});
function parseAmount(text){
 const patterns=[/(?:importe|monto|total|valor|pesos|ars)[^\d$]{0,20}\$?\s*([\d.]+(?:,\d{2})?)/i,/\$\s*([\d.]+(?:,\d{2})?)/];
 for(const re of patterns){const m=text.match(re);if(m){const raw=m[1];const n=raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw.replace(/\./g,"");if(Number.isFinite(Number(n)))return Number(n).toLocaleString("es-AR",{minimumFractionDigits:2,maximumFractionDigits:2});}}
 return "";
}
function parseDate(text){
 const monthNames="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" ");
 const namedDate=text.match(/\\b(\\d{1,2})\\s*[\\/.-]\\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\\s*[\\/.-]\\s*(20\\d{2})\\b/i);
 if(namedDate)return String(namedDate[1]).padStart(2,"0")+"/"+String(monthNames.indexOf(namedDate[2].toLowerCase())+1).padStart(2,"0")+"/"+namedDate[3];
 const patterns=[/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/,/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/];
 let m=text.match(patterns[0]);if(m)return String(m[1]).padStart(2,"0")+"/"+String(m[2]).padStart(2,"0")+"/"+m[3];
 m=text.match(patterns[1]);if(m)return String(m[3]).padStart(2,"0")+"/"+String(m[2]).padStart(2,"0")+"/"+m[1];
 const months="enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(" ");
 const re=new RegExp(String.raw`\b(\d{1,2})\s*(?:de\s*)?(`+months.join("|")+String.raw`)\s*(?:de\s*)?(20\d{2})?`,"i");m=text.toLowerCase().match(re);
 if(m)return String(m[1]).padStart(2,"0")+"/"+String(months.indexOf(m[2])+1).padStart(2,"0")+"/"+(m[3]||String(new Date().getFullYear()));
 return "";
}
function normalizeOperation(value){
 return String(value??"").replace(/\\D/g,"");
}
function parseOperation(text){
 // Priorizar identificadores explícitamente rotulados como operación/transacción.
 const labeled=/(?:n[uú]mero\s+de\s+)?(?:operaci[oó]n|transacci[oó]n|id\s+de\s+operaci[oó]n|nro\.?\s*operaci[oó]n)[^\\d]{0,24}(\\d[\\d .-]{5,})/ig;
 let m;
 while((m=labeled.exec(text))!==null){
  const candidate=normalizeOperation(m[1]);
  if(candidate.length>=6 && candidate.length<=24)return candidate;
 }
 // Evitar confundir CVU/CBU/CUIL/CUIT con un número de operación.
 const lines=String(text??"").split(/\\r?\\n/);
 for(let i=0;i<lines.length;i++){
  if(/\\b(?:cvu|cbu|cuil|cuit)\\b/i.test(lines[i]))continue;
  const candidates=lines[i].match(/\\b\\d(?:[\\d .-]{8,}\\d)\\b/g)||[];
  for(const raw of candidates){
   const candidate=normalizeOperation(raw);
   if(candidate.length>=10 && candidate.length<=24 && !/\\b(?:cvu|cbu|cuil|cuit)\\b/i.test(lines.slice(Math.max(0,i-1),i+1).join(" ")))return candidate;
  }
 }
 return "";
}

function matchUnit(text){
 if(!masterRows.length)return null;
 const t=norm(text);const col=Number($("#unit-column").value);
 const matches=masterRows.filter(r=>{const v=norm(r.raw[col]);return v.length>=2&&t.includes(v);});
 const unique=[...new Set(matches.map(r=>r.unit).filter(Boolean))];
 return unique.length===1?matches.find(r=>r.unit===unique[0]):null;
}
function moneyNumber(value){const s=String(value??"").replace(/[^\d,.-]/g,"");if(!s)return NaN;const normalized=s.includes(",")?s.replace(/\./g,"").replace(",","."):s.replace(/\.(?=\d{3}(?:\D|$))/g,"");return Number(normalized);}
async function readImage(file){
 if(!window.Tesseract)throw Error("No se pudo cargar el OCR. Revisá la conexión a internet.");
 const result=await Tesseract.recognize(file,"spa+eng",{logger:m=>{if(m.status==="recognizing text")setProgress(5+Math.round(m.progress*70),"Reconociendo texto de "+file.name+"…");}});
 return result.data.text||"";
}
async function readPdf(file){
 if(!window.pdfjsLib)throw Error("No se pudo cargar el lector PDF. Revisá la conexión a internet.");
 pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
 const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text="";
 for(let i=1;i<=pdf.numPages;i++){
  const page=await pdf.getPage(i);const content=await page.getTextContent();text+="\n"+content.items.map(x=>x.str).join(" ");
 }
 if(text.replace(/\s/g,"").length<30){
  for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.7}),canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:ctx,viewport}).promise;text+="\n"+await readImage(await new Promise(resolve=>canvas.toBlob(resolve,"image/png")));}
 }
 return text;
}
async function processFile(file){
 let text="";
 if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf"))text=await readPdf(file);
 else if(file.type.startsWith("image/"))text=await readImage(file);
 else throw Error("Formato no compatible: "+file.name);
 $("#extracted-text").textContent=text||"No se pudo reconocer texto en este archivo.";
 const operation=parseOperation(text);
 const dup=operation&&receipts.some(r=>normalizeOperation(r.operation)===normalizeOperation(operation));
 const matched=matchUnit(text);const unit=matched?.unit||"";const expected=matched?.expected||"";const amount=parseAmount(text);const sameAmount=amount!==""&&expected!==""&&moneyNumber(amount)===moneyNumber(expected);
 return {id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()),file:file.name,amount,expected,date:parseDate(text),operation,payer:"",sender:"",unit,text,status:dup?"Duplicado posible":sameAmount?"OK — importe exacto":expected&&amount?"Difiere del esperado ("+expected+")":unit?"Revisar datos":"Pendiente de identificar",draft:ACK};
}
$("#process-files").addEventListener("click",async()=>{
 const files=[...$("#receipt-files").files];if(!files.length)return;
 $("#process-files").disabled=true;let failed=[];
 for(let i=0;i<files.length;i++){
  try{setProgress(i/files.length*100,"Analizando "+(i+1)+" de "+files.length+": "+files[i].name);receipts.push(await processFile(files[i]));}
  catch(err){failed.push(files[i].name+": "+err.message);receipts.push({id:String(Date.now())+i,file:files[i].name,amount:"",date:"",operation:"",payer:"",sender:"",unit:"",status:"Error de lectura",draft:ACK,text:err.message});}
  render();
 }
 setProgress(100,failed.length?"Finalizado con "+failed.length+" error(es). Revisá la tabla.":"Análisis terminado. Revisá todos los campos antes de exportar.");
 $("#process-files").disabled=false;toast("Análisis terminado. No se envió ningún correo.");
});
function render(){
 const body=$("#results-body");
 if(!receipts.length){body.innerHTML='<tr><td colspan="8" class="table-empty">Todavía no se analizaron comprobantes.</td></tr>';$("#download-copy").disabled=$("#export-csv").disabled=true;return;}
 body.innerHTML=receipts.map(r=>{
 const duplicate=r.operation&&receipts.filter(x=>normalizeOperation(x.operation)===normalizeOperation(r.operation)).length>1;
 const status=duplicate?"Duplicado posible":(r.status==="Duplicado posible"?"Pendiente de revisar":r.status);
 const cls=duplicate?"status-duplicate":status.startsWith("OK")?"status-ok":"status-review";
 return '<tr data-id="'+esc(r.id)+'"><td>'+esc(r.file)+'</td><td><input data-field="amount" value="'+esc(r.amount)+'" placeholder="Revisar importe"></td><td><input data-field="date" value="'+esc(r.date)+'" placeholder="DD/MM/AAAA"></td><td><input data-field="operation" value="'+esc(r.operation)+'" placeholder="N.º operación"></td><td><input data-field="payer" value="'+esc(r.payer)+'" placeholder="Nombre pagador"><input data-field="sender" value="'+esc(r.sender)+'" placeholder="Remitente"></td><td><select data-field="unit"><option value="">Pendiente</option>'+masterRows.map(m=>'<option value="'+esc(m.unit)+'" '+(m.unit===r.unit?'selected':'')+'>'+esc([m.unit,m.name,m.building].filter(Boolean).join(" — "))+'</option>').join("")+'</select></td><td>'+esc(r.expected||"—")+'</td><td><span class="'+cls+'">'+esc(status)+'</span></td><td><button class="secondary-button draft-btn" data-draft="'+esc(r.id)+'">Ver texto</button><button class="row-delete" data-remove="'+esc(r.id)+'" title="Quitar">×</button></td></tr>'
 }).join("");
 $("#download-copy").disabled=!workbook;$("#export-csv").disabled=!receipts.length;
 body.querySelectorAll("input[data-field],select[data-field]").forEach(el=>el.addEventListener("change",()=>{
 const row=el.closest("tr"),r=receipts.find(x=>x.id===row.dataset.id);if(!r)return;r[el.dataset.field]=el.value;
 if(el.dataset.field==="operation"&&r.status==="Duplicado posible")r.status="Pendiente de revisar";render();
 }));
 body.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{receipts=receipts.filter(r=>r.id!==b.dataset.remove);render();}));
 body.querySelectorAll("[data-draft]").forEach(b=>b.addEventListener("click",()=>{const r=receipts.find(x=>x.id===b.dataset.draft);if(!r)return;$("#extracted-text").textContent="Borrador de acuse de recibo (no enviado):\n\n"+ACK+"\n\nArchivo: "+r.file+"\nImporte detectado: "+(r.amount||"pendiente de revisar")+"\nFecha detectada: "+(r.date||"pendiente de revisar")+"\n\n"+(r.text||"");$("#extracted-text").scrollIntoView({behavior:"smooth",block:"center"});}));
}
function currentRows(){return receipts.map(r=>({Archivo:r.file,Importe:r.amount,Fecha:r.date,Operacion:r.operation,Pagador:r.payer||r.sender||"No identificado",Remitente:r.sender,Unidad:r.unit,ImporteEsperado:r.expected,Estado:r.status,Observacion:r.status==="Duplicado posible"?"Verificar número de operación":(!r.amount||!r.date||!r.unit)?"Revisión manual requerida":"Revisar contra banco al cierre de mes"}));}
$("#export-csv").addEventListener("click",()=>{
 const rows=currentRows(),csv=[Object.keys(rows[0]||{}),...rows.map(Object.values)].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";")).join("\r\n");
 const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});downloadBlob(blob,"Seguimiento_Comprobantes.csv");
});
$("#download-copy").addEventListener("click",()=>{
 if(!workbook)return;
 const rows=currentRows();const sheet=XLSX.utils.json_to_sheet(rows);workbook.Sheets["Pagos recibidos"]=sheet;
 if(!workbook.SheetNames.includes("Pagos recibidos"))workbook.SheetNames.push("Pagos recibidos");
 XLSX.writeFile(workbook,"Copia_"+masterName.replace(/\.xlsx?$/i,"")+"_con_seguimiento.xlsx");
 toast("Se descargó una copia. El Excel original quedó intacto.");
});
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("#mobile-menu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
})();