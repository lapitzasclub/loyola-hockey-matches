# features/partido

Detalle de partido. `PartidoPage` consume `usePartido` y reparte el dominio en tres secciones deslizables (`ui/Pestanas`):

- Resumen: totales por equipo, regla del resultado oficial, datos del partido y crónica.
- Eventos: línea por periodo (más reciente arriba) con el marcador en cada gol; la tanda de penaltis va aparte. La lógica (qué se oculta, marcador acumulado, completar personas desde la alineación) vive en `domain/cronologia`.
- Alineaciones: porteros, jugadores y cuerpo técnico. El cuerpo técnico no enlaza, como en la v1.

`CabeceraPartido` separa `__meta` (lo que S09 plegará con el scroll) de `__cruce`. Todo sale de la caché de `queries/`, así que S10 podrá escribir el directo sin tocar las vistas.
