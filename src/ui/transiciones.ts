/**
 * Nombres compartidos entre la pantalla de origen y la de destino para las
 * transiciones de S09 (escudo y nombre del equipo al pasar de la tabla a su
 * detalle). Aquí solo se marcan, como `data-transicion`: nada los anima aún.
 * Van por `inscripcionId` porque es el id que comparten ambas pantallas.
 */
export const transicion = {
  escudo: (inscripcionId: string) => `escudo-${inscripcionId}`,
  nombre: (inscripcionId: string) => `nombre-${inscripcionId}`,
};
