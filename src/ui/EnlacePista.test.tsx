import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnlacePista } from './EnlacePista';

const COORDENADAS = { latitud: 43.2961, longitud: -2.9924 };

afterEach(() => vi.restoreAllMocks());

describe('EnlacePista', () => {
  it('sin coordenadas es solo el nombre', () => {
    render(<EnlacePista pista="Lasesarre" coordenadas={null} />);
    expect(screen.getByText('Lasesarre')).toBeInTheDocument();
    expect(screen.queryByTestId('enlace-pista')).toBeNull();
  });

  it('con coordenadas es un enlace al mapa que se abre aparte', () => {
    render(<EnlacePista pista="Lasesarre" coordenadas={COORDENADAS} />);
    const enlace = screen.getByTestId('enlace-pista');
    expect(enlace.tagName).toBe('A');
    expect(enlace).toHaveAttribute(
      'href',
      'https://maps.google.com/?q=43.2961,-2.9924',
    );
    expect(enlace).toHaveAttribute('target', '_blank');
    expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('dentro de otro enlace abre el mapa sin que el clic llegue al contenedor', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const fuera = vi.fn();
    render(
      <div onClick={fuera}>
        <EnlacePista pista="Lasesarre" coordenadas={COORDENADAS} anidado />
      </div>,
    );
    const enlace = screen.getByRole('link');
    expect(enlace.tagName).toBe('SPAN');
    fireEvent.click(enlace);
    expect(click).toHaveBeenCalledOnce();
    expect(fuera).not.toHaveBeenCalled();
  });
});
