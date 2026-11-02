# features

Una carpeta por pantalla: `partidos/`, `clasificacion/`, `equipo/`, `partido/`, `jugador/`, `estadisticas/`. Cada feature usa `queries/` y `ui/`; no se importan entre sí.

- `clasificacion/`: tabla por fase y grupo (`TablaClasificacion`), con el Loyola destacado y la racha.
- `equipo/`: detalle navegable desde la clasificación; `EquipoPage` con pastillas de secciones (`ResumenEquipo`, `PartidosEquipo`, `PlantillaEquipo`, `EstadisticasEquipo`, `AlineacionesEquipo`). Las secciones reciben `DatosEquipo` (`tipos.ts`).
