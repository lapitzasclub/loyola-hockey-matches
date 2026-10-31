/** Web pública de la federación: de ella cuelgan los calendarios `.ics`. */
export const FEDERACION_ORIGEN = 'https://fvpatinaje.eus';

export interface EnlacesCalendario {
  /** Dirección del `.ics`, para pegarla en cualquier app de calendario. */
  https: string;
  /** La misma con `webcal://`: iPhone, Mac y Outlook ofrecen suscribirse. */
  webcal: string;
  /** Alta directa en Google Calendar. */
  google: string;
}

/**
 * Suscripción al calendario de un equipo. Lo sirve la federación y la app del
 * calendario lo pide directamente (no pasa por nuestro proxy): se refresca
 * solo cuando cambian la hora o la pista.
 */
export function enlacesCalendario(equipoId: string): EnlacesCalendario {
  const https = `${FEDERACION_ORIGEN}/api/public/calendario/equipo/${encodeURIComponent(equipoId)}.ics`;
  const webcal = https.replace(/^https?:\/\//, 'webcal://');
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
