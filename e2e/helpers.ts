import type { Page } from '@playwright/test';

const PASSWORD = 'segredo123';

/** Regista um utilizador novo e conclui o onboarding (geocoding simulado). */
export async function registerAndOnboard(page: Page) {
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
  await page.waitForLoadState('networkidle');
  await page.locator('#register-name').fill('Teste E2E');
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(PASSWORD);
  await page.locator('label:has(input[name=locale][value=PT_PT])').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL('**/onboarding');
  // Espera pela hidratação: antes disso o React repõe os inputs controlados.
  await page.waitForLoadState('networkidle');

  await page.locator('#birth-date').fill('1990-07-15');
  await page.locator('#birth-time').fill('14:30');
  await page.getByRole('button', { name: 'Seguinte' }).click();
  await page.locator('#birth-place').fill('Lisboa');
  await page.getByRole('option', { name: 'Lisboa, Lisboa, Portugal' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.waitForURL('**/today');
}

