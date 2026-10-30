// @vitest-environment node
/**
 * Mide el arranque en frío contra la API real (bytes, requests y tiempo).
 * No corre con `npm test`: `npm run medir:arranque`. El objetivo es el de la
 * sección 6 del ROADMAP: menos de 400 KB y requests en paralelo.
 */
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { crearCliente } from './cliente';
import { API_ORIGEN, crearTransporte } from './transport';

const OBJETIVO_BYTES = 400 * 1024;

interface Medida {
  ruta: string;
  bytes: number;
  gzip: number;
  codificacion: string | null;
}

function medidor() {
  const medidas: Medida[] = [];
  const transporte = crearTransporte({
    nativo: false,
    http: { request: () => Promise.reject(new Error('solo web')) },
    // El transporte web pide `/api/...`: aquí se va directo al origen.
    fetch: async (url, init) => {
      const ruta = String(url).replace(/^\/api/, '');
      const respuesta = await fetch(`${API_ORIGEN}${ruta}`, init);
      const cuerpo = new Uint8Array(await respuesta.arrayBuffer());
      medidas.push({
        ruta: ruta.split('?')[0] ?? ruta,
        bytes: cuerpo.byteLength,
        gzip: gzipSync(cuerpo).byteLength,
        codificacion: respuesta.headers.get('content-encoding'),
      });
      return new Response(cuerpo, {
        status: respuesta.status,
        headers: respuesta.headers,
      });
    },
  });
  return { medidas, api: crearCliente(transporte) };
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

function informe(titulo: string, medidas: Medida[], ms: number) {
  const total = medidas.reduce((s, m) => s + m.bytes, 0);
  const gzip = medidas.reduce((s, m) => s + m.gzip, 0);
  const porTipo = new Map<string, { n: number; bytes: number }>();
  for (const m of medidas) {
    const tipo = m.ruta.replace(/[0-9a-f-]{36}/g, '{id}');
    const previo = porTipo.get(tipo) ?? { n: 0, bytes: 0 };
    porTipo.set(tipo, { n: previo.n + 1, bytes: previo.bytes + m.bytes });
  }
  const lineas = [...porTipo].map(
    ([tipo, { n, bytes }]) =>
      `  ${String(n).padStart(3)} × ${tipo}: ${kb(bytes)}`,
  );
  const codificaciones = new Set(
    medidas.map((m) => m.codificacion ?? 'ninguna'),
  );
  console.log(
    [
      `${titulo}: ${medidas.length} requests, ${kb(total)} (gzip ≈ ${kb(gzip)}), ${ms} ms`,
      `  content-encoding del origen: ${[...codificaciones].join(', ')}`,
      ...lineas,
    ].join('\n'),
  );
  return total;
}

describe.runIf(import.meta.env.MODE === 'medir')(
  'arranque en frío (API real)',
  () => {
    it('catálogo: agenda del club, divisiones en batch y /equipos en paralelo', async () => {
      const { medidas, api } = medidor();
      const inicio = performance.now();
      const { catalogo, divisiones } = await api.catalogo();
      const ms = Math.round(performance.now() - inicio);
      const total = informe('Catálogo', medidas, ms);
      console.log(
        `  ${catalogo.length} equipos Loyola en ${divisiones.length} divisiones`,
      );
      expect(catalogo.length).toBeGreaterThan(0);
      expect(total).toBeLessThan(OBJETIVO_BYTES);
    }, 60_000);

    it('catálogo + calendario y clasificación del primer equipo de Liga Norte', async () => {
      const { medidas, api } = medidor();
      const inicio = performance.now();
      const { catalogo } = await api.catalogo();
      const equipo =
        catalogo.find((e) => e.competicion.nombre === 'LIGA NORTE') ??
        catalogo[0];
      if (!equipo) throw new Error('Catálogo vacío');
      const calendario = await api.calendario(equipo.division);
      await Promise.all(calendario.fases.map((f) => api.clasificacion(f.id)));
      const ms = Math.round(performance.now() - inicio);
      informe(`Catálogo + ${equipo.competicion.nombre}`, medidas, ms);
    }, 60_000);
  },
);
