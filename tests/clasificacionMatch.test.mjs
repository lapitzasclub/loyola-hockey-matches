// Pruebas de la fila de clasificación asociada a un equipo cuando aparece en dos tablas.
// Ejecutar con `npm test`.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getClasificacionMatch } from "../www/components/equipoDetalle.js";

// Mismo equipo (IdEquipoComp "10") en dos tablas de la misma competición (benjamines).
const FILAS = [
  { IdCompeticion: 1, IdEquipoComp: "10", NombreEquipo: "BAT GORA B", NombreGrupo: "Benjamin Escolar a", Puntos: 4 },
  { IdCompeticion: 1, IdEquipoComp: "11", NombreEquipo: "LOYOLA INDAUTXU", NombreGrupo: "Benjamin Escolar a", Puntos: 2 },
  { IdCompeticion: 1, IdEquipoComp: "10", NombreEquipo: "BAT GORA B", NombreGrupo: "BENJAMIN ESCOLAR LIGA B", Puntos: 4 },
];

beforeEach(() => {
  globalThis.window = { _clasificacionLoyola: FILAS };
});

test("un equipo en dos tablas devuelve la fila de su propio grupo", () => {
  const liga = getClasificacionMatch({ IdCompeticion: 1, IdEquipoComp: "10", NombreGrupo: "BENJAMIN ESCOLAR LIGA B" });
  assert.equal(liga.NombreGrupo, "BENJAMIN ESCOLAR LIGA B");

  const escolarA = getClasificacionMatch({ IdCompeticion: 1, IdEquipoComp: "10", NombreGrupo: "Benjamin Escolar a" });
  assert.equal(escolarA.NombreGrupo, "Benjamin Escolar a");
});

test("sin grupo indicado usa la primera fila que coincida por id", () => {
  const fila = getClasificacionMatch({ IdCompeticion: 1, IdEquipoComp: "10" });
  assert.equal(fila.NombreGrupo, "Benjamin Escolar a");
});

test("un equipo con una sola tabla sigue encontrando su fila", () => {
  const fila = getClasificacionMatch({ IdCompeticion: 1, IdEquipoComp: "11", NombreGrupo: "Benjamin Escolar a" });
  assert.equal(fila.NombreEquipo, "LOYOLA INDAUTXU");
});

test("sin datos de clasificación devuelve null", () => {
  globalThis.window = { _clasificacionLoyola: [] };
  assert.equal(getClasificacionMatch({ IdCompeticion: 1, IdEquipoComp: "10" }), null);
});
