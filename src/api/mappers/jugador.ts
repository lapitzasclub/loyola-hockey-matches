import { crearMarcador, rolDesdePosicion } from '../../domain';
import type {
  ContadoresJugador,
  FichaJugador,
  JugadorDivision,
  PartidoJugador,
  Plantilla,
} from '../../domain';
import type {
  ContadoresJugadorApi,
  FilaJugadorApi,
  PartidoJugadorApi,
  PlantillaApi,
  StatsJugadorApi,
} from '../schemas';

function contadoresDesdeApi(c: ContadoresJugadorApi): ContadoresJugador {
  return {
    goles: c.goles,
    asistencias: c.asistencias,
    penaltisMarcados: c.penaltisExitosos,
    penaltisLanzados: c.penaltisIntentos,
    faltasDirectasMarcadas: c.faltasDirectasExitosas,
    faltasDirectasLanzadas: c.faltasDirectasIntentos,
    azules: c.tarjetasAzules,
    amarillas: c.tarjetasAmarillas,
    rojas: c.tarjetasRojas,
    faltas: c.faltas,
    minutosJugados: c.minutosJugados,
    segundosSancion: c.segundosSancion,
    golesEncajados: c.golesEncajados,
    paradas: c.paradas,
    tirosRecibidos: c.tirosRecibidos,
    porcentajeParadas: c.porcentajeParadas,
  };
}

/**
 * Fila de `estadisticas-jugadores` o de `plantilla`. El equipo se identifica
 * por `equipoId`: `equipoNombre` es la abreviatura en una y el nombre
 * completo en la otra.
 */
export function jugadorDivisionDesdeApi(j: FilaJugadorApi): JugadorDivision {
  return {
    ...contadoresDesdeApi(j),
    plantillaEquipoId: j.plantillaEquipoId,
    nombre: j.nombreCorto,
    nombreCompleto: j.nombreCompleto,
    equipoId: j.equipoId,
    logoUrl: j.clubLogoUrl,
    fotoUrl: j.fotoUrl,
    partidosJugados: j.partidosJugados,
    esPortero: j.esPortero,
    rol: j.rolCuerpoTecnico ? rolDesdePosicion(j.rolCuerpoTecnico, null) : null,
  };
}

function porNombre(a: JugadorDivision, b: JugadorDivision): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}

export function plantillaDesdeApi(p: PlantillaApi): Plantilla {
  return {
    equipoId: p.equipoId,
    nombre: p.nombre,
    logoUrl: p.clubLogoUrl,
    jugadores: p.jugadores.map(jugadorDivisionDesdeApi).sort(porNombre),
    staff: p.cuerpoTecnico.map(jugadorDivisionDesdeApi).sort(porNombre),
  };
}

function partidoJugadorDesdeApi(p: PartidoJugadorApi): PartidoJugador {
  return {
    partidoId: p.enfrentamientoId,
    fecha: p.fechaInicio.slice(0, 10),
    local: { nombreAbrev: p.localNombre, logoUrl: p.localLogoUrl },
    visitante: { nombreAbrev: p.visitanteNombre, logoUrl: p.visitanteLogoUrl },
    marcadorOficial: crearMarcador(p.localPuntaje, p.visitantePuntaje),
    stats: contadoresDesdeApi(p),
  };
}

/** La API manda los partidos del más reciente al más antiguo. */
export function fichaJugadorDesdeApi(s: StatsJugadorApi): FichaJugador {
  return {
    plantillaEquipoId: s.plantillaEquipoId,
    nombre: s.nombreCompleto,
    fotoUrl: s.fotoUrl,
    nacionalidad: s.nacionalidad,
    anioNacimiento: s.anioNacimiento,
    rol: rolDesdePosicion(s.rolPosicion, null),
    esPortero: s.esPortero,
    total: contadoresDesdeApi(s.resumenGlobal),
    competiciones: s.competiciones.map((c) => ({
      competicionId: c.competicionId,
      nombre: c.competicionNombre,
      partidosJugados: c.totalPartidos,
      total: contadoresDesdeApi(c.resumenCompeticion),
      partidos: [...c.partidos]
        .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
        .map(partidoJugadorDesdeApi),
    })),
  };
}
