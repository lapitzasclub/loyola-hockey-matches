/**
 * Captura respuestas reales de la API de fvpatinaje.eus y las guarda como
 * fixtures en `src/api/fixtures/` para los tests de esquemas y dominio.
 *
 *   npm run fixtures:capture
 *
 * Se ejecuta con Node 24 sin compilar (type stripping), por eso no importa
 * nada del proyecto. Cada muestra cubre una trampa concreta de la API; si se
 * cambia la muestra, actualizar también `src/api/fixtures/README.md`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://fvpatinaje.eus/api';
const ENTIDAD_ID = '00000000-0000-4000-0000-000000000001';
const DEPORTE = 'hp';
// La API recorta `dias` a 60 aunque se pida más.
const AGENDA_DIAS = 60;

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'api',
  'fixtures',
);

interface Muestra {
  slug: string;
  competicionId: string;
  motivo: string;
}

const MUESTRA: Muestra[] = [
  {
    slug: 'liga-norte',
    competicionId: 'fe7edab7-0be9-441e-9b34-888a0f95d251',
    motivo:
      'Liga simple con un Loyola, muchos partidos jugados y leyenda "general"',
  },
  {
    slug: 'infantil-r',
    competicionId: '841f321b-608f-4fbe-a17d-c7746dc0bba8',
    motivo:
      'Escolar: puntaje oficial capado ≠ golesActa, dos grupos solapados, Loyola A y B, color de leyenda con var()',
  },
  {
    slug: 'infantil-sub15-fem',
    competicionId: '07f37066-0900-4db4-b299-e72655b42791',
    motivo: '/equipos no incluye al Loyola; sin partidos jugados',
  },
  {
    slug: 'benjamin-c',
    competicionId: 'c92c9a16-5e3f-44af-a7f0-9f14953721cf',
    motivo:
      'Liga sin clasificación todavía y /equipos sin los Loyola A/B (solo salen en el árbol)',
  },
  {
    slug: 'copa-liga-norte',
    competicionId: '0188d974-d0fb-44d3-89e0-20553f5e2a14',
    motivo:
      'KNOCKOUT en dos fases: cruces, estado PROGRAMADO en el árbol, enfrentamientos sin participantes, sin clasificación',
  },
];

/** Campos con datos personales: se conserva el null y se sustituye el valor. */
const PLACEHOLDERS: Record<string, string> = {
  arbitro1Nombre: 'ÁRBITRO 1',
  arbitro2Nombre: 'ÁRBITRO 2',
  atletaDni: '00000000T',
  atletaFotoUrl: 'https://example.invalid/foto.webp',
  creadoPor: '00000000-0000-4000-8000-000000000000',
};

function sanear(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sanear);
  if (valor === null || typeof valor !== 'object') return valor;
  return Object.fromEntries(
    Object.entries(valor).map(([clave, v]) => {
      const placeholder = PLACEHOLDERS[clave];
      if (placeholder !== undefined && v !== null) return [clave, placeholder];
      return [clave, sanear(v)];
    }),
  );
}

async function pedir(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(API + path, {
    ...init,
    headers: { accept: 'application/json', 'content-type': 'application/json' },
  });
  if (!res.ok)
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`);
  return sanear(await res.json());
}

function guardar(ruta: string, datos: unknown): void {
  const destino = join(OUT, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(datos, null, 2) + '\n');
  console.log(`  ${ruta}`);
}

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function lista(v: unknown, que: string): Record<string, unknown>[] {
  if (!Array.isArray(v) || !v.every(esRegistro)) {
    throw new Error(`${que}: se esperaba un array de objetos`);
  }
  return v;
}

function texto(r: Record<string, unknown>, clave: string): string {
  const v = r[clave];
  if (typeof v !== 'string') throw new Error(`falta ${clave}`);
  return v;
}

async function main(): Promise<void> {
  const ids = new Set(MUESTRA.map((m) => m.competicionId));

  const agenda = await pedir(
    `/public/agenda?entidadId=${ENTIDAD_ID}&deporte=${DEPORTE}&dias=${AGENDA_DIAS}`,
  );
  if (!esRegistro(agenda)) throw new Error('agenda: respuesta inesperada');
  const eventos = lista(agenda.eventos, 'agenda.eventos');
  const nombres = new Map(
    eventos.map((e) => [texto(e, 'competicionId'), e.competicionNombre]),
  );
  for (const m of MUESTRA) {
    if (!nombres.has(m.competicionId)) {
      throw new Error(`${m.slug}: la competición no sale en la agenda`);
    }
  }

  const divisiones = lista(
    await pedir('/hierarchy/competiciones/divisiones', {
      method: 'POST',
      body: JSON.stringify([...ids]),
    }),
    'divisiones',
  );

  rmSync(OUT, { recursive: true, force: true });
  console.log(`Guardando en ${OUT}`);

  // La agenda completa pesa ~500 KB: se recortan los eventos a la muestra
  // y se conservan `filtros` y la ventana tal cual.
  guardar('agenda.json', {
    ...agenda,
    eventos: eventos.filter((e) => ids.has(texto(e, 'competicionId'))),
  });
  guardar('divisiones.json', divisiones);

  const manifiesto = [];
  for (const m of MUESTRA) {
    const division = divisiones.find(
      (d) => texto(d, 'competicionId') === m.competicionId,
    );
    if (!division) throw new Error(`${m.slug}: sin división`);
    const divisionId = texto(division, 'id');
    const [fases, equipos, tree] = await Promise.all([
      pedir(`/hierarchy/division/${divisionId}/fases`),
      pedir(`/hierarchy/division/${divisionId}/equipos`),
      pedir(`/hierarchy/division/${divisionId}/tree`),
    ]);
    const faseIds = lista(fases, `${m.slug}/fases`).map((f) => texto(f, 'id'));
    const clasificaciones = await Promise.all(
      faseIds.map((id) => pedir(`/hierarchy/fase/${id}/clasificacion`)),
    );

    guardar(`${m.slug}/fases.json`, fases);
    guardar(`${m.slug}/equipos.json`, equipos);
    guardar(`${m.slug}/tree.json`, tree);
    faseIds.forEach((id, i) =>
      guardar(`${m.slug}/clasificacion/${id}.json`, clasificaciones[i]),
    );
    manifiesto.push({
      ...m,
      competicionNombre: nombres.get(m.competicionId),
      divisionId,
      faseIds,
    });
  }

  guardar('manifest.json', {
    capturadoEn: new Date().toISOString(),
    api: API,
    entidadId: ENTIDAD_ID,
    deporte: DEPORTE,
    agendaDias: AGENDA_DIAS,
    muestra: manifiesto,
  });
}

await main();
