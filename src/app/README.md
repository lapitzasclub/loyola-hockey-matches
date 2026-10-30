# app

Bootstrap de la aplicación: providers (TanStack Query, Ionic), router (`IonReactRouter`) con las tabs, tema y CSS núcleo de Ionic.

- `queryClient.ts` y `persistencia.ts`: reintentos, `gcTime` y caché persistida en IndexedDB (`VERSION_CACHE` la descarta si cambia la forma de los datos).
