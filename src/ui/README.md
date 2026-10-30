# ui

Componentes de diseño compartidos (Escudo, Marcador, Skeleton, Tabs…). Sin lógica de negocio ni acceso a datos.

- `Pagina` (cabecera, atrás o ajustes, pull-to-refresh) y `Consulta` (carga, error y reintento).
- `rutas.ts`: rutas de detalle relativas a la pestaña actual (`useRutas`).
- `shell.ts`: acciones del shell para las pantallas (abrir ajustes), sin que dependan de `app/`.
- Partidos: `TarjetaPartido` (y su skeleton con la misma geometría), `InsigniaEstado`, `Escudo` (iniciales si no hay imagen), `CabeceraEquipo` y `SelectorEquipo` (modal agrupado por categoría), `EstadoVacio` y `EstadoError` (con reintento). Estilos en `styles/componentes.css`, solo con tokens de tema.
