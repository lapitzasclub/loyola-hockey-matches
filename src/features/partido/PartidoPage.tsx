import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { indiceAlineacion } from '../../domain';
import type { IndiceAlineacion } from '../../domain';
import { claves, usePartido, useRefrescar } from '../../queries';
import { Consulta } from '../../ui/Consulta';
import { Pagina } from '../../ui/Pagina';
import { Pestanas } from '../../ui/Pestanas';
import { AlineacionesPartido } from './AlineacionesPartido';
import { CabeceraPartido, CabeceraPartidoSkeleton } from './CabeceraPartido';
import { EventosPartido } from './EventosPartido';
import { ResumenPartido } from './ResumenPartido';

type Seccion = 'resumen' | 'eventos' | 'alineaciones';

const SIN_ALINEACION: IndiceAlineacion = new Map();

/** Detalle de partido: cabecera con el marcador y, debajo, resumen, eventos y alineaciones. */
export function PartidoPage() {
  const { t } = useTranslation();
  const { partidoId } = useParams<'partidoId'>();
  const partido = usePartido(partidoId);
  const refrescar = useRefrescar(claves.partido(partidoId));
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const indice = useMemo(
    () => (partido.data ? indiceAlineacion(partido.data) : SIN_ALINEACION),
    [partido.data],
  );

  return (
    <Pagina
      titulo={t('partido.titulo')}
      testId="page-partido"
      detalle
      alRefrescar={refrescar}
    >
      <Consulta
        consulta={partido}
        error={t('partido.error')}
        cargando={<CabeceraPartidoSkeleton />}
      >
        {(p) => (
          <>
            <CabeceraPartido partido={p} />
            <Pestanas
              testId="secciones-partido"
              valor={seccion}
              alCambiar={setSeccion}
              pestanas={[
                {
                  id: 'resumen',
                  etiqueta: t('partido.secciones.resumen'),
                  contenido: <ResumenPartido partido={p} />,
                },
                {
                  id: 'eventos',
                  etiqueta: t('partido.secciones.eventos'),
                  contenido: <EventosPartido partido={p} indice={indice} />,
                },
                {
                  id: 'alineaciones',
                  etiqueta: t('partido.secciones.alineaciones'),
                  contenido: (
                    <AlineacionesPartido
                      local={p.local}
                      visitante={p.visitante}
                    />
                  ),
                },
              ]}
            />
          </>
        )}
      </Consulta>
    </Pagina>
  );
}
