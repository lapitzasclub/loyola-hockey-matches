import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { getEstadisticaPartido } from "../services.js";
import { t } from "../i18n.js";
import { comparePartidosByScheduledDate } from "../utils/helpers.js";
import { emptyArray, escapeHtml, normalizarEquipoClasificacion, parseApiArrayResponse } from "./partidoDetalleUtils.js";

const TEAM_STATS_CACHE = new Map();
const TEAM_CHARTS = new WeakMap();

function isPlayedMatch(partido) {
  return partido?.EstadoPartido == 2 && partido?.GolesLocal != null && partido?.GolesVisit != null;
}

function pickStat(stats, type, side) {
  return stats.find((item) => item?.IdTipoEvento === type && Number(item?.LocalVisit) === side)?.Total ?? 0;
}

function getTeamSide(partido, equipo) {
  const normalized = normalizarEquipoClasificacion(equipo);
  if (!normalized || !partido) return null;
  const teamIds = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const isLocal = teamIds.has(String(partido?.IdEquipoLocal || ""));
  const isVisit = teamIds.has(String(partido?.IdEquipoVisit || ""));
  if (isLocal) return 1;
  if (isVisit) return 2;
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
  const teamIds = new Set([normalized.idEquipo, normalized.idEquipoComp].filter(Boolean).map(String));
  const played = [];
  const home = { won: 0, drawn: 0, lost: 0 };
  const away = { won: 0, drawn: 0, lost: 0 };
  let gf = 0;
  let gc = 0;

  for (const partido of partidos) {
    if (!isPlayedMatch(partido)) continue;
    const isLocal = teamIds.has(String(partido?.IdEquipoLocal || ""));
    const isVisit = teamIds.has(String(partido?.IdEquipoVisit || ""));
    if (!isLocal && !isVisit) continue;

    const goalsFor = Number(isLocal ? partido.GolesLocal : partido.GolesVisit) || 0;
    const goalsAgainst = Number(isLocal ? partido.GolesVisit : partido.GolesLocal) || 0;
    const result = goalsFor > goalsAgainst ? "won" : goalsFor === goalsAgainst ? "drawn" : "lost";

    gf += goalsFor;
    gc += goalsAgainst;
    played.push({ ...partido, result, goalsFor, goalsAgainst, isLocal });
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

function getChartWidth(mount) {
  if (!(mount instanceof HTMLElement)) return 280;
  const parentWidth = mount.parentElement?.clientWidth || 0;
  return Math.max(260, mount.clientWidth || parentWidth || 280);
}

function buildChartOptions({ width, height = 236, maxY = 1, xValues = [] } = {}) {
  return {
    width,
    height,
    padding: [18, 12, 30, 36],
    legend: { show: false },
    cursor: {
      drag: { x: false, y: false },
      points: { show: false },
      focus: { prox: 24 },
    },
    scales: {
      x: { time: false },
      y: { auto: false, range: () => [0, Math.max(1, maxY)] },
    },
    axes: [
      {
        stroke: "rgba(125, 133, 150, 0.72)",
        grid: { show: false },
        ticks: { stroke: "rgba(125, 133, 150, 0.24)", size: 6 },
        size: 24,
        values: () => xValues.map((v) => String(v)),
      },
      {
        stroke: "rgba(125, 133, 150, 0.72)",
        size: 34,
        ticks: { stroke: "rgba(125, 133, 150, 0.24)", size: 6 },
        grid: { stroke: "rgba(120, 130, 150, 0.12)", width: 1 },
        values: (_u, vals) => vals.map((v) => String(v)),
      },
    ],
  };
}

function buildGoalsChart(root, mount, stats) {
  const items = stats.timeline.slice(-8);
  if (!mount || !items.length) return null;
  const x = items.map((item) => item.index);
  const yFor = items.map((item) => item.goalsFor);
  const yAgainst = items.map((item) => item.goalsAgainst);
  const width = getChartWidth(mount);
  const maxY = Math.max(1, ...yFor, ...yAgainst) + 1;
  return new uPlot({
    ...buildChartOptions({ width, maxY, xValues: x }),
    series: [
      {},
      {
        label: t("team_detail_goals_for"),
        stroke: "#16a34a",
        width: 3,
        spanGaps: true,
        points: { show: true, size: 7, width: 2, stroke: "#ffffff", fill: "#16a34a" },
      },
      {
        label: t("team_detail_goals_against"),
        stroke: "#ef4444",
        width: 3,
        spanGaps: true,
        points: { show: true, size: 7, width: 2, stroke: "#ffffff", fill: "#ef4444" },
      },
    ],
  }, [x, yFor, yAgainst], mount);
}

function buildDisciplineChart(root, mount, stats) {
  const items = stats.timeline.slice(-8);
  if (!mount || !items.length) return null;
  const x = items.map((item) => item.index);
  const fouls = items.map((item) => item.fouls || 0);
  const width = getChartWidth(mount);
  const maxY = Math.max(1, ...fouls) + 1;
  return new uPlot({
    ...buildChartOptions({ width, maxY, xValues: x }),
    series: [
      {},
      {
        label: t("detail_fouls"),
        stroke: "#4f46e5",
        width: 3,
        spanGaps: true,
        points: { show: true, size: 6, width: 2, stroke: "#ffffff", fill: "#4f46e5" },
      },
    ],
  }, [x, fouls], mount);
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
          <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_charts_title"))}</div>
          <div class="team-detail-section-meta">${escapeHtml(t("team_detail_stats_last_matches", Math.min(stats.timeline.length, 8)))}</div>
        </div>
        <div class="team-chart-card">
          <div class="team-chart-mount" data-team-chart="goals"></div>
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
