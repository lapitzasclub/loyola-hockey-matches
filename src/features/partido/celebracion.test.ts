import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PartidoDetalle } from '../../domain';
import { apuntarCelebrado, useCelebracion } from './celebracion';
import { detalle } from './test-utils';

const CLAVE = 'loyola.celebrados';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('apuntarCelebrado', () => {
  it('apunta cada partido una vez y guarda solo los últimos 50', () => {
    apuntarCelebrado('a');
    apuntarCelebrado('a');
    expect(localStorage.getItem(CLAVE)).toBe('["a"]');
    for (let i = 0; i < 60; i += 1) apuntarCelebrado(`p${i}`);
    const guardados = JSON.parse(localStorage.getItem(CLAVE)!) as string[];
    expect(guardados).toHaveLength(50);
    expect(guardados).not.toContain('a');
    expect(guardados.at(-1)).toBe('p59');
  });

  it('un valor guardado roto cuenta como vacío', () => {
    localStorage.setItem(CLAVE, '{roto');
    apuntarCelebrado('a');
    expect(localStorage.getItem(CLAVE)).toBe('["a"]');
  });
});

describe('useCelebracion', () => {
  const victoria = detalle('copa');

  it('celebra la victoria del Loyola la primera vez que se ve', () => {
    const primera = renderHook(() => useCelebracion(victoria));
    expect(primera.result.current).toBe(true);
    const segunda = renderHook(() => useCelebracion(victoria));
    expect(segunda.result.current).toBe(false);
  });

  it('no celebra derrotas, partidos sin el Loyola ni la carga', () => {
    for (const p of [
      detalle('jugador-sin-dorsal'),
      detalle('falta-directa'),
      undefined,
    ]) {
      expect(renderHook(() => useCelebracion(p)).result.current).toBe(false);
    }
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('celebra cuando el partido acaba con la pantalla abierta', () => {
    const enJuego: PartidoDetalle = { ...victoria, estado: 'en_juego' };
    const { result, rerender } = renderHook(({ p }) => useCelebracion(p), {
      initialProps: { p: enJuego },
    });
    expect(result.current).toBe(false);
    rerender({ p: victoria });
    expect(result.current).toBe(true);
  });

  it('con movimiento reducido ni celebra ni lo apunta', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({
      matches: consulta.includes('reduce'),
    }));
    expect(renderHook(() => useCelebracion(victoria)).result.current).toBe(
      false,
    );
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });
});
