# ui

Componentes de diseño compartidos (Escudo, Marcador, Skeleton, Tabs…). Sin lógica de negocio ni acceso a datos.

- `Pagina` (cabecera, atrás o ajustes, pull-to-refresh) y `Consulta` (carga, error y reintento).
- `rutas.ts`: rutas de detalle relativas a la pestaña actual (`useRutas`).
- `shell.ts`: acciones del shell para las pantallas (abrir ajustes), sin que dependan de `app/`.
- Partidos: `TarjetaPartido` (y su skeleton con la misma geometría), `InsigniaEstado`, `Escudo` (iniciales si no hay imagen), `CabeceraEquipo` y `SelectorEquipo` (modal agrupado por categoría), `EstadoVacio` y `EstadoError` (con reintento). Estilos en `styles/componentes.css`, solo con tokens de tema.
- Clasificación y equipo: `Racha` (puntos V/E/D, compacta en tablas) y `transiciones.ts` (nombres `data-transicion` del escudo y el nombre de un equipo, para S09). Las filas que son `IonRouterLink` llevan la maquetación en un hijo, porque el `<a>` del shadow DOM rompe una rejilla o flex puesta en el enlace.
