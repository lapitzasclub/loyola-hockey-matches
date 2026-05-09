import{c as q,t as l,g as D,a as R,s as C}from"./index-NVPAqe6Q.js";function h(e){if(!e)return null;if(typeof e=="string")try{const i=JSON.parse(e);return i?.d!==void 0?typeof i.d=="string"?JSON.parse(i.d):i.d:i}catch{return null}if(e?.d!==void 0)try{return typeof e.d=="string"?JSON.parse(e.d):e.d}catch{return null}return e}function g(e,i,a=""){e.innerHTML=i,console.log("[Detalle] Header actualizado",{reason:a,html:i,text:e.textContent})}function f(e){return Array.isArray(e)?e:[]}function b(e){return e==null?"":String(e).trim()}function o(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function _(e,i=200){const a=b(e)||"sinescudo";return`https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/${i}x${i}/${a}.png`}function k(e){if(!e)return"";const i=String(e);return/^\d{4}-\d{2}-\d{2}/.test(i)?i.slice(0,10):i}function M(e){if(!e)return"";const i=String(e);return i.length>=5?i.slice(0,5):i}function N(e){const i=Array.isArray(e)?e[0]:e;return!i||typeof i!="object"?null:{raw:i,modalidad:i.IdModalidadComp||"hp",competicion:i.DenoComp||"",jornada:i.NombreJornada||"",fecha:i.Fecha||"",hora:i.Hora||"",instalacion:i.Instalacion||"",estado:i.Periodo||i.Estado||"",crono:i.Crono||"",local:i.Eq1||i.Local||"Equipo local",visit:i.Eq2||i.Visit||"Equipo visitante",localAbrev:i.LocalAbrev||"",visitAbrev:i.VisitAbrev||"",golesLocal:i.GolesLocal??"-",golesVisit:i.GolesVisit??"-",arbitros:[i.Arb1,i.Arb2].filter(Boolean),logoLocal:i.IdEntidadEq1||i.IdEnt1||i.IdEq1||i.IdEquipoLocal||"sinescudo",logoVisit:i.IdEntidadEq2||i.IdEnt2||i.IdEq2||i.IdEquipoVisit||"sinescudo",idEquipoLocal:i.IdEq1||i.IdEquipoLocal||null,idEquipoVisit:i.IdEq2||i.IdEquipoVisit||null,puntoBonus:i.PuntoBonus}}function B(e){return{idPartido:String(e),partido:null,modalidad:"hp",eventos:[],alineaciones:null,penaltis:[],statsResumen:[],localKey:null,visitKey:null,currentView:"partido",currentTab:"resumen",viewStack:[]}}function oi(e){S();const i=document.createElement("div");i.className="partido-detalle-modal",i.innerHTML=`
    <div class="partido-detalle-shell">
      <div class="partido-detalle-grabber"></div>
      <div class="partido-detalle-header">
        <button class="partido-detalle-back" aria-label="Volver" hidden disabled>←</button>
        <div class="partido-detalle-header-content" id="partido-detalle-header-content"></div>
        <button class="partido-detalle-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="partido-detalle-body" id="partido-detalle-body"></div>
    </div>
  `,document.body.appendChild(i),document.body.classList.add("modal-abierto"),i.querySelector(".partido-detalle-close").onclick=S,i.querySelector(".partido-detalle-back").onclick=()=>{const a=window.__partidoDetalleState;if(!a?.viewStack?.length)return;a.currentView=a.viewStack.pop()||"partido";const n=document.getElementById("partido-detalle-header-content"),t=document.getElementById("partido-detalle-body");y(a,n,t)},K(e)}function S(){const e=document.querySelector(".partido-detalle-modal");e&&(e.remove(),document.body.classList.remove("modal-abierto"),window.signalR?.enDirecto?.server?.salirDePartido&&window.__partidoDetalleId&&q("salirDePartido",window.__partidoDetalleId),window.__partidoDetalleUnsub&&(window.__partidoDetalleUnsub(),window.__partidoDetalleUnsub=null),window.__partidoDetalleId=null,window.__partidoDetalleState=null)}async function H(e=4e3){const i=Date.now();for(;$.connection.hub.state!==$.signalR.connectionState.connected;){if(Date.now()-i>e)throw new Error("SignalR hub no conectado");await new Promise(a=>setTimeout(a,50))}}function I(e,i){e.innerHTML=`
    <div class="partido-detalle-tabs" role="tablist" aria-label="Secciones del partido">
      <button class="tab-btn" data-tab="resumen">${o(l("detail_summary"))}</button>
      <button class="tab-btn" data-tab="alineaciones">${o(l("detail_lineups"))}</button>
      <button class="tab-btn" data-tab="eventos">${o(l("detail_events"))}</button>
      <button class="tab-btn" data-tab="penaltis">${o(l("detail_penalties"))}</button>
    </div>
    <section class="tab-content" id="tab-resumen"></section>
    <section class="tab-content" id="tab-alineaciones" hidden></section>
    <section class="tab-content" id="tab-eventos" hidden></section>
    <section class="tab-content" id="tab-penaltis" hidden></section>
  `,e.querySelectorAll(".tab-btn").forEach(a=>{a.onclick=()=>{i.currentTab=a.dataset.tab,E(e,i.currentTab)}}),E(e,i.currentTab||"resumen")}function E(e,i){e.querySelectorAll(".tab-btn").forEach(a=>{a.classList.toggle("active",a.dataset.tab===i)}),e.querySelectorAll(".tab-content").forEach(a=>{a.hidden=a.id!==`tab-${i}`})}function F(e,i){const a=i?.querySelector(".partido-detalle-back");if(!a)return;const n=!!e.viewStack.length;a.hidden=!n,a.disabled=!n}function y(e,i,a){const n=a.closest(".partido-detalle-modal");if(F(e,n),e.partido&&g(i,T(e),"renderAll"),e.currentView!=="partido"){a.innerHTML=`
      <div class="partido-detalle-subview-placeholder">
        <div class="partido-detalle-empty">${o(l("detail_loading_view"))}</div>
      </div>
    `;return}a.querySelector("#tab-resumen")||I(a,e),a.querySelector("#tab-resumen").innerHTML=U(e),a.querySelector("#tab-alineaciones").innerHTML=Y(e),a.querySelector("#tab-eventos").innerHTML=X(e),a.querySelector("#tab-penaltis").innerHTML=ai(e),E(a,e.currentTab||"resumen")}function j(e,i){if(!e)return i;if(!i)return e;const a={...e};for(const[n,t]of Object.entries(i)){if(Array.isArray(t)){t.length&&(a[n]=t);continue}t!=null&&t!==""&&(a[n]=t)}return a}function w(e,i){const a=N(i);a&&(e.partido=j(e.partido,a),e.modalidad=a.modalidad||e.modalidad,e.localKey=a.idEquipoLocal||e.localKey,e.visitKey=a.idEquipoVisit||e.visitKey)}function x(e,i){const a=h(i);if(!Array.isArray(a)||!a[0])return;const n=a[0];Array.isArray(n.partido)&&n.partido[0]&&w(e,n.partido[0]),Array.isArray(n.stats)&&(e.statsResumen=n.stats,e.eventos.length||(e.eventos=n.stats)),Array.isArray(n.eventos)&&(e.eventos=n.eventos),Array.isArray(n.alineaciones)&&n.alineaciones.length&&(e.alineaciones=n.alineaciones[0])}function z(e,i){const a=h(i);e.eventos=Array.isArray(a)?a:[]}function G(e,i){const a=h(i);e.penaltis=Array.isArray(a)?a:[]}function O(e,i){const a=h(i);Array.isArray(a)&&a[0]&&typeof a[0]=="object"?e.alineaciones=a[0]:a&&typeof a=="object"?e.alineaciones=a:e.alineaciones=null}async function K(e){console.log("[SignalR] Esperando disponibilidad de window.hubProxy...");const i=Date.now();for(;!window.hubProxy;){if(Date.now()-i>4e3)throw new Error("SignalR hubProxy no disponible");await new Promise(u=>setTimeout(u,50))}console.log("[SignalR] hubProxy disponible:",window.hubProxy),console.log("[SignalR] Esperando conexión activa del hub..."),await H(),console.log("[SignalR] Hub conectado:",$.connection.hub);const a=document.getElementById("partido-detalle-header-content"),n=document.getElementById("partido-detalle-body"),t=B(e);window.__partidoDetalleId=String(e),window.__partidoDetalleState=t,g(a,o(l("loading")),"init-loading"),I(n,t),y(t,a,n);const r=await D(e);console.log("[API] getPartido",r);const s=h(r);Array.isArray(s)&&s.length>0?(w(t,s[0]),g(a,T(t),"getPartido")):r?.error?g(a,`<div>${o(l("error",r.message||l("detail_match_load_error")))}</div>`,"getPartido-error"):g(a,`<div>${o(l("detail_match_no_data"))}</div>`,"getPartido-empty");const c=await R(e);if(console.log("[API] getEstadisticaPartido",c),x(t,c),y(t,a,n),console.log("[SignalR] Suscribiendo modal al bus global del hub..."),window.__partidoDetalleUnsub=C(({type:u,payload:v,idPartido:p})=>{if(!(!p||String(p)!==String(e))){switch(console.log(`[SignalR] EVENT modal desde bus: ${u} para partido ${p}`,v),u){case"marcadorPartido":case"recibirMarcadorPartido":case"cronoPartido":w(t,v);break;case"eventosPartido":case"recibirEventosIniciales":z(t,v);break;case"penaltisPartido":case"recibirPenaltisIniciales":G(t,v);break;case"alineacionPartido":case"recibirAlinIniciales":O(t,v);break;default:return}y(t,a,n)}}),console.log("[SignalR] Modal suscrito al bus global del hub."),window.hubProxy.server.unirseAPartido)try{console.log("[SignalR] Llamando a unirseAPartido en el hub:",e);const u=t.modalidad||"hp";window.hubProxy.server.unirseAPartido(e,u).done(v=>{console.log(`[SignalR] Unido al partido ${e} con modalidad '${u}'. Eventos actuales:`,v)}).fail(v=>{console.error("[SignalR] Error al unirse al partido:",v)})}catch(u){console.error("[SignalR] Error llamando a unirseAPartido:",u)}else console.error("[SignalR] Método unirseAPartido no disponible en hubProxy.server.")}function T(e){const i=e.partido;if(!i)return"<div>Error cargando datos de partido</div>";const a=String(i.puntoBonus||"")===String(i.idEquipoLocal||"")?"*":"",n=String(i.puntoBonus||"")===String(i.idEquipoVisit||"")?"*":"",t=[k(i.fecha),M(i.hora)].filter(Boolean).join(" · "),r=i.estado||"",s=i.arbitros.length?`<div class="partido-detalle-arbitros"><strong>${o(l("detail_referees"))}:</strong><br>${i.arbitros.map(o).join("<br>")}</div>`:"";return`
    <div class="partido-detalle-topline">
      <span>${o(i.competicion)}${i.jornada?` - ${o(i.jornada)}`:""}</span>
      <span>${o(t)}</span>
    </div>
    <div class="partido-detalle-scoreboard">
      <div class="partido-detalle-team partido-detalle-team-local">
        <div class="partido-detalle-team-name">${o(i.local)}</div>
        <img class="partido-detalle-team-logo" src="${_(i.logoLocal)}" alt="${o(i.local)}">
      </div>
      <div class="partido-detalle-score-center">
        <div class="partido-detalle-status">${o(r||l("detail_match"))}</div>
        <div class="partido-detalle-score-line">
          <span>${o(i.golesLocal)}${a}</span>
          <span>-</span>
          <span>${o(i.golesVisit)}${n}</span>
        </div>
      </div>
      <div class="partido-detalle-team partido-detalle-team-visit">
        <img class="partido-detalle-team-logo" src="${_(i.logoVisit)}" alt="${o(i.visit)}">
        <div class="partido-detalle-team-name">${o(i.visit)}</div>
      </div>
    </div>
    <div class="partido-detalle-meta">
      ${s}
      <div class="partido-detalle-pista">${o(i.instalacion)}</div>
    </div>
  `}function U(e){const i=e.partido;if(!i)return`<div class="partido-detalle-empty">${o(l("detail_summary_title"))}</div>`;const a=J(e.statsResumen);return`
    <div class="partido-detalle-section">
      <div class="partido-detalle-section-title">${o(l("detail_summary_title"))}</div>
      <div class="partido-detalle-summary-grid">
        ${m(i.localAbrev||"LOC",a.golesLocal,l("detail_goals"))}
        ${m(i.visitAbrev||"VIS",a.golesVisit,l("detail_goals"))}
        ${m(i.localAbrev||"LOC",a.faltasLocal,l("detail_fouls"))}
        ${m(i.visitAbrev||"VIS",a.faltasVisit,l("detail_fouls"))}
        ${m(i.localAbrev||"LOC",a.azulesLocal,l("detail_blue_cards"))}
        ${m(i.visitAbrev||"VIS",a.azulesVisit,l("detail_blue_cards"))}
        ${m(i.localAbrev||"LOC",a.rojasLocal,l("detail_red_cards"))}
        ${m(i.visitAbrev||"VIS",a.rojasVisit,l("detail_red_cards"))}
      </div>
    </div>
  `}function m(e,i,a){return`
    <div class="partido-detalle-summary-cell">
      <div class="partido-detalle-summary-team">${o(e)}</div>
      <div class="partido-detalle-summary-value">${o(i)}</div>
      <div class="partido-detalle-summary-label">${o(a)}</div>
    </div>
  `}function J(e){const i=(a,n)=>e.find(t=>t.IdTipoEvento===a&&Number(t.LocalVisit)===n)?.Total??0;return{golesLocal:i("gol",1),golesVisit:i("gol",2),faltasLocal:i("falta",1)||i("faltahl",1),faltasVisit:i("falta",2)||i("faltahl",2),azulesLocal:i("tarjetaazul",1),azulesVisit:i("tarjetaazul",2),rojasLocal:i("tarjetaroja",1),rojasVisit:i("tarjetaroja",2)}}function X(e){if(!Array.isArray(e.eventos)||!e.eventos.length)return'<div class="partido-detalle-empty">No hay eventos disponibles.</div>';let i=0,a=0,n=0,t=0;return`<div class="partido-detalle-section"><div class="partido-detalle-section-title">Eventos del partido</div><div class="eventos-board">${e.eventos.map(s=>{s.IdTipoEvento==="gol"&&(Number(s.LocalVisit)===1&&(i+=1),Number(s.LocalVisit)===2&&(a+=1)),s.IdTipoEvento==="falta"&&(Number(s.LocalVisit)===1&&(n+=1),Number(s.LocalVisit)===2&&(t+=1));const c=o(s.CodPeriodo||""),u=o(s.Crono||""),v=_(s.IdEntidadEquipo||"sinescudo",36),p=o(s.Eq||""),A=Q(s,i,a,n,t),V=W(s);return`
      <div class="evento-row">
        <div class="evento-time"><span>${c}</span><span>${u}</span></div>
        <div class="evento-icon">${A}</div>
        <div class="evento-team"><img src="${v}" alt="${p}"><span>${p}</span></div>
        <div class="evento-text">${V}</div>
      </div>
    `}).reverse().join("")}</div></div>`}function Q(e,i,a,n,t){switch(e.IdTipoEvento){case"gol":return`<div class="evento-icon-score">${i}-${a}</div>`;case"falta":return`<div class="evento-icon-score evento-icon-score-falta">${Number(e.LocalVisit)===1?n:t}</div>`;case"penalti":case"faltadirecta":case"falta-hl":return'<div class="evento-icon-whistle">•</div>';case"tm":return'<div class="evento-icon-generic">TM</div>';default:return`<div class="evento-icon-generic">${o((e.IdTipoEvento||"EV").slice(0,3).toUpperCase())}</div>`}}function W(e){const i=b(e.Dorsal1),a=b(e.Dorsal2),n=b(e.Lic1),t=b(e.Lic2),r=b(e.Codigo),s=b(e.MinSancion);switch(e.IdTipoEvento){case"gol":return`
        <div class="evento-title evento-title-goal">GOL${i?`: #${o(i)} ${o(n)}`:""}</div>
        ${a?`<div class="evento-subtitle">Asiste: #${o(a)} ${o(t)}</div>`:""}
      `;case"falta":return`
        <div class="evento-title evento-title-fault">FALTA${i?`: #${o(i)} ${o(n)}`:""}</div>
        ${a?`<div class="evento-subtitle">Recibe: #${o(a)} ${o(t)}</div>`:""}
      `;case"penalti":return`<div class="evento-title evento-title-fault">PENALTI${i?` · #${o(i)} ${o(n)}`:""}</div>${r?`<div class="evento-subtitle">${o(r)}</div>`:""}`;case"faltadirecta":return`<div class="evento-title evento-title-fault">FALTA DIRECTA${i?` · #${o(i)} ${o(n)}`:""}</div>${r?`<div class="evento-subtitle">${o(r)}</div>`:""}`;case"falta-hl":return`<div class="evento-title evento-title-fault">FALTA${i?` · #${o(i)} ${o(n)}`:""}</div>${r||s?`<div class="evento-subtitle">${o([r,s?`${s} min.`:""].filter(Boolean).join(" · "))}</div>`:""}`;case"tm":return'<div class="evento-title">TIEMPO MUERTO</div>';default:return`<div class="evento-title">${o(e.Descripcion||e.IdTipoEvento||"Evento")}</div>`}}function Y(e){const i=e.alineaciones;if(!i)return'<div class="partido-detalle-empty">No hay alineaciones disponibles.</div>';const a=L(e.partido?.local||"Equipo local",f(i.JugLocal),f(i.PortLocal),f(i.TecnLocal),e.modalidad),n=L(e.partido?.visit||"Equipo visitante",f(i.JugVisit),f(i.PortVisit),f(i.TecnVisit),e.modalidad);return`<div class="alineaciones-grid">${a}${n}</div>`}function L(e,i,a,n,t){return`
    <section class="partido-detalle-section alineacion-card">
      <div class="alineacion-team-title">${o(e)}</div>
      ${Z(i,t)}
      ${ii(a,t)}
      ${ei(n,t)}
    </section>
  `}function d(e,i,a=""){return i==null||i===""||i===0||i==="0/0"?"":`<span class="alineacion-chip ${a}">${o(e)} <strong>${o(i)}</strong></span>`}function Z(e,i){if(!e.length)return`<div class="partido-detalle-empty small">${o(l("detail_players"))}: 0</div>`;const a=i!=="hl",n=e.map(t=>{const r=[t.Inicial?l("detail_starter"):"",t.Capitan?l("detail_captain"):"",t.AsistCap?l("detail_assistant_captain"):""].filter(Boolean).map(v=>`<span class="alineacion-tag">${o(v)}</span>`).join(""),s=t.TirosPenalti?`${t.GolPenalti||0}/${t.TirosPenalti}`:"",c=t.TirosFD?`${t.GolFD||0}/${t.TirosFD}`:"",u=[d("G",t.Goles),d("As",t.Asist),a?d("Pe",s):"",a?d("FD",c):"",d("F+",t.FaltaReal),d("F-",t.FaltaRec),a?d("Az",t.Azules):"",a?d("Rj",t.Rojas):"",d("Min",t.Minutos)].filter(Boolean).join("");return`
      <article class="alineacion-item">
        <div class="alineacion-item-main">
          <div class="alineacion-dorsal">${o(t.Dorsal??"--")}</div>
          <div class="alineacion-info">
            <div class="alineacion-name-row">
              <div class="alineacion-name">${o(t.ApellidosNombre??"")}</div>
              ${r?`<div class="alineacion-tags">${r}</div>`:""}
            </div>
            ${u?`<div class="alineacion-chips">${u}</div>`:`<div class="alineacion-muted">${o(l("detail_no_highlights"))}</div>`}
          </div>
        </div>
      </article>
    `}).join("");return`<div class="alineacion-block"><div class="alineacion-block-title">${o(l("detail_players"))}</div><div class="alineacion-list">${n}</div></div>`}function ii(e,i){if(!e.length)return"";const a=i!=="hl",n=e.map(t=>{const r=Number(t.Goles||0),c=Number(t.Paradas||0)+r,u=c?`${((1-r/c)*100).toFixed(2)}%`:"",v=[t.Inicial?l("detail_starter"):"",t.Capitan?l("detail_captain"):""].filter(Boolean).map(A=>`<span class="alineacion-tag">${o(A)}</span>`).join(""),p=[d("GC",r),d("Tir",c),d("%",u),d("F+",t.FaltaReal),d("F-",t.FaltaRec),a?d("Az",t.Azules):"",a?d("Rj",t.Rojas):"",d("Min",t.Minutos)].filter(Boolean).join("");return`
      <article class="alineacion-item alineacion-item-goalie">
        <div class="alineacion-item-main">
          <div class="alineacion-dorsal">${o(t.Dorsal??"--")}</div>
          <div class="alineacion-info">
            <div class="alineacion-name-row">
              <div class="alineacion-name">${o(t.ApellidosNombre??"")}</div>
              ${v?`<div class="alineacion-tags">${v}</div>`:""}
            </div>
            ${p?`<div class="alineacion-chips">${p}</div>`:`<div class="alineacion-muted">${o(l("detail_no_highlights"))}</div>`}
          </div>
        </div>
      </article>
    `}).join("");return`<div class="alineacion-block"><div class="alineacion-block-title">${o(l("detail_goalkeepers"))}</div><div class="alineacion-list">${n}</div></div>`}function ei(e,i){if(!e.length)return"";const a=i!=="hl",n=e.map(t=>{const s={3:"ENT",4:"ENT2",5:"DEL",6:"AUX"}[t.IdPosicion]||t.IdPosicion||"TEC",c=[a?d("Az",t.Azules):"",a?d("Rj",t.Rojas):"",d("Min",t.Minutos)].filter(Boolean).join("");return`
      <article class="alineacion-item alineacion-item-staff">
        <div class="alineacion-item-main">
          <div class="alineacion-dorsal alineacion-dorsal-role">${o(s)}</div>
          <div class="alineacion-info">
            <div class="alineacion-name">${o(t.ApellidosNombre??"")}</div>
            ${c?`<div class="alineacion-chips">${c}</div>`:`<div class="alineacion-muted">${o(t("detail_no_incidents"))}</div>`}
          </div>
        </div>
      </article>
    `}).join("");return`<div class="alineacion-block"><div class="alineacion-block-title">${o(l("detail_staff"))}</div><div class="alineacion-list">${n}</div></div>`}function ai(e){const i=e.penaltis;if(!Array.isArray(i)||!i.length)return`<div class="partido-detalle-empty">${o(l("detail_penalty_shots_none"))}</div>`;const a=e.localKey!=null?String(e.localKey):null,n=e.visitKey!=null?String(e.visitKey):null,t=i.filter(c=>a&&String(c.IdEquipo)===a),r=i.filter(c=>n&&String(c.IdEquipo)===n),s=!a&&!n?i:[];return`
    <div class="penaltis-grid">
      ${P(e.partido?.local||l("detail_local"),t.length?t:s)}
      ${r.length?P(e.partido?.visit||l("detail_visitor"),r):""}
    </div>
  `}function P(e,i){return`
    <section class="partido-detalle-section">
      <div class="partido-detalle-section-title">${o(e)}</div>
      <div class="penaltis-column">
        ${i.map(a=>{const n=a.Gol===!0?"✔":a.Gol===!1?"✘":"□",t=a.Gol===!0?"ok":a.Gol===!1?"bad":"neutral";return`<div class="penalti-row"><span class="penalti-dorsal">${o(a.Dorsal??"")}</span><span class="penalti-nombre">${o(a.NombreApellidos??"")}</span><span class="penalti-estado ${t}">${n}</span></div>`}).join("")}
      </div>
    </section>
  `}export{S as closePartidoDetalle,oi as openPartidoDetalle};
