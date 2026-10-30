import { useMemo } from 'react';

import { agruparPorCategoria, buscarEquipo } from '../domain';
import { useEquipoElegido } from './equipoElegido';
import { useCatalogo } from './hooks';

/**
 * Catálogo de equipos Loyola junto con el elegido y el selector agrupado:
 * lo comparten las pestañas que dependen de «mi equipo».
 */
export function useSeleccionEquipo() {
  const catalogo = useCatalogo();
  const [clave, elegir] = useEquipoElegido();
  const grupos = useMemo(
    () => agruparPorCategoria(catalogo.data ?? []),
    [catalogo.data],
  );
  const elegido = useMemo(
    () => buscarEquipo(catalogo.data ?? [], clave),
    [catalogo.data, clave],
  );
  return { catalogo, clave, elegir, grupos, elegido };
}
