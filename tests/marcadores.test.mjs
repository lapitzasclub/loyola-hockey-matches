// Pruebas del marcador real (incidencias GOL) frente al oficial (puntaje del acta).
// Ejecutar con `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPartidoDetalle } from "../www/servicesPartidoMappers.js";

const LOCAL = "loc-id";
const VISIT = "vis-id";

/** Construye un detalle mínimo con `goles` incidencias GOL para el local y el visitante. */
function detalle({ periodo = 30, golesLocal = 0, golesVisit = 0, puntajeLocal = null, puntajeVisit = null } = {}) {
  const incidencias = [
    ...Array.from({ length: golesLocal }, () => ({ tipo: "GOL", equipoId: LOCAL })),
    ...Array.from({ length: golesVisit }, () => ({ tipo: "GOL", equipoId: VISIT })),
  ];
  return {
    id: "partido-1",
    periodo,
    estado: periodo === 30 ? "FINISHED" : "SCHEDULED",
    local: { equipoId: LOCAL, nombre: "LOYOLA INDAUTXU B", puntaje: puntajeLocal },
    visitante: { equipoId: VISIT, nombre: "GATIKE SUTEN", puntaje: puntajeVisit },
    incidencias,
  };
}

test("el marcador real cuenta incidencias GOL aunque el oficial esté topado", () => {
  // Caso real del 24-oct: acta 1-6, incidencias 1-12.
  const p = mapPartidoDetalle(detalle({ golesLocal: 1, golesVisit: 12, puntajeLocal: 1, puntajeVisit: 6 }));
  assert.equal(p.GolesLocal, 1);
  assert.equal(p.GolesVisit, 12);
  assert.equal(p.GolesOficialLocal, 1);
  assert.equal(p.GolesOficialVisit, 6);
  assert.equal(p.EstadoPartido, 2);
});

test("sin acta cerrada el oficial queda en null y el real se mantiene", () => {
  const p = mapPartidoDetalle(detalle({ periodo: 2, golesLocal: 3, golesVisit: 1 }));
  assert.equal(p.GolesLocal, 3);
  assert.equal(p.GolesVisit, 1);
  assert.equal(p.GolesOficialLocal, null);
  assert.equal(p.GolesOficialVisit, null);
});

test("un partido sin comenzar no tiene marcador", () => {
  const p = mapPartidoDetalle(detalle({ periodo: 0 }));
  assert.equal(p.GolesLocal, null);
  assert.equal(p.GolesVisit, null);
});
