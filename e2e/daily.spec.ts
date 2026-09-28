import { expect, test, type Page } from '@playwright/test';
import { registerAndOnboard } from './helpers';

const saveStatus = (page: Page) => page.locator('.mg-save-status');

test('o diário grava automaticamente e persiste depois de recarregar', async ({ page }) => {
  await registerAndOnboard(page);

  // Mapa natal calculado no onboarding.
  await expect(page.getByText('Ascendente')).toBeVisible();

  const ritual = page.getByRole('checkbox', { name: /Ritual matinal/ });
  await ritual.check();
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.locator('#day-intention').fill('Respirar antes de responder.');
  await expect(saveStatus(page)).toHaveText('Guardado');

  // O rádio é visualmente oculto; clica-se na cara, como o utilizador.
  await page.locator('.mg-wake .mg-mood__face').nth(4).click();
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Ritual matinal/ })).toBeChecked();
  await expect(page.locator('#day-intention')).toHaveValue('Respirar antes de responder.');
  await expect(page.getByRole('radio', { name: 'Radiante' }).first()).toBeChecked();
});

test('sem rede mostra "Sem ligação" e grava sozinho quando a rede volta', async ({ page, context }) => {
  await registerAndOnboard(page);

  await context.setOffline(true);
  await page.locator('#day-gratitude').fill('Pela chuva de hoje.');
  await expect(saveStatus(page)).toContainText('Sem ligação');

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(saveStatus(page)).toHaveText('Guardado');

  await page.reload();
  await expect(page.locator('#day-gratitude')).toHaveValue('Pela chuva de hoje.');
});

test('dias passados abrem pela seta e datas futuras voltam a /today', async ({ page }) => {
  await registerAndOnboard(page);

  await page.getByRole('link', { name: 'Dia anterior' }).click();
  await page.waitForURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole('link', { name: 'Voltar a hoje' })).toBeVisible();

  await page.goto('/day/2999-01-01');
  await expect(page).toHaveURL(/\/today$/);
  await page.goto('/day/nao-e-data');
  await expect(page).toHaveURL(/\/today$/);
});
