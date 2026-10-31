import { ganadorDesempate } from './detalle';
import type { PartidoDetalle } from './detalle';
import { PERIODO_FINALIZADO } from './estado';
import type { EstadoPartido } from './estado';
import { marcadorConReglas, marcadorPorIncidencias } from './marcador';
import type { MarcadorDirecto } from './marcador';

/**
 * Si se sigue el directo de un partido abierto: el de hoy, para ver el
 * saque inicial y las correcciones del acta tras el final, y cualquiera que
 * siga en juego (los hay que pasan de la medianoche).
 */
export function seguirEnDirecto(
  partido: Pick<PartidoDetalle, 'estado' | 'fecha'>,
  hoy: string,
): boolean {
  return partido.estado === 'en_juego' || partido.fecha === hoy;
}

/**
 * Estado tras un cambio de periodo en directo: 30 cierra el acta y 1..29
 * es juego. Con un código sin significado (la previa, 0) no cambia.
 */
export function estadoPorPeriodo(
  actual: EstadoPartido,
  periodo: number,
): EstadoPartido {
  if (periodo === PERIODO_FINALIZADO) return 'finalizado';
  if (periodo > 0 && periodo < PERIODO_FINALIZADO) return 'en_juego';
  return actual;
}

/**
 * El marcador que daría `/marcadores` para este detalle, para que las listas
 * vean el directo sin esperar a su próximo refresco. null en la previa, que
 * `/marcadores` tampoco cuenta.
 */
export function marcadorDirectoDe(
  partido: PartidoDetalle,
): MarcadorDirecto | null {
  if (partido.estado === 'programado') return null;
  const goles = marcadorPorIncidencias(partido.incidencias);
  return {
    partidoId: partido.id,
    competicionId: partido.competicionId,
    estado: partido.estado,
    periodo: partido.periodo,
    goles,
    oficial: partido.reglas.puntuacionPorPeriodos
      ? null
      : marcadorConReglas(goles, partido.reglas),
    ganadorDesempate: ganadorDesempate(partido),
  };
}

function mismoMarcador(a: MarcadorDirecto, b: MarcadorDirecto): boolean {
  return (
    a.estado === b.estado &&
    a.periodo === b.periodo &&
    a.goles.local === b.goles.local &&
    a.goles.visitante === b.goles.visitante &&
    a.oficial?.local === b.oficial?.local &&
    a.oficial?.visitante === b.oficial?.visitante &&
    a.ganadorDesempate === b.ganadorDesempate
  );
}

/**
 * La lista de `/marcadores` con el de un partido puesto al día (o añadido,
 * si empezó después de pedirla). La misma lista si no cambia nada, para no
 * repintar las listas con cada tic del reloj.
 */
export function fusionarMarcador(
  lista: MarcadorDirecto[],
  marcador: MarcadorDirecto,
): MarcadorDirecto[] {
  const i = lista.findIndex((m) => m.partidoId === marcador.partidoId);
  if (i === -1) return [...lista, marcador];
  const actual = lista[i];
  if (actual && mismoMarcador(actual, marcador)) return lista;
  return lista.with(i, marcador);
}
