import { api } from '../api/cliente';
import { urlDirecto } from '../api/transport';

export interface ManejadoresCanal {
  alMensaje: (datos: unknown) => void;
  /**
   * Al suscribirse y al volver a hacerlo tras un corte: Centrifugo no guarda
   * lo publicado entretanto, así que lo perdido hay que pedirlo por REST.
   */
  alSuscribir: () => void;
}

/** Lo que el gestor necesita del WebSocket; en los tests, un doble. */
export interface ConexionDirecto {
  /** Devuelve la baja del canal. */
  suscribir(canal: string, manejadores: ManejadoresCanal): () => void;
  /** Abre (o reabre) el WebSocket; las suscripciones se rehacen solas. */
  reanudar(): void;
  /** Cierra el WebSocket conservando las suscripciones. */
  suspender(): void;
}

/**
 * Conexión real con Centrifugo. La librería (24 KB comprimida) se carga al
 * seguir el primer partido, no en el arranque. Reintentar tras un corte, y
 * pedir de nuevo los tokens cuando caducan, lo hace ella.
 */
export async function conectarCentrifugo(): Promise<ConexionDirecto> {
  const [{ Centrifuge }, url] = await Promise.all([
    import('centrifuge'),
    api.configDirecto(),
  ]);
  const cliente = new Centrifuge(urlDirecto(url), {
    getToken: () => api.tokenDirecto(),
  });
  return {
    suscribir(canal, { alMensaje, alSuscribir }) {
      const suscripcion = cliente.newSubscription(canal, {
        getToken: () => api.tokenCanal(canal),
      });
      suscripcion.on('publication', ({ data }) => alMensaje(data));
      suscripcion.on('subscribed', alSuscribir);
      suscripcion.subscribe();
      return () => {
        suscripcion.removeAllListeners();
        cliente.removeSubscription(suscripcion);
      };
    },
    reanudar: () => cliente.connect(),
    suspender: () => cliente.disconnect(),
  };
}
