import{c as R,g as V,a as q,s as D}from"./index-DBxk60uD.js";function f(e){if(!e)return null;if(typeof e=="string")try{const t=JSON.parse(e);return t?.d!==void 0?typeof t.d=="string"?JSON.parse(t.d):t.d:t}catch{return null}if(e?.d!==void 0)try{return typeof e.d=="string"?JSON.parse(e.d):e.d}catch{return null}return e}function h(e,t,a=""){e.innerHTML=t,console.log("[Detalle] Header actualizado",{reason:a,html:t,text:e.textContent})}function b(e){return Array.isArray(e)?e:[]}function v(e){return e==null?"":String(e).trim()}function i(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function A(e,t=200){const a=v(e)||"sinescudo";return`https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/${t}x${t}/${a}.png`}function N(e){if(!e)return"";const t=String(e);return/^\d{4}-\d{2}-\d{2}/.test(t)?t.slice(0,10):t}function C(e){if(!e)return"";const t=String(e);return t.length>=5?t.slice(0,5):t}function F(e){const t=Array.isArray(e)?e[0]:e;return!t||typeof t!="object"?null:{raw:t,modalidad:t.IdModalidadComp||"hp",competicion:t.DenoComp||"",jornada:t.NombreJornada||"",fecha:t.Fecha||"",hora:t.Hora||"",instalacion:t.Instalacion||"",estado:t.Periodo||t.Estado||"",crono:t.Crono||"",local:t.Eq1||t.Local||"Equipo local",visit:t.Eq2||t.Visit||"Equipo visitante",localAbrev:t.LocalAbrev||"",visitAbrev:t.VisitAbrev||"",golesLocal:t.GolesLocal??"-",golesVisit:t.GolesVisit??"-",arbitros:[t.Arb1,t.Arb2].filter(Boolean),logoLocal:t.IdEntidadEq1||t.IdEnt1||t.IdEq1||t.IdEquipoLocal||"sinescudo",logoVisit:t.IdEntidadEq2||t.IdEnt2||t.IdEq2||t.IdEquipoVisit||"sinescudo",idEquipoLocal:t.IdEq1||t.IdEquipoLocal||null,idEquipoVisit:t.IdEq2||t.IdEquipoVisit||null,puntoBonus:t.PuntoBonus}}function M(e){return{idPartido:String(e),partido:null,modalidad:"hp",eventos:[],alineaciones:null,penaltis:[],statsResumen:[],localKey:null,visitKey:null,currentView:"partido",currentTab:"resumen",viewStack:[]}}function at(e){E();const t=document.createElement("div");t.className="partido-detalle-modal",t.innerHTML=`
    <div class="partido-detalle-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="partido-detalle-header">
        <button class="partido-detalle-back" aria-label="Volver" hidden>←</button>
        <div class="partido-detalle-header-content" id="partido-detalle-header-content"></div>
        <button class="partido-detalle-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="partido-detalle-body" id="partido-detalle-body"></div>
    </div>
  `,document.body.appendChild(t),document.body.classList.add("modal-abierto"),t.querySelector(".partido-detalle-close").onclick=E,t.querySelector(".partido-detalle-back").onclick=()=>{const a=window.__partidoDetalleState;if(!a?.viewStack?.length)return;a.currentView=a.viewStack.pop()||"partido";const n=document.getElementById("partido-detalle-header-content"),l=document.getElementById("partido-detalle-body");m(a,n,l)},O(e)}function E(){const e=document.querySelector(".partido-detalle-modal");e&&(e.remove(),document.body.classList.remove("modal-abierto"),window.signalR?.enDirecto?.server?.salirDePartido&&window.__partidoDetalleId&&R("salirDePartido",window.__partidoDetalleId),window.__partidoDetalleUnsub&&(window.__partidoDetalleUnsub(),window.__partidoDetalleUnsub=null),window.__partidoDetalleId=null,window.__partidoDetalleState=null)}async function k(e=4e3){const t=Date.now();for(;$.connection.hub.state!==$.signalR.connectionState.connected;){if(Date.now()-t>e)throw new Error("SignalR hub no conectado");await new Promise(a=>setTimeout(a,50))}}function L(e,t){e.innerHTML=`
    <div class="partido-detalle-view-header">
      <div>
        <div class="partido-detalle-view-kicker">Detalle</div>
        <div class="partido-detalle-view-title">Partido</div>
      </div>
    </div>
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">Resumen</button>
      <button class="tab-btn" data-tab="alineaciones">Alineaciones</button>
      <button class="tab-btn" data-tab="eventos">Eventos</button>
      <button class="tab-btn" data-tab="penaltis">Penaltis</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `,e.querySelectorAll(".tab-btn").forEach(a=>{a.onclick=()=>{t.currentTab=a.dataset.tab,y(e,t.currentTab)}}),y(e,t.currentTab||"resumen")}function y(e,t){e.querySelectorAll(".tab-btn").forEach(a=>{a.classList.toggle("active",a.dataset.tab===t)}),e.querySelectorAll(".tab-content").forEach(a=>{a.hidden=a.id!==`tab-${t}`})}function _(e,t){const a=t?.querySelector(".partido-detalle-back");a&&(a.hidden=!e.viewStack.length)}function m(e,t,a){const n=a.closest(".partido-detalle-modal");if(_(e,n),e.partido&&h(t,T(e),"renderAll"),e.currentView!=="partido"){a.innerHTML=`
      <div class="partido-detalle-subview-placeholder">
        <div class="partido-detalle-empty">Vista en preparación.</div>
      </div>
    `;return}a.querySelector("#tab-resumen")||L(a,e),a.querySelector("#tab-resumen").innerHTML=K(e),a.querySelector("#tab-alineaciones").innerHTML=Q(e),a.querySelector("#tab-eventos").innerHTML=j(e),a.querySelector("#tab-penaltis").innerHTML=tt(e),y(a,e.currentTab||"resumen")}function H(e,t){if(!e)return t;if(!t)return e;const a={...e};for(const[n,l]of Object.entries(t)){if(Array.isArray(l)){l.length&&(a[n]=l);continue}l!=null&&l!==""&&(a[n]=l)}return a}function w(e,t){const a=F(t);a&&(e.partido=H(e.partido,a),e.modalidad=a.modalidad||e.modalidad,e.localKey=a.idEquipoLocal||e.localKey,e.visitKey=a.idEquipoVisit||e.visitKey)}function x(e,t){const a=f(t);if(!Array.isArray(a)||!a[0])return;const n=a[0];Array.isArray(n.partido)&&n.partido[0]&&w(e,n.partido[0]),Array.isArray(n.stats)&&(e.statsResumen=n.stats,e.eventos.length||(e.eventos=n.stats)),Array.isArray(n.eventos)&&(e.eventos=n.eventos),Array.isArray(n.alineaciones)&&n.alineaciones.length&&(e.alineaciones=n.alineaciones[0])}function z(e,t){const a=f(t);e.eventos=Array.isArray(a)?a:[]}function G(e,t){const a=f(t);e.penaltis=Array.isArray(a)?a:[]}function B(e,t){const a=f(t);Array.isArray(a)&&a[0]&&typeof a[0]=="object"?e.alineaciones=a[0]:a&&typeof a=="object"?e.alineaciones=a:e.alineaciones=null}async function O(e){console.log("[SignalR] Esperando disponibilidad de window.hubProxy...");const t=Date.now();for(;!window.hubProxy;){if(Date.now()-t>4e3)throw new Error("SignalR hubProxy no disponible");await new Promise(r=>setTimeout(r,50))}console.log("[SignalR] hubProxy disponible:",window.hubProxy),console.log("[SignalR] Esperando conexión activa del hub..."),await k(),console.log("[SignalR] Hub conectado:",$.connection.hub);const a=document.getElementById("partido-detalle-header-content"),n=document.getElementById("partido-detalle-body"),l=M(e);window.__partidoDetalleId=String(e),window.__partidoDetalleState=l,h(a,"Cargando...","init-loading"),L(n,l),m(l,a,n);const o=await V(e);console.log("[API] getPartido",o);const s=f(o);Array.isArray(s)&&s.length>0?(w(l,s[0]),h(a,T(l),"getPartido")):o?.error?h(a,`<div>Error: ${o.message||"No se pudo cargar el partido"}</div>`,"getPartido-error"):h(a,"<div>No se encontraron datos del partido</div>","getPartido-empty");const c=await q(e);if(console.log("[API] getEstadisticaPartido",c),x(l,c),m(l,a,n),console.log("[SignalR] Suscribiendo modal al bus global del hub..."),window.__partidoDetalleUnsub=D(({type:r,payload:d,idPartido:u})=>{if(!(!u||String(u)!==String(e))){switch(console.log(`[SignalR] EVENT modal desde bus: ${r} para partido ${u}`,d),r){case"marcadorPartido":case"recibirMarcadorPartido":case"cronoPartido":w(l,d);break;case"eventosPartido":case"recibirEventosIniciales":z(l,d);break;case"penaltisPartido":case"recibirPenaltisIniciales":G(l,d);break;case"alineacionPartido":case"recibirAlinIniciales":B(l,d);break;default:return}m(l,a,n)}}),console.log("[SignalR] Modal suscrito al bus global del hub."),window.hubProxy.server.unirseAPartido)try{console.log("[SignalR] Llamando a unirseAPartido en el hub:",e);const r=l.modalidad||"hp";window.hubProxy.server.unirseAPartido(e,r).done(d=>{console.log(`[SignalR] Unido al partido ${e} con modalidad '${r}'. Eventos actuales:`,d)}).fail(d=>{console.error("[SignalR] Error al unirse al partido:",d)})}catch(r){console.error("[SignalR] Error llamando a unirseAPartido:",r)}else console.error("[SignalR] Método unirseAPartido no disponible en hubProxy.server.")}function T(e){const t=e.partido;if(!t)return"<div>Error cargando datos de partido</div>";const a=String(t.puntoBonus||"")===String(t.idEquipoLocal||"")?"*":"",n=String(t.puntoBonus||"")===String(t.idEquipoVisit||"")?"*":"",l=[N(t.fecha),C(t.hora)].filter(Boolean).join(" · "),o=t.estado||"",s=t.arbitros.length?`<div class="partido-detalle-arbitros"><strong>Árbitros:</strong><br>${t.arbitros.map(i).join("<br>")}</div>`:"";return`
    <div class="partido-detalle-topline">
      <span>${i(t.competicion)}${t.jornada?` - ${i(t.jornada)}`:""}</span>
      <span>${i(l)}</span>
    </div>
    <div class="partido-detalle-scoreboard">
      <div class="partido-detalle-team partido-detalle-team-local">
        <div class="partido-detalle-team-name">${i(t.local)}</div>
        <img class="partido-detalle-team-logo" src="${A(t.logoLocal)}" alt="${i(t.local)}">
      </div>
      <div class="partido-detalle-score-center">
        <div class="partido-detalle-status">${i(o||"PARTIDO")}</div>
        <div class="partido-detalle-score-line">
          <span>${i(t.golesLocal)}${a}</span>
          <span>-</span>
          <span>${i(t.golesVisit)}${n}</span>
        </div>
      </div>
      <div class="partido-detalle-team partido-detalle-team-visit">
        <img class="partido-detalle-team-logo" src="${A(t.logoVisit)}" alt="${i(t.visit)}">
        <div class="partido-detalle-team-name">${i(t.visit)}</div>
      </div>
    </div>
    <div class="partido-detalle-meta">
      ${s}
      <div class="partido-detalle-pista">${i(t.instalacion)}</div>
    </div>
  `}function K(e){const t=e.partido;if(!t)return'<div class="partido-detalle-empty">Sin resumen disponible.</div>';const a=U(e.statsResumen);return`
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">Resumen del partido</div>
      <div class="partido-detalle-summary-grid">
        ${p(t.localAbrev||"LOC",a.golesLocal,"Goles")}
        ${p(t.visitAbrev||"VIS",a.golesVisit,"Goles")}
        ${p(t.localAbrev||"LOC",a.faltasLocal,"Faltas")}
        ${p(t.visitAbrev||"VIS",a.faltasVisit,"Faltas")}
        ${p(t.localAbrev||"LOC",a.azulesLocal,"Azules")}
        ${p(t.visitAbrev||"VIS",a.azulesVisit,"Azules")}
        ${p(t.localAbrev||"LOC",a.rojasLocal,"Rojas")}
        ${p(t.visitAbrev||"VIS",a.rojasVisit,"Rojas")}
      </div>
    </div>
  `}function p(e,t,a){return`
    <div class="partido-detalle-summary-cell">
      <div class="partido-detalle-summary-team">${i(e)}</div>
      <div class="partido-detalle-summary-value">${i(t)}</div>
      <div class="partido-detalle-summary-label">${i(a)}</div>
    </div>
  `}function U(e){const t=(a,n)=>e.find(l=>l.IdTipoEvento===a&&Number(l.LocalVisit)===n)?.Total??0;return{golesLocal:t("gol",1),golesVisit:t("gol",2),faltasLocal:t("falta",1)||t("faltahl",1),faltasVisit:t("falta",2)||t("faltahl",2),azulesLocal:t("tarjetaazul",1),azulesVisit:t("tarjetaazul",2),rojasLocal:t("tarjetaroja",1),rojasVisit:t("tarjetaroja",2)}}function j(e){if(!Array.isArray(e.eventos)||!e.eventos.length)return'<div class="partido-detalle-empty">No hay eventos disponibles.</div>';let t=0,a=0,n=0,l=0;return`<div class="partido-detalle-section"><div class="partido-detalle-section-title">Eventos del partido</div><div class="eventos-board">${e.eventos.map(s=>{s.IdTipoEvento==="gol"&&(Number(s.LocalVisit)===1&&(t+=1),Number(s.LocalVisit)===2&&(a+=1)),s.IdTipoEvento==="falta"&&(Number(s.LocalVisit)===1&&(n+=1),Number(s.LocalVisit)===2&&(l+=1));const c=i(s.CodPeriodo||""),r=i(s.Crono||""),d=A(s.IdEntidadEquipo||"sinescudo",36),u=i(s.Eq||""),g=J(s,t,a,n,l),I=X(s);return`
      <div class="evento-row">
        <div class="evento-time"><span>${c}</span><span>${r}</span></div>
        <div class="evento-icon">${g}</div>
        <div class="evento-team"><img src="${d}" alt="${u}"><span>${u}</span></div>
        <div class="evento-text">${I}</div>
      </div>
    `}).reverse().join("")}</div></div>`}function J(e,t,a,n,l){switch(e.IdTipoEvento){case"gol":return`<div class="evento-icon-score">${t}-${a}</div>`;case"falta":return`<div class="evento-icon-score evento-icon-score-falta">${Number(e.LocalVisit)===1?n:l}</div>`;case"penalti":case"faltadirecta":case"falta-hl":return'<div class="evento-icon-whistle">•</div>';case"tm":return'<div class="evento-icon-generic">TM</div>';default:return`<div class="evento-icon-generic">${i((e.IdTipoEvento||"EV").slice(0,3).toUpperCase())}</div>`}}function X(e){const t=v(e.Dorsal1),a=v(e.Dorsal2),n=v(e.Lic1),l=v(e.Lic2),o=v(e.Codigo),s=v(e.MinSancion);switch(e.IdTipoEvento){case"gol":return`
        <div class="evento-title evento-title-goal">GOL${t?`: #${i(t)} ${i(n)}`:""}</div>
        ${a?`<div class="evento-subtitle">Asiste: #${i(a)} ${i(l)}</div>`:""}
      `;case"falta":return`
        <div class="evento-title evento-title-fault">FALTA${t?`: #${i(t)} ${i(n)}`:""}</div>
        ${a?`<div class="evento-subtitle">Recibe: #${i(a)} ${i(l)}</div>`:""}
      `;case"penalti":return`<div class="evento-title evento-title-fault">PENALTI${t?` · #${i(t)} ${i(n)}`:""}</div>${o?`<div class="evento-subtitle">${i(o)}</div>`:""}`;case"faltadirecta":return`<div class="evento-title evento-title-fault">FALTA DIRECTA${t?` · #${i(t)} ${i(n)}`:""}</div>${o?`<div class="evento-subtitle">${i(o)}</div>`:""}`;case"falta-hl":return`<div class="evento-title evento-title-fault">FALTA${t?` · #${i(t)} ${i(n)}`:""}</div>${o||s?`<div class="evento-subtitle">${i([o,s?`${s} min.`:""].filter(Boolean).join(" · "))}</div>`:""}`;case"tm":return'<div class="evento-title">TIEMPO MUERTO</div>';default:return`<div class="evento-title">${i(e.Descripcion||e.IdTipoEvento||"Evento")}</div>`}}function Q(e){const t=e.alineaciones;if(!t)return'<div class="partido-detalle-empty">No hay alineaciones disponibles.</div>';const a=S(e.partido?.local||"Equipo local",b(t.JugLocal),b(t.PortLocal),b(t.TecnLocal),e.modalidad),n=S(e.partido?.visit||"Equipo visitante",b(t.JugVisit),b(t.PortVisit),b(t.TecnVisit),e.modalidad);return`<div class="alineaciones-grid">${a}${n}</div>`}function S(e,t,a,n,l){return`
    <section class="partido-detalle-section alineacion-card">
      <div class="alineacion-team-title">${i(e)}</div>
      ${W(t,l)}
      ${Y(a,l)}
      ${Z(n,l)}
    </section>
  `}function W(e,t){if(!e.length)return'<div class="partido-detalle-empty small">Sin jugadores.</div>';const a=t!=="hl",n=a?"<tr><th>Nº</th><th>5i</th><th>Nombre</th><th>G</th><th>As</th><th>Pe</th><th>FD</th><th>F-></th><th>F<-</th><th>Az</th><th>Rj</th><th>Min.</th></tr>":"<tr><th>Nº</th><th>Pos</th><th>6i</th><th>Nombre</th><th>G</th><th>As</th><th>F-></th><th>F<-</th><th>Min.</th></tr>",l=e.map(o=>{const s=o.Inicial?"●":"",c=o.Capitan?" (C)":"";if(a){const d=o.TirosPenalti?`${o.GolPenalti||0}/${o.TirosPenalti}`:"",u=o.TirosFD?`${o.GolFD||0}/${o.TirosFD}`:"";return`<tr><td>${i(o.Dorsal)}</td><td>${i(s)}</td><td>${i((o.ApellidosNombre||"")+c)}</td><td>${i(o.Goles??"")}</td><td>${i(o.Asist??"")}</td><td>${i(d)}</td><td>${i(u)}</td><td>${i(o.FaltaReal??"")}</td><td>${i(o.FaltaRec??"")}</td><td>${i(o.Azules??"")}</td><td>${i(o.Rojas??"")}</td><td>${i(o.Minutos||"")}</td></tr>`}const r=`${o.Capitan?"C":""}${o.AsistCap?"A":""}`;return`<tr><td>${i(o.Dorsal)}</td><td>${i(r)}</td><td>${i(s)}</td><td>${i(o.ApellidosNombre??"")}</td><td>${i(o.Goles??"")}</td><td>${i(o.Asist??"")}</td><td>${i(o.FaltaReal??"")}</td><td>${i(o.FaltaRec??"")}</td><td>${i(o.Minutos||"")}</td></tr>`}).join("");return`<div class="table-wrap"><table class="detalle-table"><thead>${n}</thead><tbody>${l}</tbody></table></div>`}function Y(e,t){if(!e.length)return"";const a=t!=="hl",n=a?"<tr><th colspan='3'>Porteros/as</th><th>G</th><th>Tir</th><th>%</th><th>F-></th><th>F<-</th><th>Az</th><th>Rj</th><th>Min.</th></tr>":"<tr><th colspan='3'>Porteros/as</th><th>G</th><th>Tir</th><th>%</th><th>F-></th><th>F<-</th><th>Min.</th></tr>",l=e.map(o=>{const s=Number(o.Goles||0),r=Number(o.Paradas||0)+s,d=r?`${((1-s/r)*100).toFixed(2)}%`:"",u=o.Inicial?"●":"",g=o.Capitan?" (C)":"";return a?`<tr><td>${i(o.Dorsal)}</td><td>${i(u)}</td><td>${i((o.ApellidosNombre||"")+g)}</td><td>${i(s||"")}</td><td>${i(r||"")}</td><td>${i(d)}</td><td>${i(o.FaltaReal??"")}</td><td>${i(o.FaltaRec??"")}</td><td>${i(o.Azules??"")}</td><td>${i(o.Rojas??"")}</td><td>${i(o.Minutos||"")}</td></tr>`:`<tr><td>${i(o.Dorsal)}</td><td>${i(u)}</td><td>${i(o.ApellidosNombre??"")}</td><td>${i(s||"")}</td><td>${i(r||"")}</td><td>${i(d)}</td><td>${i(o.FaltaReal??"")}</td><td>${i(o.FaltaRec??"")}</td><td>${i(o.Minutos||"")}</td></tr>`}).join("");return`<div class="table-wrap"><table class="detalle-table detalle-table-sub"><thead>${n}</thead><tbody>${l}</tbody></table></div>`}function Z(e,t){if(!e.length)return"";const a=t!=="hl",n=a?"<tr><th colspan='2'>Cuerpo técnico</th><th>Az</th><th>Rj</th></tr>":"<tr><th colspan='2'>Cuerpo técnico</th></tr>",l=e.map(o=>{const c={3:"ENT",4:"ENT2",5:"DEL",6:"AUX"}[o.IdPosicion]||o.IdPosicion||"TEC";return a?`<tr><td><span class="staff-badge">${i(c)}</span></td><td>${i(o.ApellidosNombre??"")}</td><td>${i(o.Azules??"")}</td><td>${i(o.Rojas??"")}</td></tr>`:`<tr><td><span class="staff-badge">${i(c)}</span></td><td>${i(o.ApellidosNombre??"")}</td></tr>`}).join("");return`<div class="table-wrap"><table class="detalle-table detalle-table-sub"><thead>${n}</thead><tbody>${l}</tbody></table></div>`}function tt(e){const t=e.penaltis;if(!Array.isArray(t)||!t.length)return'<div class="partido-detalle-empty">No hay lanzamientos de penalti.</div>';const a=e.localKey!=null?String(e.localKey):null,n=e.visitKey!=null?String(e.visitKey):null,l=t.filter(c=>a&&String(c.IdEquipo)===a),o=t.filter(c=>n&&String(c.IdEquipo)===n),s=!a&&!n?t:[];return`
    <div class="penaltis-grid">
      ${P(e.partido?.local||"Local",l.length?l:s)}
      ${o.length?P(e.partido?.visit||"Visitante",o):""}
    </div>
  `}function P(e,t){return`
    <section class="partido-detalle-section">
      <div class="partido-detalle-section-title">${i(e)}</div>
      <div class="penaltis-column">
        ${t.map(a=>{const n=a.Gol===!0?"✔":a.Gol===!1?"✘":"□",l=a.Gol===!0?"ok":a.Gol===!1?"bad":"neutral";return`<div class="penalti-row"><span class="penalti-dorsal">${i(a.Dorsal??"")}</span><span class="penalti-nombre">${i(a.NombreApellidos??"")}</span><span class="penalti-estado ${l}">${n}</span></div>`}).join("")}
      </div>
    </section>
  `}export{E as closePartidoDetalle,at as openPartidoDetalle};
