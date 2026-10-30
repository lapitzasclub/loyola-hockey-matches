import { IonRouterLink } from '@ionic/react';
import { statsChartOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

import {
  balanceEquipo,
  disciplinaEquipo,
  rankingGoleadores,
} from '../../domain';
import type { Balance } from '../../domain';
import { usePlantilla } from '../../queries';
import { EstadoVacio } from '../../ui/EstadoVacio';
import { useRutas } from '../../ui/rutas';
import type { DatosEquipo } from './tipos';

const GOLEADORES = 5;

const decimales = (n: number) => n.toFixed(1);

function Linea({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <div className="linea">
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

/** Barra de victorias, empates y derrotas. */
function BarraResultados({ balance }: { balance: Balance }) {
  const { t } = useTranslation();
  const partes = [
    ['victoria', balance.pg],
    ['empate', balance.pe],
    ['derrota', balance.pp],
  ] as const;
  return (
    <div
      className="barra"
      role="img"
      aria-label={partes.map(([r, n]) => `${t(`racha.${r}`)}: ${n}`).join(', ')}
    >
      {partes.map(
        ([r, n]) =>
          n > 0 && (
            <span
              key={r}
              className={`barra__tramo barra__tramo--${r}`}
              style={{ flexGrow: n }}
            />
          ),
      )}
    </div>
  );
}

function Lado({ titulo, balance }: { titulo: string; balance: Balance }) {
  const { t } = useTranslation();
  return (
    <div className="lado-balance">
      <h3>{titulo}</h3>
      <span>
        {t('equipo.estadisticas.resumenLado', {
          pg: balance.pg,
          pe: balance.pe,
          pp: balance.pp,
        })}
      </span>
      <span>
        {balance.gf} – {balance.gc}
      </span>
    </div>
  );
}

/** Balance del equipo por sus partidos y, con la plantilla, goleadores y sanciones. */
export function EstadisticasEquipo({ datos }: { datos: DatosEquipo }) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const plantilla = usePlantilla(
    datos.divisionId,
    datos.equipo.equipoId ?? undefined,
  );
  const balance = balanceEquipo(datos.partidos, datos.inscripcionId);

  if (balance.total.pj === 0) {
    return (
      <EstadoVacio
        testId="estadisticas-vacias"
        icono={statsChartOutline}
        titulo={t('equipo.estadisticas.vacias')}
      />
    );
  }

  const jugadores = plantilla.data?.jugadores ?? [];
  const goleadores = rankingGoleadores(jugadores).slice(0, GOLEADORES);
  const disciplina = disciplinaEquipo(jugadores);

  return (
    <div data-testid="estadisticas-equipo">
      <section className="seccion">
        <h2 className="seccion__titulo">
          {t('equipo.estadisticas.resultados')}
        </h2>
        <BarraResultados balance={balance.total} />
        <Linea
          etiqueta={t('equipo.estadisticas.victorias')}
          valor={`${Math.round(balance.porcentajeVictorias)}%`}
        />
        <Linea
          etiqueta={t('equipo.estadisticas.golesPartido')}
          valor={`${decimales(balance.promedioFavor)} / ${decimales(balance.promedioContra)}`}
        />
        <Linea
          etiqueta={t('equipo.estadisticas.porteriaACero')}
          valor={balance.porteriasACero}
        />
        <Linea
          etiqueta={t('equipo.estadisticas.sinMarcar')}
          valor={balance.sinMarcar}
        />
        <div className="lados-balance">
          <Lado
            titulo={t('equipo.estadisticas.local')}
            balance={balance.local}
          />
          <Lado
            titulo={t('equipo.estadisticas.visitante')}
            balance={balance.visitante}
          />
        </div>
      </section>

      {goleadores.length > 0 && (
        <section className="seccion">
          <h2 className="seccion__titulo">
            {t('equipo.estadisticas.goleadores')}
          </h2>
          {goleadores.map(({ puesto, jugador }) => (
            <IonRouterLink
              key={jugador.plantillaEquipoId}
              routerLink={rutas.jugador(jugador.plantillaEquipoId)}
              className="persona persona--enlace"
            >
              <span className="persona__interior">
                <span className="persona__puesto">{puesto}</span>
                <span className="persona__nombre">{jugador.nombre}</span>
                <span className="persona__dato">
                  {t('equipo.estadisticas.asistencias', {
                    count: jugador.asistencias,
                  })}
                </span>
                <span className="persona__dato persona__dato--fuerte">
                  {t('equipo.plantilla.goles', { count: jugador.goles })}
                </span>
              </span>
            </IonRouterLink>
          ))}
        </section>
      )}

      {plantilla.data && (
        <section className="seccion">
          <h2 className="seccion__titulo">
            {t('equipo.estadisticas.disciplina')}
          </h2>
          <Linea
            etiqueta={t('equipo.estadisticas.faltas')}
            valor={disciplina.faltas}
          />
          <Linea
            etiqueta={t('equipo.estadisticas.azules')}
            valor={disciplina.azules}
          />
          <Linea
            etiqueta={t('equipo.estadisticas.amarillas')}
            valor={disciplina.amarillas}
          />
          <Linea
            etiqueta={t('equipo.estadisticas.rojas')}
            valor={disciplina.rojas}
          />
        </section>
      )}
    </div>
  );
}
