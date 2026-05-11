# Next Steps

## Prioridad alta

- [ ] Seguir reduciendo `www/components/partidoDetalle.js` solo si aparece una frontera funcional realmente segura.
- [ ] Mantener validación manual de la subvista de jugador tras cada cambio sensible.
- [ ] Revisar `www/services.js` para separar helpers o dominios sin romper el flujo legacy.
- [ ] Seguir extendiendo JSDoc en módulos antiguos que aún están menos documentados.

## Prioridad media

- [ ] Revisar si `renderJugadorSubview` debe quedarse en el coordinador o si merece un módulo propio sin comprometer la UX.
- [ ] Revisar la integración SignalR en runtime real y documentar mejor el flujo completo de eventos.
- [ ] Revisar dependencias legacy que ya no aportan valor claro.
- [ ] Valorar si `package-lock.json` debe seguir ignorado o si conviene versionarlo.
- [ ] Seguir reduciendo uso de globals basados en `window` donde no sea necesario.

## Prioridad baja

- [ ] Mejorar rendimiento de cargas agregadas por competición.
- [ ] Preparar una configuración más explícita para SonarQube/SonarLint si se quiere endurecer aún más la calidad estática.
- [ ] Revisar si la documentación pública necesita ejemplos de flujo de desarrollo móvil.
