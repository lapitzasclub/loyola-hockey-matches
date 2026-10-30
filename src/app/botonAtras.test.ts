import { describe, expect, it } from 'vitest';

import { accionAtras } from './botonAtras';

describe('accionAtras', () => {
  it('en un detalle vuelve dentro de la pila de su pestaña', () => {
    expect(accionAtras('/clasificacion/equipo/c/d/i')).toEqual({
      tipo: 'atras',
      raiz: '/clasificacion',
    });
    expect(accionAtras('/estadisticas/jugador/j')).toEqual({
      tipo: 'atras',
      raiz: '/estadisticas',
    });
  });

  it('en la raíz de otra pestaña va a la inicial', () => {
    expect(accionAtras('/clasificacion')).toEqual({
      tipo: 'inicio',
      raiz: '/partidos',
    });
  });

  it('en la raíz de la pestaña inicial sale de la app', () => {
    expect(accionAtras('/partidos')).toEqual({ tipo: 'salir' });
    expect(accionAtras('/')).toEqual({ tipo: 'salir' });
  });
});
