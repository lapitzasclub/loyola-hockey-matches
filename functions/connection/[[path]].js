import { errorJson } from '../api/_lib/response.js';

// WebSocket del directo (Centrifugo) de la federación. La web lo abre en su
// propio origen y aquí se pasa tal cual; solo esa ruta y solo como WebSocket.
const UPSTREAM = 'https://fvpatinaje.eus/connection/websocket';

export async function onRequestGet(context) {
  const segments = Array.isArray(context.params.path) ? context.params.path : [context.params.path];
  if (segments.join('/') !== 'websocket') {
    return errorJson('Ruta no permitida.', 403);
  }
  if (context.request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return errorJson('Solo WebSocket.', 426);
  }
  try {
    // Con la petición original van las cabeceras del handshake; Cloudflare
    // devuelve el 101 con el socket de la federación ya enlazado.
    return await fetch(UPSTREAM, context.request);
  } catch (error) {
    return errorJson('No se pudo contactar con el directo.', 502, { detail: String(error?.message || error) });
  }
}
