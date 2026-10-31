import { hashKey } from '@tanstack/react-query';
import type { QueryCacheNotifyEvent, QueryClient } from '@tanstack/react-query';

import { eventoDirectoSchema } from '../api/schemas';
import type { EventoDirectoApi } from '../api/schemas';
import {
  fechaLocal,
  fusionarMarcador,
  marcadorDirectoDe,
  seguirEnDirecto,
} from '../domain';
import type { Lado, MarcadorDirecto, PartidoDetalle } from '../domain';
import { claves } from '../queries/claves';
import type { ConexionDirecto } from './conexion';
import { aplicarEvento } from './reducer';

/** Avisa de cada cambio de visibilidad de la app; devuelve la baja. */
export type EscucharVisibilidad = (
  alCambiar: (visible: boolean) => void,
) => () => void;

export interface OpcionesDirecto {
  /** Abre la conexión la primera vez que hace falta seguir un partido. */
  conectar: () => Promise<ConexionDirecto>;
  /** Alguien acaba de marcar en un partido que se sigue. */
  alGol?: (partidoId: string, lado: Lado) => void;
  escucharVisibilidad?: EscucharVisibilidad;
  hoy?: () => string;
  /** Tras un mensaje que obliga a pedir el detalle, cuánto esperar para juntar la ráfaga. */
  esperaRefresco?: number;
  /** Cuánto sigue abierto el WebSocket sin partidos que seguir o con la app oculta. */
  esperaSuspension?: number;
  /** Si no se pudo conectar, cuándo se vuelve a intentar. */
  esperaReintento?: number;
}

/**
 * Los mensajes recibidos durante una petición del detalle pueden no estar en
 * su respuesta: se vuelven a aplicar sobre ella los llegados desde un poco
 * antes de pedirla (la federación no ordena REST y directo al milisegundo).
 */
const MARGEN_RESPUESTA_MS = 2_000;
const MEMORIA_EVENTOS_MS = 60_000;

interface Seguimiento {
  baja: (() => void) | null;
  refresco: ReturnType<typeof setTimeout> | undefined;
  /** Mensajes recientes, para aplicarlos otra vez sobre un detalle recién pedido. */
  recientes: { t: number; evento: EventoDirectoApi }[];
  inicioPeticion: number;
}

const visibilidadDocumento: EscucharVisibilidad = (alCambiar) => {
  const escuchar = () => alCambiar(document.visibilityState !== 'hidden');
  document.addEventListener('visibilitychange', escuchar);
  return () => document.removeEventListener('visibilitychange', escuchar);
};

function idDePartido(evento: QueryCacheNotifyEvent): string | null {
  const [raiz, recurso, id] = evento.query.queryKey;
  const [raizPartidos, partidos] = claves.partidos();
  return raiz === raizPartidos && recurso === partidos && typeof id === 'string'
    ? id
    : null;
}

/**
 * Sigue en directo los partidos que tiene abiertos alguna pantalla: los que
 * tienen observadores en la caché y se juegan hoy o siguen en juego. Las
 * pantallas no saben nada: los mensajes se aplican al detalle en caché (y al
 * marcador de las listas) y lo que no se puede aplicar se vuelve a pedir.
 * Devuelve la desinstalación.
 */
export function instalarDirecto(
  cliente: QueryClient,
  opciones: OpcionesDirecto,
): () => void {
  const {
    conectar,
    alGol,
    escucharVisibilidad = visibilidadDocumento,
    hoy = () => fechaLocal(new Date()),
    esperaRefresco = 800,
    esperaSuspension = 10_000,
    esperaReintento = 15_000,
  } = opciones;

  const seguidos = new Map<string, Seguimiento>();
  let instalado = true;
  let visible = document.visibilityState !== 'hidden';
  let conexion: ConexionDirecto | null = null;
  let conectando = false;
  let abierta = false;
  let suspension: ReturnType<typeof setTimeout> | undefined;
  let reintento: ReturnType<typeof setTimeout> | undefined;

  const detalle = (id: string) =>
    cliente.getQueryData<PartidoDetalle>(claves.partido(id));

  function ponerMarcador(partido: PartidoDetalle) {
    const marcador = marcadorDirectoDe(partido);
    const lista = cliente.getQueryData<MarcadorDirecto[]>(claves.marcadores());
    if (!marcador || !lista) return;
    const nueva = fusionarMarcador(lista, marcador);
    if (nueva !== lista) cliente.setQueryData(claves.marcadores(), nueva);
  }

  function ponerDetalle(id: string, partido: PartidoDetalle) {
    cliente.setQueryData(claves.partido(id), partido);
    ponerMarcador(partido);
  }

  function pedirDetalle(id: string) {
    void cliente.invalidateQueries({ queryKey: claves.partido(id) });
  }

  function programarRefresco(id: string, seguimiento: Seguimiento) {
    clearTimeout(seguimiento.refresco);
    seguimiento.refresco = setTimeout(() => pedirDetalle(id), esperaRefresco);
  }

  function recibir(id: string, datos: unknown) {
    const seguimiento = seguidos.get(id);
    if (!seguimiento) return;
    const leido = eventoDirectoSchema.safeParse(datos);
    if (!leido.success) {
      programarRefresco(id, seguimiento);
      return;
    }
    const evento = leido.data;
    const ahora = Date.now();
    // El reloj llega cada ~3 s y manda el último: no hace falta recordarlo.
    if (evento.type !== 'crono') {
      seguimiento.recientes = seguimiento.recientes.filter(
        (r) => ahora - r.t < MEMORIA_EVENTOS_MS,
      );
      seguimiento.recientes.push({ t: ahora, evento });
    }
    const partido = detalle(id);
    if (!partido) {
      programarRefresco(id, seguimiento);
      return;
    }
    const aplicado = aplicarEvento(partido, evento);
    if (aplicado.partido !== partido) ponerDetalle(id, aplicado.partido);
    if (aplicado.gol) alGol?.(id, aplicado.gol);
    if (aplicado.refrescar) programarRefresco(id, seguimiento);
  }

  /** Lo llegado mientras se pedía el detalle, otra vez sobre la respuesta. */
  function reaplicar(id: string, seguimiento: Seguimiento) {
    const partido = detalle(id);
    if (!partido) return;
    const desde = seguimiento.inicioPeticion - MARGEN_RESPUESTA_MS;
    const final = seguimiento.recientes
      .filter((r) => r.t >= desde)
      .reduce((p, r) => aplicarEvento(p, r.evento).partido, partido);
    if (final !== partido) cliente.setQueryData(claves.partido(id), final);
    ponerMarcador(final);
  }

  function suscribir(id: string, seguimiento: Seguimiento) {
    if (!conexion || seguimiento.baja) return;
    seguimiento.baja = conexion.suscribir(`acta_${id}`, {
      alMensaje: (datos) => recibir(id, datos),
      alSuscribir: () => pedirDetalle(id),
    });
  }

  function actualizarActividad() {
    if (!conexion) return;
    if (seguidos.size > 0 && visible) {
      clearTimeout(suspension);
      suspension = undefined;
      if (!abierta) conexion.reanudar();
      abierta = true;
    } else if (abierta && suspension === undefined) {
      const actual = conexion;
      suspension = setTimeout(() => {
        suspension = undefined;
        abierta = false;
        actual.suspender();
      }, esperaSuspension);
    }
  }

  function asegurarConexion() {
    if (conexion || conectando) return;
    clearTimeout(reintento);
    conectando = true;
    conectar().then(
      (nueva) => {
        conectando = false;
        if (!instalado) return;
        conexion = nueva;
        for (const [id, seguimiento] of seguidos) suscribir(id, seguimiento);
        actualizarActividad();
      },
      () => {
        conectando = false;
        if (instalado && seguidos.size > 0) {
          reintento = setTimeout(asegurarConexion, esperaReintento);
        }
      },
    );
  }

  function seguir(id: string) {
    const seguimiento: Seguimiento = {
      baja: null,
      refresco: undefined,
      recientes: [],
      inicioPeticion: 0,
    };
    seguidos.set(id, seguimiento);
    if (conexion) suscribir(id, seguimiento);
    else asegurarConexion();
  }

  function dejar(id: string) {
    const seguimiento = seguidos.get(id);
    if (!seguimiento) return;
    clearTimeout(seguimiento.refresco);
    seguimiento.baja?.();
    seguidos.delete(id);
  }

  /** Sigue exactamente los partidos con pantalla abierta que lo merecen. */
  function reconciliar() {
    const hoyLocal = hoy();
    const quiere = new Set<string>();
    for (const query of cliente
      .getQueryCache()
      .findAll({ queryKey: claves.partidos() })) {
      const [, , id] = query.queryKey;
      const partido = query.state.data as PartidoDetalle | undefined;
      if (
        typeof id === 'string' &&
        partido &&
        query.getObserversCount() > 0 &&
        seguirEnDirecto(partido, hoyLocal)
      ) {
        quiere.add(id);
      }
    }
    for (const id of seguidos.keys()) if (!quiere.has(id)) dejar(id);
    for (const id of quiere) if (!seguidos.has(id)) seguir(id);
    actualizarActividad();
  }

  const hashMarcadores = hashKey(claves.marcadores());

  const bajaCache = cliente.getQueryCache().subscribe((evento) => {
    if (
      evento.type === 'updated' &&
      evento.action.type === 'success' &&
      !evento.action.manual &&
      evento.query.queryHash === hashMarcadores
    ) {
      // `/marcadores` puede ir por detrás del directo: mandan los seguidos.
      for (const id of seguidos.keys()) {
        const partido = detalle(id);
        if (partido) ponerMarcador(partido);
      }
      return;
    }
    const id = idDePartido(evento);
    if (id === null) return;
    const seguimiento = seguidos.get(id);
    if (seguimiento && evento.type === 'updated') {
      if (evento.action.type === 'fetch') {
        seguimiento.inicioPeticion = Date.now();
      } else if (evento.action.type === 'success' && !evento.action.manual) {
        reaplicar(id, seguimiento);
      }
    }
    if (
      evento.type === 'observerAdded' ||
      evento.type === 'observerRemoved' ||
      evento.type === 'removed' ||
      (evento.type === 'updated' && evento.action.type === 'success')
    ) {
      reconciliar();
    }
  });

  const bajaVisibilidad = escucharVisibilidad((ahora) => {
    visible = ahora;
    actualizarActividad();
  });

  reconciliar();

  return () => {
    instalado = false;
    bajaCache();
    bajaVisibilidad();
    for (const id of [...seguidos.keys()]) dejar(id);
    clearTimeout(suspension);
    clearTimeout(reintento);
    if (abierta) conexion?.suspender();
    abierta = false;
  };
}
