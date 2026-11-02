import { useTranslation } from 'react-i18next';

import {
  balanceEquipo,
  jornadaVisible,
  partidoVisible,
  PARTIDOS_RACHA,
} from '../../domain';
import type { FilaClasificacion, Racha } from '../../domain';
import { Racha as RachaPuntos } from '../../ui/Racha';
import { TarjetaPartido } from '../../ui/TarjetaPartido';
import { useRutas } from '../../ui/rutas';
import type { DatosEquipo } from './tipos';

interface Props {
  datos: DatosEquipo;
  /** Fila de la clasificación; null si el equipo aún no sale en ella. */
  fila: FilaClasificacion | null;
  racha: Racha | undefined;
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string | number;
}) {
  return (
    <div className="dato">
      <span className="dato__valor">{valor}</span>
      <span className="dato__etiqueta">{etiqueta}</span>
    </div>
  );
}

const conSigno = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Posición, balance, racha y los partidos más cercanos. */
export function ResumenEquipo({ datos, fila, racha }: Props) {
  const { t } = useTranslation();
  const rutas = useRutas();
  const { partidos, hoy, equipo } = datos;
  const balance = balanceEquipo(partidos, datos.inscripcionId);
  const total = fila ?? {
    ...balance.total,
    dg: balance.total.gf - balance.total.gc,
  };

  const proximo = partidos.find(
    (p) => p.estado !== 'finalizado' && p.fecha >= hoy,
  );
  const ultimo = partidos.findLast((p) => p.estado === 'finalizado');
  const tarjeta = (p: (typeof partidos)[number], esProximo = false) => (
    <TarjetaPartido
      visible={partidoVisible(p, hoy, datos.directos.get(p.id))}
      propio={equipo}
      proximo={esProximo}
      href={rutas.partido(p.id)}
      jornadaDe={(q) =>
        jornadaVisible(datos.calendario, q, hoy, datos.directos)
      }
    />
  );

  return (
    <div data-testid="resumen-equipo">
      <section className="seccion">
        <div className="datos">
          {fila && (
            <Dato etiqueta={t('equipo.puesto')} valor={`${fila.puesto}º`} />
          )}
          {fila && (
            <Dato etiqueta={t('clasificacion.columnas.pts')} valor={fila.pts} />
          )}
          <Dato etiqueta={t('clasificacion.columnas.pj')} valor={total.pj} />
          <Dato etiqueta={t('clasificacion.columnas.pg')} valor={total.pg} />
          <Dato etiqueta={t('clasificacion.columnas.pe')} valor={total.pe} />
          <Dato etiqueta={t('clasificacion.columnas.pp')} valor={total.pp} />
          <Dato etiqueta={t('equipo.golesFavor')} valor={total.gf} />
          <Dato etiqueta={t('equipo.golesContra')} valor={total.gc} />
          <Dato
            etiqueta={t('clasificacion.columnas.dg')}
            valor={conSigno(total.dg)}
          />
        </div>
        {!fila && <p className="nota">{t('equipo.sinClasificacion')}</p>}
      </section>

      <section className="seccion">
        <h2 className="seccion__titulo">{t('equipo.racha')}</h2>
        <RachaPuntos racha={racha ?? balance.racha.slice(-PARTIDOS_RACHA)} />
        {balance.racha.length === 0 && (
          <p className="nota">{t('equipo.sinRacha')}</p>
        )}
      </section>

      {proximo && (
        <section className="seccion">
          <h2 className="seccion__titulo">{t('equipo.proximoPartido')}</h2>
          <div className="lista-partidos">{tarjeta(proximo, true)}</div>
        </section>
      )}
      {ultimo && (
        <section className="seccion">
          <h2 className="seccion__titulo">{t('equipo.ultimoPartido')}</h2>
          <div className="lista-partidos">{tarjeta(ultimo)}</div>
        </section>
      )}
    </div>
  );
}
