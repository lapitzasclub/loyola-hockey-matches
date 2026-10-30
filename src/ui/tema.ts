/** Opciones del selector de tema. `app/tema.ts` la guarda y la aplica. */
export const PREFERENCIAS_TEMA = ['sistema', 'claro', 'oscuro'] as const;
export type PreferenciaTema = (typeof PREFERENCIAS_TEMA)[number];
