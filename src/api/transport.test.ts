import type { HttpOptions, HttpResponse } from '@capacitor/core';
import { describe, expect, it, vi } from 'vitest';
import {
  API_ORIGEN,
  ErrorApi,
  crearTransporte,
  esReintentable,
  modoDe,
} from './transport';
import type { EntornoTransporte } from './transport';

function respuestaHttp(status: number, data: unknown): HttpResponse {
  return { status, data, headers: {}, url: '' };
}

function entorno(nativo: boolean, cambios: Partial<EntornoTransporte> = {}) {
  const fetch = vi.fn<typeof globalThis.fetch>(
    async () => new Response('{"ok":true}', { status: 200 }),
  );
  const request = vi.fn<(o: HttpOptions) => Promise<HttpResponse>>(async () =>
    respuestaHttp(200, { ok: true }),
  );
  return { nativo, fetch, http: { request }, ...cambios };
}

/** fetch que solo termina si lo abortan. */
const fetchColgado: typeof fetch = (_url, init) =>
  new Promise((_, rechazar) =>
    init?.signal?.addEventListener('abort', () =>
      rechazar(new DOMException('abortado', 'AbortError')),
    ),
  );

describe('modoDe', () => {
  it('Android va directo y la web por proxy', () => {
    expect(modoDe({ nativo: true })).toBe('directo');
    expect(modoDe({ nativo: false })).toBe('proxy');
  });
});

describe('transporte web', () => {
  it('pasa por el proxy del mismo origen y nunca por el host externo', async () => {
    const e = entorno(false);
    await crearTransporte(e)({
      ruta: '/public/agenda',
      params: { dias: 60, clubId: 'x y', vacio: undefined },
    });
    expect(e.http.request).not.toHaveBeenCalled();
    const [url, init] = vi.mocked(e.fetch).mock.calls[0] ?? [];
    expect(url).toBe('/api/public/agenda?dias=60&clubId=x+y');
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
  });

  it('manda el cuerpo de un POST como JSON', async () => {
    const e = entorno(false);
    await crearTransporte(e)({
      ruta: '/hierarchy/competiciones/divisiones',
      metodo: 'POST',
      cuerpo: ['a', 'b'],
    });
    const [, init] = vi.mocked(e.fetch).mock.calls[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('["a","b"]');
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' });
  });

  it('devuelve el JSON y convierte los no 2xx en ErrorApi', async () => {
    await expect(
      crearTransporte(entorno(false))({ ruta: '/x' }),
    ).resolves.toEqual({
      ok: true,
    });
    const mal = entorno(false, {
      fetch: async () => new Response('', { status: 503 }),
    });
    await expect(crearTransporte(mal)({ ruta: '/x' })).rejects.toMatchObject({
      name: 'ErrorApi',
      status: 503,
      ruta: '/x',
    });
  });

  it('un fallo de red es ErrorApi con status 0', async () => {
    const e = entorno(false, {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await expect(crearTransporte(e)({ ruta: '/x' })).rejects.toMatchObject({
      status: 0,
    });
  });

  it('vencer el timeout cuenta como fallo de red', async () => {
    const e = entorno(false, { timeoutMs: 10, fetch: fetchColgado });
    await expect(crearTransporte(e)({ ruta: '/x' })).rejects.toMatchObject({
      status: 0,
    });
  });

  it('si cancela quien pidió, propaga la cancelación tal cual', async () => {
    const control = new AbortController();
    const e = entorno(false, { fetch: fetchColgado });
    const promesa = crearTransporte(e)({ ruta: '/x', signal: control.signal });
    control.abort();
    const error = await promesa.catch((err: unknown) => err);
    expect(error).not.toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('transporte nativo', () => {
  it('habla directo con la federación por HTTP nativo', async () => {
    const e = entorno(true);
    await expect(
      crearTransporte(e)({
        ruta: '/hierarchy/competiciones/divisiones',
        metodo: 'POST',
        cuerpo: ['a'],
        params: { x: 1 },
      }),
    ).resolves.toEqual({ ok: true });
    expect(e.fetch).not.toHaveBeenCalled();
    expect(e.http.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `${API_ORIGEN}/hierarchy/competiciones/divisiones?x=1`,
        method: 'POST',
        data: ['a'],
      }),
    );
  });

  it('parsea la respuesta si llega como texto', async () => {
    const e = entorno(true, {
      http: { request: async () => respuestaHttp(200, '[1,2]') },
    });
    await expect(crearTransporte(e)({ ruta: '/x' })).resolves.toEqual([1, 2]);
  });

  it('convierte status y fallos en ErrorApi', async () => {
    const http404 = entorno(true, {
      http: { request: async () => respuestaHttp(404, null) },
    });
    await expect(
      crearTransporte(http404)({ ruta: '/x' }),
    ).rejects.toMatchObject({
      status: 404,
    });
    const sinRed = entorno(true, {
      http: {
        request: async () => {
          throw new Error('offline');
        },
      },
    });
    await expect(crearTransporte(sinRed)({ ruta: '/x' })).rejects.toMatchObject(
      {
        status: 0,
      },
    );
  });

  it('no entrega lo que se canceló mientras tanto', async () => {
    const control = new AbortController();
    const e = entorno(true, {
      http: {
        request: async () => {
          control.abort();
          return respuestaHttp(200, {});
        },
      },
    });
    await expect(
      crearTransporte(e)({ ruta: '/x', signal: control.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('esReintentable', () => {
  it.each([0, 408, 429, 500, 503])('reintenta un %i', (status) => {
    expect(esReintentable(new ErrorApi(status, '/x'))).toBe(true);
  });

  it.each([400, 403, 404])('no reintenta un %i', (status) => {
    expect(esReintentable(new ErrorApi(status, '/x'))).toBe(false);
  });

  it('no reintenta lo que no es de transporte', () => {
    expect(esReintentable(new Error('x'))).toBe(false);
  });
});
