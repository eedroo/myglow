import type { Page } from '@playwright/test';

export const PASSWORD = 'segredo123';

/** Regista um utilizador novo e conclui o onboarding (geocoding simulado). */
export async function registerAndOnboard(page: Page): Promise<string> {
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
  // F9: Termos + Política e consentimento de bem-estar.
  await page.locator('input[name=acceptTerms]').check();
  await page.locator('input[name=wellbeingConsent]').check();
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
  return email;
}


/** Último email capturado em memória (servidor de dev com EMAIL_TEST_ENDPOINT=1); devolve os links como caminhos. */
export async function lastEmail(page: Page, to: string): Promise<{ subject: string; tag: string; links: string[] }> {
  const res = await page.request.get(`/api/test/last-email?to=${encodeURIComponent(to)}`);
  if (!res.ok()) throw new Error(`Sem email para ${to} (${res.status()})`);
  const body = (await res.json()) as { subject: string; tag: string; links: string[] };
  return { ...body, links: body.links.map((l) => (l.startsWith('http') ? new URL(l).pathname + new URL(l).search : l)) };
}

/** Sai sem passar pela app: sair da página primeiro (um pedido ainda em curso podia repor o cookie da sessão). */
export async function dropSession(page: Page): Promise<void> {
  await page.goto('about:blank');
  await page.context().clearCookies();
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Iniciar sessão' }).click();
}

/** Acesso directo à DB de teste (lê DATABASE_URL do ambiente ou do .env). */
export async function withTestDb<T>(fn: (db: import('@prisma/client').PrismaClient) => Promise<T>): Promise<T> {
  const { readFileSync } = await import('node:fs');
  const { PrismaClient } = await import('@prisma/client');
  let url = process.env.DATABASE_URL;
  if (!url) {
    const env = readFileSync('.env', 'utf8');
    url = /^DATABASE_URL="?([^"\n]+)"?/m.exec(env)?.[1];
  }
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    return await fn(db);
  } finally {
    await db.$disconnect();
  }
}
