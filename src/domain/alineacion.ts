export type Rol =
  | 'portero'
  | 'jugador'
  | 'entrenador'
  | 'segundo-entrenador'
  | 'delegado'
  | 'auxiliar'
  /** Staff con `rolPosicion` vacío. */
  | 'staff';

const ROLES: Record<string, Rol> = {
  PORTERO: 'portero',
  JUGADOR: 'jugador',
  ENTRENADOR: 'entrenador',
  ENTRENADOR2: 'segundo-entrenador',
  DELEGADO: 'delegado',
  AUXILIAR: 'auxiliar',
};

const ORDEN_STAFF: readonly Rol[] = [
  'entrenador',
  'segundo-entrenador',
  'delegado',
  'auxiliar',
  'staff',
];

/** `""` es como la API manda «sin dorsal», tanto al staff como a algún jugador. */
export function dorsalDesdeApi(
  dorsal: string | null | undefined,
): string | null {
  const valor = (dorsal ?? '').trim();
  return valor === '' ? null : valor;
}

/**
 * Rol de una ficha. Algunas llegan con `rolPosicion` vacío: con dorsal son
 * jugadores de pista y sin dorsal, staff. Ojo, el dorsal no basta por sí
 * solo: hay `JUGADOR` sin dorsal.
 */
export function rolDesdePosicion(
  rolPosicion: string,
  dorsal: string | null,
): Rol {
  const rol = ROLES[rolPosicion.trim().toUpperCase()];
  if (rol) return rol;
  return dorsal === null ? 'staff' : 'jugador';
}

export function esStaff(rol: Rol): boolean {
  return rol !== 'portero' && rol !== 'jugador';
}

export interface MiembroAlineacion {
  plantillaEquipoId: string;
  nombre: string;
  nombrePila: string;
  dorsal: string | null;
  rol: Rol;
  titular: boolean;
  capitan: boolean;
  fotoUrl: string | null;
}

export interface Alineacion {
  /** Porteros y jugadores, por dorsal; sin dorsal al final. */
  jugadores: MiembroAlineacion[];
  /** Por rol: entrenador, segundo, delegado, auxiliar y sin rol. */
  staff: MiembroAlineacion[];
}

function numeroDorsal(m: MiembroAlineacion): number {
  const numero = m.dorsal === null ? NaN : Number(m.dorsal);
  return Number.isNaN(numero) ? Infinity : numero;
}

function porNombre(a: MiembroAlineacion, b: MiembroAlineacion): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}

export function crearAlineacion(
  miembros: readonly MiembroAlineacion[],
): Alineacion {
  const jugadores = miembros
    .filter((m) => !esStaff(m.rol))
    .sort((a, b) => numeroDorsal(a) - numeroDorsal(b) || porNombre(a, b));
  const staff = miembros
    .filter((m) => esStaff(m.rol))
    .sort(
      (a, b) =>
        ORDEN_STAFF.indexOf(a.rol) - ORDEN_STAFF.indexOf(b.rol) ||
        porNombre(a, b),
    );
  return { jugadores, staff };
}
