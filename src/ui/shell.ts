import { createContext, useContext } from 'react';

/** Lo que la cabecera de las pestañas enseña del equipo elegido. */
export interface EquipoCabecera {
  nombre: string;
  competicion: string;
}

/** Lo que el shell (`app/`) ofrece a las pantallas sin que estas lo importen. */
export interface Shell {
  abrirSelector(): void;
  /** `undefined` mientras carga el catálogo; `null` si no hay equipo elegido. */
  equipo: EquipoCabecera | null | undefined;
}

/** Id del menú lateral, para que `IonMenuButton` lo encuentre. */
export const MENU_AJUSTES = 'ajustes';

export const ShellContext = createContext<Shell>({
  abrirSelector: () => {},
  equipo: null,
});

export const useShell = () => useContext(ShellContext);
