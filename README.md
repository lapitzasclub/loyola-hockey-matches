

# Loyola Hockey Matches

Aplicación web y móvil (Capacitor) para consultar, filtrar y visualizar los partidos y clasificaciones de los equipos de hockey del Loyola.

## Descripción

Este proyecto actúa como un scrapper/cliente de la API de la Federación Vasca de Patinaje, permitiendo a los usuarios:
- Ver la clasificación de los equipos Loyola en sus competiciones.
- Consultar el calendario de partidos de cada equipo Loyola.
- Filtrar por equipo y competición.
- Acceder a detalles de partidos, localización y añadir eventos al calendario.

## Estructura principal

- `www/api.js`: Funciones para consultar la API (real o proxy) y obtener datos de clasificaciones, calendarios y equipos Loyola.
- `www/components/clasificacion.js`: Renderiza la tabla de clasificación.
- `www/components/partidos.js`: Renderiza la lista de partidos y sus detalles.
- `www/utils/helpers.js`: Utilidades para parsear, filtrar y transformar los datos recibidos de la API.
- `www/core/init.js`: Inicialización de la app, selección de equipo, eventos de UI y carga de datos.
- `www/index.html`: Entrada principal de la app.
- `android/`: Proyecto Android generado por Capacitor para empaquetar la app como aplicación móvil.

## Flujo de funcionamiento

1. El usuario selecciona un equipo Loyola y una competición.
2. La app consulta la API para obtener el calendario de partidos y la clasificación.
3. Los datos se procesan y muestran en la interfaz, permitiendo filtrar, ver detalles y añadir partidos al calendario.

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

## Tecnologías usadas
- JavaScript (ES6+)
- Capacitor (para soporte móvil)
- HTML5, CSS3

## Créditos
Desarrollado por el club Loyola para la gestión y consulta de partidos de hockey patines.

---

¿Tienes dudas o quieres contribuir? Abre un issue o contacta con el club.
