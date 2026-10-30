import { QueryClient } from '@tanstack/react-query';

/** Los datos de partidos cambian poco entre aperturas: stale-while-revalidate con reintentos acotados. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  });
}
