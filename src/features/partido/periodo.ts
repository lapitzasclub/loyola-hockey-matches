import type { TFunction } from 'i18next';

import { periodoPartido } from '../../domain';

/** Nombre del periodo para títulos de grupo y de la insignia de juego. */
export function etiquetaPeriodo(t: TFunction, codigo: number): string {
  const periodo = periodoPartido(codigo);
  switch (periodo.tipo) {
    case 'juego':
      return t('partido.periodo.juego', { numero: periodo.numero });
    case 'prorroga':
      return t('partido.periodo.prorroga', { numero: periodo.numero });
    case 'desconocido':
      return t('partido.periodo.desconocido', { codigo: periodo.codigo });
    default:
      return t(`partido.periodo.${periodo.tipo}`);
  }
}
