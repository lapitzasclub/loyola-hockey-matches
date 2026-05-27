import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
} from "chart.js";
import { getEstadisticaPartido } from "../services.js";
import { t } from "../i18n.js";
import { comparePartidosByScheduledDate } from "../utils/helpers.js";
import { emptyArray, escapeHtml, normalizarEquipoClasificacion, parseApiArrayResponse } from "./partidoDetalleUtils.js";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler);

const TEAM_STATS_CACHE = new Map();
const TEAM_CHARTS = new WeakMap();

function isPlayedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

function pickStat(stats, type, side) {
  return stats.find((item) => item?.IdTipoEvento === type && Number(item?.LocalVisit) === side)?.Total ?? 0;
}

function collectTeamIds(equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return new Set();
  return new Set([
    normalized.idEquipo,
    normalized.idEquipoComp,
    equipo?.IdEquipo,
    equipo?.IdEquipoComp,
    equipo?.idEquipo,
    equipo?.idEquipoComp,
  ].filter(Boolean).map(String));
}

function getMatchTeamPerspective(partido, teamIds) {
  if (!partido || !teamIds?.size) return null;
  const localIds = [partido?.IdEquipoLocal, partido?.IdEquipoCompLocal].filter(Boolean).map(String);
  const visitIds = [partido?.IdEquipoVisit, partido?.IdEquipoCompVisit].filter(Boolean).map(String);
  const isLocal = localIds.some((id) => teamIds.has(id));
  const isVisit = visitIds.some((id) => teamIds.has(id));
  if (isLocal && !isVisit) return "local";
  if (isVisit && !isLocal) return "visit";
  return null;
}

function getTeamSide(partido, equipo) {
  const perspective = getMatchTeamPerspective(partido, collectTeamIds(equipo));
  if (perspective === "local") return 1;
  if (perspective === "visit") return 2;
  return null;
}

function getCacheKey(equipo, partidos) {
  const normalized = normalizarEquipoClasificacion(equipo);
  const ids = emptyArray(partidos).map((partido) => partido?.IdPartido).filter(Boolean).join(",");
  return `${normalized?.idEquipoComp || normalized?.idEquipo || "team"}:${ids}`;
}

function buildBaseStats(equipo, partidos = []) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized) return null;
  const teamIds = collectTeamIds(equipo);
  const played = [];
  const home = { won: 0, drawn: 0, lost: 0 };
  const away = { won: 0, drawn: 0, lost: 0 };
  let gf = 0;
  let gc = 0;

  for (const partido of partidos) {
    if (!isPlayedMatch(partido)) continue;
    const perspective = getMatchTeamPerspective(partido, teamIds);
    if (!perspective) continue;

    const isLocal = perspective === "local";
    const goalsFor = Number(isLocal ? partido.GolesLocal : partido.GolesVisit) || 0;
    const goalsAgainst = Number(isLocal ? partido.GolesVisit : partido.GolesLocal) || 0;
    const result = goalsFor > goalsAgainst ? "won" : goalsFor === goalsAgainst ? "drawn" : "lost";

    gf += goalsFor;
    gc += goalsAgainst;
    played.push({ ...partido, result, goalsFor, goalsAgainst, isLocal, perspective });
    (isLocal ? home : away)[result] += 1;
  }

  const sortedPlayed = played.slice().sort(comparePartidosByScheduledDate);
  const wonCount = played.filter((item) => item.result === "won").length;
  const drawnCount = played.filter((item) => item.result === "drawn").length;
  const lostCount = played.filter((item) => item.result === "lost").length;
  const playedCount = played.length;

  return {
    playedCount,
    wonCount,
    drawnCount,
    lostCount,
    recentForm: sortedPlayed.slice(-5).reverse().map((partido) => partido.result),
    home,
    away,
    timeline: sortedPlayed.map((item, index) => ({
      idPartido: item.IdPartido,
      index: index + 1,
      goalsFor: item.goalsFor,
      goalsAgainst: item.goalsAgainst,
      result: item.result,
      fouls: 0,
      blueCards: 0,
      redCards: 0,
      venue: item.isLocal ? "home" : "away",
      opponent: item.isLocal ? item.EquipoVisit || "" : item.EquipoLocal || "",
      rawLocalGoals: Number(item.GolesLocal) || 0,
      rawVisitGoals: Number(item.GolesVisit) || 0,
    })),
    avgGoalsFor: playedCount ? (gf / playedCount) : 0,
    avgGoalsAgainst: playedCount ? (gc / playedCount) : 0,
    winRate: playedCount ? ((wonCount / playedCount) * 100) : 0,
    disciplineTotals: {
      fouls: 0,
      blueCards: 0,
      redCards: 0,
    },
  };
}

export function computeTeamBaseStats(equipo, partidos = []) {
  return buildBaseStats(equipo, partidos);
}

export async function loadTeamAdvancedStats(equipo, partidos = []) {
  const cacheKey = getCacheKey(equipo, partidos);
  if (TEAM_STATS_CACHE.has(cacheKey)) return TEAM_STATS_CACHE.get(cacheKey);

  const base = buildBaseStats(equipo, partidos);
  if (!base?.timeline?.length) {
    TEAM_STATS_CACHE.set(cacheKey, base);
    return base;
  }

  const partidosById = new Map(emptyArray(partidos).map((partido) => [String(partido?.IdPartido || ""), partido]));
  const timeline = await Promise.all(base.timeline.map(async (item) => {
    try {
      const raw = await getEstadisticaPartido(item.idPartido);
      const parsed = parseApiArrayResponse(raw);
      const stats = Array.isArray(parsed?.[0]?.stats) ? parsed[0].stats : Array.isArray(parsed?.stats) ? parsed.stats : [];
      const side = getTeamSide(partidosById.get(String(item.idPartido)), equipo);
      if (!side || !stats.length) return item;

      const fouls = Number(pickStat(stats, "falta", side) || pickStat(stats, "faltahl", side) || 0);
      const blueCards = Number(pickStat(stats, "tarjetaazul", side) || 0);
      const redCards = Number(pickStat(stats, "tarjetaroja", side) || 0);
      return { ...item, fouls, blueCards, redCards };
    } catch {
      return item;
    }
  }));

  const enriched = {
    ...base,
    timeline,
    disciplineTotals: timeline.reduce((acc, item) => ({
      fouls: acc.fouls + (Number(item.fouls) || 0),
      blueCards: acc.blueCards + (Number(item.blueCards) || 0),
      redCards: acc.redCards + (Number(item.redCards) || 0),
    }), { fouls: 0, blueCards: 0, redCards: 0 }),
  };

  TEAM_STATS_CACHE.set(cacheKey, enriched);
  return enriched;
}

function renderTeamFormPills(form) {
  if (!form?.length) return `<div class="team-detail-empty">${escapeHtml(t("team_detail_stats_no_form"))}</div>`;
  return `
    <div class="team-form-pills">
      ${form.map((item) => `<span class="team-form-pill team-form-pill-${item}">${escapeHtml(t(`team_detail_form_${item}`))}</span>`).join("")}
    </div>
  `;
}

function destroyTeamCharts(root) {
  const current = TEAM_CHARTS.get(root);
  if (!current) return;
  current.forEach((chart) => chart?.destroy?.());
  TEAM_CHARTS.delete(root);
}

function ensureCanvas(mount, className = "team-chart-canvas") {
  if (!(mount instanceof HTMLElement)) return null;
  const canvas = document.createElement("canvas");
  canvas.className = className;
  mount.appendChild(canvas);
  return canvas;
}

function chartPalette() {
  return {
    green: "#16a34a",
    greenSoft: "rgba(22, 163, 74, 0.18)",
    red: "#ef4444",
    redSoft: "rgba(239, 68, 68, 0.16)",
    indigo: "#4f46e5",
    indigoSoft: "rgba(79, 70, 229, 0.18)",
    text: "#2c3444",
    muted: "rgba(92, 102, 119, 0.88)",
    grid: "rgba(148, 163, 184, 0.18)",
    border: "rgba(148, 163, 184, 0.28)",
  };
}

function createBaseChart(canvas, config) {
  return new Chart(canvas, {
    type: "line",
    data: config.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(23, 27, 35, 0.92)",
          padding: 10,
          cornerRadius: 12,
          titleColor: "#ffffff",
          bodyColor: "rgba(255,255,255,0.92)",
          displayColors: true,
          boxPadding: 4,
          ...config.tooltip,
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          border: { display: false },
          ticks: {
            color: chartPalette().muted,
            font: { size: 11, weight: 700 },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: chartPalette().grid,
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            precision: 0,
            stepSize: 1,
            color: chartPalette().muted,
            font: { size: 11, weight: 700 },
          },
          suggestedMax: config.suggestedMax,
        },
      },
      ...config.options,
    },
  });
}

function buildGoalsChart(root, mount, stats) {
  const items = stats.timeline.slice(-8);
  if (!mount || !items.length) return null;
  const canvas = ensureCanvas(mount);
  if (!canvas) return null;

  const labels = items.map((item) => String(item.index));
  const goalsFor = items.map((item) => item.goalsFor);
  const goalsAgainst = items.map((item) => item.goalsAgainst);
  const maxY = Math.max(1, ...goalsFor, ...goalsAgainst) + 1;
  const colors = chartPalette();

  return createBaseChart(canvas, {
    data: {
      labels,
      datasets: [
        {
          label: t("team_detail_goals_for"),
          data: goalsFor,
          borderColor: colors.green,
          backgroundColor: colors.greenSoft,
          pointBackgroundColor: colors.green,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 3,
          fill: true,
          tension: 0.34,
        },
        {
          label: t("team_detail_goals_against"),
          data: goalsAgainst,
          borderColor: colors.red,
          backgroundColor: colors.redSoft,
          pointBackgroundColor: colors.red,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 5,
          borderWidth: 3,
          fill: true,
          tension: 0.34,
        },
      ],
    },
    suggestedMax: maxY,
    tooltip: {
      callbacks: {
        title(itemsCtx) {
          const idx = itemsCtx?.[0]?.dataIndex ?? 0;
          const item = items[idx];
          if (!item) return "";
          const prefix = item.venue === "home" ? "Casa" : "Fuera";
          return `${prefix} · ${item.opponent || `Partido ${item.index}`}`;
        },
        afterTitle(itemsCtx) {
          const idx = itemsCtx?.[0]?.dataIndex ?? 0;
          const item = items[idx];
          if (!item) return "";
          return `Marcador real: ${item.rawLocalGoals}-${item.rawVisitGoals}`;
        },
      },
    },
  });
}

function buildDisciplineChart(root, mount, stats) {
  const items = stats.timeline.slice(-8);
  if (!mount || !items.length) return null;
  const canvas = ensureCanvas(mount);
  if (!canvas) return null;

  const labels = items.map((item) => String(item.index));
  const fouls = items.map((item) => item.fouls || 0);
  const maxY = Math.max(1, ...fouls) + 1;
  const colors = chartPalette();

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("detail_fouls"),
          data: fouls,
          backgroundColor: colors.indigoSoft,
          borderColor: colors.indigo,
          borderWidth: 2,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 22,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(23, 27, 35, 0.92)",
          padding: 10,
          cornerRadius: 12,
          titleColor: "#ffffff",
          bodyColor: "rgba(255,255,255,0.92)",
          callbacks: {
            title(itemsCtx) {
              const idx = itemsCtx?.[0]?.dataIndex ?? 0;
              const item = items[idx];
              if (!item) return "";
              return `${item.venue === "home" ? "Casa" : "Fuera"} · ${item.opponent || `Partido ${item.index}`}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          border: { display: false },
          ticks: {
            color: colors.muted,
            font: { size: 11, weight: 700 },
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: maxY,
          grid: {
            color: colors.grid,
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            precision: 0,
            stepSize: 1,
            color: colors.muted,
            font: { size: 11, weight: 700 },
          },
        },
      },
    },
  });
}

function buildDisciplineSummary(mount, stats) {
  if (!mount) return;
  mount.insertAdjacentHTML("beforeend", `
    <div class="team-chart-legend team-chart-legend-discipline">
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-fouls"></span>${escapeHtml(t("detail_fouls"))}: <strong>${escapeHtml(stats.disciplineTotals.fouls)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-blue"></span>${escapeHtml(t("detail_blue_cards"))}: <strong>${escapeHtml(stats.disciplineTotals.blueCards)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-red"></span>${escapeHtml(t("detail_red_cards"))}: <strong>${escapeHtml(stats.disciplineTotals.redCards)}</strong></span>
    </div>
  `);
}

function buildResultsBars(mount, stats) {
  if (!mount) return null;
  const total = Math.max(stats.playedCount || 0, 1);
  mount.innerHTML = `
    <div class="team-results-stack" role="img" aria-label="${escapeHtml(t("team_detail_stats_results_distribution"))}">
      <span class="team-results-stack-segment is-won" style="width:${(stats.wonCount / total) * 100}%"></span>
      <span class="team-results-stack-segment is-drawn" style="width:${(stats.drawnCount / total) * 100}%"></span>
      <span class="team-results-stack-segment is-lost" style="width:${(stats.lostCount / total) * 100}%"></span>
    </div>
    <div class="team-donut-legend">
      <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-won"></span><span>${escapeHtml(t("team_detail_won"))}</span><strong>${escapeHtml(stats.wonCount)}</strong></div>
      <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-drawn"></span><span>${escapeHtml(t("team_detail_drawn"))}</span><strong>${escapeHtml(stats.drawnCount)}</strong></div>
      <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-lost"></span><span>${escapeHtml(t("team_detail_lost"))}</span><strong>${escapeHtml(stats.lostCount)}</strong></div>
    </div>
  `;
  return null;
}

export function mountTeamStatsCharts(root, stats) {
  if (!(root instanceof HTMLElement) || !stats?.timeline?.length) return;
  destroyTeamCharts(root);

  const charts = [];
  const goalsMount = root.querySelector('[data-team-chart="goals"]');
  const disciplineMount = root.querySelector('[data-team-chart="discipline"]');
  const resultsMount = root.querySelector('[data-team-chart="results"]');

  if (goalsMount instanceof HTMLElement) {
    goalsMount.innerHTML = "";
    const chart = buildGoalsChart(root, goalsMount, stats);
    if (chart) charts.push(chart);
  }
  if (disciplineMount instanceof HTMLElement) {
    disciplineMount.innerHTML = "";
    const chart = buildDisciplineChart(root, disciplineMount, stats);
    if (chart) charts.push(chart);
    buildDisciplineSummary(disciplineMount, stats);
  }
  if (resultsMount instanceof HTMLElement) {
    buildResultsBars(resultsMount, stats);
  }

  TEAM_CHARTS.set(root, charts);
}

export function unmountTeamStatsCharts(root) {
  if (!(root instanceof HTMLElement)) return;
  destroyTeamCharts(root);
}

export function renderTeamStatsView(stats, options = {}) {
  const { isLoading = false } = options;
  if (isLoading) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_tab_stats"))}</div>
        <div class="team-detail-loading">${escapeHtml(t("team_detail_stats_loading"))}</div>
      </section>
    `;
  }

  if (!stats || !stats.playedCount) {
    return `
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_tab_stats"))}</div>
        <div class="team-detail-empty">${escapeHtml(t("team_detail_stats_empty"))}</div>
      </section>
    `;
  }

  const cards = [
    [t("team_detail_stats_avg_for"), stats.avgGoalsFor.toFixed(2)],
    [t("team_detail_stats_avg_against"), stats.avgGoalsAgainst.toFixed(2)],
    [t("team_detail_stats_win_rate"), `${stats.winRate.toFixed(0)}%`],
    [t("team_detail_played"), stats.playedCount],
    [t("detail_fouls"), stats.disciplineTotals.fouls],
    [t("detail_blue_cards"), stats.disciplineTotals.blueCards],
    [t("detail_red_cards"), stats.disciplineTotals.redCards],
  ];

  return `
    <div class="team-stats-view">
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_form"))}</div>
        ${renderTeamFormPills(stats.recentForm)}
      </section>
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_overview"))}</div>
        <div class="team-detail-summary-grid team-detail-summary-grid-mobile">
          ${cards.map(([label, value]) => `
            <article class="team-detail-summary-card">
              <div class="team-detail-summary-label">${escapeHtml(label)}</div>
              <div class="team-detail-summary-value">${escapeHtml(value)}</div>
            </article>
          `).join("")}
        </div>
      </section>
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_home_away"))}</div>
        <div class="team-split-grid">
          <article class="team-split-card">
            <div class="team-split-card-title">${escapeHtml(t("team_detail_stats_home"))}</div>
            <div class="team-split-card-values">${escapeHtml(`${stats.home.won}-${stats.home.drawn}-${stats.home.lost}`)}</div>
          </article>
          <article class="team-split-card">
            <div class="team-split-card-title">${escapeHtml(t("team_detail_stats_away"))}</div>
            <div class="team-split-card-values">${escapeHtml(`${stats.away.won}-${stats.away.drawn}-${stats.away.lost}`)}</div>
          </article>
        </div>
      </section>
      <section class="team-detail-section">
        <div class="team-detail-section-head">
          <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_goals_timeline"))}</div>
          <div class="team-detail-section-meta">${escapeHtml(t("team_detail_stats_last_matches", Math.min(stats.timeline.length, 8)))}</div>
        </div>
        <div class="team-chart-card team-chart-card-goals">
          <div class="team-chart-mount" data-team-chart="goals"></div>
          <div class="team-chart-legend team-chart-legend-goals">
            <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-for"></span>${escapeHtml(t("team_detail_goals_for"))}</span>
            <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-against"></span>${escapeHtml(t("team_detail_goals_against"))}</span>
          </div>
        </div>
      </section>
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_discipline_chart"))}</div>
        <div class="team-chart-card">
          <div class="team-chart-mount" data-team-chart="discipline"></div>
        </div>
      </section>
      <section class="team-detail-section">
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_results_distribution"))}</div>
        <div class="team-chart-card">
          <div class="team-chart-mount team-chart-mount-compact" data-team-chart="results"></div>
        </div>
      </section>
    </div>
  `;
}
