import { useTranslation } from 'react-i18next';

import type { EstadoVisible } from '../domain';

/** Estado del partido en una pastilla; «en juego» lleva un punto que late. */
export function InsigniaEstado({ estado }: { estado: EstadoVisible }) {
  const { t } = useTranslation();
  return (
    <span className={`insignia insignia--${estado}`} data-estado={estado}>
      {estado === 'en_juego' && <span className="insignia__punto" />}
      {t(`partidos.estados.${estado}`)}
    </span>
  );
}
