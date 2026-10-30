import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  calendarOutline,
  listOutline,
  statsChartOutline,
} from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { Navigate, Route } from 'react-router-dom';

import { ClasificacionPage } from '../features/clasificacion/ClasificacionPage';
import { EstadisticasPage } from '../features/estadisticas/EstadisticasPage';
import { PartidosPage } from '../features/partidos/PartidosPage';

export function Tabs() {
  const { t } = useTranslation();
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route path="/partidos" element={<PartidosPage />} />
          <Route path="/clasificacion" element={<ClasificacionPage />} />
          <Route path="/estadisticas" element={<EstadisticasPage />} />
          <Route path="/" element={<Navigate to="/partidos" replace />} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom">
          <IonTabButton tab="partidos" href="/partidos">
            <IonIcon aria-hidden="true" icon={calendarOutline} />
            <IonLabel>{t('tabs.partidos')}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="clasificacion" href="/clasificacion">
            <IonIcon aria-hidden="true" icon={listOutline} />
            <IonLabel>{t('tabs.clasificacion')}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="estadisticas" href="/estadisticas">
            <IonIcon aria-hidden="true" icon={statsChartOutline} />
            <IonLabel>{t('tabs.estadisticas')}</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  );
}
