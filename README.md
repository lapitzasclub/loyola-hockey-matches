
# Loyola Hockey Matches (APK híbrida)

Aplicación web y APK híbrida para consultar partidos y clasificaciones de los equipos "Loyola Indautxu" de hockey patines, integrando funcionalidades avanzadas:

## Funcionalidades principales

- Consulta de partidos y clasificación de todos los equipos Loyola en varias competiciones.
- Selección dinámica de equipo y competición.
- Internacionalización: español y euskera.
- Selector de tema: claro, oscuro y automático (adaptado al sistema).
- Navegación intuitiva entre partidos y clasificación.
- Menú lateral y selector rápido de equipo.
- Pull-to-refresh en móviles para actualizar datos.
- Integración con Capacitor para funcionamiento nativo en Android (APK).
- Detección automática de entorno (web/nativo) y uso de plugins Capacitor.
- Gestión avanzada de errores con overlays y reintentos.
- Almacenamiento local de preferencias y equipo seleccionado.

## Estructura del proyecto

- `www/` → Código web (HTML, JS, CSS, internacionalización, UI)
- `capacitor.config.json` → Configuración Capacitor
- `package.json` → Scripts y dependencias
- `android/` → Proyecto Android generado por Capacitor

## Cómo compilar la APK

1. Instala dependencias globales:
   ```sh
   npm install -g @capacitor/cli http-server
   ```
2. Inicializa Capacitor (si no está hecho):
   ```sh
   npx cap init
   npx cap add android
   ```
3. Copia el contenido web:
   ```sh
   npx cap copy
   ```
4. Abre en Android Studio:
   ```sh
   npx cap open android
   ```
5. Compila y genera la APK desde Android Studio.

## Uso local como webapp

```sh
npm install -g http-server
npm start
```
Abre [http://localhost:8080](http://localhost:8080)
