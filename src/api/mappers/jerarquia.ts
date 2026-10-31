import {
  colorHex,
  crearCoordenadas,
  crearMarcador,
  normalizarEstado,
  ordenarPartidos,
  parsearPuestos,
} from '../../domain';
import type {
  Division,
  Equipo,
  Fase,
  Leyenda,
  PartidoResumen,
} from '../../domain';
import type {
  DivisionApi,
  EquipoDivisionApi,
  FaseApi,
  FaseArbolApi,
  LeyendaApi,
  ParticipanteApi,
} from '../schemas';

/** Clave de `leyendasGrupos` para la tabla de una fase sin grupos. */
const LEYENDA_GENERAL = 'general';

export function divisionDesdeApi(d: DivisionApi): Division {
  return {
    id: d.id,
    competicionId: d.competicionId,
    nombre: d.nombreDisplay,
    categoria: d.categoriaNombre,
    genero: d.genero,
    orden: d.orden,
  };
}

function leyendaDesdeApi(l: LeyendaApi): Leyenda {
  return {
    puestos: parsearPuestos(l.puestos),
    descripcion: l.descripcion,
    color: colorHex(l.color),
    colorTexto: colorHex(l.colorTexto),
  };
}

/** Vale tanto para `/fases` como para las fases del árbol. */
export function faseDesdeApi(
  f: Pick<
    FaseApi,
    'id' | 'nombre' | 'orden' | 'formato' | 'configuracionReglas'
  >,
): Fase {
  const { grupos, leyendasGrupos } = f.configuracionReglas;
  const leyendas = (clave: string) =>
    (leyendasGrupos[clave] ?? []).map(leyendaDesdeApi);
  return {
    id: f.id,
    nombre: f.nombre,
    orden: f.orden,
    formato: f.formato.toUpperCase() === 'KNOCKOUT' ? 'eliminatoria' : 'liga',
    grupos: grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      inscripcionIds: g.equipos,
      leyendas: leyendas(g.nombre),
    })),
    leyendas: leyendas(LEYENDA_GENERAL),
  };
}

export function equipoDesdeDivision(e: EquipoDivisionApi): Equipo {
  return {
    inscripcionId: null,
    equipoId: e.equipoId,
    clubId: e.clubId,
    nombre: e.nombre,
    nombreAbrev: e.nombreAbrev,
    logoUrl: e.clubLogoUrl,
  };
}

function equipoDeParticipante(p: ParticipanteApi): Equipo {
  return {
    inscripcionId: p.inscripcionId,
    equipoId: p.equipoId,
    clubId: p.clubId,
    nombre: p.atletaNombre,
    nombreAbrev: p.atletaNombreAbrev,
    logoUrl: p.clubLogoUrl,
  };
}

/**
 * Calendario completo de una división a partir de su árbol, ya ordenado por
 * fecha y hora. El marcador real sale de `golesActa`, que coincide con los
 * goles del acta pero vale 0 en los partidos sin jugar; el oficial, de
 * `puntaje`.
 */
export function partidosDeArbol(
  arbol: readonly FaseArbolApi[],
  competicionId: string,
): PartidoResumen[] {
  const partidos = arbol.flatMap((fase) =>
    fase.jornadas.flatMap((jornada) =>
      jornada.enfrentamientos.map((enf): PartidoResumen => {
        const [local, visitante] = [...enf.participants].sort(
          (a, b) => a.orden - b.orden,
        );
        const estado = normalizarEstado(enf.estado, enf.actaPeriodo);
        return {
          id: enf.id,
          competicionId,
          faseId: fase.id,
          jornada: jornada.nombre,
          fecha: enf.fechaInicio.slice(0, 10),
          hora: enf.hora,
          estado,
          local: local ? equipoDeParticipante(local) : null,
          visitante: visitante ? equipoDeParticipante(visitante) : null,
          marcador:
            estado === 'finalizado'
              ? crearMarcador(local?.golesActa, visitante?.golesActa)
              : null,
          marcadorOficial: crearMarcador(local?.puntaje, visitante?.puntaje),
          pista: enf.pista,
          coordenadas: crearCoordenadas(enf.pistaLatitud, enf.pistaLongitud),
        };
      }),
    ),
  );
  return ordenarPartidos(partidos);
}

export function equiposDeArbol(arbol: readonly FaseArbolApi[]): Equipo[] {
  const porId = new Map<string, Equipo>();
  for (const fase of arbol) {
    for (const jornada of fase.jornadas) {
      for (const enf of jornada.enfrentamientos) {
        for (const p of enf.participants) {
          if (!porId.has(p.inscripcionId)) {
            porId.set(p.inscripcionId, equipoDeParticipante(p));
          }
        }
      }
    }
  }
  return [...porId.values()];
}
