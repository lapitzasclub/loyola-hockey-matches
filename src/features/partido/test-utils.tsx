import { IonReactRouter } from '@ionic/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

import { fixturePartido } from '../../api/fixtures';
import { partidoDetalleDesdeApi } from '../../api/mappers';
import { partidoDetalleSchema } from '../../api/schemas';
import { Providers } from '../../app/Providers';
import type { PartidoDetalle } from '../../domain';
import '../../i18n';

/** Partido de los fixtures ya pasado por esquema y mapper, como lo ve la app. */
export function detalle(clave: string): PartidoDetalle {
  return partidoDetalleDesdeApi(
    partidoDetalleSchema.parse(fixturePartido(clave)),
  );
}

export function pintar(contenido: ReactNode) {
  return render(
    <Providers>
      <IonReactRouter>{contenido}</IonReactRouter>
    </Providers>,
  );
}
