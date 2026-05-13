# Arquitectura dual: Android + Web pública

Este proyecto **no migra de Android a web sustituyendo una por otra**.
La arquitectura correcta y mantenible es una **base frontend compartida** con dos targets de runtime.

## Targets soportados

### 1. `android-native`
- Runtime: Capacitor Android
- Distribución: APK / app instalada
- Red legacy FVP: acceso directo permitido
- SignalR legacy: acceso directo permitido
- Integraciones nativas: activas (back button, barras del sistema, HTTP nativo si aporta valor)

### 2. `web`
- Runtime: navegador móvil, Safari iPhone, escritorio, PWA
- Distribución: Cloudflare Pages
- Red legacy FVP: siempre vía backend propio `/api/*`
- SignalR bootstrap: vía `/signalr/hubs`
- Integraciones nativas: no requeridas, con degradación limpia

## Principio de diseño

La UI, navegación y lógica de presentación se comparten.
Las diferencias entre targets se concentran en una capa pequeña de runtime:

- `www/config/runtime.js`
- `www/utils/env.js`
- `www/services.js`
- `www/core/main.js`

## Política de red

### Android nativo
Puede hablar directo con los servicios legacy cuando eso simplifica compatibilidad:
- FVP ASMX directo
- SignalR directo
- HTTP nativo opcional vía Capacitor

### Web pública
Nunca debe depender de llamadas cross-origin desde frontend a terceros.
Todo debe pasar por backend propio:
- `/api/*` para FVP
- `/signalr/hubs` para el bootstrap del hub legacy

## Backend web

Cloudflare Pages Functions actúa como backend ligero y seguro.

### Responsabilidades
- ocultar orígenes externos al frontend
- controlar CORS
- aplicar allowlist de endpoints
- aplicar rate limiting básico
- cachear respuestas públicas y repetibles

## Mantenibilidad

Para mantener esta arquitectura sana:

1. No mezclar condicionales de plataforma por todo el código.
2. Centralizar decisiones en `runtime.js`.
3. Mantener `services.js` como frontera de datos.
4. Mantener el realtime aislado en `core/main.js` + helpers asociados.
5. Evitar que nuevas features web vuelvan a depender de plugins nativos.

## Regla práctica

Si una funcionalidad nueva necesita acceder a red:
- primero pensar cómo funcionará en `web`
- después permitir optimización nativa solo si aporta valor real

Eso evita que Android condicione negativamente la evolución de la webapp.
