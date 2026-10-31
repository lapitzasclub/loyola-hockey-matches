// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  competicionesValidas,
  MAX_COMPETICIONES,
  rutaPermitida,
} from './rutas';

const G1 = 'dd7180cb-3790-41a7-9993-7643575541a5';
const G2 = 'f991edaf-9299-4cf1-bd15-0645d01b08d1';
const ENTIDAD = '00000000-0000-4000-0000-000000000001';

const qs = (s = '') => new URLSearchParams(s);

describe('rutaPermitida', () => {
  it('deja pasar cada endpoint que usa la app', () => {
    const casos: [string, string, string][] = [
      [
        'GET',
        'public/agenda',
        `entidadId=${ENTIDAD}&deporte=hp&dias=60&clubId=${G1}`,
      ],
      ['GET', 'public/partidos/marcadores', `entidadId=${ENTIDAD}&deporte=hp`],
      ['GET', `public/partidos/${G1}`, ''],
      ['GET', `public/partidos/jugador/${G1}/stats`, ''],
      ['POST', 'hierarchy/competiciones/divisiones', ''],
      ['GET', `hierarchy/division/${G1}/tree`, ''],
      ['GET', `hierarchy/division/${G1}/fases`, ''],
      ['GET', `hierarchy/division/${G1}/equipos`, ''],
      ['GET', `hierarchy/division/${G1}/estadisticas-jugadores`, ''],
      ['GET', `hierarchy/division/${G1}/equipo/${G2}/plantilla`, ''],
      ['GET', `hierarchy/fase/${G2}/clasificacion`, ''],
      ['GET', 'auth/config', ''],
      ['GET', 'auth/centrifugo-token-public', ''],
      ['GET', 'auth/centrifugo-sub-token', `channel=acta_${G1}`],
    ];
    for (const [metodo, ruta, query] of casos) {
      expect(
        rutaPermitida(metodo, ruta, qs(query)),
        `${metodo} ${ruta}`,
      ).not.toBeNull();
    }
  });

  it('distingue el detalle de partido de los marcadores', () => {
    expect(rutaPermitida('GET', `public/partidos/${G1}`, qs())?.nombre).toBe(
      'partido',
    );
    expect(
      rutaPermitida(
        'GET',
        'public/partidos/marcadores',
        qs(`entidadId=${ENTIDAD}&deporte=hp`),
      )?.nombre,
    ).toBe('marcadores');
  });

  it('rechaza rutas, métodos e ids fuera de la allowlist', () => {
    expect(rutaPermitida('GET', 'web/noticias', qs())).toBeNull();
    expect(rutaPermitida('GET', 'auth/login', qs())).toBeNull();
    expect(rutaPermitida('POST', 'public/agenda', qs())).toBeNull();
    expect(
      rutaPermitida('GET', 'hierarchy/competiciones/divisiones', qs()),
    ).toBeNull();
    expect(rutaPermitida('GET', 'public/partidos/123', qs())).toBeNull();
    expect(
      rutaPermitida('GET', `hierarchy/division/${G1}/../../auth/x`, qs()),
    ).toBeNull();
    expect(
      rutaPermitida('GET', `hierarchy/division/${G1}/tree/`, qs()),
    ).toBeNull();
  });

  it('rechaza parámetros desconocidos, repetidos o mal formados', () => {
    const base = `entidadId=${ENTIDAD}&deporte=hp`;
    expect(
      rutaPermitida('GET', 'public/partidos/marcadores', qs(`${base}&x=1`)),
    ).toBeNull();
    expect(
      rutaPermitida('GET', `hierarchy/division/${G1}/tree`, qs('t=1')),
    ).toBeNull();
    expect(
      rutaPermitida(
        'GET',
        'public/partidos/marcadores',
        qs(`${base}&deporte=hp`),
      ),
    ).toBeNull();
    expect(
      rutaPermitida('GET', 'public/partidos/marcadores', qs('deporte=hp')),
    ).toBeNull();
    expect(
      rutaPermitida('GET', 'auth/centrifugo-sub-token', qs('channel=otro')),
    ).toBeNull();
    expect(rutaPermitida('GET', 'auth/centrifugo-sub-token', qs())).toBeNull();
  });

  it('normaliza la query en orden alfabético para que la caché sea una', () => {
    const a = rutaPermitida(
      'GET',
      'public/partidos/marcadores',
      qs(`deporte=hp&entidadId=${ENTIDAD}`),
    );
    const b = rutaPermitida(
      'GET',
      'public/partidos/marcadores',
      qs(`entidadId=${ENTIDAD}&deporte=hp`),
    );
    expect(a?.query).toBe(`?deporte=hp&entidadId=${ENTIDAD}`);
    expect(b?.query).toBe(a?.query);
  });

  it('no cachea los tokens del directo', () => {
    expect(
      rutaPermitida('GET', 'auth/centrifugo-token-public', qs())?.cache,
    ).toEqual({
      tipo: 'sin-cache',
    });
  });
});

describe('competicionesValidas', () => {
  it('ordena y quita repetidos', () => {
    expect(competicionesValidas([G2, G1, G2.toUpperCase()])).toEqual([G1, G2]);
  });

  it('rechaza lo que no es una lista corta de GUID', () => {
    expect(competicionesValidas(null)).toBeNull();
    expect(competicionesValidas([])).toBeNull();
    expect(competicionesValidas({ ids: [G1] })).toBeNull();
    expect(competicionesValidas([G1, 'x'])).toBeNull();
    expect(competicionesValidas([G1, 3])).toBeNull();
    expect(
      competicionesValidas(Array(MAX_COMPETICIONES + 1).fill(G1)),
    ).toBeNull();
  });
});
