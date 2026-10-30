# ui

Componentes de diseño compartidos (Escudo, Marcador, Skeleton, Tabs…). Sin lógica de negocio ni acceso a datos.

- `Pagina` (cabecera, atrás o ajustes, pull-to-refresh) y `Consulta` (carga, error y reintento).
- `rutas.ts`: rutas de detalle relativas a la pestaña actual (`useRutas`).
- `shell.ts`: acciones del shell para las pantallas (abrir ajustes), sin que dependan de `app/`.
