/**
 * Graba el directo real de la federación (Centrifugo) para sacar fixtures:
 * cada frame del WebSocket y, tras cada ráfaga de mensajes, el detalle REST
 * del partido, para comprobar que el reducer llega a lo mismo que la API.
 *
 *   npm run directo:grabar -- <carpeta de salida> [minutos]
 *
 * Se suscribe a todos los partidos de hoy que lista `/public/partidos/marcadores`
 * y repasa la lista cada minuto. Habla el protocolo JSON de Centrifugo a mano
 * (sin la librería) para guardar los frames tal cual llegan. Se ejecuta con
 * Node 24 sin compilar, por eso no importa nada del proyecto.
 *
 * Salida:
 * - `frames.jsonl`: `{ t, frame }` de cada frame recibido (sin los pings).
 * - `marcadores/<t>.json`: `/marcadores` cada vez que cambia.
 * - `partidos/<id>/<t>.json`: detalle REST al suscribirse y tras cada ráfaga.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const API = 'https://fvpatinaje.eus/api';
const ENTIDAD_ID = '00000000-0000-4000-0000-000000000001';
const DEPORTE = 'hp';
/** Tras el último mensaje de un partido, cuánto esperar para pedir su detalle. */
const RAFAGA_MS = 4_000;
const REPASO_MS = 60_000;

const [salidaArg, minutosArg] = process.argv.slice(2);
if (!salidaArg) {
  console.error(
    'Uso: node scripts/grabar-directo.ts <carpeta de salida> [minutos]',
  );
  process.exit(1);
}
const salida: string = salidaArg;
const minutos = Number(minutosArg ?? 14 * 60);
mkdirSync(join(salida, 'marcadores'), { recursive: true });
mkdirSync(join(salida, 'partidos'), { recursive: true });

const ahora = () => new Date().toISOString();
const sello = () => ahora().replace(/[:.]/g, '-');
const log = (...args: unknown[]) => console.log(ahora(), ...args);

async function pedir(ruta: string): Promise<unknown> {
  const respuesta = await fetch(`${API}${ruta}`, {
    headers: { accept: 'application/json' },
  });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${ruta}`);
  return respuesta.json();
}

async function token(ruta: string): Promise<string> {
  const datos = (await pedir(ruta)) as { token: string };
  return datos.token;
}

const tokenConexion = () => token('/auth/centrifugo-token-public');
const tokenCanal = (canal: string) =>
  token(`/auth/centrifugo-sub-token?channel=${encodeURIComponent(canal)}`);

function guardarFrame(frame: unknown) {
  appendFileSync(
    join(salida, 'frames.jsonl'),
    `${JSON.stringify({ t: ahora(), frame })}\n`,
  );
}

const pendientes = new Map<string, ReturnType<typeof setTimeout>>();

async function guardarDetalle(partidoId: string, motivo: string) {
  try {
    const detalle = await pedir(`/public/partidos/${partidoId}`);
    const carpeta = join(salida, 'partidos', partidoId);
    mkdirSync(carpeta, { recursive: true });
    writeFileSync(
      join(carpeta, `${sello()}.json`),
      JSON.stringify({ t: ahora(), motivo, detalle }),
    );
  } catch (error) {
    log('detalle', partidoId, String(error));
  }
}

function detalleTrasRafaga(partidoId: string) {
  clearTimeout(pendientes.get(partidoId));
  pendientes.set(
    partidoId,
    setTimeout(() => {
      pendientes.delete(partidoId);
      void guardarDetalle(partidoId, 'rafaga');
    }, RAFAGA_MS),
  );
}

let ultimosMarcadores = '';

interface PartidoMarcador {
  id: string;
  fechaInicio: string;
  periodo: number;
  actaCerrada: boolean;
}

async function partidosDeHoy(): Promise<PartidoMarcador[]> {
  const marcadores = (await pedir(
    `/public/partidos/marcadores?entidadId=${ENTIDAD_ID}&deporte=${DEPORTE}`,
  )) as { matches: PartidoMarcador[] }[];
  const texto = JSON.stringify(marcadores);
  if (texto !== ultimosMarcadores) {
    ultimosMarcadores = texto;
    writeFileSync(join(salida, 'marcadores', `${sello()}.json`), texto);
  }
  const hoy = new Date().toISOString().slice(0, 10);
  return marcadores
    .flatMap((c) => c.matches)
    .filter((p) => p.fechaInicio.slice(0, 10) === hoy);
}

let ws: WebSocket | null = null;
let siguienteId = 1;
const canales = new Set<string>();
const respuestas = new Map<
  number,
  (respuesta: Record<string, unknown>) => void
>();

function enviar(comando: Record<string, unknown>) {
  const id = siguienteId++;
  ws?.send(JSON.stringify({ id, ...comando }));
  return new Promise<Record<string, unknown>>((resolve) =>
    respuestas.set(id, resolve),
  );
}

async function suscribir(canal: string) {
  const respuesta = await enviar({
    subscribe: { channel: canal, token: await tokenCanal(canal) },
  });
  if (respuesta.error) {
    log('suscripción rechazada', canal, respuesta.error);
    return;
  }
  canales.add(canal);
  const sub = respuesta.subscribe as { expires?: boolean; ttl?: number };
  if (sub?.expires && sub.ttl) {
    setTimeout(() => void refrescarCanal(canal), (sub.ttl - 30) * 1000);
  }
}

async function refrescarCanal(canal: string) {
  if (!canales.has(canal)) return;
  const respuesta = await enviar({
    sub_refresh: { channel: canal, token: await tokenCanal(canal) },
  });
  const r = respuesta.sub_refresh as { expires?: boolean; ttl?: number };
  if (r?.expires && r.ttl) {
    setTimeout(() => void refrescarCanal(canal), (r.ttl - 30) * 1000);
  }
}

async function repasar() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    const partidos = await partidosDeHoy();
    for (const p of partidos) {
      const canal = `acta_${p.id}`;
      if (canales.has(canal)) continue;
      await suscribir(canal);
      log('suscrito', canal, `p${p.periodo}`);
      if (p.periodo > 0) void guardarDetalle(p.id, 'suscripcion');
    }
  } catch (error) {
    log('repaso', String(error));
  }
}

function alMensaje(texto: string) {
  // Centrifugo puede juntar varias respuestas en un frame, una por línea.
  for (const linea of texto.split('\n')) {
    if (!linea.trim()) continue;
    const frame = JSON.parse(linea) as Record<string, unknown>;
    if (Object.keys(frame).length === 0) {
      ws?.send('{}');
      continue;
    }
    guardarFrame(frame);
    const id = frame.id as number | undefined;
    if (id !== undefined) {
      respuestas.get(id)?.(frame);
      respuestas.delete(id);
      continue;
    }
    const push = frame.push as
      { channel: string; pub?: { data?: { type?: string } } } | undefined;
    if (push?.channel?.startsWith('acta_')) {
      const partidoId = push.channel.slice('acta_'.length);
      const tipo = push.pub?.data?.type;
      // El reloj llega cada ~3 s mientras corre: ni se anota ni pide detalle.
      if (tipo === 'crono') continue;
      log('push', push.channel, tipo ?? Object.keys(push));
      if (push.pub) detalleTrasRafaga(partidoId);
    }
  }
}

async function conectar() {
  const config = (await pedir('/auth/config')) as { centrifugoWsUrl: string };
  canales.clear();
  respuestas.clear();
  ws = new WebSocket(config.centrifugoWsUrl);
  ws.addEventListener('message', (e) => alMensaje(String(e.data)));
  ws.addEventListener('close', (e) => {
    log('cerrado', e.code, e.reason);
    ws = null;
    setTimeout(() => void conectar().catch((err) => log(String(err))), 3000);
  });
  ws.addEventListener('open', async () => {
    const respuesta = await enviar({
      connect: { token: await tokenConexion(), name: 'grabador' },
    });
    log('conectado', JSON.stringify(respuesta.connect ?? respuesta.error));
    await repasar();
  });
}

await conectar();
const repaso = setInterval(() => void repasar(), REPASO_MS);
setTimeout(
  () => {
    clearInterval(repaso);
    log('fin de la grabación');
    process.exit(0);
  },
  minutos * 60 * 1000,
);
