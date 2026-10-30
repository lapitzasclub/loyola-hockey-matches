import { describe, expect, it } from 'vitest';

import es from './es.json';
import eu from './eu.json';
import { detectarIdioma } from './index';

function claves(obj: Record<string, unknown>, prefijo = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? claves(v as Record<string, unknown>, `${prefijo}${k}.`)
      : [`${prefijo}${k}`],
  );
}

describe('i18n', () => {
  it('es y eu tienen las mismas claves', () => {
    expect(claves(eu).sort()).toEqual(claves(es).sort());
  });

  it('detecta euskera y cae a castellano por defecto', () => {
    expect(detectarIdioma('eu-ES')).toBe('eu');
    expect(detectarIdioma('en-US')).toBe('es');
    expect(detectarIdioma(undefined)).toBe('es');
  });
});
