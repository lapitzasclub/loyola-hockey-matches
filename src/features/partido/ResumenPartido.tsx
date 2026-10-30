import { useTranslation } from 'react-i18next';

import { resultadoPartido, totalesPartido } from '../../domain';
import type { PartidoDetalle, ReglaMarcador } from '../../domain';
import { formatoDia } from '../../ui/formato';

const FILAS = [
  'goles',
  'faltas',
  'azules',
  'amarillas',
  'rojas',
  'tiemposMuertos',
] as const;

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="datos-fila">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function textoRegla(
  t: ReturnType<typeof useTranslation>['t'],
  regla: ReglaMarcador,
  partido: PartidoDetalle,
): string {
  switch (regla.tipo) {
    case 'por-periodos':
      return t('partido.resumen.reglas.porPeriodos');
    case 'desempate':
      return t(
        regla.via === 'penaltis'
          ? 'partido.resumen.reglas.desempatePenaltis'
          : 'partido.resumen.reglas.desempateProrroga',
        { equipo: partido[regla.ganador].equipo.nombre },
      );
    case 'a-cero':
      return t('partido.resumen.reglas.aCero');
    case 'diferencia-maxima':
      return t('partido.resumen.reglas.diferenciaMaxima', { max: regla.max });
  }
}

/** Totales por equipo, cómo se llega al resultado oficial, datos del partido y crónica. */
export function ResumenPartido({ partido }: { partido: PartidoDetalle }) {
  const { t, i18n } = useTranslation();
  const resultado = resultadoPartido(partido);
  const totales = totalesPartido(partido.incidencias);
  const cronica =
    partido.cronica?.[i18n.language === 'eu' ? 'eu' : 'es'] ??
    partido.cronica?.es ??
    partido.cronica?.eu ??
    null;
  const parciales =
    resultado?.regla?.tipo === 'por-periodos' ? resultado.regla.parciales : [];

  return (
    <div data-testid="resumen-partido">
      {resultado ? (
        <section className="seccion">
          <h2 className="seccion__titulo">
            {t('partido.resumen.estadisticas')}
          </h2>
          <table className="totales" data-testid="totales-partido">
            <thead>
              <tr>
                <th />
                <th scope="col">{partido.local.equipo.nombreAbrev}</th>
                <th scope="col">{partido.visitante.equipo.nombreAbrev}</th>
              </tr>
            </thead>
            <tbody>
              {FILAS.map((fila) => (
                <tr key={fila} data-fila={fila}>
                  <th scope="row">{t(`partido.resumen.${fila}`)}</th>
                  <td>{totales.local[fila]}</td>
                  <td>{totales.visitante[fila]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <p className="nota">{t('partido.resumen.sinDatos')}</p>
      )}

      {resultado?.regla && (
        <section className="seccion" data-testid="regla-marcador">
          <h2 className="seccion__titulo">
            {t('partido.resumen.resultadoOficial')}
          </h2>
          <p className="nota">{textoRegla(t, resultado.regla, partido)}</p>
          {parciales.length > 0 && (
            <dl className="datos-lista" data-testid="parciales">
              {parciales.map((p, i) => (
                <Fila
                  key={i}
                  etiqueta={t('partido.resumen.parcial', { numero: i + 1 })}
                  valor={`${p.local}–${p.visitante}`}
                />
              ))}
            </dl>
          )}
        </section>
      )}

      <section className="seccion">
        <h2 className="seccion__titulo">{t('partido.resumen.informacion')}</h2>
        <dl className="datos-lista" data-testid="informacion-partido">
          <Fila
            etiqueta={t('partido.resumen.competicion')}
            valor={[partido.competicionNombre, partido.jornada]
              .filter(Boolean)
              .join(' · ')}
          />
          <Fila
            etiqueta={t('partido.resumen.fecha')}
            valor={[formatoDia(partido.fecha, i18n.language), partido.hora]
              .filter(Boolean)
              .join(' · ')}
          />
          {partido.pista && (
            <Fila etiqueta={t('partido.resumen.pista')} valor={partido.pista} />
          )}
          {partido.arbitros.length > 0 && (
            <Fila
              etiqueta={t('partido.resumen.arbitros')}
              valor={partido.arbitros.join(', ')}
            />
          )}
        </dl>
      </section>

      {cronica && (
        <section className="seccion" data-testid="cronica-partido">
          <h2 className="seccion__titulo">{t('partido.resumen.cronica')}</h2>
          <article className="cronica">
            <h3>{cronica.titular}</h3>
            <p>{cronica.texto}</p>
          </article>
        </section>
      )}
    </div>
  );
}
