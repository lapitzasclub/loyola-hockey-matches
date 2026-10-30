import { useSyncExternalStore } from 'react';

const CLAVE = 'loyola.equipo';

const oyentes = new Set<() => void>();

function leer(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener('storage', oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener('storage', oyente);
  };
}

/** Clave (`claveEquipo`) del equipo Loyola elegido y persistido; null si no hay. */
export function useEquipoElegido() {
  const clave = useSyncExternalStore(suscribir, leer);

  const elegir = (nueva: string | null) => {
    try {
      if (nueva) localStorage.setItem(CLAVE, nueva);
      else localStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento (navegación privada) la elección vale para esta sesión.
    }
    oyentes.forEach((o) => o());
  };

  return [clave, elegir] as const;
}
