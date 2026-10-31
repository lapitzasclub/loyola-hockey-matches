import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { HttpOptions, HttpResponse } from '@capacitor/core';

/**
 * Único punto que decide cómo se llega a la API. Android (Capacitor) habla
 * directo con la federación por HTTP nativo, sin CORS; la web pasa siempre
 * por el proxy `/api` del mismo origen (Vite en desarrollo, Cloudflare en
 * producción), porque la API no acepta peticiones CORS.
 */
export const API_ORIGEN = 'https://fvpatinaje.eus/api';
const API_PROXY = '/api';

/** La federación tarda a veces varios segundos con el árbol de una división. */
const TIMEOUT_MS = 20_000;

export type ModoTransporte = 'directo' | 'proxy';

export interface PeticionApi {
  /** Ruta bajo `/api`, empezando por `/`: `/public/agenda`. */
  ruta: string;
  metodo?: 'GET' | 'POST';
  params?: Record<string, string | number | undefined>;
  /** Cuerpo JSON (solo POST). */
  cuerpo?: unknown;
  signal?: AbortSignal;
}

/** Devuelve el JSON de la respuesta sin validar; lo valida el cliente. */
export type Transporte = (peticion: PeticionApi) => Promise<unknown>;

/**
 * Fallo de red o respuesta no 2xx. `status` vale 0 si no hubo respuesta
 * (sin conexión, DNS, timeout).
 */
export class ErrorApi extends Error {
  readonly status: number;
  readonly ruta: string;

  constructor(status: number, ruta: string, causa?: unknown) {
    super(
      status === 0 ? `Sin respuesta de ${ruta}` : `HTTP ${status} en ${ruta}`,
      { cause: causa },
    );
    this.name = 'ErrorApi';
    this.status = status;
    this.ruta = ruta;
  }
}

/**
 * Solo se reintenta lo que puede salir bien a la segunda: sin respuesta,
 * timeout, saturación (429) o error del servidor. Un 404 o un cambio de
 * forma de la API no se arreglan reintentando.
 */
export function esReintentable(error: unknown): boolean {
  if (!(error instanceof ErrorApi)) return false;
  const { status } = error;
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export interface EntornoTransporte {
  nativo: boolean;
  fetch: typeof fetch;
  http: { request(opciones: HttpOptions): Promise<HttpResponse> };
  timeoutMs?: number;
}

export function modoDe(
  entorno: Pick<EntornoTransporte, 'nativo'>,
): ModoTransporte {
  return entorno.nativo ? 'directo' : 'proxy';
}

function construirUrl(base: string, { ruta, params }: PeticionApi): string {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined) query.set(clave, String(valor));
  }
  const qs = query.toString();
  return `${base}${ruta}${qs ? `?${qs}` : ''}`;
}

function cabeceras(peticion: PeticionApi): Record<string, string> {
  return peticion.cuerpo === undefined
    ? { accept: 'application/json' }
    : { accept: 'application/json', 'content-type': 'application/json' };
}

/**
 * Señal que aborta con la del llamante o al vencer el timeout. Se hace a
 * mano porque `AbortSignal.any` no existe en Safari < 17.4.
 */
function senalConTimeout(signal: AbortSignal | undefined, ms: number) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ms);
  const alAbortar = () => control.abort(signal?.reason);
  if (signal?.aborted) alAbortar();
  else signal?.addEventListener('abort', alAbortar, { once: true });
  return {
    signal: control.signal,
    limpiar() {
      clearTimeout(reloj);
      signal?.removeEventListener('abort', alAbortar);
    },
  };
}

async function pedirConFetch(
  entorno: EntornoTransporte,
  peticion: PeticionApi,
): Promise<unknown> {
  const { signal, limpiar } = senalConTimeout(
    peticion.signal,
    entorno.timeoutMs ?? TIMEOUT_MS,
  );
  try {
    let respuesta: Response;
    try {
      respuesta = await entorno.fetch(construirUrl(API_PROXY, peticion), {
        method: peticion.metodo ?? 'GET',
        headers: cabeceras(peticion),
        body:
          peticion.cuerpo === undefined
            ? undefined
            : JSON.stringify(peticion.cuerpo),
        signal,
      });
    } catch (error) {
      // Si cancela quien pidió (TanStack Query al desmontar), se propaga tal cual.
      if (peticion.signal?.aborted) throw error;
      throw new ErrorApi(0, peticion.ruta, error);
    }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, peticion.ruta);
    return await respuesta.json();
  } finally {
    limpiar();
  }
}

async function pedirNativo(
  entorno: EntornoTransporte,
  peticion: PeticionApi,
): Promise<unknown> {
  const timeout = entorno.timeoutMs ?? TIMEOUT_MS;
  let respuesta: HttpResponse;
  try {
    respuesta = await entorno.http.request({
      url: construirUrl(API_ORIGEN, peticion),
      method: peticion.metodo ?? 'GET',
      headers: cabeceras(peticion),
      data: peticion.cuerpo,
      responseType: 'json',
      connectTimeout: timeout,
      readTimeout: timeout,
    });
  } catch (error) {
    throw new ErrorApi(0, peticion.ruta, error);
  }
  // El HTTP nativo no se puede cancelar: al menos no se entrega lo ya abortado.
  peticion.signal?.throwIfAborted();
  if (respuesta.status < 200 || respuesta.status >= 300) {
    throw new ErrorApi(respuesta.status, peticion.ruta);
  }
  const { data } = respuesta as { data: unknown };
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export function crearTransporte(entorno: EntornoTransporte): Transporte {
  return (peticion) =>
    entorno.nativo
      ? pedirNativo(entorno, peticion)
      : pedirConFetch(entorno, peticion);
}

const entorno: EntornoTransporte = {
  nativo: Capacitor.isNativePlatform(),
  fetch: (...args) => globalThis.fetch(...args),
  http: CapacitorHttp,
};

/** Modo de este runtime. */
export const modoTransporte: ModoTransporte = modoDe(entorno);

/**
 * URL del WebSocket del directo. Android abre la de la federación; la web,
 * la misma ruta en su propio origen, que el proxy (Vite en desarrollo,
 * Cloudflare en producción) pasa a la federación.
 */
export function urlDirectoPara(
  modo: ModoTransporte,
  url: string,
  origen: Pick<Location, 'protocol' | 'host'>,
): string {
  if (modo === 'directo') return url;
  const protocolo = origen.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${origen.host}${new URL(url).pathname}`;
}

export const urlDirecto = (url: string): string =>
  urlDirectoPara(modoTransporte, url, location);

export const transporte: Transporte = crearTransporte(entorno);
