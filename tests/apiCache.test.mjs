// Pruebas de la caché API persistida: una clave de localStorage por entrada.
// Ejecutar con `npm test`.

import { test, beforeEach } from "node:test";
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

const cache = await import("../www/utils/apiCache.js");

beforeEach(() => {
  store.clear();
  cache.invalidateApiCache();
});

test("guardar una entrada no reescribe las demás", () => {
  cache.setCachedApi("/a", {}, { n: 1 });
  cache.setCachedApi("/b", {}, { n: 2 });
  const antes = store.get("api_cache:/a::{}");
  cache.setCachedApi("/c", {}, { n: 3 });
  assert.equal(store.get("api_cache:/a::{}"), antes);
  assert.deepEqual(cache.getCachedApi("/b", {}), { n: 2 });
});

test("una entrada expirada no se devuelve", () => {
  // Entrada persistida hace 1 s con TTL de 1 ms: ya caducada, sin pasar por la memoria.
  store.set("api_cache:/x::{}", JSON.stringify({ t: Date.now() - 1000, v: "viejo", ttl: 1 }));
  assert.equal(cache.getCachedApi("/x", {}), null);
});

test("invalidateApiCacheFor borra solo las rutas indicadas", () => {
  cache.setCachedApi("/public/agenda", {}, 1, cache.CACHE_TTL_LONG);
  cache.setCachedApi("/public/partidos/9", {}, 2);
  cache.invalidateApiCacheFor(["/public/partidos"]);
  assert.equal(cache.getCachedApi("/public/partidos/9", {}), null);
  assert.equal(cache.getCachedApi("/public/agenda", {}), 1);
});

test("lee el blob antiguo api_cache como respaldo y lo retira al escribir", () => {
  const legacy = { "/viejo::{}": { t: Date.now(), v: "legado", ttl: cache.CACHE_TTL_LONG } };
  store.set("api_cache", JSON.stringify(legacy));
  assert.equal(cache.getCachedApi("/viejo", {}), "legado");
  cache.setCachedApi("/nuevo", {}, 1);
  assert.equal(store.has("api_cache"), false);
});
