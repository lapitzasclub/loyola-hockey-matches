# Next Steps

## Prioridad alta

- [ ] Probar la app en local y validar que el scroll automático ya apunta al siguiente partido real cuando existan aplazados o suspendidos previos.
- [ ] Validar que la exportación ICS usa la hora real del partido y que el rango horario generado es correcto.
- [ ] Arreglar el bug de `currKey` en `www/components/clasificacion.js`.
- [ ] Validar en local que SignalR carga correctamente `/signalr/hubs`, negocia por el proxy de Vite y recibe eventos reales de partido en el modal de detalle.
- [ ] Verificar en runtime los nuevos logs de `joinSelectedModalidad()` (`hasJoinGroup`, `state`, `modalidad`) y confirmar si `joinGroup(modalidad)` llega a ejecutarse realmente.
- [ ] Verificar que la cabecera ya no pierde competición/equipos/árbitros después de `getEstadisticaPartido`.
- [x] Confirmar si, tras mover los handlers a nivel global, empiezan a entrar en la app `recibirEventosIniciales`, `recibirAlinIniciales`, `recibirPenaltisIniciales` y `recibirMarcadorPartido` para el partido `4175`.
- [x] Verificar que el detalle ya muestra visualmente alineaciones, eventos y marcador con los datos de SignalR.
- [ ] Seguir refinando el detalle mobile-first: reducir dependencia visual de tablas anchas y sustituir progresivamente vistas tabulares por tarjetas/filas compactas cuando tenga sentido.
- [ ] Implementar la primera subvista interna real dentro del detalle (stats de jugador), usando navegación interna en lugar de modal sobre modal.
- [ ] Localizar e integrar el endpoint exacto de stats de jugador usado por la web (`openStatsJugador(...)`) con una UI adaptada a móvil.
- [ ] Revisar el flujo completo de SignalR y documentar cómo debe funcionar, incluyendo diferencias entre web local, web desplegada y app nativa.

## Prioridad media

- [ ] Unificar el acceso HTTP en `www/services.js`.
- [ ] Revisar dependencias que ya no parecen necesarias.
- [ ] Revisar avisos de build de Vite.

## Prioridad baja

- [ ] Actualizar `README.md` para reflejar la estructura actual.
- [ ] Reducir uso de estado global basado en `window`.
- [ ] Mejorar rendimiento de cargas agregadas por competición.
