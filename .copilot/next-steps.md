# Next Steps

## Prioridad alta

- [ ] Probar la app en local y validar que el scroll automático ya apunta al siguiente partido real cuando existan aplazados o suspendidos previos.
- [ ] Validar que la exportación ICS usa la hora real del partido y que el rango horario generado es correcto.
- [ ] Arreglar el bug de `currKey` en `www/components/clasificacion.js`.
- [ ] Validar en local que SignalR carga correctamente `/signalr/hubs`, negocia por el proxy de Vite y recibe eventos reales de partido en el modal de detalle.
- [ ] Verificar en runtime los nuevos logs de `joinSelectedModalidad()` (`hasJoinGroup`, `state`, `modalidad`) y confirmar si `joinGroup(modalidad)` llega a ejecutarse realmente.
- [ ] Verificar que la cabecera ya no pierde competición/equipos/árbitros después de `getEstadisticaPartido`.
- [ ] Confirmar si, tras mover los handlers a nivel global, empiezan a entrar en la app `recibirEventosIniciales`, `recibirAlinIniciales`, `recibirPenaltisIniciales` y `recibirMarcadorPartido` para el partido `4175`.
- [ ] Si siguen sin entrar, comparar el comportamiento del hub usando `/signalr` local frente a URL remota directa para aislar si el problema está en el proxy/entorno.
- [ ] Revisar el flujo completo de SignalR y documentar cómo debe funcionar, incluyendo diferencias entre web local, web desplegada y app nativa.

## Prioridad media

- [ ] Unificar el acceso HTTP en `www/services.js`.
- [ ] Revisar dependencias que ya no parecen necesarias.
- [ ] Revisar avisos de build de Vite.

## Prioridad baja

- [ ] Actualizar `README.md` para reflejar la estructura actual.
- [ ] Reducir uso de estado global basado en `window`.
- [ ] Mejorar rendimiento de cargas agregadas por competición.
