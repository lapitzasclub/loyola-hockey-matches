import { describe, expect, it } from 'vitest';

import {
  ajusteCaja,
  ajusteTexto,
  dentro,
  emparejar,
  interseccion,
} from './vuelo';

const caja = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
});

type Caja = ReturnType<typeof caja>;

/**
 * Dónde acaba `c` al aplicar `translate(tx, ty) scale(sx[, sy])` a un elemento
 * que ocupa `origen`, con `transform-origin: 0 0`.
 */
function aplicar(transform: string, origen: Caja, c: Caja = origen) {
  const n = transform.match(/-?[\d.]+(e-?\d+)?/g)!.map(Number);
  const [tx, ty, sx] = n as [number, number, number];
  const sy = n[3] ?? sx;
  return caja(
    origen.left + tx + (c.left - origen.left) * sx,
    origen.top + ty + (c.top - origen.top) * sy,
    c.width * sx,
    c.height * sy,
  );
}

describe('dentro', () => {
  const marco = caja(0, 100, 400, 600);

  it('acepta lo que cabe entero, con un píxel de holgura', () => {
    expect(dentro(caja(10, 100, 50, 50), marco)).toBe(true);
    expect(dentro(caja(-0.5, 99.5, 50, 50), marco)).toBe(true);
  });

  it('descarta lo que asoma por arriba, lo que está en otro panel y lo vacío', () => {
    expect(dentro(caja(10, 80, 50, 50), marco)).toBe(false);
    expect(dentro(caja(410, 200, 50, 50), marco)).toBe(false);
    expect(dentro(caja(10, 200, 0, 0), marco)).toBe(false);
  });
});

describe('interseccion', () => {
  it('recorta el texto desbordado a su caja', () => {
    expect(interseccion(caja(0, 0, 300, 20), caja(10, 0, 100, 20))).toEqual(
      caja(10, 0, 100, 20),
    );
  });

  it('es null si no se tocan', () => {
    expect(interseccion(caja(0, 0, 10, 10), caja(20, 0, 10, 10))).toBeNull();
  });
});

describe('ajusteCaja', () => {
  it('lleva una caja exactamente sobre la otra', () => {
    const de = caja(20, 300, 28, 28);
    const a = caja(16, 120, 64, 64);
    expect(aplicar(ajusteCaja(de, a), de)).toEqual(a);
  });

  it('es la identidad sobre sí misma', () => {
    const c = caja(5, 5, 40, 40);
    expect(ajusteCaja(c, c)).toBe('translate(0px, 0px) scale(1, 1)');
  });
});

describe('ajusteTexto', () => {
  it('centra el texto de origen sobre el de destino con la escala de las fuentes', () => {
    // Nombre estirado y alineado a la izquierda: el texto ocupa solo una parte.
    const de = { caja: caja(50, 400, 200, 20), texto: caja(50, 402, 80, 16) };
    const a = { texto: caja(100, 150, 120, 24) };
    const fin = aplicar(ajusteTexto(de, a, 1.5), de.caja, de.texto);
    expect(fin.left + fin.width / 2).toBeCloseTo(160);
    expect(fin.top + fin.height / 2).toBeCloseTo(162);
    expect(fin.width).toBeCloseTo(120);
  });
});

describe('emparejar', () => {
  const c = (nombre: string, pulsado = false, id = nombre) => ({
    nombre,
    pulsado,
    id,
  });

  it('empareja solo los nombres que están en las dos páginas', () => {
    const parejas = emparejar(
      [c('escudo-a'), c('nombre-a'), c('escudo-b')],
      [c('escudo-a'), c('nombre-a'), c('marcador-x')],
    );
    expect(parejas.map(([s]) => s.nombre)).toEqual(['escudo-a', 'nombre-a']);
  });

  it('con nombres repetidos prefiere el del enlace pulsado y si no el primero', () => {
    const [pareja] = emparejar(
      [c('escudo-a', false, 'tabla-1'), c('escudo-a', true, 'tabla-2')],
      [c('escudo-a', false, 'cabecera'), c('escudo-a', false, 'otra')],
    );
    expect(pareja?.[0].id).toBe('tabla-2');
    expect(pareja?.[1].id).toBe('cabecera');
  });
});
