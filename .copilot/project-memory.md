# Project Memory

## Resumen

Proyecto: `loyola-hockey-matches`

Versión actual de trabajo: `1.7.0`

Aplicación híbrida para seguir partidos, clasificaciones y detalle en vivo de los equipos de hockey patines del Loyola. La base sigue conviviendo con servicios legacy de la FVP, pero en esta fase ya tiene una arquitectura dual Android + web pública, con frontend compartido y backend web desplegable en Cloudflare Pages Functions.

## Stack actual

- JavaScript ES modules
- Vite
- Capacitor Android
- HTML/CSS
- jQuery + SignalR clásico para tiempo real
- ESLint con configuración local (`eslint.config.js`)

## Arquitectura observada

- `www/` contiene el frontend fuente compartido entre Android y web.
- `dist/` contiene la build generada y ya debe tratarse como salida no versionada.
- `android/` contiene el proyecto Android de Capacitor.
- `functions/` contiene el backend web para Cloudflare Pages Functions.
- `functions/api/` expone el proxy cerrado a endpoints legacy FVP mediante `/api/*`.
- `functions/signalr/[[route]].js` hace de proxy completo para `/signalr/*`.
- `www/config/runtime.js` centraliza la política dual de ejecución (`android-native` vs `web`).
- `www/core/` contiene arranque, navegación e inicialización.
- `www/core/teamSelectorFlow.js` concentra ahora el flujo de onboarding, cambio de idioma y refresco del selector de equipo.
- `www/core/initBootstrap.js` encapsula el bootstrap ligero de controles de tema, idioma, side menu y selector oculto.
- `www/core/mobileBackCoordinator.js` concentra la lógica del botón atrás web/native y el cierre ordenado de overlays.
- `www/core/pullToRefresh.js` quedó bastante más afinado a nivel gestual y visual, con estados explícitos del icono y guardas para no repintar clasificación fuera de contexto.
- `www/components/` contiene renderizado de partidos, clasificación y detalle.
- `www/components/equipoSelector.js` queda centrado en render del selector, mientras `www/components/equipoSelectorAccordion.js` encapsula el comportamiento del acordeón animado.
- `www/services.js` concentra acceso a datos remotos, el unwrap de respuestas legacy y el bus local de eventos de partido.
- `www/servicesCompetitionCatalog.js` encapsula el catálogo Loyola de competiciones, cachés y agregación de equipos.
- `www/servicesShared.js` centraliza constantes compartidas de transporte legacy.
- `www/components/clasificacion.js` ahora enriquece la tabla con racha reciente, escudos y layout compacto responsive.
- `www/utils/helpers.js` centraliza ahora el comparador cronológico real de partidos (`fecha + hora`, con fallback) reutilizado por partidos y clasificación.
- `www/styles/components-partido-detalle.css` contiene el estilo del detalle compartido y la subvista de equipo.
- `.copilot/` se usa como memoria técnica viva del repo, especialmente para resumir decisiones visuales y estructurales de la fase Loyola.

## Estado actual del detalle compartido

El detalle ha pasado de ser un archivo monolítico centrado en partidos a una estructura más separada y reutilizable, manteniendo la UX estable durante el refactor.

### Módulos actuales del detalle

- `www/components/partidoDetalle.js`
  - coordinador principal del modal compartido
  - navegación interna entre equipo, partido y jugador
  - transición entre subviews
  - coordinación de SignalR y ciclo de vida del modal
- `www/components/detalleModalShell.js`
  - shell compartido del detalle
- `www/components/equipoDetalle.js`
  - render de resumen y lista de partidos del equipo
- `www/components/equipoDetalleSubview.js`
  - subvista integrada del detalle de equipo dentro del modal compartido
- `www/components/partidoDetalleJugadorSubview.js`
  - render de la subvista de jugador
  - hidratación de estadísticas del jugador
- `www/components/partidoDetallePlayerLinks.js`
  - binding de clics/enlaces que abren la subvista de jugador
- `www/components/partidoDetalleRenderCoordinator.js`
  - coordinación del render principal del modal de detalle
- `www/components/partidoDetalleUtils.js`
  - utilidades base y estado
- `www/components/partidoDetalleAlineaciones.js`
  - render de alineaciones
- `www/components/partidoDetalleEventos.js`
  - render de eventos
- `www/components/partidoDetalleJugadorStats.js`
  - parser de stats, foto, chips, timeline y render histórico del jugador
- `www/components/partidoDetalleJugadorData.js`
  - resolución de jugador y eventos asociados
- `www/components/partidoDetalleJugadorView.js`
  - cabecera compacta de jugador
- `www/components/partidoDetalleRender.js`
  - render base del partido, skeletons, resumen y penaltis
- `www/components/partidoDetalleState.js`
  - actualización de estado del detalle

## Decisiones recientes importantes

- Se detectó y corrigió un bug importante de runtime mixto: Android nativo debía seguir llamando directo al ASMX legacy, pero `GetCompeticiones` se estaba escapando por Cloudflare porque `getLoyolaCompetitionCatalog()` usaba `getAppApiUrl()` y esa función forzaba `pages.dev` en nativo. Se corrigió para respetar `getLegacyApiMode()` también en la carga del catálogo.
- Se eliminó una doble petición concurrente a `GetCompeticiones` provocada por `cargarSelectorEquiposLoyola()` al invocar a la vez `getEquiposLoyolaTodasCompeticiones()` y `getLoyolaCompetitionCatalog()` aunque la primera ya dependía internamente de la segunda.
- El selector inicial ahora diferencia mejor entre error de carga real y lista vacía, evitando enseñar “no hay equipos” cuando en realidad ha fallado la API.
- En el backend web de Cloudflare, el acceso a `caches.default` pasó a ser best-effort para evitar que un fallo de caché derribe el Worker.

- Se decidió mantener la app Android y añadir web pública, no convertir el proyecto en web-only.
- La política de runtime quedó centralizada en `www/config/runtime.js` para evitar checks dispersos por plataforma.
- En web, el frontend debe hablar solo con `/api/*` y `/signalr/*`; Android puede seguir usando acceso legacy directo.
- El proxy API de Cloudflare quedó con allowlist cerrada para no exponer un open proxy.
- El proxy SignalR tuvo que ampliarse a toda la superficie `/signalr/*`, no solo `/signalr/hubs`.
- Se detectó un bug de Cloudflare cache con POST y se resolvió usando una cache key GET sintética derivada del body.
- El detalle de partido necesitó una corrección específica: si `getPartido()` llega vacío al principio, la UI no debe fijar demasiado pronto el estado de "no data", porque luego pueden llegar datos válidos por estadísticas o realtime.
- El refactor del detalle de jugador se rehízo de forma conservadora, en cortes pequeños y validados uno a uno.
- La siguiente fase de refactor se amplió a `services.js`, `core/main.js` y `core/init.js`, priorizando fronteras seguras, menos complejidad cognitiva y sustitución progresiva de `window` por `globalThis` cuando procede.
- La clasificación recibió una pasada fuerte de UX inspirada en la referencia del usuario: columna de posición compacta con caret encima, bloque de equipo con escudo y racha de 5 partidos, scroll horizontal con columnas sticky y ajuste agresivo de densidad para móvil.
- Se detectó y corrigió un bug funcional en el orden cronológico real: la lista de partidos y la racha de clasificación no debían confiar en `Orden` cuando había aplazados, sino en `Fecha` + `Hora` reprogramadas con desempate estable.
- Durante esa corrección apareció un segundo bug en clasificación: la racha se estaba invirtiendo visualmente al hacer `reverse()` tras quedarse con los últimos 5, y además hubo que robustecer el cruce entre `IdEquipo` e `IdEquipoComp` para no perder resultados según la competición.
- Se rehízo y pulió el `pull-to-refresh` con sensación de apertura entre capas, resistencia inicial, estados visuales más claros (`Sigue tirando`, `Suelta`, `Actualizando`), caret/spinner explícitos y mejor lectura en claro/oscuro.
- Se corrigió la convivencia entre `pull-to-refresh` y la tabla horizontal de clasificación: no debe dispararse por gestos laterales dominantes, pero tampoco bloquear el scroll vertical normal sobre la tabla.
- Se corrigieron varias carreras de navegación: al cambiar de clasificación a partidos, ninguna carga asíncrona tardía de clasificación debe volver a pintar la vista si la pestaña activa ya no es clasificación.
- Se abortó una extracción demasiado agresiva porque rompía visualmente la subvista de jugador.
- La frontera segura comprobada ha sido:
  - helpers de stats
  - resolución de datos de jugador
  - helpers de presentación de jugador
  - cabecera de jugador
  - render base del partido
  - resumen y penaltis
  - actualización de estado del detalle
  - render coordinado del modal
  - subvista de jugador e hidratación asociada
  - enlaces que disparan navegación interna a jugador
  - bootstrap de UI en `core/init.js`
  - coordinador de botón atrás web/native
  - catálogo Loyola de competiciones separado del transporte general
- La parte que queda más pegada al coordinador principal es:
  - `renderJugadorSubview`
  - `hydrateJugadorStats`
  - transiciones del modal
  - binding de acordeones
  - carga inicial y subscripción al hub
  - la retirada final de la vía antigua de `equipoDetalleModal.js` si ya no queda uso real

## Calidad y tooling

- Se añadió `eslint.config.js`.
- Existe script `npm run lint` en `package.json`.
- El lint quedó limpio durante esta fase.
- Se añadió y extendió JSDoc útil en varios módulos clave.

## Git y ficheros generados

- `dist/` no debe versionarse.
- `.wrangler/` no debe versionarse.
- Los temporales tipo `tmp_*.js` tampoco deben versionarse.
- `.gitignore` se corrigió y restauró tras un cambio accidental demasiado agresivo.
- `package-lock.json` sigue ignorado por decisión actual del repo.

## Riesgos y límites actuales

- Sigue habiendo mezcla entre arquitectura moderna y globals legacy, sobre todo en SignalR.
- `partidoDetalle.js` sigue siendo el núcleo delicado: cualquier corte adicional debe justificarse bien.
- No conviene tocar de golpe navegación, hidratación y transición del detalle de jugador.

## Estado general del proyecto

La base está claramente más sana que al inicio de esta fase:

- detalle de jugador funcional y estable
- botón atrás Android integrado
- shell/skeleton del detalle suavizado
- lint limpio
- build web validada tras cada extracción importante
- las tablas de clasificación quedaron ya con scroll horizontal táctil real mediante `.clas-table-wrap`, evitando recortes silenciosos de columnas finales como GC y DG
- la lista de partidos ya recoloca correctamente los aplazados según su nueva fecha/hora real
- la racha de clasificación ya usa orden cronológico real y mantiene el sentido temporal correcto al pintar los últimos 5
- el `pull-to-refresh` quedó bastante más pulido visualmente y ya no compite con el scroll horizontal de clasificación ni repinta vistas obsoletas al navegar
- README y memoria técnica actualizados
- módulos del detalle ya mucho mejor separados
- onboarding real para primera selección de equipo
- selector Loyola reutilizable desde side menu en overlay independiente
- agrupación de competiciones en ligas y torneos con acordeón exclusivo animado
- `init.js` y `equipoSelector.js` reducidos mediante extracción de flujo y helpers
- SPA pública desplegada con éxito en Cloudflare Pages
- proxy API y SignalR operativos para runtime web
- soporte PWA/iPhone mejorado con metadatos Apple y `apple-touch-icon`
- corregido el solape de la última tarjeta de partidos con la bottom nav en iPhone
- detalle de equipo funcional dentro del modal compartido, accesible desde clasificación y desde tarjetas de partidos
- navegación funcional `clasificación -> equipo -> partido -> jugador -> partido -> equipo` con back consistente
- detalle de equipo con escudo en cabecera y resumen capaz de reconstruir agregados desde calendario cuando la entrada no viene enriquecida desde clasificación

## Cambios recientes del selector Loyola

- Se añadió un selector reutilizable de equipo con dos modos:
  - onboarding de primera entrada
  - overlay lanzado desde side menu
- El side menu ya no incrusta el selector completo: muestra resumen del equipo seguido y CTA para cambiar.
- El overlay del selector tiene cabecera sticky con cierre siempre visible.
- Las competiciones se agrupan en `Ligas` y `Torneos` usando heurística por nombre (`liga`).
- El acordeón del selector se rehízo con animación real de altura/opacidad, caret sincronizado, scroll guiado y exclusividad entre secciones.
- Se corrigieron bugs de primera selección, incluyendo:
  - ocultación total de footer/header/pull-to-refresh en onboarding
  - spinner limpio durante la transición inicial
  - actualización inmediata del resumen del side menu tras la primera selección
- Se eliminó un `@ts-ignore` en `www/i18n.js` mediante tipado JSDoc más preciso.

## Fase visual Loyola

- Se tomó el mock/sidebar Loyola como referencia principal de identidad visual para claro y oscuro.
- Se rediseñó el side menu para acercarlo al lenguaje editorial Loyola, limpiando controles antiguos y simplificando especialmente selector de tema e idioma.
- La paleta global de la app se alineó con el side menu Loyola: marfil y carbón como bases, rojo Loyola como primario y superficies menos azuladas en oscuro.
- Se redujo agresividad tipográfica en varias vistas para depender menos de pesos 800/900 y más de tamaño, color y espaciado.
- Header, `main`, `#screenContent` y bottom nav quedaron visualmente integrados con el mismo color base del shell por tema, evitando una app demasiado modular o parcheada.
- El header pasó a usar escudos Loyola reales por tema y una composición más asentada.
- Las tarjetas de partidos dejaron de sentirse como cajas flotantes y pasaron a una lógica de lista editorial fundida con separadores finos y acentos internos.
- La ubicación del partido subió al header de tarjeta como acción compacta junto al calendario, usando SVG externos (`map-pin.svg`, `calendar-plus.svg`).
- La clasificación se empezó a desacoplar de la semántica heredada de partidos:
  - los grupos del acordeón ya no se renderizan como `li`, sino como `div.clas-accordion-item.clas-accordion`
  - el loading state de clasificación también usa `clas-accordion-item`
  - se eliminaron dependencias como `#matches li.clas-card` en la base de estilos
- Los assets Loyola de trabajo viven en `www/assets/sidebar-loyola/...` como fuente única editable.
- `vite.config.js` incorpora un plugin inline que copia automáticamente esa carpeta a `dist/assets/sidebar-loyola/...` al final del build, para que Capacitor/APK reciba los mismos archivos sin mantener duplicado manual en `www/public/...`.
- La X del side menu y los decoradores inferiores se rehicieron como capas absolutas ancladas al contenedor correcto para que fueran robustos en APK/móvil real.
- En `www/components/equipoSelectorLauncher.js` se introdujeron constantes para centralizar las rutas del escudo Loyola claro/oscuro.
- Commits importantes de esta fase:
  - `6e87676` `Redesign Loyola sidebar UI and theme controls`
  - `d1b1115` `Clean up Loyola sidebar styles`
  - `eacc28c` `Align app theme palette with Loyola sidebar`
  - `1cce185` `Refine typography across match views`
  - `7323117` `Integrate Loyola shell and match card styling`
  - `5530e24` `Refactor Loyola visual styling cleanup`
  - `87d37d2` `Polish Loyola sidebar and standings integration`
  - `9eedd25` `Refine Loyola asset references and standings loading state`

## Cambios recientes de la fase 1.7.0

- Se rehízo la identidad visual del selector de equipo Loyola tanto en onboarding inicial como en overlay de cambio, buscando una composición más integrada con el fondo y menos dependiente de cards flotantes.
- El onboarding pasó a usar el título en la cabecera principal (`ELIGE TU EQUIPO`) y una introducción traducida dentro del contenido, evitando duplicidad de hero.
- El skeleton/loading del selector se alineó con la estructura real del acordeón, manteniendo el mismo layout y esqueletonizando solo count y tarjetas internas.
- Se desactivó el pull-to-refresh durante el onboarding del selector para evitar estados intermedios rotos.
- El launcher del side menu conserva siempre la identidad Loyola aunque no haya equipo seleccionado.
- Durante onboarding, pulsar `Elegir equipo` desde el side menu ya no abre un overlay encima de la selección inicial, sino que cierra el menú y deja la vista ya visible.
- Se hizo una pasada amplia de retheme claro/oscuro en detalle de equipo, detalle de partido y stats/ficha de jugador.
- Se desactivó el acceso al detalle de cuerpo técnico en alineaciones porque esa ficha seguía rota.
- Se unificó la lógica de acordeones sobre un componente compartido (`www/components/accordion.js`) y se migraron selector de equipo, stats de jugador y clasificación al patrón común basado en `details/summary`.
- Clasificación y stats de jugador se acercaron visualmente a la piel del selector de equipo, compartiendo paleta, redondeo, spacing y comportamiento.
- Se extrajeron tokens globales de acordeón en `www/styles/theme.css`, tanto de color como de geometría, para reducir duplicación entre selector, clasificación y stats.
- Se detectaron y corrigieron dos bugs de scoping de tema claro: primero en clasificación y después en el selector de cambio de equipo, ambos causados por variables visuales definidas de forma demasiado global frente a `body[data-theme="light"]` / `body[data-theme="dark"]`.
- Se hizo una limpieza conservadora final eliminando variables y overrides visuales ya redundantes tras la convergencia de acordeones.

## Recomendación de trabajo siguiente

1. Probar la web pública en más iPhone/iPad y validar instalación real como webapp desde pantalla de inicio.
2. Preparar un icono iOS específico con más margen visual para evitar recorte feo en el icono de pantalla de inicio.
3. Revisar si conviene optimizar la carga inicial para reducir fan-out de `GetParametrosCompeticion`.
4. Revisar si existe en la API algún campo aún más fiable que `Fecha` + `Hora` para distinguir fecha original frente a fecha reprogramada en todos los calendarios legacy.
5. Validar el `pull-to-refresh` en más móviles reales para afinar sensaciones del umbral, resistencia y transición visual entre claro/oscuro.
6. Seguir reduciendo `partidoDetalle.js` solo si aparece otra frontera realmente clara.
7. Si no, priorizar limpieza, JSDoc y endurecimiento técnico sobre más fragmentación.
8. Mantener validación visual real después de cada iteración del detalle.
9. Retirar la vía antigua de `equipoDetalleModal.js` si ya no se necesita en ningún flujo.
