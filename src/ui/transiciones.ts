/**
 * Nombres compartidos entre la pantalla de origen y la de destino para la
 * transición compartida (`app/transicionPagina.ts`): los elementos con el
 * mismo `data-transicion` en las dos páginas vuelan de un sitio a otro. Los
 * del equipo van por `inscripcionId` porque es el id que comparten la tabla y
 * su detalle; los del partido, por el id del partido, que es único en una
 * lista aunque el mismo equipo salga en muchas tarjetas.
 */
export const transicion = {
  escudo: (inscripcionId: string) => `escudo-${inscripcionId}`,
  nombre: (inscripcionId: string) => `nombre-${inscripcionId}`,
  escudoPartido: (partidoId: string, lado: 'local' | 'visitante') =>
    `escudo-${partidoId}-${lado}`,
  nombrePartido: (partidoId: string, lado: 'local' | 'visitante') =>
    `nombre-${partidoId}-${lado}`,
  marcador: (partidoId: string) => `marcador-${partidoId}`,
};

/**
 * Un escudo vuela como imagen (se escala a la caja de destino); el resto es
 * texto y vuela con la escala de su letra, fundiéndose con el de destino.
 */
export const vuelaComoCaja = (nombre: string) => nombre.startsWith('escudo-');
