


# Loyola Hockey Matches

Aplicación web y móvil (Capacitor) para consultar, filtrar y visualizar los partidos y clasificaciones de los equipos de hockey del Loyola.

## Descripción

Este proyecto actúa como un scrapper/cliente de la API de la Federación Vasca de Patinaje, permitiendo a los usuarios:
- Ver la clasificación de los equipos Loyola en sus competiciones.
- Consultar el calendario de partidos de cada equipo Loyola.
- Filtrar por equipo y competición.
- Acceder a detalles de partidos, localización y añadir eventos al calendario (Google Calendar/ICS).
- Visualizar la app en modo claro/oscuro/auto, con integración de barras de sistema en móvil.

## Estructura principal del proyecto

- `www/api.js`: Funciones para consultar la API (real o proxy) y obtener datos de clasificaciones, calendarios y equipos Loyola.
- `www/components/clasificacion.js`: Renderiza la tabla de clasificación.
- `www/components/partidos.js`: Renderiza la lista de partidos y sus detalles.
- `www/components/ui.js`: Componentes y utilidades de UI.
- `www/core/init.js`: Inicialización de la app, selección de equipo, eventos de UI y carga de datos.
- `www/core/navigation.js`: Lógica de navegación y gestión de rutas.
- `www/core/pullToRefresh.js`: Lógica para refresco por arrastre.
- `www/core/header.js`: Gestión de la cabecera de competición.
- `www/core/main.js`: Arranque principal de la app.
- `www/utils/apiCache.js`: Lógica de caché para peticiones API (Map + localStorage).
- `www/utils/helpers.js`: Utilidades generales para parseo, filtrado y transformación de datos.
- `www/utils/env.js`: Detección de entorno y helpers de plataforma.
- `www/utils/partidosHelpers.js`: Helpers específicos para partidos.
- `www/utils/clasificacionHelpers.js`: Helpers específicos para clasificación.
- `www/utils/calendar.js`: Utilidades para exportar partidos a calendario (Google/ICS).
- `www/systemBars.js`: Gestión de colores de barras de sistema (StatusBar/NavigationBar).
- `www/theme.js`: Gestión de tema (claro/oscuro/auto) y reacciones al cambio.
- `www/index.html`: Entrada principal de la app.
- `android/`: Proyecto Android generado por Capacitor para empaquetar la app como aplicación móvil.

## Flujo de funcionamiento

1. El usuario selecciona un equipo Loyola y una competición desde el menú lateral.
2. La app consulta la API para obtener el calendario de partidos y la clasificación, usando caché local para eficiencia.
3. Los datos se procesan y muestran en la interfaz, permitiendo filtrar, ver detalles, navegar entre jornadas y añadir partidos al calendario.
4. El usuario puede cambiar el tema visual (claro/oscuro/auto) y la app adapta las barras del sistema en móvil.

## Instalación y ejecución

1. Instala dependencias:
   ```sh
   npm install
   ```
2. Ejecuta la app en modo desarrollo:
   ```sh
   npm start
   ```
3. Para compilar y ejecutar en Android:
   ```sh
   npx cap open android
   ```

## Buenas prácticas y detalles técnicos

- Código modularizado en ES6, con helpers y lógica separada por dominio.
- Todas las funciones principales están documentadas con JSDoc en español.
- Uso de async/await para peticiones y lógica asíncrona.
- Lógica de caché para evitar peticiones innecesarias a la API.
- Soporte para exportar partidos a Google Calendar y archivos ICS.
- Adaptación visual automática a tema claro/oscuro y barras de sistema en móvil.

## Tecnologías usadas
- JavaScript (ES6+)
- Capacitor (para soporte móvil)
- HTML5, CSS3

## Créditos y agradecimientos

Desarrollado por el club Loyola para la gestión y consulta de partidos de hockey patines.

Inspirado y apoyado por la comunidad de la Federación Vasca de Patinaje.

---

¿Tienes dudas, sugerencias o quieres contribuir? Abre un issue o contacta con el club.
