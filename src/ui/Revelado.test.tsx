import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Revelado, useEspera } from './Revelado';

describe('useEspera', () => {
  it('recuerda que hubo espera aunque los datos ya hayan llegado', () => {
    const { result, rerender } = renderHook(
      ({ pendiente }) => useEspera(pendiente),
      { initialProps: { pendiente: false } },
    );
    expect(result.current).toBe(false);
    rerender({ pendiente: true });
    rerender({ pendiente: false });
    expect(result.current).toBe(true);
  });
});

describe('Revelado', () => {
  it('sin espera pinta el contenido sin transición ni skeleton', () => {
    const { container } = render(
      <Revelado espera={false} saliente={<span>esqueleto</span>}>
        <p>datos</p>
      </Revelado>,
    );
    expect(screen.getByText('datos')).toBeInTheDocument();
    expect(screen.queryByText('esqueleto')).toBeNull();
    expect(container.querySelector('.revelado')).toBeNull();
  });

  it('tras una espera funde el skeleton encima y lo quita al acabar', () => {
    const { container } = render(
      <Revelado espera saliente={<span>esqueleto</span>}>
        <p>datos</p>
      </Revelado>,
    );
    expect(container.querySelector('.revelado')).not.toBeNull();
    const saliente = container.querySelector('.revelado__saliente');
    expect(saliente).toHaveTextContent('esqueleto');

    // jsdom no tiene AnimationEvent y React escucha la variante con prefijo.
    fireEvent(saliente!, new Event('webkitAnimationEnd', { bubbles: true }));
    expect(container.querySelector('.revelado__saliente')).toBeNull();
    expect(screen.getByText('datos')).toBeInTheDocument();
  });
});
