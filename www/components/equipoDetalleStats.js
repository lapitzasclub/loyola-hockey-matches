import {
  Chart,
  LineController,
  BarController,
  DoughnutController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
} from "chart.js";
import { t } from "../i18n.js";
import { escapeHtml } from "./partidoDetalleUtils.js";

// El cálculo de las estadísticas vive aparte; aquí sólo se pintan.
// Se re-exporta para no cambiar los imports de los consumidores.
export { computeTeamBaseStats, loadTeamAdvancedStats } from "./equipoDetalleStatsData.js";

Chart.register(LineController, BarController, DoughnutController, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Filler);

const TEAM_CHARTS = new WeakMap();
const TEAM_STATS_RANGE_OPTIONS = ["all", 8, 5];

function getRangeSlice(stats, range) {
  if (!stats?.timeline?.length) return [];
  if (range === "all") return stats.timeline;
  const count = Number(range) || stats.timeline.length;
  return stats.timeline.slice(-count);
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
  current.charts?.forEach((chart) => chart?.destroy?.());
  TEAM_CHARTS.delete(root);
}

function ensureCanvas(mount, className = "team-chart-canvas") {
  if (!(mount instanceof HTMLElement)) return null;
  const canvas = document.createElement("canvas");
  canvas.className = className;
  mount.appendChild(canvas);
  return canvas;
}

/**
 * Paleta semántica compartida por todas las gráficas del detalle de equipo.
 *
 * @returns {Record<string, string>} Tokens de color reutilizables.
 */
function chartPalette() {
  return {
    green: "#16a34a",
    greenSoft: "rgba(22, 163, 74, 0.18)",
    red: "#ef4444",
    redSoft: "rgba(239, 68, 68, 0.16)",
    amber: "#d97706",
    amberSoft: "rgba(217, 119, 6, 0.2)",
    amberStrong: "rgba(180, 83, 9, 0.92)",
    cyan: "#0891b2",
    cyanSoft: "rgba(8, 145, 178, 0.2)",
    cyanStrong: "rgba(14, 116, 144, 0.92)",
    rose: "#e11d48",
    roseSoft: "rgba(225, 29, 72, 0.2)",
    roseStrong: "rgba(190, 24, 93, 0.92)",
    text: "#2c3444",
    muted: "rgba(92, 102, 119, 0.88)",
    grid: "rgba(148, 163, 184, 0.18)",
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

function buildGoalsChart(mount, items) {
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
      },
    },
  });
}

function buildVenueComparisonChart(mount, stats) {
  if (!mount || !stats?.venueAverages) return null;
  const canvas = ensureCanvas(mount);
  if (!canvas) return null;

  const colors = chartPalette();
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: [t("team_detail_stats_home"), t("team_detail_stats_away")],
      datasets: [
        {
          label: t("team_detail_goals_for"),
          data: [stats.venueAverages.home.goalsFor, stats.venueAverages.away.goalsFor],
          backgroundColor: colors.greenSoft,
          borderColor: colors.green,
          borderWidth: 2,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 26,
        },
        {
          label: t("team_detail_goals_against"),
          data: [stats.venueAverages.home.goalsAgainst, stats.venueAverages.away.goalsAgainst],
          backgroundColor: colors.redSoft,
          borderColor: colors.red,
          borderWidth: 2,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 26,
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
          grid: {
            color: colors.grid,
            drawBorder: false,
          },
          border: { display: false },
          ticks: {
            color: colors.muted,
            font: { size: 11, weight: 700 },
          },
        },
      },
    },
  });
}

function buildDisciplineChart(mount, items) {
  if (!mount || !items.length) return null;
  const canvas = ensureCanvas(mount);
  if (!canvas) return null;

  const labels = items.map((item) => String(item.index));
  const foulsFor = items.map((item) => item.foulsFor || 0);
  const foulsAgainst = items.map((item) => item.foulsAgainst || 0);
  const blueCardsFor = items.map((item) => item.blueCardsFor || 0);
  const blueCardsAgainst = items.map((item) => item.blueCardsAgainst || 0);
  const redCardsFor = items.map((item) => item.redCardsFor || 0);
  const redCardsAgainst = items.map((item) => item.redCardsAgainst || 0);
  const maxY = Math.max(1, ...foulsFor, ...foulsAgainst, ...blueCardsFor, ...blueCardsAgainst, ...redCardsFor, ...redCardsAgainst) + 1;
  const colors = chartPalette();

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: t("team_detail_stats_fouls_for"),
          data: foulsFor,
          backgroundColor: colors.amberStrong,
          borderColor: colors.amber,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
        },
        {
          label: t("team_detail_stats_fouls_against"),
          data: foulsAgainst,
          backgroundColor: colors.amberSoft,
          borderColor: colors.amber,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
        },
        {
          label: t("team_detail_stats_blue_cards_for"),
          data: blueCardsFor,
          backgroundColor: colors.cyanStrong,
          borderColor: colors.cyan,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
        },
        {
          label: t("team_detail_stats_blue_cards_against"),
          data: blueCardsAgainst,
          backgroundColor: colors.cyanSoft,
          borderColor: colors.cyan,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
        },
        {
          label: t("team_detail_stats_red_cards_for"),
          data: redCardsFor,
          backgroundColor: colors.roseStrong,
          borderColor: colors.rose,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
        },
        {
          label: t("team_detail_stats_red_cards_against"),
          data: redCardsAgainst,
          backgroundColor: colors.roseSoft,
          borderColor: colors.rose,
          borderWidth: 1,
          borderRadius: 999,
          borderSkipped: false,
          maxBarThickness: 16,
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
          stacked: false,
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
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-fouls"></span>${escapeHtml(t("team_detail_stats_fouls_for"))}: <strong>${escapeHtml(stats.disciplineTotals.foulsFor)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-fouls-against"></span>${escapeHtml(t("team_detail_stats_fouls_against"))}: <strong>${escapeHtml(stats.disciplineTotals.foulsAgainst)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-blue"></span>${escapeHtml(t("team_detail_stats_blue_cards_for"))}: <strong>${escapeHtml(stats.disciplineTotals.blueCardsFor)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-blue-against"></span>${escapeHtml(t("team_detail_stats_blue_cards_against"))}: <strong>${escapeHtml(stats.disciplineTotals.blueCardsAgainst)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-red"></span>${escapeHtml(t("team_detail_stats_red_cards_for"))}: <strong>${escapeHtml(stats.disciplineTotals.redCardsFor)}</strong></span>
      <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-red-against"></span>${escapeHtml(t("team_detail_stats_red_cards_against"))}: <strong>${escapeHtml(stats.disciplineTotals.redCardsAgainst)}</strong></span>
    </div>
  `);
}

function buildResultsBars(mount, stats) {
  if (!mount) return null;
  mount.innerHTML = `
    <div class="team-results-donut-wrap">
      <div class="team-results-donut-canvas"></div>
      <div class="team-donut-legend">
        <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-won"></span><span>${escapeHtml(t("team_detail_won"))}</span><strong>${escapeHtml(stats.wonCount)}</strong></div>
        <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-drawn"></span><span>${escapeHtml(t("team_detail_drawn"))}</span><strong>${escapeHtml(stats.drawnCount)}</strong></div>
        <div class="team-donut-legend-row"><span class="team-chart-legend-swatch team-chart-legend-swatch-lost"></span><span>${escapeHtml(t("team_detail_lost"))}</span><strong>${escapeHtml(stats.lostCount)}</strong></div>
      </div>
    </div>
  `;

  const canvasMount = mount.querySelector('.team-results-donut-canvas');
  if (!(canvasMount instanceof HTMLElement)) return null;
  const canvas = ensureCanvas(canvasMount, 'team-chart-canvas team-chart-canvas-donut');
  if (!canvas) return null;
  const colors = chartPalette();
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [t("team_detail_won"), t("team_detail_drawn"), t("team_detail_lost")],
      datasets: [{
        data: [stats.wonCount || 0, stats.drawnCount || 0, stats.lostCount || 0],
        backgroundColor: [colors.green, '#d1a000', colors.red],
        borderColor: ['#ffffff', '#ffffff', '#ffffff'],
        borderWidth: 3,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(23, 27, 35, 0.92)',
          padding: 10,
          cornerRadius: 12,
          titleColor: '#ffffff',
          bodyColor: 'rgba(255,255,255,0.92)',
        },
      },
    },
  });
}

function getSelectedRange(root) {
  return root?.dataset?.teamStatsRange || "all";
}

function renderRangeControls(root, selectedRange) {
  const controls = root.querySelector('[data-team-stats-range-controls]');
  if (!(controls instanceof HTMLElement)) return;
  controls.innerHTML = TEAM_STATS_RANGE_OPTIONS.map((range) => {
    const key = String(range);
    const active = key === String(selectedRange);
    const label = range === "all" ? t("team_detail_stats_range_all") : String(range);
    return `<button type="button" class="team-stats-range-btn${active ? " is-active" : ""}" data-team-stats-range="${escapeHtml(key)}">${escapeHtml(label)}</button>`;
  }).join("");
}

/**
 * Monta o remonta todas las gráficas de estadísticas del detalle de equipo.
 *
 * @param {HTMLElement} root Nodo raíz de la vista de estadísticas.
 * @param {object} stats Estadísticas ya calculadas.
 * @returns {void}
 */
export function mountTeamStatsCharts(root, stats) {
  if (!(root instanceof HTMLElement) || !stats?.timeline?.length) return;
  destroyTeamCharts(root);

  const selectedRange = getSelectedRange(root);
  const rangeItems = getRangeSlice(stats, selectedRange);
  renderRangeControls(root, selectedRange);

  const charts = [];
  const goalsMount = root.querySelector('[data-team-chart="goals"]');
  const disciplineMount = root.querySelector('[data-team-chart="discipline"]');
  const venueMount = root.querySelector('[data-team-chart="venue-comparison"]');
  const resultsMount = root.querySelector('[data-team-chart="results"]');

  if (goalsMount instanceof HTMLElement) {
    goalsMount.innerHTML = "";
    const chart = buildGoalsChart(goalsMount, rangeItems);
    if (chart) charts.push(chart);
  }
  if (disciplineMount instanceof HTMLElement) {
    disciplineMount.innerHTML = "";
    const chart = buildDisciplineChart(disciplineMount, rangeItems);
    if (chart) charts.push(chart);
    buildDisciplineSummary(disciplineMount, stats);
  }
  if (venueMount instanceof HTMLElement) {
    venueMount.innerHTML = "";
    const chart = buildVenueComparisonChart(venueMount, stats);
    if (chart) charts.push(chart);
  }
  if (resultsMount instanceof HTMLElement) {
    resultsMount.innerHTML = "";
    const chart = buildResultsBars(resultsMount, stats);
    if (chart) charts.push(chart);
  }

  root.querySelectorAll('[data-team-stats-range]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextRange = button.getAttribute('data-team-stats-range') || 'all';
      if (root.dataset.teamStatsRange === nextRange) return;
      root.dataset.teamStatsRange = nextRange;
      mountTeamStatsCharts(root, stats);
    }, { once: true });
  });

  TEAM_CHARTS.set(root, { charts });
}

/**
 * Desmonta las instancias Chart.js asociadas a la vista actual.
 *
 * @param {HTMLElement} root Nodo raíz de la vista.
 * @returns {void}
 */
export function unmountTeamStatsCharts(root) {
  if (!(root instanceof HTMLElement)) return;
  destroyTeamCharts(root);
}

/**
 * Renderiza el HTML de la pestaña de estadísticas del detalle de equipo.
 *
 * @param {object|null} stats Estadísticas avanzadas ya calculadas.
 * @param {{isLoading?: boolean}} [options={}] Estado de carga visual.
 * @returns {string} HTML resultante.
 */
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

  const goalDiffText = stats.goalDifference > 0 ? `+${stats.goalDifference}` : String(stats.goalDifference);
  const cards = [
    [t("team_detail_goals_for"), stats.goalsForTotal],
    [t("team_detail_goals_against"), stats.goalsAgainstTotal],
    [t("team_detail_goal_difference"), goalDiffText],
    [t("team_detail_stats_avg_for"), stats.avgGoalsFor.toFixed(2)],
    [t("team_detail_stats_avg_against"), stats.avgGoalsAgainst.toFixed(2)],
    [t("team_detail_stats_win_rate"), `${stats.winRate.toFixed(0)}%`],
    [t("team_detail_stats_clean_sheets"), stats.cleanSheets],
    [t("team_detail_stats_scoreless"), stats.scorelessMatches],
    [t("team_detail_stats_fouls_for"), stats.disciplineTotals.foulsFor],
    [t("team_detail_stats_fouls_against"), stats.disciplineTotals.foulsAgainst],
    [t("team_detail_stats_blue_cards_for"), stats.disciplineTotals.blueCardsFor],
    [t("team_detail_stats_blue_cards_against"), stats.disciplineTotals.blueCardsAgainst],
    [t("team_detail_stats_red_cards_for"), stats.disciplineTotals.redCardsFor],
    [t("team_detail_stats_red_cards_against"), stats.disciplineTotals.redCardsAgainst],
  ];

  const setPieceCards = [
    [t("team_detail_stats_penalties_for"), stats.setPieces.penaltiesFor],
    [t("team_detail_stats_penalties_against"), stats.setPieces.penaltiesAgainst],
    [t("team_detail_stats_penalties_scored_for"), stats.setPieces.penaltiesScoredFor],
    [t("team_detail_stats_penalties_scored_against"), stats.setPieces.penaltiesScoredAgainst],
    [t("team_detail_stats_penalties_missed_for"), stats.setPieces.penaltiesMissedFor],
    [t("team_detail_stats_penalties_missed_against"), stats.setPieces.penaltiesMissedAgainst],
    [t("team_detail_stats_direct_fouls_for"), stats.setPieces.directFoulsFor],
    [t("team_detail_stats_direct_fouls_against"), stats.setPieces.directFoulsAgainst],
    [t("team_detail_stats_direct_fouls_scored_for"), stats.setPieces.directFoulsScoredFor],
    [t("team_detail_stats_direct_fouls_scored_against"), stats.setPieces.directFoulsScoredAgainst],
    [t("team_detail_stats_direct_fouls_missed_for"), stats.setPieces.directFoulsMissedFor],
    [t("team_detail_stats_direct_fouls_missed_against"), stats.setPieces.directFoulsMissedAgainst],
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
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_set_pieces"))}</div>
        <div class="team-detail-summary-grid team-detail-summary-grid-mobile">
          ${setPieceCards.map(([label, value]) => `
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
        <div class="team-detail-section-head team-detail-section-head-wrap">
          <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_goals_timeline"))}</div>
          <div class="team-stats-range-controls" data-team-stats-range-controls></div>
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
        <div class="team-detail-section-title">${escapeHtml(t("team_detail_stats_home_away_chart"))}</div>
        <div class="team-chart-card">
          <div class="team-chart-mount" data-team-chart="venue-comparison"></div>
          <div class="team-chart-legend team-chart-legend-goals">
            <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-for"></span>${escapeHtml(t("team_detail_goals_for"))}</span>
            <span class="team-chart-legend-item"><span class="team-chart-legend-swatch team-chart-legend-swatch-against"></span>${escapeHtml(t("team_detail_goals_against"))}</span>
          </div>
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
