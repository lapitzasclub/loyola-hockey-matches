import type { ContadoresJugador, PartidoJugador } from '../../domain';

export type ClaveContador =
  | 'goles'
  | 'asistencias'
  | 'faltasDirectas'
  | 'penaltis'
  | 'azules'
  | 'amarillas'
  | 'rojas'
  | 'faltas'
  | 'encajados'
  | 'paradas'
  | 'tiros'
  | 'porcentajeParadas'
  | 'minutos';

export interface Contador {
  clave: ClaveContador;
  /** Ya formateado: `3`, `2/5`, `62.1%`. */
  valor: string;
}

/** `marcados/lanzados`, solo si se ha lanzado alguno. */
function acierto(marcados: number, lanzados: number): string | null {
  return lanzados > 0 ? `${marcados}/${lanzados}` : null;
}

/**
 * Contadores que merecen enseñarse: los de un portero no son los de un
 * jugador de pista y los que valen cero se omiten.
 */
export function contadoresVisibles(
  c: ContadoresJugador,
  portero: boolean,
): Contador[] {
  const candidatos: [ClaveContador, string | number | null][] = portero
    ? [
        ['encajados', c.golesEncajados],
        ['paradas', c.paradas],
        ['tiros', c.tirosRecibidos],
        [
          'porcentajeParadas',
          c.tirosRecibidos > 0 ? `${c.porcentajeParadas.toFixed(1)}%` : null,
        ],
        ['minutos', c.minutosJugados],
      ]
    : [
        ['goles', c.goles],
        ['asistencias', c.asistencias],
        [
          'faltasDirectas',
          acierto(c.faltasDirectasMarcadas, c.faltasDirectasLanzadas),
        ],
        ['penaltis', acierto(c.penaltisMarcados, c.penaltisLanzados)],
        ['azules', c.azules],
        ['amarillas', c.amarillas],
        ['rojas', c.rojas],
        ['faltas', c.faltas],
      ];
  return candidatos.flatMap(([clave, valor]) =>
    valor === null || valor === 0 ? [] : [{ clave, valor: String(valor) }],
  );
}

export interface SerieGrafica {
  clave: 'goles' | 'asistencias' | 'paradas' | 'encajados';
  /** Un valor por partido, en el orden de `partidos`. */
  valores: number[];
}

/** Las dos series que dibuja la gráfica: producción en pista o trabajo bajo palos. */
export function seriesPartidos(
  partidos: readonly PartidoJugador[],
  portero: boolean,
): [SerieGrafica, SerieGrafica] {
  return portero
    ? [
        { clave: 'paradas', valores: partidos.map((p) => p.stats.paradas) },
        {
          clave: 'encajados',
          valores: partidos.map((p) => p.stats.golesEncajados),
        },
      ]
    : [
        { clave: 'goles', valores: partidos.map((p) => p.stats.goles) },
        {
          clave: 'asistencias',
          valores: partidos.map((p) => p.stats.asistencias),
        },
      ];
}
