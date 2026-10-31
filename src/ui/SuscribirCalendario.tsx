import { IonActionSheet, IonButton, IonIcon, useIonToast } from '@ionic/react';
import { calendarNumberOutline } from 'ionicons/icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { enlacesCalendario } from '../domain';
import { abrirEnlace, modoIonic } from './plataforma';

interface Props {
  equipoId: string;
}

/**
 * Botón de la barra para añadir los partidos del equipo al calendario del
 * móvil. La federación sirve el `.ics` y la app del calendario lo refresca.
 */
export function SuscribirCalendario({ equipoId }: Props) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [avisar] = useIonToast();
  const enlaces = enlacesCalendario(equipoId);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlaces.https);
      await avisar({ message: t('calendario.copiado'), duration: 2000 });
    } catch {
      await avisar({
        message: t('calendario.copiaManual', { direccion: enlaces.https }),
        duration: 8000,
      });
    }
  };

  const apple = {
    text: t('calendario.apple'),
    data: 'apple',
    handler: () => abrirEnlace(enlaces.webcal),
  };
  const google = {
    text: t('calendario.google'),
    data: 'google',
    handler: () => abrirEnlace(enlaces.google),
  };
  // Android no suele tener quien abra `webcal:`; el resto, sí.
  const opciones = modoIonic() === 'md' ? [google, apple] : [apple, google];

  return (
    <>
      <IonButton
        aria-label={t('calendario.suscribirse')}
        data-testid="suscribir-calendario"
        onClick={() => setAbierto(true)}
      >
        <IonIcon slot="icon-only" icon={calendarNumberOutline} />
      </IonButton>
      <IonActionSheet
        isOpen={abierto}
        header={t('calendario.suscribirse')}
        subHeader={t('calendario.explicacion')}
        buttons={[
          ...opciones,
          {
            text: t('calendario.copiar'),
            data: 'copiar',
            handler: () => void copiar(),
          },
          { text: t('common.cancelar'), role: 'cancel' },
        ]}
        onDidDismiss={() => setAbierto(false)}
        cssClass="hoja-calendario"
      />
    </>
  );
}
