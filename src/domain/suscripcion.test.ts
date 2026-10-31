import { describe, expect, it } from 'vitest';

import { enlacesCalendario } from './suscripcion';

const EQUIPO = 'e76fdb3d-13e2-4bc6-ba00-e7b8ccfbf551';

describe('enlacesCalendario', () => {
  const enlaces = enlacesCalendario(EQUIPO);

  it('apunta al .ics del equipo en la web de la federación', () => {
    expect(enlaces.https).toBe(
      `https://fvpatinaje.eus/api/public/calendario/equipo/${EQUIPO}.ics`,
    );
  });

  it('la versión webcal es la misma dirección con otro esquema', () => {
    expect(enlaces.webcal).toBe(
      `webcal://fvpatinaje.eus/api/public/calendario/equipo/${EQUIPO}.ics`,
    );
  });

  it('Google recibe el webcal escapado como cid', () => {
    expect(enlaces.google).toBe(
      `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(enlaces.webcal)}`,
    );
    expect(new URL(enlaces.google).searchParams.get('cid')).toBe(
      enlaces.webcal,
    );
  });
});
