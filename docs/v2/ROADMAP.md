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
| Animación | View Transitions API + **Motion** (`motion/react`) | `layoutId` para elementos compartidos, gestos, springs. |
| i18n | i18next + react-i18next (es/eu) | Estándar, pluralización, carga por namespace. |
| Gráficas | Librería ligera con carga diferida (decidir en S08) | chart.js hoy pesa mucho para lo que se usa. |
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

- [ ] Selector de equipo Loyola (acordeón por categoría), persistido
- [ ] Calendario/partidos del equipo, ordenado por fecha+hora, marcador real y badge de estado
- [ ] Pull-to-refresh
- [ ] Clasificación por grupo/fase con racha V/E/D
- [ ] Detalle de equipo: resumen, partidos, plantilla, estadísticas, hub de alineaciones
- [ ] Detalle de partido: resumen, marcador, eventos, alineaciones, penaltis, cuerpo técnico (sin navegación)
- [ ] Jugador: cabecera compacta y estadísticas
- [ ] Pestaña de estadísticas y rankings (goleadores)
- [ ] Navegación clasificación → equipo → partido → jugador → atrás, con back de Android y swipe iOS
- [ ] Directo: marcador, incidencias y periodo en tiempo real
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
