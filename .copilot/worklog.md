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

## 2026-05-17

- Se revisó un bug en clasificación y calendario con partidos aplazados: la lista de partidos sí debía recolocar encuentros por fecha/hora reprogramadas reales, no por `Orden` de jornada.
- Se añadió en `www/utils/helpers.js` un comparador cronológico compartido (`comparePartidosByScheduledDate`) basado en `Fecha` + `Hora`, con fallback a mediodía y desempate por `Orden` e `IdPartido`.
- `www/components/partidos.js` pasó a ordenar localmente el calendario antes de renderizarlo, corrigiendo la posición visible de partidos aplazados con nueva fecha.
- `www/components/clasificacion.js` pasó a calcular la racha reciente usando ese mismo orden cronológico real.
- Durante la validación se detectó un segundo bug: la racha se invertía visualmente porque después de coger los últimos 5 se aplicaba `reverse()`, produciendo secuencias como `D,V,D` cuando la secuencia temporal real era `D,D,V`.
- Se eliminó ese `reverse()` y se mantuvo la racha en sentido temporal natural.
- También se robusteció el cruce de IDs de equipo en clasificación (`IdEquipo` / `IdEquipoComp`) para evitar pérdidas de resultados según la competición.
- Se validó el fix con trazas reales en navegador sobre el caso de `LOYOLA INDAUTXU A`, donde la racha quedó corregida.
- Se rehízo bastante el `pull-to-refresh`: nueva sensación visual de separación entre capas, resistencia inicial, estados de texto más claros, caret con estados explícitos abajo/arriba, spinner de carga y mejor comportamiento en claro/oscuro.
- Se corrigió la interferencia entre el `pull-to-refresh` y el scroll horizontal de la clasificación, manteniendo el scroll vertical normal de la página sobre la tabla.
- Se añadió scroll al inicio al entrar en clasificación.
- Se corrigieron varias carreras de navegación y refresco: si una carga de clasificación termina cuando el usuario ya ha vuelto a partidos, ya no debe repintar clasificación por detrás dejando la botonera incoherente.
- Se preparó la versión `1.5.1`.
- `npm run lint` siguió limpio tras los cambios.
- Se inició la implementación del nuevo detalle de equipo reutilizando infraestructura del detalle de partido, primero con una modal separada como prototipo y después reconduciéndolo a una arquitectura mejor: un shell compartido y subvistas internas.
- Se añadió `www/components/detalleModalShell.js` para centralizar el montaje de la shell de detalle sin alterar la pinta existente.
- Se añadió `www/components/equipoDetalle.js` para renderizar resumen del equipo y calendario simplificado.
- Se añadió `www/components/equipoDetalleSubview.js` como subvista real dentro del modal compartido, con cabecera propia, resumen, partidos del equipo y apertura de partido dentro del mismo contenedor.
- Se conectó apertura de detalle de equipo desde clasificación y desde la lista de partidos al tocar nombre o escudo del equipo.
- Se corrigió el contrato de navegación real validado por el usuario: `clasificación -> equipo -> partido -> jugador -> back -> partido -> back -> equipo`, sin dejar un back fantasma al volver al último nivel de equipo.
- Se corrigió la cabecera del detalle compartido para que siga la vista actual (`equipo`, `partido` o `jugador`) en vez de quedarse pegada a la última cabecera de partido.
- Se evitó que la apertura inicial del detalle de equipo intentase cargar `team-detail-entry` como si fuera un partido real contra APIs/SignalR.
- Se añadió el escudo en la cabecera del detalle de equipo.
- Se corrigió el caso de apertura desde tarjetas de partidos para pasar `IdEntidadEquipo` y así resolver el escudo correcto en cabecera.
- Se corrigió el caso de apertura desde partidos cuando no había fila enriquecida de clasificación disponible: el resumen del equipo ahora reconstruye agregados desde el calendario del propio equipo usando partidos cerrados.
- Se corrigió el formato de diferencia de goles para que `0` no se pinte como `+0`.
- Se mejoró la tarjeta de partido alineando arriba los bloques del duelo y centrando horizontalmente escudo + nombre dentro de cada equipo.
- La release objetivo pasó a ser `1.6.0`.

## 2026-05-23

- Se continuó la fase visual Loyola tomando el mock del sidebar como base para claro y oscuro.
- Se integró el lenguaje Loyola en el shell global de la app, haciendo que header, fondo principal y bottom nav compartan base visual por tema.
- Se pasó la lista de partidos a una lógica más editorial y fundida con el fondo, con acciones compactas en cabecera para ubicación y calendario.
- Se inició el desacople estructural de clasificación respecto a la semántica heredada de partidos:
  - la base visual ya no depende de `#matches li.clas-card`
  - los items del acordeón de clasificación se renderizan como `div` con clase propia `clas-accordion-item`
  - el skeleton/loading de clasificación también usa esa nueva clase base
- Se reforzó la robustez de assets para APK/Capacitor copiando los Loyola de uso directo a `www/public/assets/sidebar-loyola/...`.
- Se rehízo el cierre del side menu móvil y las esquinas inferiores como capas absolutas reales, para que no dependan de la grid interna.
- Se añadieron constantes de ruta para el escudo Loyola claro/oscuro en `www/components/equipoSelectorLauncher.js`.
- Se sustituyó la duplicación manual de assets Loyola entre `www/assets/...` y `www/public/...` por una copia automática en build desde `vite.config.js`, dejando `www/assets/sidebar-loyola/...` como fuente editable principal.
- Se fueron dejando commits pequeños y temáticos durante la fase, culminando en:
  - `87d37d2` `Polish Loyola sidebar and standings integration`
  - `9eedd25` `Refine Loyola asset references and standings loading state`

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
