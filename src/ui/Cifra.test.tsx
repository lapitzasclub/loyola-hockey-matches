import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Cifra } from './Cifra';

describe('Cifra', () => {
  it('al montarse no late', () => {
    render(<Cifra valor="1–0" />);
    expect(screen.getByText('1–0')).not.toHaveClass('cifra--cambia');
  });

  it('late cada vez que el valor cambia, con un nodo nuevo', () => {
    const { rerender } = render(<Cifra valor="1–0" />);
    const antes = screen.getByText('1–0');
    rerender(<Cifra valor="2–0" />);
    const gol = screen.getByText('2–0');
    expect(gol).toHaveClass('cifra--cambia');
    expect(gol).not.toBe(antes);
    rerender(<Cifra valor="2–1" />);
    expect(screen.getByText('2–1')).not.toBe(gol);
  });
});
