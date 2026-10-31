import {
  PERIODO_PENALTIS,
  crearAlineacion,
  crearCoordenadas,
  dorsalDesdeApi,
  esTipoIncidencia,
  estadoDetalle,
  ganadorDesempate,
  ladoContrario,
  marcadorConReglas,
  normalizarEstado,
  ordenarIncidencias,
  rolDesdePosicion,
} from '../../domain';
import type {
  Equipo,
  Incidencia,
  LadoDetalle,
  MarcadorDirecto,
  MiembroAlineacion,
  PartidoDetalle,
  PersonaIncidencia,
  ResultadoLanzamiento,
  ViaGol,
} from '../../domain';
import type {
  AlineacionApi,
  IncidenciaApi,
  LadoPartidoApi,
  MarcadoresApi,
  PartidoDetalleApi,
  PartidoMarcadorApi,
} from '../schemas';

export function miembroDesdeApi(a: AlineacionApi): MiembroAlineacion {
  const dorsal = dorsalDesdeApi(a.dorsal);
  return {
    plantillaEquipoId: a.plantillaEquipoId,
    nombre: a.nombre,
    nombrePila: a.nombrePila,
    dorsal,
    rol: rolDesdePosicion(a.rolPosicion, dorsal),
    titular: a.esInicial,
    capitan: a.esCapitan,
    fotoUrl: a.fotoUrl,
  };
}

function persona(
  id: string | null,
  dorsal: string | null,
  nombre: string | null,
): PersonaIncidencia | null {
  return id
    ? { plantillaEquipoId: id, dorsal: dorsalDesdeApi(dorsal), nombre }
    : null;
}

const RESULTADOS: Record<string, ResultadoLanzamiento> = {
  GOL: 'gol',
  NO_GOL: 'fallo',
  PENDIENTE: 'pendiente',
};

/** Comparación exacta: `"NO_GOL".includes("GOL")` contaba fallos como gol. */
function resultadoLanzamiento(resultado: string | null): ResultadoLanzamiento {
  return RESULTADOS[(resultado ?? '').trim().toUpperCase()] ?? 'pendiente';
}

function viaGol(codigo: string | null): ViaGol {
  const valor = (codigo ?? '').trim().toUpperCase();
  if (valor === 'PENALTI') return 'penalti';
  if (valor === 'FALTA DIRECTA') return 'falta-directa';
  return 'juego';
}

/**
 * Incidencia de dominio, o null si no se puede representar: tipo desconocido
 * (la federación define también TARJETA y AMONESTACIONVERBAL, nunca vistos)
 * o un `equipoId` que no es de ninguno de los dos equipos.
 */
export function incidenciaDesdeApi(
  i: IncidenciaApi,
  equipos: { local: string; visitante: string },
): Incidencia | null {
  const lado =
    i.equipoId === equipos.local
      ? 'local'
      : i.equipoId === equipos.visitante
        ? 'visitante'
        : null;
  if (!lado || !esTipoIncidencia(i.tipo)) return null;
  const base = {
    id: i.id,
    lado,
    periodo: i.periodo,
    minuto: i.minuto,
    segundo: i.segundo,
    registro: i.fechaCreacion,
  } as const;
  const principal = persona(i.plantillaEquipoId, i.dorsal, i.nombre);
  const secundaria = persona(
    i.plantillaEquipoSecundariaId,
    i.dorsalSecundario,
    i.nombreSecundario,
  );
  const portero = persona(i.porteroId, i.porteroDorsal, i.porteroNombre);
  switch (i.tipo) {
    case 'GOL':
      return {
        ...base,
        tipo: i.tipo,
        autor: principal,
        asistente: secundaria,
        portero,
        via: viaGol(i.codigo),
      };
    case 'PARADA':
      return { ...base, tipo: i.tipo, portero: principal };
    case 'FALTA':
    case 'FALTA-HL':
      return { ...base, tipo: i.tipo, jugador: principal };
    case 'PENALTI':
    case 'FALTADIRECTA':
      return {
        ...base,
        // En juego la API apunta el lanzamiento al equipo que defiende (el
        // del portero) y el gol que sale de él es del rival. En la tanda la
        // federación lo pinta en la columna de su `equipoId` junto al
        // lanzador; se sigue su criterio hasta ver una tanda real.
        lado: i.periodo === PERIODO_PENALTIS ? lado : ladoContrario(lado),
        tipo: i.tipo,
        lanzador: principal,
        portero,
        resultado: resultadoLanzamiento(i.resultado),
      };
    case 'TM':
      return { ...base, tipo: i.tipo };
    case 'CAMBIO':
      return { ...base, tipo: i.tipo, entra: principal, sale: secundaria };
    case 'TARJETAAZUL':
    case 'TARJETAAMARILLA':
    case 'TARJETAROJA':
      return {
        ...base,
        tipo: i.tipo,
        persona: principal,
        sancionSegundos: i.duracionSancionSegundos,
      };
  }
}

function equipoDeLado(l: LadoPartidoApi): Equipo {
  return {
    inscripcionId: l.inscripcionId,
    equipoId: l.equipoId,
    clubId: null,
    nombre: l.nombre,
    nombreAbrev: l.nombreAbrev,
    logoUrl: l.logoUrl,
  };
}

function ladoDetalle(
  l: LadoPartidoApi,
  alineacion: readonly AlineacionApi[],
): LadoDetalle {
  return {
    equipo: equipoDeLado(l),
    puntaje: l.puntaje,
    ganoDesempate: l.ganoDesempate,
    alineacion: crearAlineacion(alineacion.map(miembroDesdeApi)),
  };
}

export function partidoDetalleDesdeApi(d: PartidoDetalleApi): PartidoDetalle {
  const equipos = { local: d.local.equipoId, visitante: d.visitante.equipoId };
  const incidencias = d.incidencias.flatMap((i) => {
    const incidencia = incidenciaDesdeApi(i, equipos);
    return incidencia ? [incidencia] : [];
  });
  return {
    id: d.id,
    competicionId: d.competicionId,
    competicionNombre: d.competicionNombre,
    divisionId: d.divisionId,
    divisionNombre: d.divisionNombre,
    faseId: d.faseId,
    jornada: d.jornadaNombre,
    fecha: d.fechaInicio.slice(0, 10),
    hora: d.hora,
    pista: d.pista,
    coordenadas: crearCoordenadas(d.pistaLatitud, d.pistaLongitud),
    arbitros: [d.arbitro1Nombre, d.arbitro2Nombre].filter(
      (a): a is string => !!a,
    ),
    estado: estadoDetalle(d.estado, d.actaEstado, d.periodo),
    periodo: d.periodo,
    reloj:
      d.cronoMin !== null && d.cronoSec !== null
        ? { minuto: d.cronoMin, segundo: d.cronoSec, enMarcha: d.cronoEnMarcha }
        : null,
    local: ladoDetalle(d.local, d.alineacionesLocal),
    visitante: ladoDetalle(d.visitante, d.alineacionesVisitante),
    incidencias: ordenarIncidencias(incidencias),
    reglas: {
      marcadorACero: d.marcadorACero,
      maxDiferenciaGoles: d.maxDiferenciaGoles,
      puntuacionPorPeriodos: d.puntuacionPorPeriodos,
      // Hay ligas que mandan 0 aunque `duracionPeriodos` trae sus periodos.
      numeroPeriodos:
        d.numeroPeriodos > 0 ? d.numeroPeriodos : d.duracionPeriodos.length,
      puntoBonus: d.puntoBonus,
      desempatePenaltis: d.configuracionReglas.penaltis,
    },
    duracionPeriodos: d.duracionPeriodos,
    cronica: d.cronica
      ? { es: d.cronica.es ?? null, eu: d.cronica.eu ?? null }
      : null,
  };
}

function marcadorDirecto(
  p: PartidoMarcadorApi,
  competicionId: string,
): MarcadorDirecto {
  const goles = { local: p.local.goles, visitante: p.visitante.goles };
  return {
    partidoId: p.id,
    competicionId,
    estado: normalizarEstado(p.actaCerrada ? 'FINALIZADO' : null, p.periodo),
    periodo: p.periodo,
    goles,
    oficial: p.puntuacionPorPeriodos ? null : marcadorConReglas(goles, p),
    ganadorDesempate: ganadorDesempate(p),
  };
}

/**
 * Marcadores del momento, solo de partidos empezados: `/marcadores` lista
 * también los de periodo 0, que pintados serían un falso «en juego 0-0».
 */
export function marcadoresDesdeApi(m: MarcadoresApi): MarcadorDirecto[] {
  return m.flatMap((competicion) =>
    competicion.matches
      .filter((p) => p.periodo > 0 || p.actaCerrada)
      .map((p) => marcadorDirecto(p, competicion.competicionId)),
  );
}
