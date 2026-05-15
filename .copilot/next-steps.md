# Next Steps

## Prioridad alta

- [ ] Validar en producción pública el flujo completo en iPhone abriendo desde icono de pantalla de inicio, no desde Safari normal.
- [ ] Preparar un icono iOS específico con margen interno para que no quede recortado raro al instalar la webapp.
- [ ] Revisar si conviene optimizar la carga inicial para reducir llamadas repetidas a `GetParametrosCompeticion`.
- [ ] Mantener validación manual del detalle de partido y subvista de jugador tras cada cambio sensible.
- [ ] Revisar si conviene unificar `getServiceUrl()` y `getAppApiUrl()` bajo una sola política de transporte para evitar futuras divergencias entre Android y web.
- [ ] Validar la release 1.5.0 en los tres entornos: Android nativo, web local y Cloudflare Pages.
- [ ] Revisar y pulir el pequeño "tembleque" visual de las columnas sticky en la tabla de clasificación durante el scroll horizontal móvil.

## Prioridad media

- [ ] Revisar `www/services.js` para separar helpers o dominios sin romper el flujo legacy.
- [ ] Evaluar si la racha de 5 partidos y el layout enriquecido de clasificación necesitan algún ajuste adicional de densidad para móviles muy estrechos.
- [ ] Revisar si `renderJugadorSubview` debe quedarse en el coordinador o si merece un módulo propio sin comprometer la UX.
- [ ] Revisar la integración SignalR en runtime web público y documentar mejor el flujo completo de eventos.
- [ ] Revisar dependencias legacy que ya no aportan valor claro.
- [ ] Valorar si `package-lock.json` debe seguir ignorado o si conviene versionarlo.
- [ ] Seguir reduciendo uso de globals basados en `window` donde no sea necesario.

## Prioridad baja

- [ ] Seguir reduciendo `www/components/partidoDetalle.js` solo si aparece una frontera funcional realmente segura.
- [ ] Seguir extendiendo JSDoc en módulos antiguos que aún están menos documentados.
- [ ] Preparar una configuración más explícita para SonarQube/SonarLint si se quiere endurecer aún más la calidad estática.
- [ ] Revisar si la documentación pública necesita ejemplos de flujo de desarrollo móvil.
