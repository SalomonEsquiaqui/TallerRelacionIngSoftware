const {SUPABASE_URL,SUPABASE_KEY,T}=window.CONFIG;
const configured=!SUPABASE_KEY.startsWith("PEGA_");
const sb=configured?supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
const $=s=>document.querySelector(s);
const ic=n=>`<svg class="i"><use href="#i-${n}"/></svg>`;
const money=n=>"$"+Number(n||0).toLocaleString("es-CO");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let D={c:[],p:[],v:[],d:[],fresh:new Set()},view="home",prev=null,rt=false,sig="";

const VIEWS={home:["Sistema de Ventas","home"],clientes:["Clientes","user"],productos:["Productos","box"],ventas:["Ventas","cart"],live:["Tablas en vivo","chart"]};
const FIELDS={
 clientes:{t:T.cliente,pk:"id_cliente",name:"cliente",f:[["nombre","Nombre","text"]]},
 productos:{t:T.producto,pk:"codigo_producto",name:"producto",f:[["nombre","Nombre","text"],["precio","Precio","number"],["cantidad_disponible","Cantidad disponible","number"]]}};

function toast(m,err){const t=$("#toast");t.textContent=m;t.className="toast glass show"+(err?" err":"");clearTimeout(toast.h);toast.h=setTimeout(()=>t.className="toast glass",3200)}
function openModal(h){$("#modal").innerHTML=h;$("#overlay").classList.add("open")}
function closeModal(){$("#overlay").classList.remove("open")}
$("#overlay").addEventListener("click",e=>{if(e.target.id==="overlay")closeModal()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

async function load(){
 if(!configured)return false;
 const q=(t,k,asc=true)=>sb.from(t).select("*").order(k,{ascending:asc});
 const [c,p,v,d]=await Promise.all([q(T.cliente,"id_cliente"),q(T.producto,"codigo_producto"),q(T.venta,"id_venta",false),q(T.detalle,"id_venta",false)]);
 const er=c.error||p.error||v.error||d.error;
 if(er){toast("Error: "+er.message,true);return false}
 const x=JSON.stringify([c.data,p.data,v.data,d.data]);
 if(x===sig)return false;
 sig=x;
 const keys=new Set([...c.data.map(r=>"c"+r.id_cliente),...p.data.map(r=>"p"+r.codigo_producto),...v.data.map(r=>"v"+r.id_venta),...d.data.map(r=>"d"+r.id_venta+"-"+r.codigo_producto)]);
 D={c:c.data,p:p.data,v:v.data,d:d.data,fresh:prev?new Set([...keys].filter(k=>!prev.has(k))):new Set()};
 prev=keys;return true;
}
const vtotal=id=>D.d.filter(x=>x.id_venta==id).reduce((s,x)=>s+price(x.codigo_producto)*x.cantidad,0);
const fdate=f=>new Date(f).toLocaleString("es-CO",{dateStyle:"short",timeStyle:"short"});
const cname=id=>D.c.find(x=>x.id_cliente==id)?.nombre??"—";
const pname=id=>D.p.find(x=>x.codigo_producto==id)?.nombre??"—";

function nav(){
 const L={home:"Inicio",live:"En vivo"};
 $("#nav").innerHTML=Object.entries(VIEWS).map(([k,[l,i]])=>
  `<button class="navb ${k===view?"on":""}" data-go="${k}" aria-label="${l}"><span class="orb ${k===view?"on":""}">${ic(i)}</span><span>${L[k]||l}</span></button>`).join("");
}
function render(){
 nav();$("#title").textContent=VIEWS[view][0];
 $("#banner").innerHTML=configured?"":`<div class="banner glass">Falta conectar Supabase: abre <b>config.js</b> y pega tu <b>anon key</b> en SUPABASE_KEY.</div>`;
 const a=$("#actions"),v=$("#view");
 a.innerHTML=view==="clientes"||view==="productos"?`<button class="pill pri" data-add="${view}">${ic("plus")}Agregar</button>`:
  view==="home"||view==="ventas"?`<button class="pill pri" data-sale>${ic("plus")}Nueva venta</button>`:"";
 if(view==="home")v.innerHTML=`<div class="stats">
  ${[["user",D.c.length,"Clientes"],["box",D.p.length,"Productos"],["cart",D.v.length,"Ventas"]].map(([i,n,l])=>
   `<div class="stat glass"><span class="orb on">${ic(i)}</span><div><b>${n}</b><span>${l}</span></div></div>`).join("")}</div>
  <div class="card glass"><h2>Ventas recientes</h2>${salesRows(D.v.slice(0,6))}</div>`;
 else if(view==="live")v.innerHTML=liveView();
 else if(view==="ventas")v.innerHTML=`<div class="card glass">${salesRows(D.v)}</div>`;
 else{const m=FIELDS[view],list=view==="clientes"?D.c:D.p;
  v.innerHTML=`<div class="card glass">${list.length?list.map(r=>`<div class="row"><div class="grow"><b>${esc(r.nombre)}</b>
   <small>${view==="clientes"?"ID "+r.id_cliente:money(r.precio)+" · disponibles "+r.cantidad_disponible}</small></div>
   <div class="acts"><button class="orb sm" data-edit="${r[m.pk]}" aria-label="Editar">${ic("edit")}</button>
   <button class="orb sm bad" data-del="${r[m.pk]}" aria-label="Eliminar">${ic("trash")}</button></div></div>`).join(""):`<div class="empty">Aún no hay ${view}. Agrega el primero.</div>`}</div>`}
}
function salesRows(l){return l.length?l.map(s=>`<div class="row"><div class="grow"><b>#${String(s.id_venta).padStart(5,"0")} ${esc(cname(s.id_cliente))}</b><small>${fdate(s.fecha)}</small></div>
 <span class="amt">${money(vtotal(s.id_venta))}</span><button class="orb sm" data-see="${s.id_venta}" aria-label="Ver venta">${ic("eye")}</button></div>`).join(""):`<div class="empty">Todavía no hay ventas. Crea la primera con “Nueva venta”.</div>`}

// ---- CRUD clientes / productos
function form(kind,row={}){
 const m=FIELDS[kind];
 openModal(`<h2>${row[m.pk]?"Editar":"Agregar"} ${m.name}</h2>
  ${m.f.map(([k,l,t])=>`<label>${l}</label><input id="f_${k}" type="${t}" ${t==="number"?'min="0" step="any"':""} value="${esc(row[k])}">`).join("")}
  <div class="foot"><button class="pill" data-close>${ic("x")}Cancelar</button><button class="pill pri" data-save="${kind}" data-id="${row[m.pk]??""}">${ic("check")}Guardar</button></div>`);
}
async function save(kind,id){
 const m=FIELDS[kind],o={};
 for(const[k,,t]of m.f){let v=$("#f_"+k).value.trim();o[k]=t==="number"?(k==="cantidad_disponible"?Math.trunc(Number(v||0)):Number(v||0)):(v||null)}
 if(!o.nombre)return toast("El nombre es obligatorio",true);
 const r=id?await sb.from(m.t).update(o).eq(m.pk,id):await sb.from(m.t).insert(o);
 if(r.error)return toast(r.error.message,true);
 closeModal();toast("Guardado");await load();render();
}
async function del(kind,id){
 const m=FIELDS[kind];if(!confirm("¿Eliminar este registro?"))return;
 const r=await sb.from(m.t).delete().eq(m.pk,id);
 if(r.error)return toast(r.error.code==="23503"?"No se puede eliminar: tiene ventas asociadas":r.error.message,true);
 toast("Eliminado");await load();render();
}

// ---- Nueva venta (VENTA + DETALLE_VENTA)
let lines=[];
function saleForm(){
 if(!D.c.length||!D.p.length)return toast("Crea al menos un cliente y un producto primero",true);
 lines=[{p:D.p[0].codigo_producto,q:1}];
 openModal(`<h2>Nueva venta</h2><label>Cliente</label>
  <select id="s_cli">${D.c.map(c=>`<option value="${c.id_cliente}">${esc(c.nombre)}</option>`).join("")}</select>
  <label>Productos</label><div id="lines"></div>
  <button class="pill" style="margin-top:12px" data-addline>${ic("plus")}Agregar producto</button>
  <div class="total"><span>Total</span><span id="s_tot"></span></div>
  <div class="foot"><button class="pill" data-close>${ic("x")}Cancelar</button><button class="pill pri" data-savesale>${ic("check")}Crear venta</button></div>`);
 drawLines();
}
const price=id=>Number(D.p.find(x=>x.codigo_producto==id)?.precio||0);
function drawLines(){
 $("#lines").innerHTML=lines.map((l,i)=>`<div class="line"><select data-lp="${i}">${D.p.map(p=>`<option value="${p.codigo_producto}" ${p.codigo_producto==l.p?"selected":""}>${esc(p.nombre)} · ${money(p.precio)} · ${p.cantidad_disponible} disp.</option>`).join("")}</select>
  <input type="number" min="1" value="${l.q}" data-lq="${i}" aria-label="Cantidad"><span class="sub">${money(price(l.p)*l.q)}</span>
  <button class="orb sm bad" data-rl="${i}" aria-label="Quitar">${ic("x")}</button></div>`).join("");
 tot();
}
const tot=()=>$("#s_tot").textContent=money(lines.reduce((s,l)=>s+price(l.p)*l.q,0));
async function saveSale(){
 const merged={};lines.forEach(l=>merged[l.p]=(merged[l.p]||0)+l.q); // mismo producto = una fila (PK compuesta)
 for(const[p,q]of Object.entries(merged)){const pr=D.p.find(x=>x.codigo_producto==p);if(q>pr.cantidad_disponible)return toast(`Solo hay ${pr.cantidad_disponible} de ${pr.nombre}`,true)}
 const v=await sb.from(T.venta).insert({id_cliente:Number($("#s_cli").value)}).select().single();
 if(v.error)return toast(v.error.message,true);
 const rows=Object.entries(merged).map(([p,q])=>({id_venta:v.data.id_venta,codigo_producto:Number(p),cantidad:q}));
 const d=await sb.from(T.detalle).insert(rows);
 if(d.error){await sb.from(T.venta).delete().eq("id_venta",v.data.id_venta);return toast(d.error.message,true)}
 await Promise.all(Object.entries(merged).map(([p,q])=>sb.from(T.producto).update({cantidad_disponible:D.p.find(x=>x.codigo_producto==p).cantidad_disponible-q}).eq("codigo_producto",p)));
 closeModal();toast("Venta creada");await load();render();
}
async function seeSale(id){
 const s=D.v.find(x=>x.id_venta==id),r=await sb.from(T.detalle).select("*").eq("id_venta",id);
 if(r.error)return toast(r.error.message,true);
 openModal(`<h2>Venta #${String(id).padStart(5,"0")}</h2><p style="color:var(--mute)">${esc(cname(s.id_cliente))} · ${fdate(s.fecha)}</p>
  ${r.data.map(d=>`<div class="row"><div class="grow"><b>${esc(pname(d.codigo_producto))}</b><small>${d.cantidad} × ${money(price(d.codigo_producto))}</small></div><span class="amt">${money(price(d.codigo_producto)*d.cantidad)}</span></div>`).join("")}
  <div class="total"><span>Total</span><span>${money(r.data.reduce((a,d)=>a+price(d.codigo_producto)*d.cantidad,0))}</span></div>
  <div class="foot"><button class="pill pri" data-close>${ic("check")}Cerrar</button></div>`);
}

// ---- eventos
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;const d=b.dataset;
 if(d.go){view=d.go;render()}
 else if(d.add)form(d.add);
 else if(d.edit){const m=FIELDS[view];form(view,(view==="clientes"?D.c:D.p).find(r=>r[m.pk]==d.edit))}
 else if(d.del)del(view,d.del);
 else if("save"in d)save(d.save,d.id);
 else if("close"in d)closeModal();
 else if("sale"in d)saleForm();
 else if("addline"in d){lines.push({p:D.p[0].codigo_producto,q:1});drawLines()}
 else if(d.rl!==undefined){lines.splice(+d.rl,1);if(!lines.length)lines.push({p:D.p[0].codigo_producto,q:1});drawLines()}
 else if("savesale"in d)saveSale();
 else if(d.see)seeSale(d.see);
});
document.addEventListener("input",e=>{
 const d=e.target.dataset;
 if(d.lq!==undefined){lines[d.lq].q=Math.max(1,parseInt(e.target.value)||1);e.target.closest(".line").querySelector(".sub").textContent=money(price(lines[d.lq].p)*lines[d.lq].q);tot()}
 if(d.lp!==undefined){lines[d.lp].p=e.target.value;drawLines()}
});
// ---- Tablas en vivo
function liveView(){
 const N=k=>D.fresh.has(k)?' class="new"':"";
 const tb=(title,i,head,rows,n)=>`<div class="card glass tcard"><h2><span class="orb sm on">${ic(i)}</span>${title}<em>${n}</em></h2><div class="tw"><table><thead><tr>${head.map(h=>`<th${h[0]===">"?' class="r"':""}>${h.replace(">","")}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${head.length}" class="empty">Sin registros</td></tr>`}</tbody></table></div></div>`;
 const bars=(o,nm,fmt)=>{const e=Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,6),m=Math.max(...e.map(x=>x[1]),1);
  return e.length?`<div class="bars">${e.map(([k,v])=>`<div class="bar"><span>${esc(nm(k))}</span><div class="trk"><i style="width:${v/m*100}%"></i></div><b>${fmt(v)}</b></div>`).join("")}</div>`:`<div class="empty">Sin datos todavía</div>`};
 const byC={},byP={};
 D.v.forEach(x=>byC[x.id_cliente]=(byC[x.id_cliente]||0)+vtotal(x.id_venta));
 D.d.forEach(x=>byP[x.codigo_producto]=(byP[x.codigo_producto]||0)+x.cantidad);
 const card=(t,i,b)=>`<div class="card glass tcard"><h2><span class="orb sm on">${ic(i)}</span>${t}</h2>${b}</div>`;
 return `<div class="live-head"><span class="live-l"><span class="badge glass"><i></i>${rt?"Tiempo real":"Actualiza cada 5 s"}</span><button class="uv" data-schema aria-label="Ver esquema SQL"><span>Esquema SQL</span><svg viewBox="0 0 24 24"><path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"/></svg></button></span><span>Las tablas se actualizan solas cuando cambian los datos.</span></div>
 <div class="live-grid">
  ${card("Ventas por cliente","cart",bars(byC,cname,money))}
  ${card("Unidades por producto","box",bars(byP,pname,n=>n+" u."))}
  ${tb("Clientes","user",["ID","Nombre"],D.c.map(r=>`<tr${N("c"+r.id_cliente)}><td>${r.id_cliente}</td><td>${esc(r.nombre)}</td></tr>`).join(""),D.c.length)}
  ${tb("Productos","box",["Código","Nombre",">Precio",">Disponible"],D.p.map(r=>`<tr${N("p"+r.codigo_producto)}><td>${r.codigo_producto}</td><td>${esc(r.nombre)}</td><td class="r">${money(r.precio)}</td><td class="r">${r.cantidad_disponible}</td></tr>`).join(""),D.p.length)}
  ${tb("Ventas","cart",["N.º","Fecha","Cliente",">Total"],D.v.map(r=>`<tr${N("v"+r.id_venta)}><td>#${String(r.id_venta).padStart(5,"0")}</td><td>${fdate(r.fecha)}</td><td>${esc(cname(r.id_cliente))}</td><td class="r">${money(vtotal(r.id_venta))}</td></tr>`).join(""),D.v.length)}
  ${tb("Detalle de venta","eye",["Venta","Producto",">Cant.",">Subtotal"],D.d.map(r=>`<tr${N("d"+r.id_venta+"-"+r.codigo_producto)}><td>#${String(r.id_venta).padStart(5,"0")}</td><td>${esc(pname(r.codigo_producto))}</td><td class="r">${r.cantidad}</td><td class="r">${money(price(r.codigo_producto)*r.cantidad)}</td></tr>`).join(""),D.d.length)}
 </div>`;
}
let rtimer;
const refresh=()=>{clearTimeout(rtimer);rtimer=setTimeout(async()=>{if(await load())render()},250)};
function startLive(){
 if(!configured)return;
 const ch=sb.channel("ventas-live");
 Object.values(T).forEach(t=>ch.on("postgres_changes",{event:"*",schema:"public",table:t},refresh));
 ch.subscribe(st=>{rt=st==="SUBSCRIBED";if(view==="live")render()});
 setInterval(refresh,5000); // respaldo si Realtime no está activado
}
render();load().then(render);startLive();
