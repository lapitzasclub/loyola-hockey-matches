// Pruebas de la invalidación del almacén de marcadores (lo usa el pull-to-refresh).
// Ejecutar con `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

// Simula localStorage antes de cargar el módulo (no existe en Node).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const { invalidarMarcadoresFinales } = await import("../www/servicesFvp.js");

test("invalidarMarcadoresFinales vacía el almacén de marcadores", () => {
  store.set("partido_marcador_cache", JSON.stringify({ "1": { t: Date.now(), e: 2 } }));
  store.set("api_cache:/otra", "conservada");
  invalidarMarcadoresFinales();
  assert.equal(store.has("partido_marcador_cache"), false);
  assert.equal(store.get("api_cache:/otra"), "conservada");
});

test("invalidarMarcadoresFinales no falla si no hay almacén", () => {
  store.clear();
  assert.doesNotThrow(() => invalidarMarcadoresFinales());
});
