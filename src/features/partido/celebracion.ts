import { useEffect, useState } from 'react';

import { ganaLoyola } from '../../domain';
import type { PartidoDetalle } from '../../domain';
import { movimientoPermitido } from '../../ui/movimiento';

const CLAVE = 'loyola.celebrados';
/** Basta con los últimos: un partido viejo no se vuelve a abrir tanto. */
const MAXIMO = 50;

function celebrados(): string[] {
  try {
    const guardados: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(guardados)
      ? guardados.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Apunta el partido como celebrado para no repetir el confeti. */
export function apuntarCelebrado(partidoId: string) {
  const previos = celebrados();
  if (previos.includes(partidoId)) return;
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify([...previos, partidoId].slice(-MAXIMO)),
    );
  } catch {
    // Sin almacenamiento (navegación privada) se celebra en cada visita.
  }
}

const toca = (id: string | null) =>
  id !== null && movimientoPermitido() && !celebrados().includes(id);

/**
 * Si toca confeti: el Loyola ha ganado y es la primera vez que se ve el
 * partido terminado, también cuando acaba con la pantalla abierta. Se decide
 * al cambiar de partido o de resultado y se mantiene aunque ya esté apuntado.
 * Con movimiento reducido no se celebra ni se apunta.
 */
export function useCelebracion(partido: PartidoDetalle | undefined): boolean {
  const id = partido && ganaLoyola(partido) ? partido.id : null;
  const [estado, setEstado] = useState(() => ({ id, celebrar: toca(id) }));
  if (estado.id !== id) setEstado({ id, celebrar: toca(id) });
  useEffect(() => {
    if (estado.id !== null && estado.celebrar) apuntarCelebrado(estado.id);
  }, [estado]);
  return estado.id === id && estado.celebrar;
}
