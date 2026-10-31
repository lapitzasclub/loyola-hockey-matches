import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MarcadorDirecto, PartidoDetalle } from '../domain';
import { detalle, equipo } from '../domain/test-utils';
import { claves } from '../queries/claves';
import type { ConexionDirecto, ManejadoresCanal } from './conexion';
import { instalarDirecto } from './gestor';
import type { OpcionesDirecto } from './gestor';

const HOY = '2026-10-31';
const ESPERA_REFRESCO = 800;
const ESPERA_SUSPENSION = 10_000;

function conexionFalsa() {
  const canales = new Map<string, ManejadoresCanal>();
  const conexion = {
    canales,
    suscribir: vi.fn((canal: string, manejadores: ManejadoresCanal) => {
      canales.set(canal, manejadores);
      return () => canales.delete(canal);
    }),
    reanudar: vi.fn(),
    suspender: vi.fn(),
    publicar(partidoId: string, datos: unknown) {
      canales.get(`acta_${partidoId}`)?.alMensaje(datos);
    },
  } satisfies ConexionDirecto & Record<string, unknown>;
  return conexion;
}

const LOCAL = '11111111-1111-4111-8111-111111111111';

const enJuego = (extra: Partial<PartidoDetalle> = {}) =>
  detalle({
    id: 'p',
    fecha: HOY,
    estado: 'en_juego',
    periodo: 1,
    local: {
      ...detalle().local,
      equipo: equipo('loc', { equipoId: LOCAL }),
    },
    ...extra,
  });

const gol = {
  type: 'incidencia_creada',
  incidencia: {
    id: '22222222-2222-4222-8222-222222222222',
    fechaCreacion: '2026-10-31T10:12:00.1234567Z',
    periodo: 1,
    minuto: 20,
    segundo: 5,
    equipoId: LOCAL,
    tipo: 'GOL',
    plantillaEquipoId: null,
    plantillaEquipoSecundariaId: null,
    porteroId: null,
    resultado: null,
    codigo: null,
    duracionSancionSegundos: null,
  },
};

let cliente: QueryClient;
let conexion: ReturnType<typeof conexionFalsa>;
let pedidas: string[];
let desinstalar: () => void;
let visibilidad: (visible: boolean) => void;
let alGol: ReturnType<typeof vi.fn<NonNullable<OpcionesDirecto['alGol']>>>;

/** Lo que respondería la API a la siguiente petición del detalle. */
let servir: () => Promise<PartidoDetalle>;

function instalar(conectar = async (): Promise<ConexionDirecto> => conexion) {
  desinstalar = instalarDirecto(cliente, {
    conectar,
    alGol,
    hoy: () => HOY,
    escucharVisibilidad: (alCambiar) => {
      visibilidad = alCambiar;
      return () => {};
    },
    esperaRefresco: ESPERA_REFRESCO,
    esperaSuspension: ESPERA_SUSPENSION,
    esperaReintento: 15_000,
  });
}

/** Una pantalla que muestra el partido: un observador de su consulta. */
function abrir(id = 'p') {
  const observador = new QueryObserver(cliente, {
    queryKey: claves.partido(id),
    queryFn: () => {
      pedidas.push(id);
      return servir();
    },
    staleTime: Infinity,
  });
  return observador.subscribe(() => {});
}

const datos = () => cliente.getQueryData<PartidoDetalle>(claves.partido('p'));

beforeEach(() => {
  vi.useFakeTimers();
  cliente = new QueryClient();
  conexion = conexionFalsa();
  pedidas = [];
  alGol = vi.fn();
  servir = async () => enJuego();
  cliente.setQueryData(claves.partido('p'), enJuego());
});

afterEach(() => {
  desinstalar();
  cliente.clear();
  vi.useRealTimers();
});

describe('qué partidos se siguen', () => {
  it('el de hoy abierto en pantalla, hasta que se cierra', async () => {
    instalar();
    const cerrar = abrir();
    await vi.advanceTimersByTimeAsync(0);
    expect(conexion.suscribir).toHaveBeenCalledWith(
      'acta_p',
      expect.anything(),
    );
    expect(conexion.reanudar).toHaveBeenCalledTimes(1);

    cerrar();
    expect(conexion.canales.size).toBe(0);
    expect(conexion.suspender).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(ESPERA_SUSPENSION);
    expect(conexion.suspender).toHaveBeenCalledTimes(1);
  });

  it('dos pantallas del mismo partido comparten la suscripción', async () => {
    instalar();
    const cerrarUna = abrir();
    const cerrarOtra = abrir();
    await vi.advanceTimersByTimeAsync(0);
    expect(conexion.suscribir).toHaveBeenCalledTimes(1);
    cerrarUna();
    expect(conexion.canales.size).toBe(1);
    cerrarOtra();
    expect(conexion.canales.size).toBe(0);
  });

  it('no se conecta por un partido de otro día ya jugado', async () => {
    cliente.setQueryData(
      claves.partido('p'),
      enJuego({ fecha: '2026-10-24', estado: 'finalizado', periodo: 30 }),
    );
    const conectar = vi.fn(async () => conexion);
    instalar(conectar);
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    expect(conectar).not.toHaveBeenCalled();
  });

  it('empieza a seguirlo cuando llega el detalle, si no estaba en caché', async () => {
    cliente.clear();
    servir = async () => enJuego({ id: 'q' });
    instalar();
    abrir('q');
    await vi.advanceTimersByTimeAsync(0);
    expect(conexion.canales.has('acta_q')).toBe(true);
  });

  it('si no puede conectar lo vuelve a intentar', async () => {
    const conectar = vi
      .fn<() => Promise<ConexionDirecto>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(conexion);
    instalar(conectar);
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    expect(conexion.canales.size).toBe(0);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(conectar).toHaveBeenCalledTimes(2);
    expect(conexion.canales.has('acta_p')).toBe(true);
  });

  it('al desinstalar suelta las suscripciones y cierra', async () => {
    instalar();
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    desinstalar();
    expect(conexion.canales.size).toBe(0);
    expect(conexion.suspender).toHaveBeenCalledTimes(1);
  });
});

describe('segundo plano', () => {
  it('cierra el WebSocket al rato de ocultarse y lo reabre al volver', async () => {
    instalar();
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    visibilidad(false);
    await vi.advanceTimersByTimeAsync(ESPERA_SUSPENSION - 1);
    expect(conexion.suspender).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(conexion.suspender).toHaveBeenCalledTimes(1);
    // La suscripción se conserva: Centrifugo la rehace al reconectar.
    expect(conexion.canales.size).toBe(1);

    visibilidad(true);
    expect(conexion.reanudar).toHaveBeenCalledTimes(2);
  });

  it('una vuelta rápida no corta la conexión', async () => {
    instalar();
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    visibilidad(false);
    await vi.advanceTimersByTimeAsync(3_000);
    visibilidad(true);
    await vi.advanceTimersByTimeAsync(ESPERA_SUSPENSION);
    expect(conexion.suspender).not.toHaveBeenCalled();
    expect(conexion.reanudar).toHaveBeenCalledTimes(1);
  });

  it('los mensajes que siguen llegando no aplazan el cierre', async () => {
    instalar();
    abrir();
    await vi.advanceTimersByTimeAsync(0);
    visibilidad(false);
    for (let s = 0; s < 4; s += 1) {
      await vi.advanceTimersByTimeAsync(3_000);
      conexion.publicar('p', {
        type: 'crono',
        periodo: 1,
        min: 20 - s,
        sec: 0,
        enMarcha: true,
      });
    }
    expect(conexion.suspender).toHaveBeenCalledTimes(1);
  });
});

describe('mensajes', () => {
  async function siguiendo() {
    instalar();
    abrir();
    await vi.advanceTimersByTimeAsync(0);
  }

  it('al suscribirse pide el detalle: lo publicado antes no se recupera', async () => {
    await siguiendo();
    conexion.canales.get('acta_p')?.alSuscribir();
    await vi.advanceTimersByTimeAsync(0);
    expect(pedidas).toEqual(['p']);
  });

  it('un gol entra en el detalle y en el marcador de las listas, y se celebra', async () => {
    const otro: MarcadorDirecto = {
      partidoId: 'otro',
      competicionId: 'c',
      estado: 'en_juego',
      periodo: 1,
      goles: { local: 0, visitante: 0 },
      oficial: { local: 0, visitante: 0 },
      ganadorDesempate: null,
    };
    cliente.setQueryData(claves.marcadores(), [otro]);
    await siguiendo();
    conexion.publicar('p', gol);

    expect(datos()?.incidencias.map((i) => i.id)).toEqual([gol.incidencia.id]);
    expect(
      cliente.getQueryData<MarcadorDirecto[]>(claves.marcadores()),
    ).toEqual([
      otro,
      expect.objectContaining({
        partidoId: 'p',
        goles: { local: 1, visitante: 0 },
      }),
    ]);
    expect(alGol).toHaveBeenCalledWith('p', 'local');
    await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO);
    expect(pedidas).toEqual([]);
  });

  it('una alineación nueva se pide, juntando la ráfaga en una petición', async () => {
    await siguiendo();
    for (let i = 0; i < 3; i += 1) {
      conexion.publicar('p', { type: 'alineacion_actualizada', matchId: 'p' });
      await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO / 2);
    }
    expect(pedidas).toEqual([]);
    await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO);
    expect(pedidas).toEqual(['p']);
  });

  it('las firmas y verificaciones no piden nada', async () => {
    await siguiendo();
    conexion.publicar('p', { type: 'firma_guardada', matchId: 'p' });
    conexion.publicar('p', { type: 'atleta_verificado', matchId: 'p' });
    await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO);
    expect(pedidas).toEqual([]);
  });

  it('un mensaje que no se entiende se resuelve pidiendo el detalle', async () => {
    await siguiendo();
    conexion.publicar('p', { type: 'incidencia_creada', incidencia: {} });
    await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO);
    expect(pedidas).toEqual(['p']);
  });

  it('lo llegado mientras se pedía el detalle no se pierde', async () => {
    await siguiendo();
    // La respuesta es de antes del gol, pero llega después.
    let responder: () => void = () => {};
    servir = () =>
      new Promise((resolver) => {
        responder = () => resolver(enJuego());
      });
    void cliente.invalidateQueries({ queryKey: claves.partido('p') });
    conexion.publicar('p', gol);
    expect(datos()?.incidencias).toHaveLength(1);
    responder();
    await vi.advanceTimersByTimeAsync(0);
    expect(datos()?.incidencias).toHaveLength(1);
    expect(alGol).toHaveBeenCalledTimes(1);
  });

  it('el reloj y el periodo se aplican sin pedir nada', async () => {
    await siguiendo();
    conexion.publicar('p', {
      type: 'crono',
      matchId: 'p',
      periodo: 2,
      min: 24,
      sec: 59,
      enMarcha: true,
    });
    expect(datos()).toMatchObject({
      periodo: 2,
      reloj: { minuto: 24, segundo: 59, enMarcha: true },
    });
    await vi.advanceTimersByTimeAsync(ESPERA_REFRESCO);
    expect(pedidas).toEqual([]);
  });
});
