import type { Division } from './competicion';
import type { FichaJugador, PartidoJugador } from './jugador';
import type { PartidoResumen } from './partido';

type Lado = PartidoJugador['local'];

/** El equipo de un jugador; con `enlace` si se ha encontrado su inscripción. */
export interface EquipoDelJugador {
  nombre: string;
  nombreAbrev: string;
  logoUrl: string | null;
  enlace: {
    competicionId: string;
    divisionId: string;
    inscripcionId: string;
  } | null;
}

const clave = (abrev: string) => abrev.trim().toUpperCase();

/**
 * La API de la ficha no dice de qué equipo es el jugador, pero sus partidos
 * sí: es el único lado que se repite en todos. Con un solo partido (o si
 * siempre juega contra el mismo rival) no se puede saber.
 */
export function ladoComun(partidos: readonly PartidoJugador[]): Lado | null {
  const [primero, ...resto] = partidos;
  if (!primero) return null;
  const lados = (p: PartidoJugador) =>
    new Map<string, Lado>(
      [p.local, p.visitante].map((e) => [clave(e.nombreAbrev), e]),
    );
  let comunes = lados(primero);
  for (const p of resto) {
    const estos = lados(p);
    comunes = new Map([...comunes].filter(([k]) => estos.has(k)));
  }
  return comunes.size === 1 ? ([...comunes.values()][0] ?? null) : null;
}

/** La competición con más partidos del jugador: ahí se busca su equipo. */
export function competicionPrincipal(
  ficha: Pick<FichaJugador, 'competiciones'>,
) {
  return [...ficha.competiciones].sort(
    (a, b) => b.partidosJugados - a.partidosJugados,
  )[0];
}

export interface CalendarioDeDivision {
  division: Pick<Division, 'id' | 'competicionId'>;
  partidos: readonly PartidoResumen[];
}

/**
 * Busca el equipo en los calendarios de las divisiones de su competición,
 * por abreviatura. Si está en varias (p. ej. «BGO» en dos grupos), gana la
 * división donde juega contra los rivales de sus partidos.
 */
export function equipoDelJugador(
  ficha: Pick<FichaJugador, 'competiciones'>,
  calendarios: readonly CalendarioDeDivision[],
): EquipoDelJugador | null {
  const comun = ladoComun(ficha.competiciones.flatMap((c) => c.partidos));
  if (!comun) return null;
  const abrev = clave(comun.nombreAbrev);
  const rivales = new Set(
    (competicionPrincipal(ficha)?.partidos ?? [])
      .flatMap((p) => [p.local.nombreAbrev, p.visitante.nombreAbrev])
      .map(clave)
      .filter((k) => k !== abrev),
  );

  let mejor: { enlace: EquipoDelJugador['enlace']; nombre: string } | null =
    null;
  let mejorAfinidad = -1;
  for (const { division, partidos } of calendarios) {
    const equipos = partidos.flatMap((p) => [p.local, p.visitante]);
    const suyo = equipos.find(
      (e) => e?.inscripcionId && clave(e.nombreAbrev) === abrev,
    );
    if (!suyo?.inscripcionId) continue;
    const afinidad = new Set(
      equipos
        .map((e) => (e ? clave(e.nombreAbrev) : ''))
        .filter((k) => rivales.has(k)),
    ).size;
    if (afinidad > mejorAfinidad) {
      mejorAfinidad = afinidad;
      mejor = {
        nombre: suyo.nombre,
        enlace: {
          competicionId: division.competicionId,
          divisionId: division.id,
          inscripcionId: suyo.inscripcionId,
        },
      };
    }
  }
  return {
    nombreAbrev: comun.nombreAbrev,
    logoUrl: comun.logoUrl,
    nombre: mejor?.nombre ?? comun.nombreAbrev,
    enlace: mejor?.enlace ?? null,
  };
}
