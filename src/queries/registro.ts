/** Metadatos propios de las consultas, tipados para toda la app. */
export interface MetaConsulta extends Record<string, unknown> {
  /** `false` para lo que no tiene sentido guardar entre aperturas. */
  persistir?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: MetaConsulta;
  }
}
