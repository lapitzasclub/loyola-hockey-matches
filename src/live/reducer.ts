import { incidenciaDirectoDesdeApi } from '../api/mappers';
import type { EventoDirectoApi } from '../api/schemas';
import {
  PERIODO_FINALIZADO,
  esGol,
  estadoPorPeriodo,
  indiceAlineacion,
  ordenarIncidencias,
} from '../domain';
import type { Lado, PartidoDetalle } from '../domain';

/** Mensajes que no cambian nada que se pinte: ni se pide el detalle. */
const SIN_EFECTO = new Set(['firma_guardada', 'atleta_verificado']);

export interface EventoAplicado {
  partido: PartidoDetalle;
  /** Lo que llegó no basta para ponerlo al día: hay que pedir el detalle. */
  refrescar: boolean;
  /** Lado que acaba de marcar, para celebrarlo. */
  gol: Lado | null;
}

function conPeriodo(
  partido: PartidoDetalle,
  periodo: number,
  reloj: PartidoDetalle['reloj'] = partido.reloj,
): PartidoDetalle {
  const estado = estadoPorPeriodo(partido.estado, periodo);
  const mismoReloj =
    reloj === partido.reloj ||
    (reloj !== null &&
      partido.reloj !== null &&
      reloj.minuto === partido.reloj.minuto &&
      reloj.segundo === partido.reloj.segundo &&
      reloj.enMarcha === partido.reloj.enMarcha);
  if (periodo === partido.periodo && estado === partido.estado && mismoReloj) {
    return partido;
  }
  return { ...partido, periodo, estado, reloj };
}

/**
 * Aplica un mensaje del directo al detalle del partido, como lo dejaría la
 * API: el mismo objeto si no cambia nada. Lo que no se puede reconstruir con
 * el mensaje (una alineación nueva, el resultado oficial al cerrar el acta,
 * alguien que no está en la alineación) se marca para pedir el detalle.
 */
export function aplicarEvento(
  partido: PartidoDetalle,
  evento: EventoDirectoApi,
): EventoAplicado {
  const igual: EventoAplicado = { partido, refrescar: false, gol: null };
  switch (evento.type) {
    case 'incidencia_creada': {
      const { incidencia: i } = evento;
      // También llega la que ya trajo el detalle pedido al suscribirse.
      if (partido.incidencias.some((x) => x.id === i.id)) return igual;
      const incidencia = incidenciaDirectoDesdeApi(i, partido);
      if (!incidencia) return { ...igual, refrescar: true };
      const indice = indiceAlineacion(partido);
      const desconocida = [
        i.plantillaEquipoId,
        i.plantillaEquipoSecundariaId,
        i.porteroId,
      ].some((id) => id !== null && !indice.has(id));
      return {
        partido: {
          ...partido,
          incidencias: ordenarIncidencias([...partido.incidencias, incidencia]),
        },
        refrescar: desconocida,
        gol: esGol(incidencia) ? incidencia.lado : null,
      };
    }
    case 'incidencia_eliminada': {
      const incidencias = partido.incidencias.filter((x) => x.id !== evento.id);
      return incidencias.length === partido.incidencias.length
        ? igual
        : { ...igual, partido: { ...partido, incidencias } };
    }
    case 'periodo_actualizado':
      return { ...igual, partido: conPeriodo(partido, evento.periodo) };
    case 'crono':
      return {
        ...igual,
        partido: conPeriodo(partido, evento.periodo, {
          minuto: evento.min,
          segundo: evento.sec,
          enMarcha: evento.enMarcha,
        }),
      };
    case 'acta_cerrada':
      // El resultado oficial y la crónica solo llegan pidiendo el detalle.
      return {
        ...igual,
        partido: conPeriodo(
          partido,
          PERIODO_FINALIZADO,
          partido.reloj && { ...partido.reloj, enMarcha: false },
        ),
        refrescar: true,
      };
    case 'acta_reabierta':
      return { ...igual, refrescar: true };
    case 'otro':
      return { ...igual, refrescar: !SIN_EFECTO.has(evento.original) };
  }
}
