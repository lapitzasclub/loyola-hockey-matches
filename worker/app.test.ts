// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearApp } from './app';
import type { Env } from './app';

const G1 = 'dd7180cb-3790-41a7-9993-7643575541a5';
const G2 = 'f991edaf-9299-4cf1-bd15-0645d01b08d1';
const ORIGEN = 'https://loyola.test';

/** Cache API del edge en memoria, con `max-age` respetado. */
function cacheEnMemoria() {
  const guardadas = new Map<string, { respuesta: Response; hasta: number }>();
  let ahora = 0;
  const cache = {
    match: async (clave: string) => {
      const g = guardadas.get(clave);
      return g && g.hasta > ahora ? g.respuesta.clone() : undefined;
    },
    put: async (clave: string, respuesta: Response) => {
      const maxAge = /max-age=(\d+)/.exec(
        respuesta.headers.get('cache-control') ?? '',
      );
      guardadas.set(clave, {
        respuesta,
        hasta: ahora + Number(maxAge?.[1] ?? 0) * 1000,
      });
    },
  };
  return {
    guardadas,
    avanzar: (ms: number) => (ahora += ms),
    caches: { open: async () => cache },
  };
}

let federacion: ReturnType<typeof vi.fn>;
let edge: ReturnType<typeof cacheEnMemoria>;

beforeEach(() => {
  edge = cacheEnMemoria();
  federacion = vi.fn(async () => Response.json({ ok: true }));
  vi.stubGlobal('caches', edge.caches);
  vi.stubGlobal('fetch', federacion);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const pedir = (ruta: string, init?: RequestInit, env: Env = {}) =>
  crearApp().request(`${ORIGEN}${ruta}`, init, env);

/** Espera a que terminen los `cache.put` en segundo plano. */
const tic = () => new Promise((r) => setTimeout(r, 0));

describe('proxy /api', () => {
  it('pasa a la federación la ruta permitida con la query normalizada', async () => {
    const r = await pedir(`/api/hierarchy/division/${G1}/tree`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(federacion).toHaveBeenCalledWith(
      `https://fvpatinaje.eus/api/hierarchy/division/${G1}/tree`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('no deja salir lo que no está en la allowlist', async () => {
    for (const ruta of [
      '/api/web/noticias',
      '/api/auth/login',
      `/api/public/partidos/${G1}?x=1`,
    ]) {
      expect((await pedir(ruta)).status, ruta).toBe(404);
    }
    expect(
      (await pedir('/api/public/agenda', { method: 'DELETE' })).status,
    ).toBe(404);
    expect(federacion).not.toHaveBeenCalled();
  });

  it('sirve del edge mientras dura la política y vuelve a pedir al caducar', async () => {
    const ruta = `/api/hierarchy/fase/${G2}/clasificacion`;
    expect((await pedir(ruta)).headers.get('x-cache')).toBe('MISS');
    await tic();
    const segunda = await pedir(ruta);
    expect(segunda.headers.get('x-cache')).toBe('HIT');
    expect(await segunda.json()).toEqual({ ok: true });
    expect(federacion).toHaveBeenCalledTimes(1);
    edge.avanzar(61_000);
    expect((await pedir(ruta)).headers.get('x-cache')).toBe('MISS');
    expect(federacion).toHaveBeenCalledTimes(2);
  });

  it('el detalle de un partido abierto caduca en segundos y el cerrado dura', async () => {
    federacion.mockImplementation(async () =>
      Response.json({ actaEstado: 'PROGRAMADO' }),
    );
    await pedir(`/api/public/partidos/${G1}`);
    federacion.mockImplementation(async () =>
      Response.json({ actaEstado: 'FINALIZADO' }),
    );
    await pedir(`/api/public/partidos/${G2}`);
    await tic();
    edge.avanzar(6000);
    expect(
      (await pedir(`/api/public/partidos/${G1}`)).headers.get('x-cache'),
    ).toBe('MISS');
    expect(
      (await pedir(`/api/public/partidos/${G2}`)).headers.get('x-cache'),
    ).toBe('HIT');
  });

  it('no guarda tokens ni errores', async () => {
    await pedir('/api/auth/centrifugo-token-public');
    federacion.mockImplementation(
      async () => new Response('caída', { status: 500 }),
    );
    const r = await pedir(`/api/hierarchy/division/${G1}/fases`);
    expect(r.status).toBe(500);
    await tic();
    expect(edge.guardadas.size).toBe(0);
  });

  it('valida el POST de divisiones y lo cachea por su contenido', async () => {
    const post = (cuerpo: unknown) =>
      pedir('/api/hierarchy/competiciones/divisiones', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    expect((await post({ x: 1 })).status).toBe(400);
    expect((await post([G1, 'nope'])).status).toBe(400);
    expect(federacion).not.toHaveBeenCalled();

    expect((await post([G2, G1])).headers.get('x-cache')).toBe('MISS');
    expect(federacion).toHaveBeenCalledWith(
      'https://fvpatinaje.eus/api/hierarchy/competiciones/divisiones',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify([G1, G2]),
      }),
    );
    await tic();
    expect((await post([G1, G2])).headers.get('x-cache')).toBe('HIT');
  });

  it('responde 502 si la federación no contesta', async () => {
    federacion.mockRejectedValue(new TypeError('fetch failed'));
    expect((await pedir('/api/auth/config')).status).toBe(502);
  });

  it('limita por IP con 429 y retry-after', async () => {
    const app = crearApp({ maximoPorMinuto: 2 });
    const ip = { 'cf-connecting-ip': '9.9.9.9' };
    for (let i = 0; i < 2; i++) {
      expect(
        (await app.request(`${ORIGEN}/api/auth/config`, { headers: ip }, {}))
          .status,
      ).toBe(200);
    }
    const r = await app.request(
      `${ORIGEN}/api/auth/config`,
      { headers: ip },
      {},
    );
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});

describe('directo /connection', () => {
  const ws = { upgrade: 'websocket', origin: ORIGEN };

  it('pasa el WebSocket a Centrifugo de la federación', async () => {
    federacion.mockResolvedValue(new Response(null, { status: 200 }));
    await pedir('/connection/websocket', { headers: ws });
    expect(federacion).toHaveBeenCalledWith(
      'https://fvpatinaje.eus/connection/websocket',
      expect.any(Request),
    );
  });

  it('solo acepta WebSocket desde el propio origen y en esa ruta', async () => {
    expect((await pedir('/connection/websocket')).status).toBe(426);
    expect(
      (
        await pedir('/connection/websocket', {
          headers: { ...ws, origin: 'https://otro.test' },
        })
      ).status,
    ).toBe(403);
    expect((await pedir('/connection/otra', { headers: ws })).status).toBe(404);
    expect(federacion).not.toHaveBeenCalled();
  });
});

describe('resto', () => {
  it('sirve los estáticos de Pages', async () => {
    const ASSETS = { fetch: vi.fn(async () => new Response('<html>')) };
    const r = await pedir('/equipo/x', undefined, { ASSETS });
    expect(await r.text()).toBe('<html>');
    expect(ASSETS.fetch).toHaveBeenCalled();
  });
});
