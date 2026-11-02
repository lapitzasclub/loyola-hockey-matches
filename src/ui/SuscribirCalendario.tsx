import {
  IonActionSheet,
  IonButton,
  IonIcon,
  isPlatform,
  useIonAlert,
  useIonToast,
} from '@ionic/react';
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
  const [alerta] = useIonAlert();
  const enlaces = enlacesCalendario(equipoId);

  const alPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(enlaces.https);
      return true;
    } catch {
      return false;
    }
  };

  const copiar = async () => {
    if (await alPortapapeles()) {
      await avisar({ message: t('calendario.copiado'), duration: 2000 });
    } else {
      await avisar({
        message: t('calendario.copiaManual', { direccion: enlaces.https }),
        duration: 8000,
      });
    }
  };

  /*
   * Google no deja suscribirse a un calendario por URL desde el móvil: su app
   * de Android se queda con el enlace y lo ignora, y la web móvil no tiene la
   * opción. Se hace una vez en calendar.google.com desde un ordenador y luego
   * aparece solo en el móvil. En el ordenador, el enlace directo sí vale.
   */
  const google = async () => {
    if (!isPlatform('mobile')) {
      abrirEnlace(enlaces.google);
      return;
    }
    const copiada = await alPortapapeles();
    await alerta({
      header: t('calendario.google'),
      message: t(
        copiada ? 'calendario.googleMovil' : 'calendario.googleMovilSinCopia',
        {
          direccion: enlaces.https,
        },
      ),
      buttons: [{ text: t('common.entendido'), role: 'cancel' }],
      cssClass: 'alerta-calendario',
    });
  };

  const android = modoIonic() === 'md';
  const opcionWebcal = {
    // En Android abre `webcal:` la app que lo sepa leer (ICSx⁵, Etar…).
    text: t(android ? 'calendario.otraApp' : 'calendario.apple'),
    data: 'webcal',
    handler: () => abrirEnlace(enlaces.webcal),
  };
  const opcionGoogle = {
    text: t('calendario.google'),
    data: 'google',
    handler: () => void google(),
  };
  const opciones = android
    ? [opcionGoogle, opcionWebcal]
    : [opcionWebcal, opcionGoogle];

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
