# Fixtures reales de la API

Respuestas reales de `https://fvpatinaje.eus/api` para los tests de esquemas y dominio. Las genera `scripts/capture-fixtures.ts`:

```bash
npm run fixtures:capture
```

El script borra y regenera los JSON de la carpeta (no toca `index.ts` ni este README). Después hay que pasar `npm test`: si un test cae, la API ha cambiado de forma o la muestra ya no cubre la trampa que se buscaba.

## Qué hay

- `manifest.json`: fecha de captura, parámetros, la muestra de competiciones (slug, competición, división, fases y motivo), la de partidos (`clave`, id y motivo) y los jugadores elegidos.
- `agenda.json`: `GET /public/agenda?dias=60`. Los `eventos` se recortan a las competiciones de la muestra; `filtros` y la ventana quedan como los devuelve la API.
- `divisiones.json`: `POST /hierarchy/competiciones/divisiones` con los ids de la muestra.
- `marcadores.json`: `GET /public/partidos/marcadores`, recortado a las competiciones de la muestra. Solo trae partidos del momento: si no hay ninguno en juego, todos llegan con `periodo: 0`.
- `<slug>/fases.json`, `<slug>/equipos.json`, `<slug>/tree.json`: endpoints `/hierarchy/division/{id}/…`.
- `<slug>/clasificacion/<faseId>.json`: `GET /hierarchy/fase/{faseId}/clasificacion`.
- `partidos/<clave>.json`: `GET /public/partidos/{id}`.
- `liga-norte/estadisticas-jugadores.json`: `GET /hierarchy/division/{id}/estadisticas-jugadores`.
- `liga-norte/plantilla/<equipoId>.json`: `GET /hierarchy/division/{id}/equipo/{equipoId}/plantilla` del Loyola.
- `jugadores/<plantillaEquipoId>.json`: `GET /public/partidos/jugador/{id}/stats` del máximo goleador y del portero con más partidos del Loyola.

## Muestra

| Slug | Por qué está |
|---|---|
| `liga-norte` | Liga simple, un solo Loyola, muchos partidos jugados, leyenda `general`. También estadísticas de jugadores, plantilla y stats de jugador. |
| `infantil-r` | Escolar: `puntaje` oficial capado distinto de `golesActa`, dos grupos solapados, Loyola A y B, color de leyenda con `var()`. |
| `infantil-sub15-fem` | `/equipos` no incluye al Loyola; aún sin partidos jugados. |
| `benjamin-c` | Liga sin clasificación todavía y `/equipos` sin los Loyola A/B: solo salen en el árbol y la agenda. |
| `copa-liga-norte` | KNOCKOUT en dos fases: cruces, estado `PROGRAMADO` en el árbol, enfrentamientos sin participantes, sin clasificación. |

| Partido | Por qué está |
|---|---|
| `falta-directa` | Falta directa marcada, azul, amarilla a staff sin dorsal, cambios y asistencias. |
| `roja` | Tarjeta roja, penalti marcado y dos faltas directas marcadas. |
| `periodo-0` | Cambios en el periodo 0 (previa); falta directa marcada y fallada. |
| `descanso` | Cambios en el periodo 9 (descanso); falta directa fallada. |
| `penaltis-fallados` | Dos penaltis `NO_GOL` en un 1-1. |
| `copa` | `configuracionReglas` con `penaltis: true`; penalti fallado, falta directa marcada y fallada. |
| `escolar-capado` | 1-9 en goles, 1-6 oficial (`maxDiferenciaGoles`); staff con `rolPosicion` vacío. |
| `escolar-por-periodos` | 6-6 en goles, 3-3 oficial por periodos (tres periodos). |
| `escolar-a-cero` | 12-6 en goles, 0-0 oficial (`marcadorACero`); staff con `rolPosicion` vacío. |
| `jugador-sin-dorsal` | `JUGADOR` con dorsal `""`. |
| `puntaje-fuera-de-regla` | `puntaje` 10-0 aunque `maxDiferenciaGoles` es 5: manda el oficial. |
| `programado` | Próximo partido del Loyola en Liga Norte: periodo 0, `puntaje` null, sin alineaciones (cambia en cada captura). |

No hay ningún partido con tanda de penaltis (periodo 21) en toda la temporada capturada; los tests de la tanda usan incidencias construidas a mano.

## Datos personales

Se sustituyen los valores no nulos de `arbitro1Nombre`, `arbitro2Nombre`, `atletaDni`, `atletaFotoUrl`, `fotoUrl`, `creadoPor`, `nacionalidad`, `anioNacimiento` y el texto de la crónica por marcadores fijos. Se mantiene el `null` cuando la API lo devuelve, porque la nulabilidad también forma parte del contrato.

Los nombres de jugadores y staff se cambian por seudónimos (`PERSONA 12`, nombre de pila `P12`) estables por `plantillaEquipoId`: la misma persona se llama igual en alineaciones, incidencias, exclusiones, plantilla, estadísticas y stats. La exclusión no trae id y se casa con la alineación por lado y dorsal.

Los JSON no pasan por Prettier (`.prettierignore`).
