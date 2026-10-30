import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import type {
  PersistQueryClientOptions,
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';
import { createStore, del, get, set } from 'idb-keyval';

import { VIDA_CACHE } from '../queries';

/**
 * Se sube cuando cambia la forma de los datos de dominio guardados: una caché
 * con otra versión se descarta al arrancar en vez de pintar datos rotos.
 */
export const VERSION_CACHE = 'v2-1';

/** Dónde se guarda la caché. En tests se sustituye por uno en memoria. */
export interface AlmacenCache {
  leer(): Promise<PersistedClient | undefined>;
  guardar(cliente: PersistedClient): Promise<void>;
  borrar(): Promise<void>;
}

const CLAVE = 'cliente';

/**
 * IndexedDB guarda el objeto por clonado estructurado, sin pasar por
 * `JSON.stringify` de toda la caché en el hilo principal. Si no existe
 * (navegación privada antigua, jsdom) la app funciona igual, sin persistir.
 */
export function almacenIndexedDb(): AlmacenCache {
  if (typeof indexedDB === 'undefined') {
    return {
      leer: async () => undefined,
      guardar: async () => {},
      borrar: async () => {},
    };
  }
  const tienda = createStore('loyola-hockey', 'cache');
  return {
    leer: () => get<PersistedClient>(CLAVE, tienda),
    guardar: (cliente) => set(CLAVE, cliente, tienda),
    borrar: () => del(CLAVE, tienda),
  };
}

export interface PersisterCache extends Persister {
  /** Escribe ya lo pendiente (la app pasa a segundo plano y puede morir). */
  vaciar(): Promise<void>;
}

/**
 * TanStack pide guardar en cada cambio de la caché; se agrupan los de un
 * segundo en una sola escritura. Un fallo al leer o escribir no rompe la app:
 * en el peor caso la siguiente apertura arranca en frío.
 */
export function crearPersister(
  almacen: AlmacenCache,
  esperaMs = 1000,
): PersisterCache {
  let pendiente: PersistedClient | undefined;
  let reloj: ReturnType<typeof setTimeout> | undefined;

  async function vaciar() {
    clearTimeout(reloj);
    reloj = undefined;
    const cliente = pendiente;
    pendiente = undefined;
    if (cliente) await almacen.guardar(cliente).catch(() => {});
  }

  return {
    persistClient(cliente) {
      pendiente = cliente;
      reloj ??= setTimeout(() => void vaciar(), esperaMs);
    },
    async restoreClient() {
      return almacen.leer().catch(() => undefined);
    },
    async removeClient() {
      clearTimeout(reloj);
      reloj = undefined;
      pendiente = undefined;
      await almacen.borrar().catch(() => {});
    },
    vaciar,
  };
}

export function opcionesPersistencia(
  persister: Persister,
): Omit<PersistQueryClientOptions, 'queryClient'> {
  return {
    persister,
    buster: VERSION_CACHE,
    maxAge: VIDA_CACHE,
    dehydrateOptions: {
      shouldDehydrateQuery: (consulta) =>
        defaultShouldDehydrateQuery(consulta) &&
        consulta.meta?.persistir !== false,
    },
  };
}
