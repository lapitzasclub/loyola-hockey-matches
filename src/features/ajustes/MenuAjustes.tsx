import { IonContent, IonIcon, IonMenu, IonMenuToggle } from '@ionic/react';
import {
  chevronForward,
  close,
  contrastOutline,
  globeOutline,
  moon,
  people,
  sunny,
  sunnyOutline,
} from 'ionicons/icons';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { IDIOMAS, cambiarIdioma } from '../../i18n';
import { MENU_AJUSTES } from '../../ui/shell';
import type { EquipoCabecera } from '../../ui/shell';
import { PREFERENCIAS_TEMA as TEMAS } from '../../ui/tema';
import type { PreferenciaTema as Tema } from '../../ui/tema';

const ICONOS_TEMA: Record<Tema, string> = {
  claro: sunny,
  oscuro: moon,
  sistema: contrastOutline,
};

interface Props {
  ref?: Ref<HTMLIonMenuElement>;
  /** Id del contenido que el menú tapa al abrirse. */
  contentId: string;
  equipo: EquipoCabecera | null | undefined;
  alCambiarEquipo: () => void;
  tema: Tema;
  alCambiarTema: (tema: Tema) => void;
}

/** Menú lateral: el equipo elegido y su cambio, idioma y tema. */
export function MenuAjustes({
  ref,
  contentId,
  equipo,
  alCambiarEquipo,
  tema,
  alCambiarTema,
}: Props) {
  const { t, i18n } = useTranslation();
  return (
    <IonMenu
      ref={ref}
      menuId={MENU_AJUSTES}
      contentId={contentId}
      type="overlay"
      // Desde el borde izquierdo chocaría con el gesto de volver de iOS.
      swipeGesture={false}
      className="menu-ajustes"
      aria-label={t('ajustes.titulo')}
      data-testid="ajustes"
    >
      {/* Fuera del scroll, para que las esquinas no se muevan con él. */}
      <span className="menu-ajustes__esquina menu-ajustes__esquina--arriba" />
      <span className="menu-ajustes__esquina menu-ajustes__esquina--izquierda" />
      <span className="menu-ajustes__esquina menu-ajustes__esquina--derecha" />
      <IonContent className="menu-ajustes__contenido">
        <div className="menu-ajustes__pila">
          <IonMenuToggle menu={MENU_AJUSTES} autoHide={false}>
            <button
              type="button"
              className="menu-ajustes__cerrar"
              aria-label={t('ajustes.cerrar')}
            >
              <IonIcon icon={close} aria-hidden />
            </button>
          </IonMenuToggle>

          <header className="menu-ajustes__equipo">
            <span className="escudo-club escudo-club--grande" aria-hidden />
            <h2 className="menu-ajustes__nombre">
              {equipo?.nombre ?? t('app.club')}
            </h2>
            {equipo && (
              <p className="menu-ajustes__liga">{equipo.competicion}</p>
            )}
          </header>

          <button
            type="button"
            className="menu-ajustes__tarjeta menu-ajustes__cambiar"
            onClick={alCambiarEquipo}
            data-testid="cambiar-equipo"
          >
            <IonIcon
              className="menu-ajustes__icono"
              icon={people}
              aria-hidden
            />
            <span>{t(equipo ? 'selector.cambiar' : 'selector.elegir')}</span>
            <IonIcon icon={chevronForward} aria-hidden />
          </button>

          <div
            className="menu-ajustes__tarjeta menu-ajustes__idiomas"
            role="group"
            aria-label={t('ajustes.idioma')}
          >
            <IonIcon
              className="menu-ajustes__icono"
              icon={globeOutline}
              aria-hidden
            />
            {IDIOMAS.map((x) => (
              <button
                key={x}
                type="button"
                className="menu-ajustes__idioma"
                lang={x}
                // Cada idioma en su propio idioma, para encontrarlo sin entender el actual.
                aria-label={t(`ajustes.idiomas.${x}`, { lng: x })}
                aria-pressed={i18n.resolvedLanguage === x}
                onClick={() => cambiarIdioma(x)}
                data-testid={`idioma-${x}`}
              >
                {x.toUpperCase()}
              </button>
            ))}
          </div>

          <section className="menu-ajustes__tema">
            <h3 className="menu-ajustes__apartado">
              <IonIcon icon={sunnyOutline} aria-hidden />
              {t('ajustes.tema')}
            </h3>
            <div className="menu-ajustes__temas" role="group">
              {TEMAS.map((x) => (
                <button
                  key={x}
                  type="button"
                  className="menu-ajustes__opcion"
                  data-tema={x}
                  aria-pressed={tema === x}
                  onClick={() => alCambiarTema(x)}
                  data-testid={`tema-${x}`}
                >
                  <IonIcon icon={ICONOS_TEMA[x]} aria-hidden />
                  {t(`ajustes.temas.${x}`)}
                </button>
              ))}
            </div>
          </section>
        </div>
      </IonContent>
    </IonMenu>
  );
}
