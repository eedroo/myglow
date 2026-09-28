import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'segredo123';

/** Regista um utilizador novo e conclui o onboarding (geocoding simulado). */
async function registerAndOnboard(page: Page) {
  await page.route('**/api/geocode?**', (route) =>
    route.fulfill({
      json: {
        results: [
          { id: 1, name: 'Lisboa', label: 'Lisboa, Lisboa, Portugal', latitude: 38.72, longitude: -9.14, timezone: 'Europe/Lisbon', countryCode: 'PT' },
        ],
      },
    }),
  );
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  await page.goto('/register');
  await page.locator('#register-name').fill('Teste E2E');
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(PASSWORD);
  await page.locator('label:has(input[name=locale][value=PT_PT])').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL('**/onboarding');

  await page.locator('#birth-date').fill('1990-07-15');
  await page.locator('#birth-time').fill('14:30');
  await page.getByRole('button', { name: 'Seguinte' }).click();
  await page.locator('#birth-place').fill('Lisboa');
  await page.getByRole('option', { name: 'Lisboa, Lisboa, Portugal' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.waitForURL('**/today');
}

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
