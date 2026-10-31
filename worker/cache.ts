import type { PoliticaCache } from './rutas';

/** Acta del detalle de partido cuando el partido ya no cambia. */
const ACTA_CERRADA = 'FINALIZADO';

export const JSON_UTF8 = 'application/json; charset=utf-8';

export interface Respuesta {
  status: number;
  cuerpo: string;
  contentType: string;
  /** `HIT` si salió del edge, `MISS` si se pidió a la federación. */
  cache: 'HIT' | 'MISS';
}

/**
 * Segundos que se guarda una respuesta 200 según su política. El detalle de
 * partido se mira por dentro: con el acta abierta va casi sin caché, porque
 * el directo lo pide justo cuando cambia algo que el mensaje no trae.
 */
export function segundosDeCache(
  politica: PoliticaCache,
  cuerpo: string,
): number {
  switch (politica.tipo) {
    case 'sin-cache':
      return 0;
    case 'fija':
      return politica.segundos;
    case 'vivo': {
      let acta: unknown;
      try {
        acta = (JSON.parse(cuerpo) as { actaEstado?: unknown }).actaEstado;
      } catch {
        return politica.abierto;
      }
      return acta === ACTA_CERRADA ? politica.cerrado : politica.abierto;
    }
  }
}

/** Cache API del edge; `null` donde no existe (tests, Node). */
async function abrirCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open('api');
  } catch {
    return null;
  }
}

interface Opciones {
  /** URL que identifica la respuesta (GET con la query normalizada). */
  clave: string;
  politica: PoliticaCache;
  pedir: () => Promise<Response>;
  /** Alarga la vida de la petición para guardar sin hacer esperar al cliente. */
  enSegundoPlano: (tarea: Promise<unknown>) => void;
}

/**
 * Sirve desde el edge si hay copia y, si no, pide a la federación y guarda
 * las respuestas 200 el tiempo que diga la política.
 */
export async function conCache({
  clave,
  politica,
  pedir,
  enSegundoPlano,
}: Opciones): Promise<Respuesta> {
  const cache = politica.tipo === 'sin-cache' ? null : await abrirCache();
  const guardada = await cache?.match(clave).catch(() => undefined);
  if (guardada) {
    return {
      status: guardada.status,
      cuerpo: await guardada.text(),
      contentType: guardada.headers.get('content-type') ?? JSON_UTF8,
      cache: 'HIT',
    };
  }

  const upstream = await pedir();
  const cuerpo = await upstream.text();
  const contentType = upstream.headers.get('content-type') ?? JSON_UTF8;
  const segundos =
    upstream.status === 200 ? segundosDeCache(politica, cuerpo) : 0;
  if (cache && segundos > 0) {
    const copia = new Response(cuerpo, {
      headers: {
        'content-type': contentType,
        'cache-control': `public, max-age=${segundos}`,
      },
    });
    enSegundoPlano(cache.put(clave, copia).catch(() => undefined));
  }
  return { status: upstream.status, cuerpo, contentType, cache: 'MISS' };
}
