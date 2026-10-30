import { describe, expect, it } from 'vitest';
import {
  crearAlineacion,
  dorsalDesdeApi,
  esStaff,
  rolDesdePosicion,
} from './alineacion';
import type { MiembroAlineacion } from './alineacion';

function miembro(
  nombre: string,
  dorsal: string | null,
  rol: MiembroAlineacion['rol'],
): MiembroAlineacion {
  return {
    plantillaEquipoId: nombre,
    nombre,
    nombrePila: nombre,
    dorsal,
    rol,
    titular: false,
    capitan: false,
    fotoUrl: null,
  };
}

describe('dorsalDesdeApi', () => {
  it('convierte el "" del staff en null y respeta los ceros', () => {
    expect(dorsalDesdeApi('')).toBeNull();
    expect(dorsalDesdeApi(' ')).toBeNull();
    expect(dorsalDesdeApi(null)).toBeNull();
    expect(dorsalDesdeApi('04')).toBe('04');
    expect(dorsalDesdeApi('00')).toBe('00');
  });
});

describe('rolDesdePosicion', () => {
  it.each([
    ['PORTERO', '1', 'portero'],
    ['JUGADOR', '7', 'jugador'],
    ['ENTRENADOR', null, 'entrenador'],
    ['ENTRENADOR2', null, 'segundo-entrenador'],
    ['DELEGADO', null, 'delegado'],
    ['AUXILIAR', null, 'auxiliar'],
  ] as const)('%s → %s', (rolPosicion, dorsal, esperado) => {
    expect(rolDesdePosicion(rolPosicion, dorsal)).toBe(esperado);
  });

  it('con rolPosicion vacío decide el dorsal: sin él es staff', () => {
    expect(rolDesdePosicion('', null)).toBe('staff');
    expect(rolDesdePosicion('', '12')).toBe('jugador');
  });

  it('un JUGADOR sin dorsal sigue siendo jugador', () => {
    expect(rolDesdePosicion('JUGADOR', null)).toBe('jugador');
  });

  it('el segundo entrenador y el staff sin rol son staff', () => {
    expect(esStaff('segundo-entrenador')).toBe(true);
    expect(esStaff('staff')).toBe(true);
    expect(esStaff('portero')).toBe(false);
  });
});

describe('crearAlineacion', () => {
  it('ordena jugadores por dorsal numérico, sin dorsal al final', () => {
    const { jugadores } = crearAlineacion([
      miembro('Sin', null, 'jugador'),
      miembro('Diez', '10', 'jugador'),
      miembro('Cuatro', '04', 'jugador'),
      miembro('Cero', '00', 'portero'),
    ]);
    expect(jugadores.map((j) => j.nombre)).toEqual([
      'Cero',
      'Cuatro',
      'Diez',
      'Sin',
    ]);
  });

  it('separa el staff y lo ordena por rol', () => {
    const { jugadores, staff } = crearAlineacion([
      miembro('Sin rol', null, 'staff'),
      miembro('Delegada', null, 'delegado'),
      miembro('Segundo', null, 'segundo-entrenador'),
      miembro('Primera', null, 'entrenador'),
      miembro('Jugadora', '5', 'jugador'),
    ]);
    expect(jugadores.map((j) => j.nombre)).toEqual(['Jugadora']);
    expect(staff.map((s) => s.nombre)).toEqual([
      'Primera',
      'Segundo',
      'Delegada',
      'Sin rol',
    ]);
  });
});
