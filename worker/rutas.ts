/**
 * Allowlist del proxy: solo pasan los endpoints de la federación que usa la
 * app, con sus parámetros validados. Lo demás es 404, así el proxy no se
 * puede usar para llegar a otras rutas de la API ni para romper la caché con
 * parámetros inventados. La usan el worker y el proxy de desarrollo de Vite.
 */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTERO = /^\d{1,3}$/;
const DEPORTE = /^[a-z]{1,8}$/;
const CANAL =
  /^acta_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Máximo de competiciones por POST de divisiones. */
export const MAX_COMPETICIONES = 100;

/**
 * Cuánto se guarda la respuesta en el edge. `vivo` decide por el cuerpo
 * (detalle de partido): poco mientras el acta está abierta y más una vez
 * cerrada.
 */
export type PoliticaCache =
  | { tipo: 'sin-cache' }
  | { tipo: 'fija'; segundos: number }
  | { tipo: 'vivo'; abierto: number; cerrado: number };

type Segmento = string | RegExp;

interface Definicion {
  nombre: string;
  metodo: 'GET' | 'POST';
  ruta: Segmento[];
  /** Parámetros admitidos; los marcados como obligatorios deben venir. */
  query?: Record<string, { patron: RegExp; obligatorio?: boolean }>;
  cache: PoliticaCache;
}

const SIN_CACHE: PoliticaCache = { tipo: 'sin-cache' };
const fija = (segundos: number): PoliticaCache => ({ tipo: 'fija', segundos });

const ENTIDAD_Y_DEPORTE = {
  entidadId: { patron: GUID, obligatorio: true },
  deporte: { patron: DEPORTE, obligatorio: true },
};

// Los tiempos salen de cuánto cambia cada cosa: lo del directo (marcadores,
// detalle con el acta abierta) en segundos, para que el detalle que pide el
// directo tras cerrar el acta no llegue viejo; calendario y clasificación en
// un minuto; la estructura de la temporada en minutos u horas.
const DEFINICIONES: Definicion[] = [
  {
    nombre: 'agenda',
    metodo: 'GET',
    ruta: ['public', 'agenda'],
    query: {
      ...ENTIDAD_Y_DEPORTE,
      dias: { patron: ENTERO },
      clubId: { patron: GUID },
    },
    cache: fija(60),
  },
  {
    nombre: 'marcadores',
    metodo: 'GET',
    ruta: ['public', 'partidos', 'marcadores'],
    query: ENTIDAD_Y_DEPORTE,
    cache: fija(5),
  },
  {
    nombre: 'estadisticas-jugador',
    metodo: 'GET',
    ruta: ['public', 'partidos', 'jugador', GUID, 'stats'],
    cache: fija(300),
  },
  {
    nombre: 'partido',
    metodo: 'GET',
    ruta: ['public', 'partidos', GUID],
    cache: { tipo: 'vivo', abierto: 5, cerrado: 600 },
  },
  {
    nombre: 'divisiones',
    metodo: 'POST',
    ruta: ['hierarchy', 'competiciones', 'divisiones'],
    cache: fija(3600),
  },
  {
    nombre: 'arbol',
    metodo: 'GET',
    ruta: ['hierarchy', 'division', GUID, 'tree'],
    cache: fija(60),
  },
  {
    nombre: 'fases',
    metodo: 'GET',
    ruta: ['hierarchy', 'division', GUID, 'fases'],
    cache: fija(600),
  },
  {
    nombre: 'equipos',
    metodo: 'GET',
    ruta: ['hierarchy', 'division', GUID, 'equipos'],
    cache: fija(600),
  },
  {
    nombre: 'estadisticas-jugadores',
    metodo: 'GET',
    ruta: ['hierarchy', 'division', GUID, 'estadisticas-jugadores'],
    cache: fija(300),
  },
  {
    nombre: 'plantilla',
    metodo: 'GET',
    ruta: ['hierarchy', 'division', GUID, 'equipo', GUID, 'plantilla'],
    cache: fija(600),
  },
  {
    nombre: 'clasificacion',
    metodo: 'GET',
    ruta: ['hierarchy', 'fase', GUID, 'clasificacion'],
    cache: fija(60),
  },
  {
    nombre: 'config-directo',
    metodo: 'GET',
    ruta: ['auth', 'config'],
    cache: fija(3600),
  },
  // Tokens de corta duración: cachearlos podría servir uno ya caducado.
  {
    nombre: 'token-directo',
    metodo: 'GET',
    ruta: ['auth', 'centrifugo-token-public'],
    cache: SIN_CACHE,
  },
  {
    nombre: 'token-canal',
    metodo: 'GET',
    ruta: ['auth', 'centrifugo-sub-token'],
    query: { channel: { patron: CANAL, obligatorio: true } },
    cache: SIN_CACHE,
  },
];

export interface RutaPermitida {
  nombre: string;
  /** Ruta bajo `/api`, sin `/` inicial, con los segmentos ya validados. */
  ruta: string;
  /** Query normalizada (solo parámetros admitidos, en orden): `?a=1&b=2` o `''`. */
  query: string;
  cache: PoliticaCache;
}

function encaja(patron: Segmento[], segmentos: string[]): boolean {
  return (
    patron.length === segmentos.length &&
    patron.every((p, i) => {
      const s = segmentos[i] ?? '';
      return typeof p === 'string' ? p === s : p.test(s);
    })
  );
}

function normalizarQuery(
  definicion: Definicion,
  params: URLSearchParams,
): string | null {
  const admitidos = definicion.query ?? {};
  const salida = new URLSearchParams();
  for (const clave of new Set(params.keys())) {
    const regla = admitidos[clave];
    const valores = params.getAll(clave);
    if (
      !regla ||
      valores.length !== 1 ||
      !regla.patron.test(valores[0] ?? '')
    ) {
      return null;
    }
  }
  for (const [clave, regla] of Object.entries(admitidos).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const valor = params.get(clave);
    if (valor === null) {
      if (regla.obligatorio) return null;
      continue;
    }
    salida.set(clave, valor);
  }
  const qs = salida.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Busca la ruta en la allowlist. `ruta` es lo que va tras `/api/`, sin
 * decodificar; `null` si no está permitida.
 */
export function rutaPermitida(
  metodo: string,
  ruta: string,
  params: URLSearchParams,
): RutaPermitida | null {
  const segmentos = ruta.split('/');
  for (const definicion of DEFINICIONES) {
    if (definicion.metodo !== metodo) continue;
    if (!encaja(definicion.ruta, segmentos)) continue;
    const query = normalizarQuery(definicion, params);
    if (query === null) return null;
    return {
      nombre: definicion.nombre,
      ruta: segmentos.join('/'),
      query,
      cache: definicion.cache,
    };
  }
  return null;
}

/**
 * Cuerpo del POST de divisiones: una lista corta de GUID, sin repetidos y en
 * orden, para que dos peticiones con las mismas competiciones compartan caché.
 * `null` si no vale.
 */
export function competicionesValidas(cuerpo: unknown): string[] | null {
  if (
    !Array.isArray(cuerpo) ||
    cuerpo.length === 0 ||
    cuerpo.length > MAX_COMPETICIONES ||
    !cuerpo.every((id) => typeof id === 'string' && GUID.test(id))
  ) {
    return null;
  }
  return [...new Set(cuerpo.map((id: string) => id.toLowerCase()))].sort();
}
