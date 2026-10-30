# queries

Hooks de TanStack Query con las query keys centralizadas. Las pantallas consumen solo estos hooks, nunca `fetch`.

- `claves.ts`: todas las keys, bajo la raíz `['fvp']`. Lo de una división cuelga de `claves.division(id)` para invalidar una pantalla entera de golpe.
- `frescura.ts`: `staleTime` por tipo de dato y `frescuraPartido` (en juego 15 s, programado 5 min, finalizado 30 min y, pasados dos días, nunca caduca).
- `consultas.ts`: `queryOptions` de cada recurso, para hooks, `prefetchQuery` o `invalidateQueries`. Un id `undefined` deja la consulta en espera (`skipToken`).
- `hooks.ts`: un hook por recurso (`useAgenda`, `useCatalogo`, `useCalendario`, `useClasificacion`, `usePartido`…).
- `registro.ts`: tipo de `meta`; `persistir: false` deja una consulta fuera de la caché en IndexedDB.

El catálogo siembra la agenda en caché al cargarse: la pestaña de partidos no la vuelve a pedir. La persistencia y los reintentos se configuran en `app/` (`persistencia.ts`, `queryClient.ts`).
