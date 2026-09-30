(()=>{
const $=s=>document.querySelector(s);
const ICO={key:'<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>',
 arr:'<svg viewBox="0 0 24 24"><path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"/></svg>',
 tbl:'<svg class="i" viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 10h18M9 10v9"/></svg>'};
// Esquema real (columnas: [nombre, tipo, clave])
const SQ=[
 {n:"cliente",cnt:()=>D.c.length,f:[["id_cliente","BIGINT","pk"],["nombre","VARCHAR(100)"]]},
 {n:"venta",cnt:()=>D.v.length,f:[["id_venta","BIGINT","pk"],["fecha","TIMESTAMP"],["id_cliente","BIGINT","fk"]]},
 {n:"detalle_venta",cnt:()=>D.d.length,f:[["id_venta","BIGINT","pk fk"],["codigo_producto","BIGINT","pk fk"],["cantidad","INT"]]},
 {n:"producto",cnt:()=>D.p.length,f:[["codigo_producto","BIGINT","pk"],["nombre","VARCHAR(100)"],["precio","DECIMAL(10,2)"],["cantidad_disponible","INT"]]}];
// [PK, FK]
const REL=[["cliente.id_cliente","venta.id_cliente"],["venta.id_venta","detalle_venta.id_venta"],["producto.codigo_producto","detalle_venta.codigo_producto"]];

const ov=document.createElement("div");ov.className="overlay";ov.id="schemaOv";
ov.innerHTML=`<div class="glass modal sqm" role="dialog" aria-label="Esquema SQL"><div class="sq-top"><div><h2>Esquema SQL</h2><p>Cómo se relacionan tus tablas en Supabase</p></div>
<button class="orb sm" data-sqclose aria-label="Cerrar"><svg class="i"><use href="#i-x"/></svg></button></div><div id="sqBody"></div></div>`;
document.body.appendChild(ov);

function body(){
 const cards=SQ.map((t,i)=>`<div class="sc glass" style="--i:${i}"><div class="sh"><span class="orb sm on">${ICO.tbl}</span><b>${t.n}</b><em>${t.cnt()} reg.</em></div>
 ${t.f.map(([c,ty,k=""],j)=>`<div class="sr" data-k="${t.n}.${c}" style="--r:${j}"><div><b>${c}</b><small>${ty}</small></div><span class="tags">
 ${k.includes("pk")?`<span class="tag pk" title="Clave primaria">${ICO.key}</span>`:""}${k.includes("fk")?`<span class="tag fk" title="Clave foránea">${ICO.arr}</span>`:""}</span></div>`).join("")}</div>`).join("");
 return `<div class="sq-wrap"><div class="sq" id="sq"><svg id="sqsvg" class="sqsvg"></svg><div class="sq-grid">${cards}</div></div></div>
 <div class="sq-leg"><span><i class="tag pk">${ICO.key}</i>Clave primaria (PK)</span><span><i class="tag fk">${ICO.arr}</i>Clave foránea (FK)</span>
 <span><b>1 → N</b>Un registro se relaciona con muchos</span><span><b>CASCADE</b>Al borrar una venta se borra su detalle</span></div>`;
}
function lines(){
 const c=$("#sq"),s=$("#sqsvg");if(!c||!s)return;
 const cb=c.getBoundingClientRect();
 const pt=k=>{const r=c.querySelector(`[data-k="${k}"]`).getBoundingClientRect();return{l:r.left-cb.left,r:r.right-cb.left,y:r.top-cb.top+r.height/2}};
 s.setAttribute("viewBox",`0 0 ${cb.width} ${cb.height}`);
 s.innerHTML=REL.map(([a,b],i)=>{
  const A=pt(a),B=pt(b),d=A.l<B.l?1:-1,x1=d>0?A.r:A.l,x2=d>0?B.l:B.r,m=(x1+x2)/2,p=`M${x1} ${A.y}C${m} ${A.y} ${m} ${B.y} ${x2} ${B.y}`;
  return `<path class="rl" data-rel="${i}" d="${p}"/><path class="flow" d="${p}"/>
  <circle class="pt" cx="${x1}" cy="${A.y}" r="5" fill="#ffb938"/><circle class="pt" cx="${x2}" cy="${B.y}" r="5" fill="var(--acc)"/>
  <text class="pt lb" x="${x1+d*14}" y="${A.y-8}">1</text><text class="pt lb" x="${x2-d*14}" y="${B.y-8}">N</text>`}).join("");
 s.querySelectorAll(".rl").forEach(p=>p.style.setProperty("--len",p.getTotalLength()));
}
const hot=(e,on)=>{const r=e.target.closest&&e.target.closest(".sr");if(!r)return;const k=r.dataset.k;
 REL.forEach(([a,b],i)=>{if(a!==k&&b!==k)return;
  [a,b].forEach(x=>$(`#sq [data-k="${x}"]`).classList.toggle("hot",on));
  document.querySelectorAll(`#sqsvg .rl[data-rel="${i}"]`).forEach(p=>p.classList.toggle("hot",on))})};
ov.addEventListener("mouseover",e=>hot(e,true));ov.addEventListener("mouseout",e=>hot(e,false));

let tm;
function show(){
 clearTimeout(tm);ov.classList.add("open");
 $("#sqBody").innerHTML=`<div class="sq-load"><span class="loader"></span><p>Leyendo esquema…</p></div>`;
 tm=setTimeout(()=>{$("#sqBody").innerHTML=body();requestAnimationFrame(()=>requestAnimationFrame(lines))},1300);
}
function hide(){clearTimeout(tm);ov.classList.remove("open")}
document.addEventListener("click",e=>{
 if(e.target.closest("[data-schema]"))show();
 else if(e.target.closest("[data-sqclose]")||e.target===ov)hide();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")hide()});
addEventListener("resize",()=>{if(ov.classList.contains("open")&&$("#sq")){$("#sqsvg").classList.add("static");lines()}});
})();
