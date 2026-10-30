import { QueryClient } from '@tanstack/react-query';

import { esReintentable } from '../api/transport';
import { VIDA_CACHE } from '../queries';

/** Tres reintentos con espera exponencial, solo si el fallo es pasajero. */
const MAX_REINTENTOS = 3;

/**
 * Cada consulta trae su `staleTime` (ver `queries/frescura.ts`). La caché en
 * memoria vive lo mismo que la persistida porque solo se guarda lo que sigue
 * en memoria: con el `gcTime` por defecto (5 min) lo restaurado de IndexedDB
 * que ninguna pantalla mirase se perdería en la siguiente escritura.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: VIDA_CACHE,
        retry: (fallos, error) =>
          fallos < MAX_REINTENTOS && esReintentable(error),
        // Al volver a la app solo se refresca lo que ya está caducado.
        refetchOnWindowFocus: true,
      },
    },
  });
}
