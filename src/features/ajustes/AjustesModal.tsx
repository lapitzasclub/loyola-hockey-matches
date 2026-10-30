import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';

import { IDIOMAS, cambiarIdioma } from '../../i18n';
import type { Idioma } from '../../i18n';
import { PREFERENCIAS_TEMA as TEMAS } from '../../ui/tema';
import type { PreferenciaTema as Tema } from '../../ui/tema';

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  tema: Tema;
  alCambiarTema: (tema: Tema) => void;
}

/** Hoja de ajustes: tema e idioma, persistidos al instante. */
export function AjustesModal({
  abierto,
  alCerrar,
  tema,
  alCambiarTema,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <IonModal
      isOpen={abierto}
      onDidDismiss={alCerrar}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 1]}
      data-testid="ajustes"
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t('ajustes.titulo')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={alCerrar}>{t('common.cerrar')}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonListHeader>
            <IonLabel>{t('ajustes.tema')}</IonLabel>
          </IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={tema}
              onIonChange={(e) => {
                const valor = TEMAS.find((x) => x === e.detail.value);
                if (valor) alCambiarTema(valor);
              }}
            >
              {TEMAS.map((x) => (
                <IonSegmentButton key={x} value={x} data-testid={`tema-${x}`}>
                  <IonLabel>{t(`ajustes.temas.${x}`)}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </IonItem>
          <IonListHeader>
            <IonLabel>{t('ajustes.idioma')}</IonLabel>
          </IonListHeader>
          <IonItem lines="none">
            <IonSegment
              value={i18n.resolvedLanguage}
              onIonChange={(e) => {
                const valor = IDIOMAS.find((x) => x === e.detail.value);
                if (valor) cambiarIdioma(valor);
              }}
            >
              {IDIOMAS.map((x: Idioma) => (
                <IonSegmentButton key={x} value={x} data-testid={`idioma-${x}`}>
                  {/* Cada idioma en su propio idioma, para encontrarlo sin entender el actual. */}
                  <IonLabel>{t(`ajustes.idiomas.${x}`, { lng: x })}</IonLabel>
                </IonSegmentButton>
              ))}
            </IonSegment>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
}
