import { IonRouterLink } from '@ionic/react';
import { useTranslation } from 'react-i18next';

import {
  colorHex,
  esEquipoLoyola,
  leyendaDePuesto,
  nombreGrupo,
  PARTIDOS_RACHA,
} from '../../domain';
import type {
  FilaClasificacion,
  Racha,
  TablaClasificacion,
} from '../../domain';
import { Escudo } from '../../ui/Escudo';
import { Racha as RachaPuntos } from '../../ui/Racha';
import { useRutas } from '../../ui/rutas';
import { Skeleton } from '../../ui/Skeleton';
import { transicion } from '../../ui/transiciones';

interface Props {
  tabla: TablaClasificacion;
  competicionId: string;
  divisionId: string;
  /** Racha calculada por `inscripcionId`; sin ella se usa la de la federación. */
  rachas?: ReadonlyMap<string, Racha>;
}

function Fila({
  fila,
  tabla,
  competicionId,
  divisionId,
  racha,
}: {
  fila: FilaClasificacion;
  tabla: TablaClasificacion;
  competicionId: string;
  divisionId: string;
  racha: Racha;
}) {
  const rutas = useRutas();
  const { inscripcionId, nombre, nombreAbrev, logoUrl } = fila.equipo;
  const leyenda = leyendaDePuesto(tabla.leyendas, fila.puesto);
  const color = colorHex(leyenda?.colorTexto) ?? colorHex(leyenda?.color);
  const clases = [
    'clasif__fila',
    esEquipoLoyola(fila.equipo) ? 'clasif__fila--loyola' : '',
    inscripcionId ? 'clasif__fila--enlace' : '',
  ].join(' ');

  const contenido = (
    <>
      <span
        className="clasif__puesto"
        style={color ? { borderLeftColor: color } : undefined}
      >
        {fila.puesto}
      </span>
      <span className="clasif__equipo">
        <Escudo
          logoUrl={logoUrl}
          nombre={nombre}
          abreviatura={nombreAbrev}
          tamano={28}
          transicion={
            inscripcionId ? transicion.escudo(inscripcionId) : undefined
          }
        />
        <span className="clasif__textos">
          <span
            className="clasif__nombre"
            data-transicion={
              inscripcionId ? transicion.nombre(inscripcionId) : undefined
            }
          >
            {nombre}
          </span>
          <RachaPuntos racha={racha} compacta />
        </span>
      </span>
      <span className="clasif__num">{fila.pj}</span>
      <span className="clasif__num clasif__num--opc">{fila.pg}</span>
      <span className="clasif__num clasif__num--opc">{fila.pe}</span>
      <span className="clasif__num clasif__num--opc">{fila.pp}</span>
      <span className="clasif__num">
        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
      </span>
      <span className="clasif__num clasif__pts">{fila.pts}</span>
    </>
  );

  return inscripcionId ? (
    <IonRouterLink
      routerLink={rutas.equipo({ competicionId, divisionId, inscripcionId })}
      className={clases}
      data-testid="clasificacion-fila"
      data-inscripcion={inscripcionId}
    >
      <span className="clasif__interior">{contenido}</span>
    </IonRouterLink>
  ) : (
    <div className={clases} data-testid="clasificacion-fila">
      {contenido}
    </div>
  );
}

/** Tabla de una fase o de uno de sus grupos, con el Loyola destacado y la racha. */
export function TablaClasificacionGrupo({
  tabla,
  competicionId,
  divisionId,
  rachas,
}: Props) {
  const { t } = useTranslation();
  const ajustes = tabla.filas.filter((f) => f.ajustePuntos !== 0);

  return (
    <section className="clasif" data-testid="clasificacion">
      {tabla.grupo && (
        <h2 className="clasif__grupo">{nombreGrupo(tabla.grupo.nombre)}</h2>
      )}
      <div className="clasif__tabla" role="table">
        <div className="clasif__fila clasif__cabecera" role="row">
          <span>#</span>
          <span className="clasif__equipo">
            {t('clasificacion.columnas.equipo')}
          </span>
          <span className="clasif__num">{t('clasificacion.columnas.pj')}</span>
          <span className="clasif__num clasif__num--opc">
            {t('clasificacion.columnas.pg')}
          </span>
          <span className="clasif__num clasif__num--opc">
            {t('clasificacion.columnas.pe')}
          </span>
          <span className="clasif__num clasif__num--opc">
            {t('clasificacion.columnas.pp')}
          </span>
          <span className="clasif__num">{t('clasificacion.columnas.dg')}</span>
          <span className="clasif__num">{t('clasificacion.columnas.pts')}</span>
        </div>
        {tabla.filas.map((fila) => (
          <Fila
            key={fila.equipo.inscripcionId ?? fila.equipo.nombre}
            fila={fila}
            tabla={tabla}
            competicionId={competicionId}
            divisionId={divisionId}
            racha={
              (fila.equipo.inscripcionId
                ? rachas?.get(fila.equipo.inscripcionId)
                : undefined) ??
              fila.racha?.slice(-PARTIDOS_RACHA) ??
              []
            }
          />
        ))}
      </div>
      {tabla.leyendas.length > 0 && (
        <ul className="clasif__leyendas">
          {tabla.leyendas.map((l) => (
            <li key={l.descripcion}>
              <span
                className="clasif__marca"
                style={{
                  background:
                    colorHex(l.colorTexto) ?? colorHex(l.color) ?? undefined,
                }}
              />
              {l.descripcion}
            </li>
          ))}
        </ul>
      )}
      {ajustes.map((f) => (
        <p key={f.equipo.nombre} className="clasif__nota">
          {t('clasificacion.ajuste', {
            equipo: f.equipo.nombre,
            puntos: f.ajustePuntos,
            nota: f.ajusteNota ?? '',
          })}
        </p>
      ))}
    </section>
  );
}

export function TablaClasificacionSkeleton() {
  return (
    <div className="clasif" data-testid="clasificacion-skeleton">
      <div className="clasif__tabla">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="clasif__fila clasif__fila--skeleton">
            <Skeleton ancho={28} alto={28} redondo />
            <Skeleton ancho="60%" alto={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
