/**
 * Saca de una grabación de `grabar-directo.ts` las fixtures del reducer del
 * directo: los mensajes de un partido y algunos de los detalles REST pedidos
 * tras cada ráfaga, para comprobar que el reducer llega a lo mismo que la API.
 * Para que no pesen megas, se quedan los detalles en los que cambia el periodo
 * o el estado, uno de cada `CADA` del resto, y el último; y del reloj, solo los
 * mensajes que lo paran o lo arrancan y uno de cada `CADA`.
 *
 *   npm run directo:fixtures -- <carpeta de la grabación> <clave>=<partidoId> [...]
 *
 * Escribe `src/live/fixtures/<clave>.json` con `{ partidoId, grabado,
 * eventos: [{ t, data }], detalles: [{ t, detalle }] }`. Los pings y los
 * mensajes de otros partidos se descartan.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [carpeta, ...pares] = process.argv.slice(2);
if (!carpeta || pares.length === 0) {
  console.error(
    'Uso: node scripts/fixtures-directo.ts <grabación> <clave>=<partidoId> [...]',
  );
  process.exit(1);
}

const DESTINO = join(import.meta.dirname, '..', 'src', 'live', 'fixtures');
mkdirSync(DESTINO, { recursive: true });
const CADA = 12;

interface Frame {
  t: string;
  frame: { push?: { channel: string; pub?: { data: unknown } } };
}

const frames: Frame[] = readFileSync(join(carpeta, 'frames.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((linea) => JSON.parse(linea) as Frame);

/** Lo que el reducer tiene que dejar igual que la API. */
function huella(detalle: {
  estado: string;
  periodo: number;
  incidencias?: { id: string }[];
}): string {
  const ids = (detalle.incidencias ?? []).map((x) => x.id).sort();
  return JSON.stringify([detalle.estado, detalle.periodo, ids]);
}

for (const par of pares) {
  const [clave, partidoId] = par.split('=');
  if (!clave || !partidoId) throw new Error(`Par inválido: ${par}`);

  let reloj = '';
  const eventos = frames
    .filter((x) => x.frame.push?.channel === `acta_${partidoId}`)
    .map((x) => ({ t: x.t, data: x.frame.push?.pub?.data }))
    .filter((x, i) => {
      const data = x.data as
        { type: string; periodo?: number; enMarcha?: boolean } | undefined;
      if (data === undefined) return false;
      if (data.type !== 'crono') return true;
      const clave = `${data.periodo}|${data.enMarcha}`;
      const cambia = clave !== reloj;
      reloj = clave;
      return cambia || i % CADA === 0;
    });

  const dir = join(carpeta, 'partidos', partidoId);
  const todos = readdirSync(dir)
    .sort()
    .map(
      (archivo) =>
        JSON.parse(readFileSync(join(dir, archivo), 'utf8')) as {
          t: string;
          detalle: Parameters<typeof huella>[0];
        },
    );
  const detalles: { t: string; detalle: unknown }[] = [];
  let anterior = '';
  let fase = '';
  let cambios = 0;
  todos.forEach(({ t, detalle }, i) => {
    const h = huella(detalle);
    if (h === anterior) return;
    anterior = h;
    const f = `${detalle.estado}|${detalle.periodo}`;
    const ultimo = i === todos.length - 1;
    if (f !== fase || cambios++ % CADA === 0 || ultimo) {
      detalles.push({ t, detalle });
    }
    fase = f;
  });

  const salida = join(DESTINO, `${clave}.json`);
  writeFileSync(
    salida,
    JSON.stringify({
      partidoId,
      grabado: eventos[0]?.t.slice(0, 10) ?? null,
      eventos,
      detalles,
    }),
  );
  console.log(
    `${salida}: ${eventos.length} mensajes, ${detalles.length} detalles`,
  );
}
