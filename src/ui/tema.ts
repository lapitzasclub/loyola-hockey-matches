/** Opciones del selector de tema. `app/tema.ts` la guarda y la aplica. */
export const PREFERENCIAS_TEMA = ['claro', 'oscuro', 'sistema'] as const;
export type PreferenciaTema = (typeof PREFERENCIAS_TEMA)[number];
