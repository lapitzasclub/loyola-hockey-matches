export interface OpcionPastilla<Id extends string> {
  id: Id;
  etiqueta: string;
}

interface Props<Id extends string> {
  opciones: readonly OpcionPastilla<Id>[];
  valor: Id;
  alCambiar: (id: Id) => void;
  /** Etiqueta accesible del grupo. */
  etiqueta: string;
  /**
   * `pestanas` para cambiar de sección (role tablist) y `filtro` para refinar
   * una lista (botones con `aria-pressed`).
   */
  tipo?: 'pestanas' | 'filtro';
  testId?: string;
  testIdOpcion: (id: Id) => string;
}

/**
 * Botonera de pastillas, como la de la v1: todas las opciones se ven a la vez
 * y, si no caben, pasan a la línea siguiente en vez de obligar a desplazar.
 * La activa va rellena con el color primario.
 */
export function Pastillas<Id extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  tipo = 'pestanas',
  testId,
  testIdOpcion,
}: Props<Id>) {
  const filtro = tipo === 'filtro';
  return (
    <div
      className={`pastillas${filtro ? ' pastillas--filtro' : ''}`}
      role={filtro ? 'group' : 'tablist'}
      aria-label={etiqueta}
      data-testid={testId}
    >
      {opciones.map((opcion) => {
        const activa = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            role={filtro ? undefined : 'tab'}
            aria-selected={filtro ? undefined : activa}
            aria-pressed={filtro ? activa : undefined}
            className={`pastillas__boton${activa ? ' pastillas__boton--activo' : ''}`}
            onClick={() => alCambiar(opcion.id)}
            data-testid={testIdOpcion(opcion.id)}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
