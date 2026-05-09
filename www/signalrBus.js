const BUS_EVENT = "loyola-signalr-partido";

export function emitPartidoHubEvent(type, payload, idPartido) {
  window.dispatchEvent(
    new CustomEvent(BUS_EVENT, {
      detail: { type, payload, idPartido: idPartido != null ? String(idPartido) : null },
    }),
  );
}

export function subscribePartidoHubEvents(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener(BUS_EVENT, listener);
  return () => window.removeEventListener(BUS_EVENT, listener);
}
