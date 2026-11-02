import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Tira hacia abajo desde arriba de la pantalla visible y suelta. Con ratón:
 * el gesto de Ionic atiende igual a ratón y a toque en todos los motores.
 */
export async function tirarParaRefrescar(page: Page, testId: string) {
  const pagina = page.getByTestId(testId);
  // Partidos se abre desplazada hasta el próximo: solo se tira desde arriba.
  const contenido = pagina.locator('ion-content');
  await expect
    .poll(() =>
      contenido.evaluate(async (c: HTMLIonContentElement) => {
        await c.scrollToTop(0);
        await new Promise((r) => setTimeout(r, 300));
        return (await c.getScrollElement()).scrollTop;
      }),
    )
    .toBe(0);
  const caja = await pagina.locator('ion-content').boundingBox();
  if (!caja) throw new Error(`Sin contenido en ${testId}`);
  const x = caja.x + 12;
  const y = caja.y + 40;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Pasos con pausa: Ionic procesa el movimiento una vez por fotograma.
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(x, y + i * 20);
    await page.waitForTimeout(20);
  }
  await expect(pagina.getByTestId('desgarro')).toHaveAttribute(
    'data-estado',
    'listo',
  );
  await page.mouse.up();
}
