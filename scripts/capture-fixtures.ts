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
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
  /**
   * Captura además estadísticas de jugadores, la plantilla del Loyola, las
   * stats de dos de sus jugadores y su próximo partido sin jugar.
   */
  jugadores?: boolean;
}

const MUESTRA: Muestra[] = [
  {
    slug: 'liga-norte',
    competicionId: 'fe7edab7-0be9-441e-9b34-888a0f95d251',
    motivo:
      'Liga simple con un Loyola, muchos partidos jugados y leyenda "general"',
    jugadores: true,
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

interface MuestraPartido {
  clave: string;
  id: string;
  motivo: string;
}

/**
 * Detalles de partidos finalizados (inmutables, por eso van por id). Ninguno
 * tiene tanda de penaltis (periodo 21): no se ha visto ninguna en la API.
 */
const PARTIDOS: MuestraPartido[] = [
  {
    clave: 'falta-directa',
    id: '6636af38-a791-4002-ab03-402a765a7d7f',
    motivo:
      'Liga Norte 3-2: falta directa marcada, azul, amarilla a staff sin dorsal, cambios y asistencias',
  },
  {
    clave: 'roja',
    id: '8b78cf18-2638-418d-961f-c200becec224',
    motivo:
      'Liga Norte 4-6: tarjeta roja, penalti marcado y dos faltas directas marcadas',
  },
  {
    clave: 'periodo-0',
    id: '13a7f4de-99ce-4634-a56f-ad56dba6141a',
    motivo:
      'Liga Norte 5-4: cambios en el periodo 0 (previa), falta directa marcada y fallada',
  },
  {
    clave: 'descanso',
    id: '13aad399-731a-4dc8-93df-cfd4f2a6054b',
    motivo:
      'Liga Norte 2-5: cambios en el periodo 9 (descanso) y falta directa fallada',
  },
  {
    clave: 'penaltis-fallados',
    id: '8761059e-ec91-47f6-a042-195bde5ac2e4',
    motivo: 'Liga Vasca Junior 1-1: dos penaltis NO_GOL y amarillas',
  },
  {
    clave: 'copa',
    id: 'b931107f-6c3d-4811-8469-d616167478f6',
    motivo:
      'Copa 5-6: configuracionReglas {"penaltis":true}, penalti fallado, falta directa marcada y fallada',
  },
  {
    clave: 'escolar-capado',
    id: '4ac17159-ebe2-4036-b5ed-756e49517395',
    motivo:
      'Infantil R: 1-9 en goles, 1-6 oficial (maxDiferenciaGoles 5) y staff con rolPosicion vacío',
  },
  {
    clave: 'escolar-por-periodos',
    id: 'fdc003b2-9f7e-4bad-8379-371dc2684e64',
    motivo:
      'Alevín A: 6-6 en goles, 3-3 oficial por periodos (3 periodos) y penalti marcado',
  },
  {
    clave: 'escolar-a-cero',
    id: '92a0ec93-70c9-4757-b50a-8ea9da96044c',
    motivo:
      'Benjamín B: 12-6 en goles, 0-0 oficial (marcadorACero) y staff con rolPosicion vacío',
  },
  {
    clave: 'jugador-sin-dorsal',
    id: '76c1c3cc-c29f-4475-a7a8-6216ef5c94ee',
    motivo: 'Alevín R: JUGADOR con dorsal "" (no jugó) y Loyola A',
  },
  {
    clave: 'puntaje-fuera-de-regla',
    id: 'bf26aba9-ce4e-4e72-9979-a6a79f5a6f08',
    motivo:
      'Juvenil escolar: puntaje oficial 10-0 aunque maxDiferenciaGoles es 5',
  },
];

/** Campos con datos personales: se conserva el null y se sustituye el valor. */
const PLACEHOLDERS: Record<string, string | number> = {
  arbitro1Nombre: 'ÁRBITRO 1',
  arbitro2Nombre: 'ÁRBITRO 2',
  atletaDni: '00000000T',
  atletaFotoUrl: 'https://example.invalid/foto.webp',
  creadoPor: '00000000-0000-4000-8000-000000000000',
  fotoUrl: 'https://example.invalid/foto.webp',
  nacionalidad: 'XXX',
  anioNacimiento: 2000,
  // La crónica nombra a los jugadores.
  titular: 'TITULAR',
  texto: 'TEXTO',
};

/**
 * Nombres de personas y el id que las identifica en el mismo objeto. `nombre`
 * y `nombrePila` solo son de persona en alineaciones, incidencias y
 * exclusiones; en el resto de objetos `nombre` es de equipo, fase, etc.
 */
const NOMBRES_PERSONA: Record<string, string> = {
  nombreCompleto: 'plantillaEquipoId',
  nombreCorto: 'plantillaEquipoId',
  nombreSecundario: 'plantillaEquipoSecundariaId',
  porteroNombre: 'porteroId',
};

/** Número de seudónimo por persona, estable entre respuestas. */
const personas = new Map<string, number>();
/**
 * Para nombres que llegan sin id en su objeto. La exclusión trae el nombre
 * completo (la alineación, el corto): se casa con la alineación por lado y
 * dorsal.
 */
const idPorNombre = new Map<string, string>();

function registrarExclusiones(partido: Record<string, unknown>): void {
  if (!Array.isArray(partido.exclusiones)) return;
  for (const e of lista(partido.exclusiones, 'exclusiones')) {
    const alineacion = partido[
      e.esLocal ? 'alineacionesLocal' : 'alineacionesVisitante'
    ] as Record<string, unknown>[];
    const jugador = alineacion.find((a) => a.dorsal === e.dorsal);
    if (typeof e.nombre === 'string' && jugador) {
      idPorNombre.set(e.nombre, texto(jugador, 'plantillaEquipoId'));
    }
  }
}

function esPersona(r: Record<string, unknown>): boolean {
  return 'plantillaEquipoId' in r || 'tarjeta' in r;
}

function camposPersona(r: Record<string, unknown>): Record<string, string> {
  return esPersona(r)
    ? { ...NOMBRES_PERSONA, nombre: 'plantillaEquipoId' }
    : NOMBRES_PERSONA;
}

function registrarPersonas(valor: unknown): void {
  if (Array.isArray(valor)) return valor.forEach(registrarPersonas);
  if (!esRegistro(valor)) return;
  for (const [campo, campoId] of Object.entries(camposPersona(valor))) {
    const nombre = valor[campo];
    const id = valor[campoId];
    if (typeof nombre === 'string' && typeof id === 'string') {
      idPorNombre.set(nombre, id);
    }
  }
  registrarExclusiones(valor);
  Object.values(valor).forEach(registrarPersonas);
}

function seudonimo(r: Record<string, unknown>, campo: string): number {
  const nombre = r[campo];
  const id = r[camposPersona(r)[campo] ?? ''];
  const clave =
    typeof id === 'string'
      ? id
      : (idPorNombre.get(String(nombre)) ?? String(nombre));
  let n = personas.get(clave);
  if (n === undefined) {
    n = personas.size + 1;
    personas.set(clave, n);
  }
  return n;
}

function sanear(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sanear);
  if (!esRegistro(valor)) return valor;
  const nombres = camposPersona(valor);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, v]) => {
      if (v === null) return [clave, v];
      const placeholder = PLACEHOLDERS[clave];
      if (placeholder !== undefined) return [clave, placeholder];
      if (clave in nombres) {
        return [clave, `PERSONA ${seudonimo(valor, clave)}`];
      }
      if (clave === 'nombrePila' && esPersona(valor)) {
        return [clave, `P${seudonimo(valor, 'nombre')}`];
      }
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
  const datos: unknown = await res.json();
  registrarPersonas(datos);
  return sanear(datos);
}

function guardar(ruta: string, datos: unknown): void {
  const destino = join(OUT, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(datos, null, 2) + '\n');
  console.log(`  ${ruta}`);
}

/** Borra las fixtures anteriores sin tocar `index.ts` ni el README. */
function limpiar(): void {
  mkdirSync(OUT, { recursive: true });
  for (const entrada of readdirSync(OUT, { withFileTypes: true })) {
    if (entrada.isDirectory() || entrada.name.endsWith('.json')) {
      rmSync(join(OUT, entrada.name), { recursive: true, force: true });
    }
  }
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

function numero(r: Record<string, unknown>, clave: string): number {
  const v = r[clave];
  if (typeof v !== 'number') throw new Error(`falta ${clave}`);
  return v;
}

/** El de más valor en `clave`; en empate, el primero. */
function maximo(
  filas: Record<string, unknown>[],
  clave: string,
  que: string,
): Record<string, unknown> {
  const fila = filas.reduce<Record<string, unknown> | undefined>(
    (mejor, f) =>
      mejor === undefined || numero(f, clave) > numero(mejor, clave)
        ? f
        : mejor,
    undefined,
  );
  if (!fila) throw new Error(`${que}: sin candidatos`);
  return fila;
}

/** Ficheros y elecciones de la parte de jugadores de una muestra. */
async function capturarJugadores(
  slug: string,
  divisionId: string,
  equipos: unknown,
  tree: unknown,
) {
  const base = `/hierarchy/division/${divisionId}`;
  const estadisticas = await pedir(`${base}/estadisticas-jugadores`);
  const loyola = lista(equipos, `${slug}/equipos`).find((e) =>
    /LOYOLA/i.test(texto(e, 'nombre')),
  );
  if (!loyola) throw new Error(`${slug}: /equipos sin Loyola`);
  const equipoId = texto(loyola, 'equipoId');

  const plantilla = await pedir(`${base}/equipo/${equipoId}/plantilla`);
  if (!esRegistro(plantilla)) throw new Error(`${slug}: plantilla inesperada`);
  const jugadores = lista(plantilla.jugadores, `${slug}/plantilla`);
  const goleador = maximo(jugadores, 'goles', `${slug}: goleador`);
  const portero = maximo(
    jugadores.filter((j) => j.esPortero === true),
    'partidosJugados',
    `${slug}: portero`,
  );
  const ids = [goleador, portero].map((j) => texto(j, 'plantillaEquipoId'));
  const stats = await Promise.all(
    ids.map((id) => pedir(`/public/partidos/jugador/${id}/stats`)),
  );

  // El próximo partido del Loyola: detalle sin jugar (periodo 0, sin acta).
  const enfrentamientos = lista(tree, `${slug}/tree`).flatMap((f) =>
    lista(f.jornadas, 'jornadas').flatMap((j) =>
      lista(j.enfrentamientos, 'enfrentamientos'),
    ),
  );
  const proximo = enfrentamientos
    .filter(
      (e) =>
        e.estado !== 'FINISHED' &&
        lista(e.participants, 'participants').some((p) =>
          /LOYOLA/i.test(String(p.atletaNombre)),
        ),
    )
    .sort((a, b) =>
      texto(a, 'fechaInicio').localeCompare(texto(b, 'fechaInicio')),
    )[0];
  if (!proximo)
    throw new Error(`${slug}: el Loyola no tiene partidos sin jugar`);
  const programadoId = texto(proximo, 'id');
  const programado = await pedir(`/public/partidos/${programadoId}`);

  guardar(`${slug}/estadisticas-jugadores.json`, estadisticas);
  guardar(`${slug}/plantilla/${equipoId}.json`, plantilla);
  ids.forEach((id, i) => guardar(`jugadores/${id}.json`, stats[i]));

  return {
    jugadores: {
      slug,
      equipoId,
      goleadorId: ids[0],
      porteroId: ids[1],
    },
    programado: {
      clave: 'programado',
      id: programadoId,
      motivo: `Próximo partido del Loyola en ${slug}: sin jugar, periodo 0, puntaje null`,
      datos: programado,
    },
  };
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

  const [divisiones, marcadores, detalles] = await Promise.all([
    pedir('/hierarchy/competiciones/divisiones', {
      method: 'POST',
      body: JSON.stringify([...ids]),
    }).then((d) => lista(d, 'divisiones')),
    pedir(
      `/public/partidos/marcadores?entidadId=${ENTIDAD_ID}&deporte=${DEPORTE}`,
    ).then((m) => lista(m, 'marcadores')),
    Promise.all(PARTIDOS.map((p) => pedir(`/public/partidos/${p.id}`))),
  ]);

  limpiar();
  console.log(`Guardando en ${OUT}`);

  // La agenda completa pesa ~500 KB: se recortan los eventos a la muestra
  // y se conservan `filtros` y la ventana tal cual.
  guardar('agenda.json', {
    ...agenda,
    eventos: eventos.filter((e) => ids.has(texto(e, 'competicionId'))),
  });
  guardar('divisiones.json', divisiones);
  guardar(
    'marcadores.json',
    marcadores.filter((c) => ids.has(texto(c, 'competicionId'))),
  );
  PARTIDOS.forEach((p, i) => guardar(`partidos/${p.clave}.json`, detalles[i]));

  const manifiesto = [];
  const partidos: MuestraPartido[] = [...PARTIDOS];
  let jugadores;
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
    if (m.jugadores) {
      const capturado = await capturarJugadores(
        m.slug,
        divisionId,
        equipos,
        tree,
      );
      jugadores = capturado.jugadores;
      const { datos, ...programado } = capturado.programado;
      guardar(`partidos/${programado.clave}.json`, datos);
      partidos.push(programado);
    }
    manifiesto.push({
      slug: m.slug,
      competicionId: m.competicionId,
      motivo: m.motivo,
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
    partidos,
    jugadores,
  });
}

await main();
