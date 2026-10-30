import { IonIcon } from '@ionic/react';
import type { ReactNode } from 'react';

interface Props {
  icono: string;
  titulo: string;
  texto?: string;
  accion?: ReactNode;
  testId?: string;
}

/** Estado vacío o de error: icono, mensaje y una acción opcional (reintentar…). */
export function EstadoVacio({ icono, titulo, texto, accion, testId }: Props) {
  return (
    <div className="estado-vacio" data-testid={testId}>
      <span className="estado-vacio__icono">
        <IonIcon icon={icono} />
      </span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  );
}
