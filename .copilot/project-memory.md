# Project Memory

## Resumen

Proyecto: `loyola-hockey-matches`

Aplicación híbrida para seguir partidos y clasificaciones de equipos de hockey patines del Loyola. Usa una base web modular en JavaScript y empaquetado Android con Capacitor.

## Stack actual

- JavaScript ES modules
- Vite
- Capacitor Android
- HTML/CSS
- jQuery + SignalR clásico para tiempo real

## Arquitectura observada

- `www/` contiene el frontend fuente.
- `dist/` contiene la build web generada por Vite.
- `android/` contiene el proyecto Android de Capacitor.
- `www/core/` contiene arranque, navegación e inicialización.
- `www/components/` contiene renderizado de partidos, clasificación y detalle.
- `www/styles/components-partido-detalle.css` contiene el estilo del modal de detalle de partido, integrado con el sistema global de tema.
- `www/components/partidoDetalle.js` ya soporta payloads reales del hub para detalle: `recibirEventosIniciales`, `recibirPenaltisIniciales`, `recibirAlinIniciales`, `recibirMarcadorPartido`, además de alineaciones `JugLocal/JugVisit/PortLocal/PortVisit/TecnLocal/TecnVisit`.
- Los handlers del hub en tiempo real deben vivir globalmente desde `www/core/main.js`, igual que en la web original, para no perder los payloads iniciales antes de que el modal se monte.
- `www/services.js` concentra acceso a datos remotos y parte de la integración en tiempo real.
- `www/signalrBus.js` actúa como bus simple de eventos para desacoplar los handlers globales del hub del modal de detalle.
- `www/state/` guarda estado de equipos y overlays.
- `www/utils/` contiene helpers, caché, calendario y utilidades de clasificación/partidos.

## Estado actual del proyecto

El proyecto compila con `vite build`, pero está en una transición parcial desde una estructura legacy a una más moderna.

### Señales de transición incompleta

- `README.md` no refleja del todo la estructura real.
- Hay dependencias legacy todavía presentes (`express`, `http-proxy`, `browser-sync`, `live-server`, `nodemon`).
- `server.js` fue eliminado, pero aún quedan rastros del enfoque anterior.
- Se mezcla código modular moderno con globals y scripts legacy de SignalR.

## Problemas detectados

1. Bug claro en `www/components/clasificacion.js`
   - Se usa `currKey` en `localStorage.setItem(currKey, ...)` pero no está definido.

2. Bug funcional en scroll al próximo partido
   - La lógica de `getProximoPartidoIdx()` trataba partidos pasados sin resultado final como si fueran el próximo partido.
   - Eso hace que un aplazado o suspendido pueda robar el foco al siguiente partido real.

3. Bug funcional en exportación ICS
   - La generación de eventos ICS no estaba usando la hora real del partido.
   - Se aplicaba siempre el rango por defecto 12:00-14:00 aunque el partido tuviera `Hora` informada.

4. Integración SignalR frágil
   - Depende de scripts globales y `window.hubProxy`.
   - Hay mezcla entre `window.signalR` y `$.connection`.
   - `index.html` carga recursos externos de hubs que conviene revisar.
   - Un riesgo específico detectado era registrar los handlers del detalle demasiado tarde, perdiendo potencialmente los callbacks iniciales que en la web original llegan inmediatamente tras abrir el partido.

3. Capa de servicios inconsistente
   - Parte del acceso a la API usa `post()` con caché.
   - `getEquiposLoyolaTodasCompeticiones()` usa `fetch()` directo.

6. Rendimiento mejorable
   - `getCalendarioTodosEquipos()` hace peticiones secuenciales por equipo.

7. Dependencia de estado global
   - Uso frecuente de `window.*` y `localStorage` para coordinar módulos.

## Build

Comando probado:

```bash
npm run build
```

Resultado:
- build correcta
- aviso por script legacy `jquery.signalR-2.4.3.min.js`
- aviso de resolución de `loyola_hockey.png`

## Evaluación técnica

Base funcional aceptable, pero conviene estabilizar el proyecto antes de añadir nuevas funcionalidades grandes.

## Recomendación de trabajo

1. Verificación funcional real en local
2. Corrección de bugs evidentes
3. Limpieza de dependencias y restos legacy
4. Endurecer la integración de SignalR
5. Unificar acceso a API y reducir globals

## Convención para esta carpeta

Mantener actualizados al menos:
- estado general
- decisiones técnicas
- riesgos
- tareas siguientes
- hallazgos nuevos
