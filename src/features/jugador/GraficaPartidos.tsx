import { useTranslation } from 'react-i18next';

import type { PartidoJugador } from '../../domain';
import { seriesPartidos } from './contadores';

/** Ancho de cada partido y alto del dibujo, en unidades del `viewBox`. */
const ANCHO_GRUPO = 36;
const ALTO = 120;
const BASE = 100;
const MAX_BARRA = 78;
const ANCHO_BARRA = 12;

/**
 * Barras partido a partido, en SVG propio: dos series (goles y asistencias,
 * o paradas y encajados) por partido. No hace falta una librería de gráficas
 * para esto; el componente se carga en diferido desde la ficha. Si hay muchos
 * partidos, la gráfica se desliza en horizontal.
 */
export default function GraficaPartidos({
  partidos,
  portero,
}: {
  partidos: readonly PartidoJugador[];
  portero: boolean;
}) {
  const { t } = useTranslation();
  const series = seriesPartidos(partidos, portero);
  const maximo = Math.max(1, ...series.flatMap((s) => s.valores));
  const ancho = partidos.length * ANCHO_GRUPO;
  const resumen = series
    .map((s) =>
      t('jugador.grafica.resumen', {
        serie: t(`jugador.series.${s.clave}`),
        valores: s.valores.join(', '),
      }),
    )
    .join('. ');

  return (
    <figure className="grafica" data-testid="grafica-partidos">
      <div className="grafica__lienzo">
        <svg
          role="img"
          aria-label={resumen}
          viewBox={`0 0 ${ancho} ${ALTO}`}
          width={ancho}
          height={ALTO}
        >
          <line
            className="grafica__eje"
            x1={0}
            x2={ancho}
            y1={BASE}
            y2={BASE}
          />
          {partidos.map((p, i) => {
            const x = i * ANCHO_GRUPO + ANCHO_GRUPO / 2;
            return (
              <g key={p.partidoId}>
                {series.map((serie, j) => {
                  const valor = serie.valores[i] ?? 0;
                  const alto = (valor / maximo) * MAX_BARRA;
                  const xBarra = x + (j === 0 ? -ANCHO_BARRA - 1 : 1);
                  return (
                    <g key={serie.clave}>
                      <rect
                        className={`grafica__barra grafica__barra--${j}`}
                        x={xBarra}
                        y={BASE - alto}
                        width={ANCHO_BARRA}
                        height={alto}
                        rx={2}
                      />
                      {valor > 0 && (
                        <text
                          className="grafica__valor"
                          x={xBarra + ANCHO_BARRA / 2}
                          y={BASE - alto - 3}
                          textAnchor="middle"
                        >
                          {valor}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  className="grafica__fecha"
                  x={x}
                  y={BASE + 14}
                  textAnchor="middle"
                >
                  {p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="grafica__leyenda">
        {series.map((s, j) => (
          <span key={s.clave}>
            <i className={`grafica__muestra grafica__barra--${j}`} />
            {t(`jugador.series.${s.clave}`)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
