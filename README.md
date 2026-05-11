# Loyola Hockey Matches

Aplicación web y móvil, basada en Capacitor, para consultar calendario, clasificación y detalle en vivo de los equipos de hockey patines del Loyola.

Versión actual: **1.3.0**

## Estado actual

El proyecto está funcional y en uso, con una base ya bastante más ordenada que la original.
En las últimas iteraciones se ha trabajado sobre todo en:

- detalle de partido mobile-first
- integración real con SignalR y endpoints legacy de la FVP
- subvista de jugador dentro del modal de partido
- refactor progresivo de `partidoDetalle.js` a módulos más pequeños
- nuevo selector Loyola reutilizable con onboarding y overlay desde side menu
- separación de competiciones en ligas y torneos con acordeón animado
- limpieza técnica, JSDoc y lint

## Stack

- JavaScript ES modules
- Vite
- Capacitor Android
- HTML y CSS
- jQuery + SignalR clásico para tiempo real

## Estructura relevante

### Código fuente

- `www/core/`
  - arranque, navegación, pull-to-refresh e integración móvil
- `www/core/teamSelectorFlow.js`
  - flujo del selector Loyola, onboarding y refresco del launcher del side menu
- `www/components/`
  - renderizado de clasificación, partidos, selector de equipo y detalle de partido
- `www/components/equipoSelectorAccordion.js`
  - comportamiento del acordeón exclusivo del selector Loyola
- `www/services.js`
  - acceso a endpoints legacy y bus local de eventos de partido
- `www/i18n.js`
  - textos de la aplicación
- `www/styles/components-partido-detalle.css`
  - estilos del modal de detalle de partido

### Módulos recientes del detalle de partido

- `www/components/partidoDetalle.js`
  - coordinador principal del modal
- `www/components/partidoDetalleUtils.js`
  - utilidades y estado base
- `www/components/partidoDetalleAlineaciones.js`
  - render de alineaciones
- `www/components/partidoDetalleEventos.js`
  - render de eventos
- `www/components/partidoDetalleJugadorStats.js`
  - helpers y render de estadísticas de jugador
- `www/components/partidoDetalleJugadorData.js`
  - resolución de datos del jugador y eventos asociados
- `www/components/partidoDetalleJugadorView.js`
  - cabecera compacta de jugador
- `www/components/partidoDetalleRender.js`
  - render base del partido, skeletons, resumen y penaltis
- `www/components/partidoDetalleState.js`
  - actualización y normalización de estado del detalle

### Otros directorios

- `android/`
  - proyecto Android de Capacitor
- `dist/`
  - salida generada de build, no se versiona
- `.copilot/`
  - memoria operativa del proyecto

## Scripts

```bash
npm start      # desarrollo con Vite
npm run build  # build web
npm run serve  # preview local de build
npm run lint   # lint de www/**/*.js
npm run cap:copy
npm run cap:sync
```

## Desarrollo

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Arrancar entorno local:
   ```bash
   npm start
   ```
3. Verificar calidad estática:
   ```bash
   npm run lint
   ```
4. Si hay cambios nativos, sincronizar Capacitor:
   ```bash
   npm run cap:sync
   ```

## Convenciones actuales

- El detalle de partido se está refactorizando por cortes pequeños y seguros.
- Los textos visibles deben pasar por `t(...)` y `www/i18n.js`.
- `dist/` y ficheros temporales no deben commitearse.
- Se prefiere JSDoc útil en español, no decorativo.
- Antes de tocar flujo delicado del modal, conviene validar la UX real en móvil.

## Estado de calidad

- ESLint está configurado con `eslint.config.js`.
- `npm run lint` debe quedar limpio antes de cerrar una iteración.
- Parte del código legacy sigue coexistiendo con la estructura modular moderna, sobre todo alrededor de SignalR y algunos endpoints históricos.

## Próximos focos razonables

- seguir reduciendo el peso de `www/components/partidoDetalle.js` si aparece otra frontera segura
- revisar `www/services.js` para separar mejor helpers y dominios legacy
- continuar la documentación JSDoc en módulos antiguos
- endurecer más la integración con servicios legacy sin romper la UX actual

## Notas

La carpeta `.copilot/` mantiene memoria de trabajo del proyecto para poder retomarlo rápido entre sesiones.
