export function createModalHandoffCover() {
  const cover = document.createElement("div");
  cover.className = "modal-handoff-cover";
  document.body.appendChild(cover);
  return cover;
}

export function removeModalHandoffCover(cover) {
  cover?.remove?.();
}
