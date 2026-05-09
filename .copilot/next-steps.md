# Next Steps

## Prioridad alta

- [ ] Probar la app en local y validar que el scroll automático ya apunta al siguiente partido real cuando existan aplazados o suspendidos previos.
- [ ] Validar que la exportación ICS usa la hora real del partido y que el rango horario generado es correcto.
- [ ] Arreglar el bug de `currKey` en `www/components/clasificacion.js`.
- [ ] Validar en local que SignalR carga correctamente `/signalr/hubs`, negocia por el proxy de Vite y recibe eventos reales de partido en el modal de detalle.
- [ ] Verificar en runtime que `recibirEventosIniciales`, `recibirAlinIniciales`, `recibirPenaltisIniciales` y `recibirMarcadorPartido` alimentan bien el nuevo render completo y anotar diferencias restantes frente a `competicion.js`.
- [ ] Revisar el flujo completo de SignalR y documentar cómo debe funcionar, incluyendo diferencias entre web local, web desplegada y app nativa.

## Prioridad media

- [ ] Unificar el acceso HTTP en `www/services.js`.
- [ ] Revisar dependencias que ya no parecen necesarias.
- [ ] Revisar avisos de build de Vite.

## Prioridad baja

- [ ] Actualizar `README.md` para reflejar la estructura actual.
- [ ] Reducir uso de estado global basado en `window`.
- [ ] Mejorar rendimiento de cargas agregadas por competición.
