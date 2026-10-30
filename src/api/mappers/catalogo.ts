import type { Competicion, Division, FuentesDivision } from '../../domain';
import type {
  AgendaApi,
  EquipoDivisionApi,
  FaseArbolApi,
  FilaClasificacionApi,
} from '../schemas';
import { equiposDeAgenda } from './agenda';
import { equiposDeClasificacion } from './clasificacion';
import { equipoDesdeDivision, equiposDeArbol } from './jerarquia';

export interface DatosDivision {
  competicion: Competicion;
  division: Division;
  arbol?: readonly FaseArbolApi[];
  clasificacion?: readonly FilaClasificacionApi[];
  equipos?: readonly EquipoDivisionApi[];
  agenda?: AgendaApi;
}

/**
 * Fuentes de equipos de una división para el catálogo. El orden importa: las
 * que traen `inscripcionId` (árbol y clasificación) van primero y `/equipos`
 * y la agenda completan el `equipoId`. Ninguna basta sola: `/equipos` omite
 * equipos, la clasificación está vacía al empezar la liga y la agenda solo
 * ve los próximos 60 días.
 */
export function fuentesDivision(datos: DatosDivision): FuentesDivision {
  const { competicion, division } = datos;
  return {
    competicion,
    division,
    fuentes: [
      datos.arbol ? equiposDeArbol(datos.arbol) : [],
      datos.clasificacion ? equiposDeClasificacion(datos.clasificacion) : [],
      (datos.equipos ?? []).map(equipoDesdeDivision),
      datos.agenda
        ? equiposDeAgenda(datos.agenda, competicion.id, division.nombre)
        : [],
    ],
  };
}
