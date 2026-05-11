# Worklog

## 2026-05-09

- Se analizó la estructura general del proyecto.
- Se confirmó que el proyecto usa Vite + Capacitor Android + JS modular con restos legacy.
- Se verificó que `npm run build` funciona.
- Se detectó un bug en `www/components/clasificacion.js` por uso de `currKey` sin definir.
- Se detectó fragilidad en la integración de SignalR por dependencia de globals y scripts externos.
- Se creó la carpeta `.copilot` como memoria interna del proyecto.
- Se detectó un bug funcional en el scroll automático: partidos aplazados o suspendidos sin resultado podían marcarse como próximo partido.
- Se corrigió la lógica de `getProximoPartidoIdx()` para priorizar el primer partido de hoy o futuro, evitando que partidos pasados sin cerrar roben el foco.
- Se detectó un bug en la exportación ICS: los eventos no usaban la hora real del partido y caían siempre en el rango 12:00-14:00.
- Se corrigió la generación temporal de ICS para usar `p.Hora` cuando exista y mantener un fallback razonable si falta.
- Se detectó que en desarrollo local web SignalR intenta negociar contra `digitalsport.online` y falla por CORS, generando ruido continuo en consola.
- Se ajustó temporalmente la inicialización para desactivar SignalR en `localhost` web y evitar reconexiones inútiles durante desarrollo local.
- Después se recondujo el enfoque para permitir SignalR en web dev mediante proxy de Vite, cargando `/signalr/hubs` dinámicamente y apuntando el hub a `/signalr` en local.
- Se detectó que el detalle del partido sí recibía datos de API y se unía a SignalR, pero el render fallaba por un parseo incompleto de las respuestas reales (`getPartido` y `getEstadisticaPartido`).
- Se corrigió el parseo base del detalle para aceptar la forma real del payload devuelto por la API.
- Se reforzó la UI del modal de detalle para asegurar contraste y visibilidad del header.
- Cuando la API de estadísticas no trae `eventos` detallados pero sí `stats`, se reutilizan esos datos como fallback visible en la pestaña de eventos.
- Se añadieron trazas defensivas al modal de detalle para diagnosticar si el header se sobreescribe o si el problema es de renderizado final en DOM.
- Se integró la pantalla de detalle de partido con el sistema global de tema claro/oscuro, moviendo su estilo a `www/styles/components-partido-detalle.css`.
- Se rehízo `www/components/partidoDetalle.js` para aproximar el detalle real de `competicion.js`: resumen, alineaciones por equipo, porteros, cuerpo técnico, eventos enriquecidos y penaltis por lado.
- Se añadió `joinGroup(modalidad)` en `www/core/main.js` al conectar/reconectar SignalR, como hace la web original con `unirseAModalidad()`.
- Se corrigió `www/components/partidoDetalle.js` para fusionar cabecera rica de `GetParametrosPartido` con el fallback de `GetEstadisticaPartido` sin perder competición, equipos ni árbitros.
- Se añadió instrumentación adicional en `joinSelectedModalidad()` para ver si `joinGroup` existe y si realmente se ejecuta en runtime.
- Se confirmó con trazas de la web original que el partido `4175` sí recibe `recibirEventosIniciales`, `recibirPenaltisIniciales`, `recibirAlinIniciales` y `recibirMarcadorPartido` pese a reportar `SeguimientoDirecto:false` y `Estadisticas:false` en cabecera.
- Se detectó una diferencia crítica con la web original: allí los handlers de SignalR viven globalmente desde el arranque, mientras en la app se registraban tarde dentro del modal de detalle.
- Se movió el registro de handlers de SignalR a `www/core/main.js` y se creó `www/signalrBus.js` como bus global para reenviar eventos del hub al detalle abierto.
- `www/components/partidoDetalle.js` dejó de sobrescribir `hubProxy.client` y ahora se suscribe al bus global, filtrando por `idPartido`.
- Se añadió también captura global de `cronoPartido` para dejar la arquitectura alineada con `competicion.js`.
- Se verificó que la build sigue pasando tras esta reestructuración del flujo SignalR.
- Se detectó y corrigió un fallo de ruta en dev: `signalrBus.js` se había creado fuera de `www`, pero Vite usa `root: 'www'`, así que el import resolvía a `/signalrBus.js` y rompía el arranque con 404.
- Para evitar más fragilidad con un módulo nuevo suelto, el bus global de eventos de SignalR se integró finalmente dentro de `www/services.js`, eliminando la dependencia externa a `www/signalrBus.js`.
- Se verificó con trazas reales de la app que, tras mover los handlers a nivel global, ya entran correctamente `recibirEventosIniciales`, `recibirPenaltisIniciales`, `recibirAlinIniciales` y `recibirMarcadorPartido` para el partido `4175`.
- Se confirmó visualmente que el detalle de partido ya carga alineaciones, eventos, penaltis y marcador usando el flujo SignalR replicado desde la web original.
- Se aclaró una regla funcional del hockey de esta competición: el header `2-4` es correcto como resultado por puntos/tiempos, mientras que los eventos muestran marcadores parciales acumulados del juego.
- Se abrió la siguiente línea de trabajo: rediseñar la navegación del detalle y de futuras stats de jugador con criterio mobile-first, evitando modales anidadas y tablas anchas poco usables en móvil.
- Se aplicó una primera mejora mobile-first al detalle de partido: nueva shell tipo hoja/pantalla, grabber superior, header con botón de retroceso preparado, título de vista interna y conservación explícita de pestaña/vista en el estado.
- La arquitectura del detalle queda preparada para futuras subvistas internas (por ejemplo stats de jugador) sin necesidad de abrir modales anidadas.
- La build se verificó tras esta primera pasada de UX móvil.
- Se mejoró el contraste del detalle en modo noche, especialmente en pestañas activas y en la legibilidad de la sección de eventos.
- Se empezó a internacionalizar de forma explícita `www/components/partidoDetalle.js`, añadiendo claves propias al diccionario de `www/i18n.js` para tabs, resumen, alineaciones, eventos, penaltis, árbitros y estados vacíos.
- Se eliminaron heurísticas frágiles basadas en comparar cadenas ya traducidas y se sustituyeron por claves de i18n dedicadas del detalle.
- La build se volvió a verificar tras la pasada de contraste e i18n del detalle.

## 2026-05-11

- Se retomó el proyecto con foco en refactor seguro, Sonar/JSDoc, clasificación, tarjetas de partido y nuevo selector Loyola reutilizable.
- Se extrajeron `www/components/partidoDetalleNavigation.js` y `www/components/partidoDetalleTabs.js`, reduciendo presión sobre `www/components/partidoDetalle.js`.
- Se hizo una pasada de JSDoc/limpieza en módulos como `www/core/main.js`, `www/core/init.js`, `www/services.js`, `www/components/partidoDetalleAlineaciones.js`, `www/components/partidoDetalleEventos.js` y `www/components/partidoDetalleUtils.js`.
- Se corrigió el cálculo de posiciones previas de clasificación comparando contra la tabla anterior a la última jornada completamente finalizada.
- Se mejoró visualmente la clasificación y se eliminó un scroll horizontal introducido por el banner de competición.
- Se añadieron escudos reales a tarjetas de partidos usando `GetParametrosCompeticion`, mapeo `IdEquipoComp -> IdEntidadEquipo/TieneLogo` y la URL pública S3 de DigitalSport.
- Se rediseñaron las tarjetas de partidos y se mejoró el estado visual de partidos pendientes.
- Se implementó un nuevo selector reutilizable de equipo Loyola con onboarding real, `#screenContent`, launcher en side menu y overlay/sheet dedicado.
- Se ajustó la UX del onboarding para que no muestre `bottom-nav`, `competicionHeader` ni `pullToRefresh`, y para que tras la primera selección se vea solo un spinner antes de cargar datos.
- Se corrigieron bugs del flujo inicial: `ensureMatchesList()` para restaurar `#matches`, eliminación del “equipo fantasma” por el `<select>` oculto y supresión del flash inicial del footer.
- Se separaron competiciones en `Ligas` y `Torneos` con heurística por nombre y se construyó un acordeón exclusivo con animación real, caret sincronizado, scroll guiado y cabecera sticky en overlay.
- Se corrigió la actualización del resumen del side menu tras la primera selección y tras cambios de equipo desde el overlay.
- Se eliminó el hero duplicado dentro del selector mostrado en overlay desde side menu.
- Se extrajo `www/core/teamSelectorFlow.js` para sacar de `init.js` el flujo de onboarding, refresco del launcher y cambio de idioma.
- Se extrajo `www/components/equipoSelectorAccordion.js` para encapsular el comportamiento del acordeón del selector.
- Se eliminó un `@ts-ignore` de `www/i18n.js` mediante un `@callback I18nFormatter`.
- Se subió la versión del proyecto a `1.3.0` en `package.json`.
