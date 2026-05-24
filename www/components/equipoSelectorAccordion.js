import { bindDetailsAccordion } from "./accordion.js";

function getTeamSelectorScrollHost() {
  return document.querySelector("main");
}

function scrollGroupIntoView(detailsEl) {
  const scrollHost = getTeamSelectorScrollHost();
  if (!scrollHost) return;

  const topOffset = 10;
  const detailsRect = detailsEl.getBoundingClientRect();
  const hostRect = scrollHost.getBoundingClientRect();
  const targetTop = Math.max(scrollHost.scrollTop + (detailsRect.top - hostRect.top) - topOffset, 0);

  scrollHost.scrollTo({ top: targetTop, behavior: "smooth" });
}

export function bindTeamSelectorAccordions(container) {
  bindDetailsAccordion(container, {
    itemSelector: ".team-selector-group",
    triggerSelector: ".team-selector-group-summary",
    contentSelector: ".team-selector-group-content",
    expandedClass: "is-expanded",
    animationDurationOpen: 300,
    animationDurationClose: 300,
    exclusive: true,
    onBeforeOpen: (detailsEl) => scrollGroupIntoView(detailsEl),
  });
}
