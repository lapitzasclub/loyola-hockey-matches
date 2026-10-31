# Roadmap v2 — Loyola Hockey Matches

> Documento vivo. Las sesiones de trabajo, su modelo, esfuerzo y prompt inicial están en
> [`roadmap.json`](./roadmap.json). Un hook de Claude Code (`.claude/hooks/roadmap.mjs`) avisa al
> empezar cada sesión de cuál toca y, cuando una se marca como terminada, de cuál es la siguiente.

## 1. Por qué una v2

La v1 empezó como una app sencilla en JS plano y hoy tiene ~21k líneas en 66 módulos: calendario,
clasificaciones por grupo, detalle de equipo, detalle de partido con directo, jugador, estadísticas
y rankings, dos idiomas, dos runtimes (Android y PWA). Los dolores recurrentes son de
infraestructura, no de negocio:

- Navegación, back button, pull-to-refresh y overlays reimplementados a mano y frágiles en el APK.
- La capa de datos traduce la API nueva de DigitalSport a la *forma legacy* del ASMX muerto,
  así que cada pantalla razona sobre un modelo que ya no existe.
- Sin tipos ni validación: los cambios de forma de la API se descubren en producción.
- CSS monolítico (`components-partido-detalle.css` ~2.500 líneas).

## 2. Restricciones (no negociables)

1. **Coste cero.** Nada de cuenta de Apple, EAS de pago ni servicios con tarjeta. Cloudflare free
   tier, GitHub, Google Play ya pagado.
2. **iPhone = PWA instalable.** La web *es* el producto de iOS y tiene que sentirse nativa
   (swipe-back, safe areas, standalone, push de iOS 16.4+).
3. **Android = Capacitor**, conservando `appId` `com.loyola.hockeymatches` y la keystore para que
   la v2 se instale como actualización de la v1.
4. **Efecto wow**: transiciones compartidas, microanimaciones, sensación de app nativa.
5. Política de red dual-target: Android habla directo con `fvpatinaje.eus`; la web pasa por
   el proxy de Cloudflare (CORS). Nunca hosts externos directos desde el runtime web.

## 3. Stack decidido (2026-10-30)

| Pieza | Elección | Por qué |
|---|---|---|
| Lenguaje | TypeScript `strict` | El dominio (estados, incidencias, roles) es rico y la API cambia de forma. |
| UI | **React 19** | Mejor ecosistema para animación (Motion nació aquí), TanStack, librerías. |
| Build | Vite | Rápido, ya conocido, soporta PWA y Capacitor sin fricción. |
| Shell móvil | **Ionic React** | Pila de navegación con swipe-back iOS en la PWA, tabs, modales/sheets, refresher, back button de Capacitor resueltos de fábrica. |
| Datos | **TanStack Query** + persistencia (IndexedDB) | Caché, stale-while-revalidate, reintentos, offline e invalidación desde el directo. |
| Validación | **Zod** | Esquemas = contrato de la API; modelo de dominio propio, no la forma legacy. |
| Directo | `centrifuge` → `queryClient.setQueryData/invalidateQueries` | El directo actualiza la caché; las pantallas no saben que existe. |
| Animación | `navAnimation` de Ionic + FLIP propio (`app/transicionPagina.ts`) y CSS | Revisado en S09: sin Motion ni View Transitions, porque no siguen al gesto de volver de Ionic (ver §6, S09). |
| i18n | i18next + react-i18next (es/eu) | Estándar, pluralización, carga por namespace. |
| Gráficas | **SVG propio** (`features/jugador/GraficaPartidos.tsx`) con `React.lazy` | La única gráfica son barras agrupadas partido a partido (dos series). chart.js pesaba ~180 KB en la v1 para eso; un SVG de ~100 líneas no añade dependencia, hereda los tokens de tema y es accesible (`role="img"` + descripción). Se carga en diferido al abrir una competición con ≥2 partidos. Si algún día hacen falta ejes, zoom o tooltips, reevaluar uPlot/visx. |
| Backend | Cloudflare Worker + **Hono** (Pages Functions o Worker con assets) | Proxy allowlist tipado, caché en el edge, base para push. |
| Push | Web Push (VAPID) + FCM en Android, Durable Object para el fan-out | Gratis en ambos. Fase 6. |
| Tests | Vitest con fixtures reales + Testing Library + Playwright (WebKit y Chromium móvil) | WebKit ≈ Safari de iPhone. |
| Calidad | ESLint flat + typescript-eslint, Prettier | |

Descartado: **Expo/React Native** (react-native-web daría peor PWA en iPhone, que es el único iOS
posible a coste cero) y **Vue** (sin ventaja técnica frente a React para este caso; Motion y
TanStack son React-first).

## 4. Arquitectura destino

```
src/
  app/            # bootstrap, router (IonReactRouter), providers, tema
  domain/         # tipos y reglas puras: Partido, Incidencia, Clasificación… (sin React, sin fetch)
  api/            # cliente HTTP dual-target, esquemas Zod, mappers API→dominio, fixtures
  queries/        # hooks TanStack Query (query keys centralizadas)
  live/           # Centrifugo: conexión, suscripciones, reducer de eventos → caché
  features/       # una carpeta por pantalla: partidos/, clasificacion/, equipo/, partido/, jugador/, estadisticas/
  ui/             # componentes de diseño compartidos (Escudo, Marcador, Skeleton, Tabs…)
  i18n/           # es.json, eu.json
  styles/         # tokens (CSS custom properties), tema claro/oscuro
worker/           # Hono: proxy allowlist + caché + (F6) push
tests/            # e2e Playwright
```

Reglas:
- `domain/` no importa nada de React ni de red. Toda la lógica con trampas vive ahí con tests.
- Las pantallas solo consumen hooks de `queries/`. Nunca `fetch` en componentes.
- Un único punto decide el transporte (directo vs proxy): `api/transport.ts`.
- Animar solo `transform` y `opacity`. Respetar `prefers-reduced-motion`.

## 5. Trampas conocidas de la API (deben tener test en F1)

- `resultado` vale `GOL | NO_GOL | PENDIENTE`: comparar `=== 'GOL'`, nunca `includes`.
- Dos vocabularios de estado: agenda `PROGRAMADO|EN_JUEGO|FINALIZADO`; árbol y detalle
  `SCHEDULED|FINISHED` (+ posible `IN_PROGRESS`/`PROGRESS`).
- `periodo: 30` ⇒ finalizado; `1..29` en juego; `periodo <= 0` en `/marcadores` = no empezado
  (ignorar, si no se pinta "en juego 0-0").
- El `estado` del detalle se queda en `PROGRAMADO` en vivo; el marcador en vivo se cuenta con
  incidencias `GOL` por `equipoId` (el `puntaje` viene null en vivo).
- `puntaje` llega como float (`3.0`).
- Roles: `PORTERO, JUGADOR, ENTRENADOR, ENTRENADOR2, DELEGADO, AUXILIAR`, y `rolPosicion` vacío
  (con dorsal = jugador de pista; staff nunca lleva dorsal).
- `datosAdicionales` de clasificación es un **string JSON**.
- Ordenar partidos por `fecha + hora`, nunca por orden de jornada (aplazados).
- `FALTA-HL` lleva guion. Catálogo completo de incidencias en la memoria `new-digitalsport-api`.
- Halladas en S01 (con test en `src/api/mappers/mappers.test.ts`):
  - Dos ids por equipo: árbol y clasificación usan `inscripcionId`; agenda y `/equipos`,
    `equipoId`. En el árbol `participants[].equipoId` es null. `orden` 0 = local.
  - `golesActa` es el marcador real (== goles del acta) pero vale 0 sin jugar; `puntaje` es el
    oficial, capado en escolar.
  - La Copa (KNOCKOUT) usa `PROGRAMADO` también en el árbol, y las rondas futuras llegan con
    `participants: []`.
  - `form` de la clasificación: `D` = empate. Coincide con la racha calculada solo contra rivales
    del mismo grupo; los grupos se solapan y un equipo sale una vez por grupo.
  - Las leyendas se indexan por nombre de grupo (o `general`) y su `color` puede ser `var(...)`.
  - `/equipos` omite equipos (justo Loyola en Benjamín C y Sub15 fem).
  - `nombreDisplay` de división se repite entre competiciones: etiquetar por competición.
  - La agenda está capada a 60 días.
- Halladas en S02 (con test en `src/domain/*.test.ts` y `src/api/mappers/partido.test.ts`):
  - `PENALTI` y `FALTADIRECTA` apuntan al equipo que **defiende** (`equipoId` y `porteroId` son
    del portero) y nunca traen lanzador; el `GOL` que sale de ellos lleva el `equipoId` del rival.
    En la tanda (periodo 21) la web de la federación los pinta en la columna de su `equipoId`:
    sin datos reales aún, se sigue ese criterio (verificar con la primera tanda).
  - Códigos de periodo: 0 previa, 1..4 juego, 9 descanso (con `CAMBIO` a 0:00, va entre 1 y 2),
    11/12 prórroga, 21 penaltis, 30 final. Hay incidencias (`CAMBIO`) en el periodo 0.
  - El reloj de las incidencias va hacia **atrás** (24:59 es el principio de un periodo de 25).
  - `numeroPeriodos` vale 0 en casi todas las ligas: usar `duracionPeriodos.length`.
  - Hay actas cerradas con `puntaje` fuera de regla (10-0 con diferencia máxima 5): manda el
    `puntaje`; las reglas solo se aplican mientras es null.
  - `codigo` del `GOL` (`PENALTI`, `FALTA DIRECTA`) no siempre viene aunque haya lanzamiento.
  - Dorsales string con ceros (`"00"`, `"09"`); `""` en el staff y en algún `JUGADOR`. Tarjetas
    (amarillas) también al staff, sin dorsal. `FALTA` lleva siempre 90 s de sanción: no significa
    nada.
  - `estadisticas-jugadores` solo trae a quien ha jugado y su `equipoNombre` es la abreviatura; en
    `plantilla` es el nombre completo. La clave es `equipoId`. Las stats de jugador mandan los
    partidos del más reciente al más antiguo.
- Contrato completo: memoria del proyecto `new-digitalsport-api` y `oportunidades-api-nueva`.

## 6. Rendimiento objetivo

- Arranque en frío hoy: ~3,3 MB en ~31 requests en serie. Objetivo v2: < 400 KB de datos y
  requests en paralelo.
- `/equipos` (3,2 KB) no basta para el catálogo porque omite equipos (ver §5). Se necesita el árbol
  igualmente para el calendario; el ahorro está en paralelizar y en no pedir detalles: el marcador
  real ya viene en el árbol (`golesActa`).
- `POST /hierarchy/competiciones/divisiones` en batch.
- `/public/partidos/{id}` pesa ~121 KB: cachear agresivamente partidos finalizados (inmutables).
- Caché persistida: segunda apertura pinta al instante desde IndexedDB.

Medido en S03 con la API real (`npm run medir:arranque`, 2026-10-30):

| Arranque en frío | Requests | Bytes (sin comprimir) | gzip aprox. | Tiempo |
|---|---|---|---|---|
| v1 (algoritmo de la v1 sobre la API nueva) | 59 | 846 KB | — | 1,4 s |
| v2 catálogo (agenda `clubId` + batch + `/equipos` en paralelo, 3 rondas) | 16 | 164 KB | 22 KB | 0,7 s |
| v2 catálogo + calendario y clasificación de un equipo (Liga Norte) | 18 | 399 KB | 42 KB | 0,5 s |

- La agenda filtrada con `clubId` pesa ~120 KB frente a ~490 KB sin filtrar.
- El origen no comprime (sin `content-encoding`). En web el proxy de Cloudflare comprime hacia el
  cliente (cifras gzip); en Android directo llegan los bytes sin comprimir.
- El árbol de la división (~230 KB) solo se pide al abrir un equipo y queda en caché persistida; la
  segunda apertura no toca la red.

### Shell móvil: decisiones y hallazgos (S04)

- **Capacitor 8, targetSdk/compileSdk 36, minSdk 24.** Google Play exige targetSdk 36 desde el
  31-08-2026, y con él Android 16 ignora `windowOptOutEdgeToEdgeEnforcement`: la app es siempre
  edge-to-edge. Se usa el plugin `SystemBars` del core (`insetsHandling: "native"`) en lugar de
  `@capacitor/status-bar` y del plugin de navigation bar. Las barras son transparentes sobre la
  cabecera y la tab bar, Ionic aparta el contenido con `env(safe-area-inset-*)` y
  `app/barrasSistema.ts` solo elige iconos claros u oscuros según el fondo del tema.
- **WebView Chromium < 140** (visto en el emulador de Android 16 con WebView 133): Capacitor no
  pasa las safe areas a la web, la aparta de forma nativa y bajo las barras queda el
  `windowBackground` de Android, no la cabecera. Con el tema por defecto salía gris claro con
  iconos blancos, ilegible. `windowBackground` es `fondo_barras`, el fondo de la página en claro y
  en oscuro (`values-night`), y si el WebView es < 140 los iconos siguen al modo del sistema
  (`SystemBarsStyle.Default`, `webViewApartaDeFormaNativa`). Solo se nota el corte si se fuerza en
  la app un tema distinto al del sistema; con WebView 140 o superior las barras son transparentes
  sobre la web y no hay corte.
- **Barras fundidas, como en la v1** (S09, a petición del usuario): cabecera, tab bar, barras del
  sistema y `theme-color` llevan el mismo fondo que la página (`--app-barra-superior/-inferior`),
  sin la franja teal. En la PWA de iOS la barra de estado pasa de `black-translucent` (texto
  siempre blanco, ilegible sobre marfil) a `default`; **sin validar en iPhone real** que iOS pinte
  la barra con `theme-color`. Si no lo hace, queda blanca o negra según el sistema, casi igual al
  fondo.
- **Fuera el trust-all de certificados** de la v1 (`MainActivity`). La cadena de `fvpatinaje.eus`
  (Let's Encrypt, ISRG Root X1) es válida desde Android 7.1.1, y minSdk 24 cubre ese caso.
- **Una pila por pestaña.** Las rutas de detalle cuelgan de cada pestaña
  (`/clasificacion/equipo/…`, `/partidos/partido/…`, `ui/rutas.ts`), así que back y swipe nunca
  saltan de pestaña y cada pestaña conserva su pila al volver a ella.
- **Back de Android** (`app/botonAtras.ts`): primero cierra modales y hojas (prioridad 100 de
  Ionic), luego vuelve dentro de la pila de la pestaña (con `defaultHref` a su raíz si se entró
  por enlace), después va de la raíz de otra pestaña a Partidos y, desde la raíz de Partidos, sale.
  No se usa el historial del navegador porque mezcla pestañas.
- **Swipe-back iOS** solo en la PWA instalada. En Safari normal se desactiva, porque choca con el
  gesto propio de Safari y deja la vista a medias.
- **Pull-to-refresh**: `Pagina` lleva el `IonRefresher` y `useRefrescar(...claves)` invalida las
  queries de la vista. El spinner espera al refetch.
- **Tema** `sistema | claro | oscuro` en `localStorage` (`loyola.tema`), con tokens bajo
  `body[data-theme]` (`styles/tema.css`). Se aplica antes del primer render para que no parpadee y
  actualiza `theme-color`. El **idioma** se guarda en `loyola.idioma` y `<html lang>` lo sigue.
- **Splash** con `@capacitor/splash-screen`: se oculta en cuanto se restaura la caché persistida,
  con un tope de 3 s.

Validación en dispositivo real:

| Plataforma | Dispositivo | Versión | Back / swipe | Pull-to-refresh | Tema e idioma | Notas |
|---|---|---|---|---|---|---|
| Android (APK, emulador) | AVD Pixel `sdk_gphone64_x86_64` | Android 16 (API 36), WebView 133 | ✅ back: action sheet → hoja → jugador → partido → equipo → Clasificación → Partidos → sale; la pila se conserva al cambiar de pestaña | ✅ vuelve a pedir `/public/agenda` directo a fvpatinaje.eus | ✅ oscuro + euskera tras force-stop | Datos reales sin trust-all; barras corregidas para WebView < 140 |
| iPhone (PWA instalada) | ❌ sin dispositivo | — | ⚠️ solo e2e WebKit (Playwright, iPhone emulado) | ⚠️ solo e2e WebKit | ⚠️ solo e2e WebKit | Preview en `v2.loyola-hockey-matches.pages.dev` (proxy `/api`, manifest y meta de iOS comprobados). Swipe-back, safe areas con notch/Dynamic Island y standalone **sin validar en iPhone real**: se acepta el riesgo y se revisa en cuanto haya uno |

Hallazgo pendiente: en arranque en frío la web pide `/public/agenda` dos veces, una por `consultas.agenda` (Partidos) y otra dentro de `consultas.catalogo`. El edge la cachea 120 s, así que no cuesta cuota; se puede unificar haciendo que el catálogo reutilice la consulta de la agenda (`fetchQuery`).

### Selector y partidos: decisiones y hallazgos (S05)

- **Equipo elegido** = `claveEquipo` (`${division.id}|${NOMBRE.trim().toUpperCase()}`), en
  `localStorage` (`loyola.equipo`) vía `useEquipoElegido` (`useSyncExternalStore`). No se usan los
  ids de la API: hay dos (`inscripcionId` y `equipoId`) y no son estables entre vistas.
- **Selector** en `IonModal`, agrupado por `division.categoria` (Prebenjamín → Senior, sin
  diacríticos, desconocidas al final). La API trae la categoría por división, así que Benjamín sale
  como tres grupos (A, B, C). En lugar del acordeón de la v1, lista plana por grupo con escudo.
- **Orden** por `fecha` + `hora`, nunca por jornada. Agrupado por mes; el próximo partido se
  resalta y se centra una sola vez por equipo (`requestAnimationFrame`: al montarse, `ion-content`
  aún no tiene scroll).
- **«Aplazado» no existe en la API.** Se deduce de `programado` con fecha pasada: hasta 3 días
  (`DIAS_PARA_APLAZADO`) se muestra «Pendiente» (el acta puede tardar) y pasado ese margen,
  «Aplazado». Si `/marcadores` trae el partido `en_juego` o `finalizado`, manda sobre el árbol.
  **Por verificar con datos reales tras un fin de semana de partidos**: si `/marcadores` conserva
  los partidos recién terminados.
- **`useMarcadores(enDirecto)`** repite cada 30 s solo si el equipo juega hoy; el directo real
  (Centrifugo) llega en S10.
- **Marcador** = `golesActa`; si el oficial (`puntaje`) difiere, se muestra debajo.
- **e2e y servidor de desarrollo**: `reuseExistingServer` reutiliza cualquier servidor en el 5173,
  también `npm start`, y los tests fallan contra él. Pararlo antes de `npm run e2e`.
- No incluido (fuera de S05): pulsar un equipo desde la tarjeta, añadir al calendario, enlace al
  mapa de la pista.

Validación:

| Plataforma | Selector y calendario | Persistencia | Pull-to-refresh |
|---|---|---|---|
| Android (APK, emulador Android 16) | ✅ onboarding, selector agrupado, tarjetas, próximo resaltado | ✅ force-stop y reapertura conservan el equipo | ⚠️ el gesto de `adb` mueve la lista pero no se vio el spinner (datos en caché); la recarga se comprueba en e2e lanzando `ionRefresh` y ya se vio en dispositivo en S04 |
| iPhone (PWA) | ⚠️ solo e2e WebKit | ⚠️ solo e2e WebKit | ⚠️ solo e2e WebKit; **sin validar en iPhone real** (mismo riesgo aceptado que en S04) |

### Clasificación y equipo: decisiones y hallazgos (S06)

- **Racha en el dominio** (`rachasDeTabla`, `PARTIDOS_RACHA = 5`): sale de los partidos con el
  resultado oficial (`marcadorOficial`), no del `form` de la federación. En tablas por grupo solo
  cuentan los partidos entre miembros del grupo. Orden por `fecha` + `hora`.
- **Fase del equipo** (`faseDelEquipo`): el resumen usa la fase donde juega el equipo ese día; la
  pantalla de clasificación abre en `faseInicial`.
- **Dos ids por equipo**: la tabla y el árbol usan `inscripcionId`; agenda, `/equipos` y plantilla
  usan `equipoId`. `/equipos` omite algunos equipos del Loyola: `completarEquipo` rellena el
  `equipoId` por nombre desde `/equipos` y el catálogo. Sin `equipoId` no hay plantilla.
- **Hub de alineaciones**: la v1 no lo definía. Se interpreta como la alineación del último partido
  jugado (en línea) más la lista de partidos jugados, del más reciente al más antiguo. El cuerpo
  técnico no tiene ficha y no enlaza.
- **Nombres de transición** (S09): solo como atributos `data-transicion` (`escudo-<inscripcionId>`,
  `nombre-<inscripcionId>`) vía `ui/transiciones.ts`; no se anima nada todavía.
- **Estilo** sin paneles: filas con separador fino, sin bordes ni sombras. La cabecera con el
  equipo elegido y las barras del sistema integradas con el fondo (estilo v1) quedan para una
  tarea aparte tras S06. Las barras fundidas se hicieron en S09 (ver S04).
- **`ion-router-link` y la maquetación**: pinta un `<a>` en su shadow DOM, así que una rejilla o
  flex puesta en el propio enlace colapsa los hijos en la primera columna (la racha salía con
  ancho 0). La maquetación va en un hijo (`clasif__interior`, `persona__interior`). jsdom no lo
  detecta; lo cazó el e2e.
- **`IonSegment` en jsdom**: `onIonChange` no actualiza el estado en jsdom (el wrapper de Stencil
  no recibe el evento). El cambio de sección y el filtro de partidos se prueban en Playwright
  (`tests/e2e/equipo.spec.ts`); en Vitest las secciones se renderizan directamente.
- **Pila de navegación y e2e**: las páginas de debajo siguen en el DOM; los selectores deben
  acotarse a la página (`page-partido`, `hoja-info-partido`…).

### Capa wow: decisiones y hallazgos (S09)

- **Transición compartida sin Motion ni View Transitions.** `layoutId` de Motion necesita que
  origen y destino vivan en el mismo árbol de React, y Ionic monta cada página aparte y anima con
  su propio motor. View Transitions congela la página mientras dura, no sigue al gesto de volver
  y depende de la versión de Safari. Se usa la `navAnimation` del router: la de iOS de Ionic más
  clones FLIP de los elementos con el mismo `data-transicion` (`ui/transiciones.ts`), como hijos
  de la animación de página. Heredan duración y curva, y el swipe-back los arrastra con el dedo.
  La geometría (`app/vuelo.ts`) es pura y tiene tests.
- **Qué vuela**: escudo y nombre de equipo (tabla → cabecera del equipo) y escudos, nombres y
  marcador (tarjeta → cabecera del partido). Solo se emparejan los elementos que se ven enteros, y
  si un nombre se repite manda el que está dentro del enlace pulsado (al volver, el enlace desde el
  que se abrió). Los escudos vuelan como caja y los textos cruzan dos clones con la escala de la
  fuente.
- **Destino al instante**: el detalle de partido pinta una cabecera previa con lo que enseñaba la
  tarjeta (`ui/tarjetaPulsada.ts`), así el vuelo tiene adónde ir aunque el acta tarde. Los
  originales se ocultan **por nombre** y no por nodo: si la cabecera real sustituye a la previa a
  mitad del vuelo, el nodo nuevo también queda bajo su clon.
- **Cabecera que se pliega**: `Pagina` escribe `--pliegue` (0–1) en los `[data-plegable]` con el
  scroll y el CSS traduce ese valor a `transform` y `opacity`. En la barra, el título deja paso a
  lo esencial del cruce (escudos y marcador u hora). Con movimiento reducido pasa de 0 a 1 de
  golpe.
- **Pastilla del segmento**: sustituye al indicador de Ionic (que salta de botón en botón) y sigue
  el desplazamiento de la fila de paneles (`ui/pastilla.ts`). De paso, `.segmento` lleva
  `width: auto`, porque el `width: 100%` de Ionic más el margen lo sacaba 24 px de la pantalla.
- **Skeleton → contenido** (`Revelado`): solo si la consulta estuvo pendiente; con datos de caché
  no anima. En el detalle de partido solo entran las pestañas, porque la cabecera previa ya ocupa
  el sitio.
- **Marcador que late** (`Cifra`) solo cuando cambia con la pantalla abierta, nunca al montarse.
  **EN JUEGO** con una onda desde el punto y **racha** con los puntos escalonados.
- **Confeti** una vez por partido: victoria del Loyola (`ganaLoyola`, que excluye los partidos
  entre dos equipos del club) vista por primera vez o que termina con la pantalla abierta. Sale
  cuando acaba la transición, se apunta en `loyola.celebrados` (últimos 50) y con movimiento
  reducido ni se pinta ni se gasta.
- **`prefers-reduced-motion` al final de `componentes.css`**: en mitad del archivo quedaba antes
  de la animación del punto de EN JUEGO y no la anulaba. Lo cazó el e2e que comprueba que no
  queda ninguna animación CSS. Sin animaciones, la navegación es un fundido de 200 ms.
- **e2e con animaciones**: mientras algo se mueve, Playwright reintenta el toque desplazando la
  página y eso plegaba la cabecera antes de tiempo. Hay que esperar a `getAnimations()` antes de
  tocar. Para medir la pastilla a mitad de gesto se quita el `scroll-snap` de la fila.
- **Barras fundidas** con el fondo, a petición del usuario: ver S04.

Validación:

| Criterio | Android (APK, emulador Android 16, WebView 133) | iPhone (PWA) |
|---|---|---|
| Transiciones compartidas | ✅ tabla → equipo y tarjeta → partido, ida y vuelta (grabado y revisado fotograma a fotograma) | ⚠️ solo e2e WebKit; **sin validar en iPhone real** (swipe-back con vuelo incluido) |
| Sin jank | ✅ `dumpsys gfxinfo` sin S09 frente a con S09 en el mismo recorrido: 10,5 % frente a 9,9–11,8 % de frames lentos, p50 24 frente a 23 ms y p95 46 frente a 48 ms. S09 no añade jank. ⚠️ El emulador va limitado por la GPU del PC: las cifras absolutas no son las de un Android de gama media, que está **sin medir en dispositivo real** | — |
| `prefers-reduced-motion` | ✅ «Quitar animaciones» del sistema llega al WebView como `reduce` (comprobado por CDP); el comportamiento está cubierto en e2e (sin vuelos, sin animaciones CSS, sin confeti) | ⚠️ solo e2e WebKit |

### Directo: decisiones y hallazgos (S10)

- **`src/live/`**: `conexion.ts` abre Centrifugo con la config de `/api/auth/config`, el token
  público y un sub-token por canal `acta_${id}`. `gestor.ts` sigue los partidos cuyo detalle está en
  la caché y que `seguirEnDirecto` da por vivos hoy, se suscribe al montarse la query y se da de baja
  al quedar sin observadores (test de navegación: sin fugas). Con la app oculta o sin partidos que
  seguir, el WebSocket se cierra tras una espera; al volver se reabre y se pide el detalle.
- **Reducer puro** (`reducer.ts`): aplica `incidencia_creada`, `incidencia_eliminada`,
  `periodo_actualizado`, `crono`, `acta_cerrada`, `acta_reabierta` y `alineacion_actualizada` al
  detalle. Lo que el mensaje no basta para reconstruir (alineación nueva, resultado oficial al
  cerrar, alguien fuera de la alineación) se marca para pedir el detalle, en ráfaga; sobre la
  respuesta se vuelven a aplicar los mensajes de los 2 s previos a pedirla. `firma_guardada` y
  `atleta_verificado` no tienen efecto.
- **Grabaciones reales**: `npm run directo:grabar -- <carpeta> [minutos]` guarda los frames tal cual
  y el detalle REST tras cada ráfaga; `npm run directo:fixtures -- <carpeta> <clave>=<id>` saca
  `src/live/fixtures/`. `reducer.grabado.test.ts` reproduce dos partidos del 2026-10-31 (LOY A–VOT y
  uno con 7 incidencias eliminadas) y comprueba que el reducer llega al mismo estado, periodo,
  incidencias y goles que la API en cada detalle grabado.
- **Mensajes vistos el 2026-10-31** (57 partidos, 12 h): además de los documentados llega `crono`
  (`periodo`, `min`, `sec`, `enMarcha`) cada pocos segundos con el reloj en marcha; es el que mueve
  el reloj del periodo. `acta_reabierta` no apareció.
- **Listas**: `/public/partidos/marcadores` se superpone al calendario ignorando `periodo <= 0`.
- **Web**: el WebSocket va al propio origen (`/connection/websocket`) y lo pasa Vite en desarrollo y
  `functions/connection/[[path]].js` en Cloudflare (solo esa ruta y solo con `Upgrade: websocket`).
- **Gol**: animación del marcador (solo `transform`/`opacity`, sin ella con movimiento reducido) y,
  en Android, vibración con `@capacitor/haptics`.
- **Pendiente para S11 (worker)**: el proxy de Pages cachea `/api/public/*` 120 s en el edge. En web,
  el detalle que el directo pide tras `acta_cerrada` o una alineación nueva puede llegar con hasta
  2 minutos de retraso (el marcador no, que lo pone el reducer). El worker debe no cachear, o cachear
  segundos, el detalle de partidos de hoy no finalizados y `marcadores`.

### Aspecto de Android: modo `md` (tras S09)

A petición del usuario («el estilo de navegación y esos botones de atrás se me asemejan a iOS»),
Android deja el modo `ios` de Ionic. iPhone y web siguen en `ios`.

- **Un solo punto decide**: `ui/plataforma.ts` (`modoIonic()`): `md` si `isPlatform('android')`
  (la app y el navegador de Android), `ios` en el resto. Lo usan `setupIonicReact` y `Pagina`.
- **Qué cambia en Android**:
  - atrás es solo la flecha, con `aria-label` «Atrás»;
  - el título va a la izquierda, y también la versión compacta de la cabecera plegada;
  - la transición de página es la de Android (`mdTransitionAnimation`), con los mismos vuelos FLIP;
  - pulsación con ripple y tab bar de Material.
- **Swipe-back solo en `ios`**: el router lo activa si `swipeBackEnabled` es `true`, sea cual sea
  el modo. En Android atrás es el gesto del sistema.
- **Se mantiene el estilo fundido**: sin la sombra de Material bajo la cabecera, que Ionic inyecta
  después de nuestro CSS (de ahí `ion-header.header-md`), y con la misma línea fina.
- **Pestañas de Android**: la pastilla pasa a ser el subrayado de 2 px. Van sin las mayúsculas ni el
  ancho mínimo de Material, porque así cuatro pestañas no cabían («ESTADÍ…»). Lo mismo para los
  botones («Cerrar»).
- **Equipo con cinco secciones**: su segmento es `scrollable` y en Android la quinta queda cortada
  en el borde, como en las pestañas desplazables de Material.
- **e2e**: el proyecto `chromium-android` (UA de Android) corre ahora en `md`. Los selectores por
  nombre accesible siguen valiendo. Un test comprueba el modo y el atrás sin texto en cada proyecto.
- Revisado en el emulador en claro y oscuro: detalle de partido y de equipo, cabecera plegada,
  hoja de ajustes y transición de ida y vuelta.

## 7. Fases

| Fase | Objetivo | Sesiones |
|---|---|---|
| F0 | Esqueleto en rama `v2` | S00 |
| F1 | Dominio y datos con tests sobre fixtures reales | S01, S02, S03 |
| F2 | Shell, navegación, tema, i18n — validado en Android real y PWA iPhone | S04 |
| F3 | Pantallas con paridad v1 | S05, S06, S07, S08 |
| F3+ | Capa wow | S09 |
| F4 | Directo | S10 |
| F5 | Worker, PWA, E2E y corte de versión | S11, S12 |
| F6 | Novedades: push de goles | S13 |

## 8. Checklist de paridad con la v1

Cada casilla se marca cuando la v2 lo hace **igual o mejor** en Android real y en PWA iPhone.

- [x] Selector de equipo Loyola (acordeón por categoría), persistido (iPhone real sin validar)
- [x] Calendario/partidos del equipo, ordenado por fecha+hora, marcador real y badge de estado (iPhone real sin validar; «aplazado» deducido, revisar con datos reales)
- [x] Pull-to-refresh (iPhone real sin validar)
- [x] Clasificación por grupo/fase con racha V/E/D (iPhone real sin validar)
- [x] Detalle de equipo: resumen, partidos, plantilla, estadísticas, hub de alineaciones (iPhone real sin validar)
- [x] Detalle de partido: resumen, marcador, eventos, alineaciones, penaltis, cuerpo técnico (sin navegación)
- [x] Jugador: cabecera compacta y estadísticas
- [x] Pestaña de estadísticas y rankings (goleadores)
- [ ] Navegación clasificación → equipo → partido → jugador → atrás, con back de Android y swipe iOS (pila cubierta en e2e; back de Android y swipe iOS sin validar en dispositivo)
- [x] Directo: marcador, incidencias y periodo en tiempo real (web y Android con partidos en juego el 2026-10-31; vibración del gol, ver S10)
- [ ] Tema claro/oscuro, barras de sistema en Android
- [ ] Español y euskera en todos los textos
- [ ] Instalable como PWA en iPhone, funciona offline con datos cacheados

## 9. Protocolo de sesiones con Claude Code

1. Al abrir Claude Code en el repo, el hook `SessionStart` muestra la sesión actual del roadmap:
   modelo, esfuerzo y prompt inicial.
2. Antes de pegar el prompt: `/model <modelo>` y `/effort <nivel>` según indique.
3. Al empezar a trabajar: `node .claude/hooks/roadmap.mjs start SXX`.
4. Al cumplir los criterios de salida: `node .claude/hooks/roadmap.mjs done SXX`. En el siguiente
   fin de turno, el hook `Stop` avisa (una sola vez) de que conviene abrir una sesión nueva
   (`/clear`) y muestra la siguiente con su modelo, esfuerzo y prompt.
5. Comandos útiles: `node .claude/hooks/roadmap.mjs status` (tabla) y `next` (prompt de la siguiente).
6. Si una sesión crece demasiado, se parte: añadir `SXXb` en `roadmap.json` en lugar de alargarla.

Criterio de modelo: **Opus 5.5** para arquitectura, dominio con trampas, directo y animación
compleja; **Sonnet 5.5** para esqueleto, pantallas que siguen patrones ya establecidos y tareas
mecánicas. Si una sesión de Sonnet se atasca, subir a Opus a mitad con `/model` sin perder contexto.
