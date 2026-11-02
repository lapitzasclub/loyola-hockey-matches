# ui

Componentes de diseño compartidos (Escudo, Marcador, Skeleton, Tabs…). Sin lógica de negocio ni acceso a datos.

- `Pagina` (cabecera, atrás o ajustes, pull-to-refresh) y `Consulta` (carga, error y reintento). El pull-to-refresh es `Desgarro`, propio sobre `createGesture` de Ionic porque `IonRefresher` no limita lo que baja el contenido; la curva de goma, con tope, está en `goma.ts`.
- `rutas.ts`: rutas de detalle relativas a la pestaña actual (`useRutas`).
- `shell.ts`: acciones del shell para las pantallas (abrir ajustes), sin que dependan de `app/`.
- `plataforma.ts`: modo de Ionic, `md` en Android y `ios` en el resto (ver ROADMAP, «Aspecto de Android»).
- Partidos: `TarjetaPartido` (y su skeleton con la misma geometría), `InsigniaEstado`, `Escudo` (iniciales si no hay imagen), `CabeceraEquipo` y `SelectorEquipo` (modal agrupado por categoría), `HojaJornada` (los partidos de una jornada, desde la jornada de la tarjeta), `EnlacePista` (la pista abre el mapa: `geo:` en Android, Mapas en iPhone, Google en escritorio), `SuscribirCalendario` (el `.ics` del equipo en la web de la federación, con `webcal://`, Google Calendar o copiar la dirección), `EstadoVacio` y `EstadoError` (con reintento). Estilos en `styles/componentes.css`, solo con tokens de tema.
- Clasificación y equipo: `Racha` (puntos V/E/D, compacta en tablas) y `transiciones.ts` (nombres `data-transicion` de escudos, nombres y marcador que vuelan entre pantallas; ver `app/transicionPagina.ts`). Las filas que son `IonRouterLink` llevan la maquetación en un hijo, porque el `<a>` del shadow DOM rompe una rejilla o flex puesta en el enlace.
- `Pastillas`: botonera de secciones y filtros al estilo de la v1, con todas las opciones visibles y reparto en varias líneas si no caben (sin scroll horizontal). La activa va rellena.
- `Pestanas`: secciones con `Pastillas` y una fila de paneles con `scroll-snap`, sin librería. Todos los paneles siguen montados; los inactivos van `inert` y recortados a la altura del activo (`ResizeObserver`), para que el scroll de la página no dependa del panel más alto.
- Movimiento (S09), siempre con `transform` y `opacity` y apagado con `prefers-reduced-motion` (`movimiento.ts`):
  - `Revelado` y `useEspera`: el skeleton se funde en el contenido, solo si antes hubo skeleton (con datos de caché no anima).
  - `Cifra`: el marcador late cuando cambia con la pantalla abierta, no al montarse.
  - `Confeti`: ráfaga corta de piezas con colores del tema; quién la lanza lo decide la feature.
  - `tarjetaPulsada.ts`: lo que enseñaba la tarjeta pulsada, para que el detalle pinte su cabecera al instante y el vuelo tenga destino.
  - `Pagina` con `compacta` escribe `--pliegue` (0–1) en los `[data-plegable]` al hacer scroll: la cabecera se pliega con CSS y su versión compacta sustituye al título en la barra.
