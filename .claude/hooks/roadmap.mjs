#!/usr/bin/env node
// Guardarraíl del roadmap v2: avisa de qué sesión toca, con qué modelo/esfuerzo y su prompt.
// Uso desde hooks: `roadmap.mjs session-start` | `roadmap.mjs stop` (leen JSON por stdin).
// Uso manual: `roadmap.mjs status | next | start <id> | done <id> | reset <id>`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROADMAP = join(ROOT, 'docs', 'v2', 'roadmap.json');
const STATE = join(ROOT, '.claude', 'roadmap-state.json');
const SCRIPT = 'node .claude/hooks/roadmap.mjs';

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function readStdin() {
  if (process.stdin.isTTY) return {};
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

const roadmap = readJson(ROADMAP, null);
if (!roadmap) {
  // Sin roadmap (otra rama, fichero borrado): los hooks no deben molestar.
  if (!['session-start', 'stop'].includes(process.argv[2])) {
    console.error(`No se pudo leer ${ROADMAP}`);
    process.exit(1);
  }
  process.exit(0);
}

const sessions = roadmap.sessions;

function current() {
  return sessions.find((s) => s.status === 'in_progress') ?? sessions.find((s) => s.status === 'pending');
}

function nextAfter(session) {
  const idx = sessions.indexOf(session);
  return sessions.slice(idx + 1).find((s) => s.status !== 'done') ?? sessions.find((s) => s.status !== 'done');
}

function model(session) {
  return roadmap.models[session.model] ?? { label: session.model, command: `/model ${session.model}` };
}

function card(session) {
  const m = model(session);
  return [
    `▶ ${session.id} · ${session.phase} · ${session.title}  [${session.status}]`,
    `  Modelo: ${m.label}  →  ${m.command}`,
    `  Esfuerzo: ${session.effort}  →  /effort ${session.effort}`,
    '',
    '  Prompt inicial:',
    ...wrap(session.prompt, 96).map((l) => `    ${l}`),
    '',
    '  Criterios de salida:',
    ...session.exit.map((e) => `    - ${e}`),
    '',
    `  Al empezar: ${SCRIPT} start ${session.id}   ·   Al terminar: ${SCRIPT} done ${session.id}`,
  ].join('\n');
}

function wrap(text, width) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function modelMismatch(input, session) {
  const active = typeof input.model === 'string' ? input.model : input.model?.id;
  if (!active) return null;
  const expected = session.model;
  return active.toLowerCase().includes(expected) ? null : active;
}

function find(id) {
  const session = sessions.find((s) => s.id.toLowerCase() === String(id ?? '').toLowerCase());
  if (!session) {
    console.error(`Sesión desconocida: ${id}. Disponibles: ${sessions.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }
  return session;
}

function setStatus(id, status) {
  const session = find(id);
  session.status = status;
  writeJson(ROADMAP, roadmap);
  return session;
}

const [cmd, arg] = process.argv.slice(2);

switch (cmd) {
  case 'session-start': {
    const input = readStdin();
    const session = current();
    if (!session) {
      emit({ systemMessage: 'Roadmap v2: todas las sesiones están terminadas.' });
      break;
    }
    const mismatch = modelMismatch(input, session);
    const warn = mismatch
      ? `\n  ⚠ Modelo activo: ${mismatch}. Esta sesión pide ${model(session).label}: ${model(session).command}`
      : '';
    emit({
      systemMessage: `Roadmap v2 (docs/v2/ROADMAP.md)\n${card(session)}${warn}`,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          `Roadmap v2: la sesión actual es ${session.id} (${session.title}), estado ${session.status}. ` +
          `Si el usuario arranca esta sesión, ejecuta \`${SCRIPT} start ${session.id}\`; cuando se cumplan sus criterios ` +
          `de salida, ejecuta \`${SCRIPT} done ${session.id}\`. Plan completo en docs/v2/ROADMAP.md.`,
      },
    });
    break;
  }

  case 'stop': {
    const input = readStdin();
    if (input.stop_hook_active) break;
    const state = readJson(STATE, { notified: [] });
    const pending = sessions.filter((s) => s.status === 'done' && !state.notified.includes(s.id));
    if (pending.length === 0) break;
    const finished = pending.map((s) => s.id).join(', ');
    const next = nextAfter(pending[pending.length - 1]);
    const body = next
      ? `Abre una sesión nueva (/clear) y configura antes de pegar el prompt:\n${card(next)}`
      : 'No quedan sesiones pendientes: la v2 está completa.';
    emit({ systemMessage: `Roadmap v2: ${finished} terminada. ${body}` });
    state.notified.push(...pending.map((s) => s.id));
    writeJson(STATE, state);
    break;
  }

  case 'status': {
    for (const s of sessions) {
      const mark = { done: '✔', in_progress: '▶', pending: '·' }[s.status] ?? '?';
      console.log(`${mark} ${s.id.padEnd(4)} ${s.phase.padEnd(3)} ${model(s).label.padEnd(10)} ${s.effort.padEnd(6)} ${s.title}`);
    }
    break;
  }

  case 'next': {
    const session = current();
    console.log(session ? card(session) : 'Todas las sesiones están terminadas.');
    break;
  }

  case 'start': {
    const session = setStatus(arg, 'in_progress');
    console.log(`${session.id} marcada en curso.`);
    break;
  }

  case 'done': {
    const session = setStatus(arg, 'done');
    console.log(`${session.id} terminada. El hook Stop avisará de la siguiente al acabar el turno.`);
    break;
  }

  case 'reset': {
    const session = setStatus(arg, 'pending');
    const state = readJson(STATE, { notified: [] });
    state.notified = state.notified.filter((id) => id !== session.id);
    if (existsSync(STATE)) writeJson(STATE, state);
    console.log(`${session.id} vuelve a pendiente.`);
    break;
  }

  default:
    console.error('Uso: roadmap.mjs session-start | stop | status | next | start <id> | done <id> | reset <id>');
    process.exit(1);
}
