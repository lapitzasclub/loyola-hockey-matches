// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { crearLimitador } from './limite';
import type { KvLimite } from './limite';

function kvEnMemoria() {
  const datos = new Map<string, string>();
  const kv: KvLimite = {
    get: vi.fn(async (clave: string) => datos.get(clave) ?? null),
    put: vi.fn(async (clave: string, valor: string) => {
      datos.set(clave, valor);
    }),
  };
  return { kv, datos };
}

describe('crearLimitador', () => {
  it('deja pasar hasta el máximo por ventana y bloquea hasta que acaba', async () => {
    let t = 0;
    const limitador = crearLimitador({
      maximo: 3,
      ventanaMs: 60_000,
      ahora: () => t,
    });
    for (let i = 0; i < 3; i++)
      expect(await limitador.comprobar('1.1.1.1')).toBeNull();
    t = 15_000;
    expect(await limitador.comprobar('1.1.1.1')).toBe(45);
    expect(await limitador.comprobar('2.2.2.2')).toBeNull();
    t = 60_000;
    expect(await limitador.comprobar('1.1.1.1')).toBeNull();
  });

  it('escribe en KV solo al bloquear, una vez por ventana', async () => {
    let t = 0;
    const { kv } = kvEnMemoria();
    const limitador = crearLimitador({
      maximo: 2,
      ventanaMs: 60_000,
      ahora: () => t,
    });
    for (let i = 0; i < 2; i++) await limitador.comprobar('1.1.1.1', kv);
    expect(kv.put).not.toHaveBeenCalled();
    t = 1000;
    await limitador.comprobar('1.1.1.1', kv);
    await limitador.comprobar('1.1.1.1', kv);
    expect(kv.put).toHaveBeenCalledTimes(1);
    expect(kv.put).toHaveBeenCalledWith('bloqueo:1.1.1.1', '60000', {
      expirationTtl: 60,
    });
  });

  it('respeta el bloqueo que puso otra instancia y espacia las lecturas de KV', async () => {
    let t = 0;
    const { kv, datos } = kvEnMemoria();
    const otra = crearLimitador({
      maximo: 1,
      ventanaMs: 60_000,
      ahora: () => t,
    });
    const esta = crearLimitador({
      maximo: 100,
      ventanaMs: 60_000,
      consultaKvMs: 30_000,
      ahora: () => t,
    });

    expect(await esta.comprobar('1.1.1.1', kv)).toBeNull();
    await otra.comprobar('1.1.1.1', kv);
    await otra.comprobar('1.1.1.1', kv);
    expect(datos.get('bloqueo:1.1.1.1')).toBe('60000');
    vi.mocked(kv.get).mockClear();

    t = 10_000;
    // Todavía no toca mirar en KV.
    expect(await esta.comprobar('1.1.1.1', kv)).toBeNull();
    expect(kv.get).not.toHaveBeenCalled();
    t = 30_000;
    expect(await esta.comprobar('1.1.1.1', kv)).toBe(30);
    expect(await esta.comprobar('1.1.1.1', kv)).toBe(30);
    expect(kv.get).toHaveBeenCalledTimes(1);
  });

  it('un fallo de KV no bloquea a nadie', async () => {
    const kv: KvLimite = {
      get: () => Promise.reject(new Error('kv caído')),
      put: () => Promise.reject(new Error('kv caído')),
    };
    const limitador = crearLimitador({
      maximo: 1,
      ventanaMs: 60_000,
      ahora: () => 0,
    });
    expect(await limitador.comprobar('1.1.1.1', kv)).toBeNull();
    expect(await limitador.comprobar('1.1.1.1', kv)).toBe(60);
  });
});
