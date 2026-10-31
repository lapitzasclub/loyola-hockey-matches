import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cachesQueSobran, estrategiaPara, HOST_IMAGENES } from './estrategias';

const ORIGEN = 'https://loyola-hockey-matches.pages.dev';

const get = (ruta: string, mode: RequestMode = 'cors') => ({
  url: ruta.startsWith('http') ? ruta : `${ORIGEN}${ruta}`,
  method: 'GET',
  mode,
});

describe('estrategiaPara', () => {
  it('sirve el shell en cualquier navegación de la SPA', () => {
    expect(estrategiaPara(get('/', 'navigate'), ORIGEN)).toBe('shell');
    expect(
      estrategiaPara(get('/clasificacion/equipo/x', 'navigate'), ORIGEN),
    ).toBe('shell');
  });

  it('no sirve el shell si se navega a un fichero', () => {
    expect(
      estrategiaPara(get('/manifest.webmanifest', 'navigate'), ORIGEN),
    ).toBe('publico');
  });

  it('los ficheros con hash salen de la precache', () => {
    expect(estrategiaPara(get('/static/index-BSksMhmz.js'), ORIGEN)).toBe(
      'estatico',
    );
  });

  it('el resto de public se guarda y se refresca', () => {
    expect(estrategiaPara(get('/icons/icon-192.png', 'no-cors'), ORIGEN)).toBe(
      'publico',
    );
  });

  it('no toca la API, el directo, otros hosts ni lo que no es GET', () => {
    expect(estrategiaPara(get('/api/public/agenda'), ORIGEN)).toBe('red');
    expect(estrategiaPara(get('/connection/websocket'), ORIGEN)).toBe('red');
    expect(
      estrategiaPara(get('https://fvpatinaje.eus/api/auth/config'), ORIGEN),
    ).toBe('red');
    expect(
      estrategiaPara(
        { ...get('/api/hierarchy/competiciones/divisiones'), method: 'POST' },
        ORIGEN,
      ),
    ).toBe('red');
  });

  it('guarda escudos y fotos del S3 de DigitalSport', () => {
    expect(
      estrategiaPara(
        get(`https://${HOST_IMAGENES}/entidades/logos/x.webp`, 'no-cors'),
        ORIGEN,
      ),
    ).toBe('imagen');
  });
});

describe('cachesQueSobran', () => {
  it('conserva la actual y la anterior y borra las más viejas', () => {
    expect(
      cachesQueSobran(
        ['shell-a', 'imagenes', 'shell-b', 'publicos', 'shell-c', 'shell-d'],
        'shell-d',
      ),
    ).toEqual(['shell-a', 'shell-b']);
  });

  it('no borra nada en la primera instalación ni en la segunda', () => {
    expect(cachesQueSobran(['shell-a'], 'shell-a')).toEqual([]);
    expect(cachesQueSobran(['shell-a', 'shell-b'], 'shell-b')).toEqual([]);
  });
});

describe('CSP de public/_headers', () => {
  const csp = readFileSync('public/_headers', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.includes('Content-Security-Policy'));

  // El SW pide los escudos con fetch(): sin esto salen rotos en la PWA y los
  // e2e no lo ven porque corren sin service worker.
  it.each(['img-src', 'connect-src'])(
    '%s admite el host de las imágenes',
    (directiva) => {
      const valor = new RegExp(`${directiva}([^;]*)`).exec(csp ?? '')?.[1];
      expect(valor).toContain(HOST_IMAGENES);
    },
  );
});
