# app

Bootstrap de la aplicación: providers (TanStack Query, Ionic), router (`IonReactRouter`) con las tabs, tema y CSS núcleo de Ionic.

- `queryClient.ts` y `persistencia.ts`: reintentos, `gcTime` y caché persistida en IndexedDB (`VERSION_CACHE` la descarta si cambia la forma de los datos).
- `Tabs.tsx`: pestañas con una pila por pestaña (los detalles cuelgan de cada raíz) y la hoja de ajustes.
- `botonAtras.ts`: back de Android (modal → pila → pestaña inicial → salir).
- `tema.ts` y `barrasSistema.ts`: preferencia de tema persistida, `body[data-theme]`, `theme-color` e iconos de las barras de Android.
