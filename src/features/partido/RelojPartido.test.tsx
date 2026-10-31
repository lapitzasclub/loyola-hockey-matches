import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { RelojPartido } from './RelojPartido';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const reloj = () => screen.queryByTestId('reloj')?.textContent;

it('descuenta mientras está en marcha y se corrige con cada valor del directo', () => {
  const { rerender } = render(
    <RelojPartido reloj={{ minuto: 1, segundo: 2, enMarcha: true }} />,
  );
  expect(reloj()).toBe('1:02');
  act(() => vi.advanceTimersByTime(3_000));
  expect(reloj()).toBe('0:59');

  rerender(<RelojPartido reloj={{ minuto: 1, segundo: 0, enMarcha: true }} />);
  expect(reloj()).toBe('1:00');
  act(() => vi.advanceTimersByTime(90_000));
  expect(reloj()).toBe('0:00');
});

it('parado no se mueve, y a 0:00 no se pinta', () => {
  const { rerender } = render(
    <RelojPartido reloj={{ minuto: 7, segundo: 5, enMarcha: false }} />,
  );
  act(() => vi.advanceTimersByTime(5_000));
  expect(reloj()).toBe('7:05');

  rerender(<RelojPartido reloj={{ minuto: 0, segundo: 0, enMarcha: false }} />);
  expect(reloj()).toBeUndefined();
});
