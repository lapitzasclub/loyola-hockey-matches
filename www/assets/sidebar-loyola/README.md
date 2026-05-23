# Assets sidebar Loyola Indautxu

Contenido del ZIP:

## escudo/
- `escudo_loyola_indautxu_original.png`: imagen original del escudo.
- `escudo_loyola_indautxu_fondo_transparente.png`: versión con fondo exterior transparente.

## mockups/
- `sidebar_loyola_indautxu_tema_claro.png`: propuesta visual en tema claro.
- `sidebar_loyola_indautxu_tema_noche.png`: propuesta visual en tema noche.

## iconos_svg/
Todos los iconos están en SVG y usan `currentColor`, para que puedas cambiar el color desde CSS.

- `icono_cerrar.svg`: botón de cierre del sidebar.
- `icono_cambiar_equipo.svg`: opción de cambio de equipo.
- `icono_idioma_globo.svg`: selector de idioma ES / EU.
- `icono_tema_dia.svg`: modo día.
- `icono_tema_noche.svg`: modo noche.
- `icono_tema_auto.svg`: modo automático / sistema.
- `icono_chevron_derecha.svg`: flecha de navegación.
- `icono_equipo_escudo_placeholder.svg`: icono genérico de equipo/escudo por si necesitas placeholder.

Ejemplo de cambio de color:

```css
.sidebar-icon {
  color: #e01f2d;
}
```

## estilos/
- `tokens_tema_sidebar.css`: variables CSS orientativas para tema claro y tema noche.


## Assets añadidos de esquinas del sidebar

Se han añadido los siguientes PNGs decorativos extraídos del diseño del sidebar:

### Tema claro
- `esquinas_sidebar/claro/sidebar_esquina_superior_derecha_tema_claro.png`
- `esquinas_sidebar/claro/sidebar_esquina_inferior_izquierda_tema_claro.png`
- `esquinas_sidebar/claro/sidebar_esquina_inferior_derecha_tema_claro.png`

### Tema noche
- `esquinas_sidebar/noche/sidebar_esquina_superior_derecha_tema_noche.png`
- `esquinas_sidebar/noche/sidebar_esquina_inferior_izquierda_tema_noche.png`
- `esquinas_sidebar/noche/sidebar_esquina_inferior_derecha_tema_noche.png`


## Versión v3

Los assets de `esquinas_sidebar` han sido rehechos **sin esquinas redondeadas** para facilitar su uso directo como imágenes rectangulares en CSS o en componentes UI.


## Versión v4

- Corregido el asset `sidebar_esquina_superior_derecha_*` para que mantenga las proporciones adecuadas.
- Sustituido el escudo con fondo transparente por dos versiones con fondo integrado:
  - `escudo/escudo_loyola_indautxu_fondo_claro.png`
  - `escudo/escudo_loyola_indautxu_fondo_oscuro.png`
