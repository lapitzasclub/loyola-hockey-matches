import type { Rol } from './alineacion';
import type { FilaClasificacion } from './clasificacion';
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
  /** Abreviatura en `estadisticas-jugadores`, nombre completo en la plantilla. */
  equipoNombre: string;
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

export type CategoriaRanking =
  'goles' | 'asistencias' | 'porteros' | 'sanciones';

export const CATEGORIAS_RANKING: readonly CategoriaRanking[] = [
  'goles',
  'asistencias',
  'porteros',
  'sanciones',
];

type DatosRanking = Pick<
  JugadorDivision,
  | 'nombre'
  | 'esPortero'
  | 'partidosJugados'
  | 'goles'
  | 'asistencias'
  | 'azules'
  | 'rojas'
  | 'golesEncajados'
  | 'porcentajeParadas'
>;

interface ReglaRanking {
  incluye: (j: DatosRanking) => boolean;
  /** Con lo que se ordena y se comparte puesto: más es mejor. */
  puntos: (j: DatosRanking) => number;
  /** Lo que se enseña en la fila. */
  valor: (j: DatosRanking) => number;
  /** Desempate antes del nombre. */
  desempate: (a: DatosRanking, b: DatosRanking) => number;
}

/**
 * Los porteros solo cuentan en su ranking y quien no ha registrado nada no
 * entra. En sanciones la roja pesa el doble que la azul, como en la v1.
 */
const REGLAS: Record<CategoriaRanking, ReglaRanking> = {
  goles: {
    incluye: (j) => !j.esPortero && j.goles > 0,
    puntos: (j) => j.goles,
    valor: (j) => j.goles,
    desempate: (a, b) => b.asistencias - a.asistencias,
  },
  asistencias: {
    incluye: (j) => !j.esPortero && j.asistencias > 0,
    puntos: (j) => j.asistencias,
    valor: (j) => j.asistencias,
    desempate: (a, b) => b.goles - a.goles,
  },
  porteros: {
    incluye: (j) => j.esPortero && j.partidosJugados > 0,
    puntos: (j) => j.porcentajeParadas,
    valor: (j) => j.porcentajeParadas,
    desempate: (a, b) => a.golesEncajados - b.golesEncajados,
  },
  sanciones: {
    incluye: (j) => j.azules + j.rojas > 0,
    puntos: (j) => j.azules + j.rojas * 2,
    valor: (j) => j.azules + j.rojas,
    desempate: () => 0,
  },
};

/** Lo que enseña la fila de un jugador en un ranking. */
export function valorRanking(
  jugador: DatosRanking,
  categoria: CategoriaRanking,
): number {
  return REGLAS[categoria].valor(jugador);
}

/**
 * Ranking de una categoría. A igualdad de puntos comparten puesto; entre
 * empatados ordena el desempate de la categoría y, al final, el nombre.
 */
export function rankingJugadores<T extends DatosRanking>(
  jugadores: readonly T[],
  categoria: CategoriaRanking,
  limite?: number,
): PuestoRanking<T>[] {
  const regla = REGLAS[categoria];
  const ordenados = jugadores
    .filter(regla.incluye)
    .sort(
      (a, b) =>
        regla.puntos(b) - regla.puntos(a) ||
        regla.desempate(a, b) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    );
  const ranking: PuestoRanking<T>[] = [];
  ordenados.forEach((jugador, i) => {
    const anterior = ranking[i - 1];
    const puesto =
      anterior && regla.puntos(anterior.jugador) === regla.puntos(jugador)
        ? anterior.puesto
        : i + 1;
    ranking.push({ puesto, jugador });
  });
  return limite === undefined ? ranking : ranking.slice(0, limite);
}

export interface Lider<T> {
  categoria: CategoriaRanking;
  jugador: T;
  valor: number;
}

/** El primero de cada categoría que tiene alguien, para las tarjetas de premios. */
export function lideres<T extends DatosRanking>(
  jugadores: readonly T[],
): Lider<T>[] {
  return CATEGORIAS_RANKING.flatMap((categoria) => {
    const primero = rankingJugadores(jugadores, categoria, 1)[0];
    return primero
      ? [
          {
            categoria,
            jugador: primero.jugador,
            valor: valorRanking(primero.jugador, categoria),
          },
        ]
      : [];
  });
}

export interface PuestoEquipo<T> {
  puesto: number;
  fila: T;
}

type FilaEquipo = Pick<FilaClasificacion, 'pj' | 'gf' | 'gc'>;

/**
 * Mejores ataques (más goles a favor) y defensas (menos en contra) entre los
 * equipos que ya han jugado; a igualdad comparten puesto.
 */
export function rankingEquipos<T extends FilaEquipo>(
  filas: readonly T[],
  categoria: 'ataque' | 'defensa',
  limite?: number,
): PuestoEquipo<T>[] {
  const valor = (f: FilaEquipo) => (categoria === 'ataque' ? f.gf : -f.gc);
  const ordenadas = filas
    .filter((f) => f.pj > 0)
    .sort((a, b) => valor(b) - valor(a));
  const ranking: PuestoEquipo<T>[] = [];
  ordenadas.forEach((fila, i) => {
    const anterior = ranking[i - 1];
    const puesto =
      anterior && valor(anterior.fila) === valor(fila)
        ? anterior.puesto
        : i + 1;
    ranking.push({ puesto, fila });
  });
  return limite === undefined ? ranking : ranking.slice(0, limite);
}
