import type { Rol } from './alineacion';
import type { Marcador } from './partido';

/** Contadores de temporada, competición o partido de un jugador. */
export interface ContadoresJugador {
  goles: number;
  asistencias: number;
  penaltisMarcados: number;
  penaltisLanzados: number;
  faltasDirectasMarcadas: number;
  faltasDirectasLanzadas: number;
  azules: number;
  amarillas: number;
  rojas: number;
  faltas: number;
  minutosJugados: number;
  segundosSancion: number;
  golesEncajados: number;
  paradas: number;
  tirosRecibidos: number;
  /** 0–100, con decimales. */
  porcentajeParadas: number;
}

/** Jugador o técnico con sus totales en una división. */
export interface JugadorDivision extends ContadoresJugador {
  plantillaEquipoId: string;
  nombre: string;
  nombreCompleto: string;
  equipoId: string;
  logoUrl: string | null;
  fotoUrl: string | null;
  partidosJugados: number;
  esPortero: boolean;
  /** Solo en el cuerpo técnico de la plantilla. */
  rol: Rol | null;
}

export interface Plantilla {
  equipoId: string;
  nombre: string;
  logoUrl: string | null;
  /** Por nombre; incluye a quien aún no ha jugado. */
  jugadores: JugadorDivision[];
  staff: JugadorDivision[];
}

export interface PartidoJugador {
  partidoId: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  local: { nombreAbrev: string; logoUrl: string | null };
  visitante: { nombreAbrev: string; logoUrl: string | null };
  marcadorOficial: Marcador | null;
  stats: ContadoresJugador;
}

export interface CompeticionJugador {
  competicionId: string;
  nombre: string;
  partidosJugados: number;
  total: ContadoresJugador;
  /** En orden cronológico. */
  partidos: PartidoJugador[];
}

/** Ficha de un jugador: su temporada en todas las competiciones. */
export interface FichaJugador {
  plantillaEquipoId: string;
  nombre: string;
  fotoUrl: string | null;
  nacionalidad: string | null;
  anioNacimiento: number | null;
  rol: Rol;
  esPortero: boolean;
  total: ContadoresJugador;
  competiciones: CompeticionJugador[];
}

export interface PuestoRanking<T> {
  /** Compartido entre quienes empatan a goles. */
  puesto: number;
  jugador: T;
}

type Goleador = Pick<JugadorDivision, 'goles' | 'asistencias' | 'nombre'>;

/**
 * Ranking de goleadores: solo quien ha marcado, por goles; a igualdad de
 * goles comparten puesto y se ordenan por asistencias y nombre (como la v1).
 */
export function rankingGoleadores<T extends Goleador>(
  jugadores: readonly T[],
): PuestoRanking<T>[] {
  const ordenados = jugadores
    .filter((j) => j.goles > 0)
    .sort(
      (a, b) =>
        b.goles - a.goles ||
        b.asistencias - a.asistencias ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
  const ranking: PuestoRanking<T>[] = [];
  ordenados.forEach((jugador, i) => {
    const anterior = ranking[i - 1];
    const puesto =
      anterior && anterior.jugador.goles === jugador.goles
        ? anterior.puesto
        : i + 1;
    ranking.push({ puesto, jugador });
  });
  return ranking;
}

export interface Disciplina {
  faltas: number;
  azules: number;
  amarillas: number;
  rojas: number;
}

/** Sanciones acumuladas por un conjunto de jugadores (el equipo entero). */
export function disciplinaEquipo(
  jugadores: readonly Pick<
    ContadoresJugador,
    'faltas' | 'azules' | 'amarillas' | 'rojas'
  >[],
): Disciplina {
  return jugadores.reduce<Disciplina>(
    (total, j) => ({
      faltas: total.faltas + j.faltas,
      azules: total.azules + j.azules,
      amarillas: total.amarillas + j.amarillas,
      rojas: total.rojas + j.rojas,
    }),
    { faltas: 0, azules: 0, amarillas: 0, rojas: 0 },
  );
}
