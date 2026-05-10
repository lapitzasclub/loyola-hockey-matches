export function parseApiArrayResponse(raw) {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.d !== undefined) {
        return typeof parsed.d === "string" ? JSON.parse(parsed.d) : parsed.d;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  if (raw?.d !== undefined) {
    try {
      return typeof raw.d === "string" ? JSON.parse(raw.d) : raw.d;
    } catch {
      return null;
    }
  }

  return raw;
}

export function emptyArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normText(value) {
  return value == null ? "" : String(value).trim();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function logoUrl(id, size = 200) {
  const key = normText(id) || "sinescudo";
  return `https://s3.eu-west-3.amazonaws.com/digitalsport-public-images/entidad/${size}x${size}/${key}.png`;
}

export function formatFecha(fecha) {
  if (!fecha) return "";
  const text = String(fecha);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  return text;
}

export function formatHora(hora) {
  if (!hora) return "";
  const text = String(hora);
  return text.length >= 5 ? text.slice(0, 5) : text;
}

export function normalizarPartido(input) {
  const p = Array.isArray(input) ? input[0] : input;
  if (!p || typeof p !== "object") return null;
  return {
    raw: p,
    modalidad: p.IdModalidadComp || "hp",
    competicion: p.DenoComp || "",
    jornada: p.NombreJornada || "",
    fecha: p.Fecha || "",
    hora: p.Hora || "",
    instalacion: p.Instalacion || "",
    estado: p.Periodo || p.Estado || "",
    crono: p.Crono || "",
    local: p.Eq1 || p.Local || "Equipo local",
    visit: p.Eq2 || p.Visit || "Equipo visitante",
    localAbrev: p.LocalAbrev || "",
    visitAbrev: p.VisitAbrev || "",
    golesLocal: p.GolesLocal ?? "-",
    golesVisit: p.GolesVisit ?? "-",
    arbitros: [p.Arb1, p.Arb2].filter(Boolean),
    logoLocal: p.IdEntidadEq1 || p.IdEnt1 || p.IdEq1 || p.IdEquipoLocal || "sinescudo",
    logoVisit: p.IdEntidadEq2 || p.IdEnt2 || p.IdEq2 || p.IdEquipoVisit || "sinescudo",
    idEquipoLocal: p.IdEq1 || p.IdEquipoLocal || null,
    idEquipoVisit: p.IdEq2 || p.IdEquipoVisit || null,
    puntoBonus: p.PuntoBonus,
  };
}

export function createDetalleState(idPartido) {
  return {
    idPartido: String(idPartido),
    partido: null,
    modalidad: "hp",
    eventos: [],
    alineaciones: null,
    penaltis: [],
    statsResumen: [],
    localKey: null,
    visitKey: null,
    selectedJugador: null,
    navigation: {
      currentView: "partido",
      currentTab: "resumen",
      viewStack: [],
    },
  };
}

export function getCurrentView(state) {
  return state.navigation?.currentView || "partido";
}

export function getCurrentTab(state) {
  return state.navigation?.currentTab || "resumen";
}

export function getViewStack(state) {
  return state.navigation?.viewStack || [];
}

export function setCurrentView(state, view) {
  state.navigation.currentView = view;
}

export function setCurrentTab(state, tab) {
  state.navigation.currentTab = tab;
}

export function popView(state) {
  return state.navigation.viewStack.pop();
}

export function pushView(state, view) {
  state.navigation.viewStack.push(view);
}
