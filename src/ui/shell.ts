import { createContext, useContext } from 'react';

/** Acciones que el shell (`app/`) ofrece a las pantallas sin que estas lo importen. */
export interface AccionesShell {
  abrirAjustes(): void;
}

export const AccionesShellContext = createContext<AccionesShell>({
  abrirAjustes: () => {},
});

export const useAccionesShell = () => useContext(AccionesShellContext);
