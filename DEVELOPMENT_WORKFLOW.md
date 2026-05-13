# Flujo de trabajo recomendado

Esta guía resume cómo trabajar cómodamente con la arquitectura dual del proyecto.

## 1. Desarrollo diario de frontend

Usa Vite para iterar rápido sobre UI y lógica compartida.

```bash
npm install
npm start
```

Esto levanta la app web local con proxies de desarrollo definidos en `vite.config.js`.

## 2. Validación antes de cerrar cambios

```bash
npm run lint
npm run build
```

Haz esto siempre antes de:
- commitear
- sincronizar Android
- desplegar a Cloudflare

## 3. Trabajo sobre Android

### Sincronizar assets web hacia Capacitor Android

```bash
npm run android:sync
```

Esto:
1. genera `dist`
2. copia/sincroniza el frontend web dentro del proyecto Android

### Ejecutar en Android conectado

```bash
npm run android:run
```

### Abrir Android Studio

```bash
npm run android:open
```

Recomendado cuando necesites:
- depuración nativa
- emulador
- firmar release
- revisar logs Android

## 4. Desarrollo del backend web Cloudflare

### Probar Pages Functions localmente

```bash
npm run cf:dev
```

Esto sirve `dist` junto con `functions/` usando el runtime de Pages.

Úsalo para validar:
- `/api/*`
- `/signalr/hubs`
- comportamiento web más parecido al deploy real

## 5. Despliegue web a Cloudflare

### Deploy manual con Wrangler

```bash
npm run cf:deploy
```

O conecta el repo a Cloudflare Pages y usa build automático con:

- build command: `npm run build`
- output: `dist`

## 6. Regla práctica para tocar red

### Si cambias consumo de datos
Verifica ambos escenarios:

- **Android nativo**
  - flujo en Capacitor
  - side effects móviles
  - botón atrás / overlays si aplica

- **Web pública**
  - llamadas solo a `/api/*`
  - nada de dependencias directas del frontend a terceros salvo el caso legacy controlado de realtime

## 7. Regla práctica para tocar UI

Cuando el cambio sea visual o de navegación:

1. probar en navegador de escritorio
2. probar ancho móvil en devtools
3. si afecta overlays, modal o navegación atrás, probar también en Android

## 8. Checklist de PR o cierre de iteración

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] si toca red web, probar `npm run cf:dev`
- [ ] si toca UX móvil, probar `npm run android:sync`
- [ ] si toca Android nativo, abrir en Android Studio o ejecutar en dispositivo

## 9. Qué no hacer

- No meter lógica de plataforma dispersa por cualquier módulo
- No llamar desde frontend web a hosts externos nuevos sin pasar por backend propio
- No usar plugins nativos para funcionalidades que deban existir también en web, salvo optimización opcional
