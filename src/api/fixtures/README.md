# Fixtures reales de la API

Respuestas reales de `https://fvpatinaje.eus/api` para los tests de esquemas y dominio. Las genera `scripts/capture-fixtures.ts`:

```bash
npm run fixtures:capture
```

El script borra y regenera la carpeta. Después hay que pasar `npm test`: si un test cae, la API ha cambiado de forma o la muestra ya no cubre la trampa que se buscaba.

## Qué hay

- `manifest.json`: fecha de captura, parámetros y la muestra (slug, competición, división, fases y el motivo de cada una).
- `agenda.json`: `GET /public/agenda?dias=60`. Los `eventos` se recortan a las competiciones de la muestra; `filtros` y la ventana quedan como los devuelve la API.
- `divisiones.json`: `POST /hierarchy/competiciones/divisiones` con los ids de la muestra.
- `<slug>/fases.json`, `<slug>/equipos.json`, `<slug>/tree.json`: endpoints `/hierarchy/division/{id}/…`.
- `<slug>/clasificacion/<faseId>.json`: `GET /hierarchy/fase/{faseId}/clasificacion`.

## Muestra

| Slug | Por qué está |
|---|---|
| `liga-norte` | Liga simple, un solo Loyola, muchos partidos jugados, leyenda `general`. |
| `infantil-r` | Escolar: `puntaje` oficial capado distinto de `golesActa`, dos grupos solapados, Loyola A y B, color de leyenda con `var()`. |
| `infantil-sub15-fem` | `/equipos` no incluye al Loyola; aún sin partidos jugados. |
| `benjamin-c` | Liga sin clasificación todavía y `/equipos` sin los Loyola A/B: solo salen en el árbol y la agenda. |
| `copa-liga-norte` | KNOCKOUT en dos fases: cruces, estado `PROGRAMADO` en el árbol, enfrentamientos sin participantes, sin clasificación. |

## Datos personales

Se sustituyen los valores no nulos de `arbitro1Nombre`, `arbitro2Nombre`, `atletaDni`, `atletaFotoUrl` y `creadoPor` por marcadores fijos. Se mantiene el `null` cuando la API lo devuelve, porque la nulabilidad también forma parte del contrato.

Los JSON no pasan por Prettier (`.prettierignore`).
