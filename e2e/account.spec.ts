import { readFileSync } from 'node:fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { decode, encode } from '@auth/core/jwt';
import { PASSWORD, dropSession, lastEmail, login, registerAndOnboard, withTestDb } from './helpers';

/** F9: conta, email e privacidade (emails lidos da captura em memória do servidor de dev). */

const NEW_PASSWORD = 'nova-chave-456';
const SESSION_COOKIE = 'authjs.session-token';

function authSecret(): string {
  return process.env.AUTH_SECRET ?? /^AUTH_SECRET="?([^"\n]+)"?/m.exec(readFileSync('.env', 'utf8'))![1]!;
}

/** Força a próxima verificação da sessionVersion (o JWT só a relê de 5 em 5 min). */
async function expireSessionCheck(context: BrowserContext) {
  const cookie = (await context.cookies()).find((c) => c.name === SESSION_COOKIE)!;
  const secret = authSecret();
  const token = await decode({ token: cookie.value, secret, salt: SESSION_COOKIE });
  const value = await encode({ token: { ...token!, svCheckedAt: 0 }, secret, salt: SESSION_COOKIE });
  await context.addCookies([{ ...cookie, value }]);
}

async function openSettings(page: Page) {
  await page.goto('/settings');
  await page.waitForLoadState('networkidle');
}

test('registo com consentimentos → banner → link do email confirma e o banner desaparece', async ({ page }) => {
  const email = await registerAndOnboard(page);
  const user = await withTestDb((db) => db.user.findUniqueOrThrow({ where: { email } }));
  expect(user.termsVersion).toBeTruthy();
  expect(user.wellbeingConsentAt).not.toBeNull();
  expect(user.emailVerifiedAt).toBeNull();

  await expect(page.getByText('Confirma o teu email para poderes recuperar a conta.')).toBeVisible();
  const mail = await lastEmail(page, email);
  expect(mail.tag).toBe('verify');
  const link = mail.links.find((l) => l.startsWith('/verify-email'))!;
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Email confirmado' })).toBeVisible();

  await page.goto('/today');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Confirma o teu email para poderes recuperar a conta.')).toBeHidden();
  // Link de uso único.
  await page.goto(link);
  await expect(page.getByRole('heading', { name: 'Link inválido' })).toBeVisible();
});

test('esqueci-me → link → nova palavra-passe: entra com a nova, não com a antiga', async ({ page }) => {
  test.slow(); // registo + 3 páginas novas a compilar no servidor de dev
  const email = await registerAndOnboard(page);
  await dropSession(page);

  await page.goto('/login');
  await page.getByRole('link', { name: 'Esqueceste-te da palavra-passe?' }).click();
  await page.waitForURL('**/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.locator('#forgot-email').fill(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByText('Se existir uma conta com este email, enviámos um link.')).toBeVisible();

  const mail = await lastEmail(page, email);
  expect(mail.tag).toBe('reset');
  await page.goto(mail.links.find((l) => l.startsWith('/reset-password'))!);
  await page.waitForLoadState('networkidle');
  await page.locator('#reset-password').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Guardar palavra-passe' }).click();
  await expect(page.getByText('Palavra-passe alterada. Já podes entrar com a nova.')).toBeVisible();
  expect((await lastEmail(page, email)).tag).toBe('password-changed');

  await login(page, email, PASSWORD);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await login(page, email, NEW_PASSWORD);
  await page.waitForURL('**/today');
  // Abriu o link do email: fica confirmado.
  const user = await withTestDb((db) => db.user.findUniqueOrThrow({ where: { email } }));
  expect(user.emailVerifiedAt).not.toBeNull();
});

test('pedido de recuperação para um email inexistente → a mesma mensagem', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.locator('#forgot-email').fill(`ninguem-${Date.now()}@example.com`);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByText('Se existir uma conta com este email, enviámos um link.')).toBeVisible();
});

test('alterar email → confirmar no novo → entra com o email novo', async ({ page }) => {
  const email = await registerAndOnboard(page);
  const newEmail = email.replace('e2e-', 'e2e-novo-');
  await openSettings(page);

  await page.locator('#change-email-new').fill(newEmail);
  await page.locator('#change-email-password').fill('errada');
  await page.getByRole('button', { name: 'Enviar confirmação' }).click();
  await expect(page.getByText('A palavra-passe não está correcta.')).toBeVisible();

  await page.locator('#change-email-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Enviar confirmação' }).click();
  await expect(page.getByText(`Enviámos um link para ${newEmail}.`, { exact: false })).toBeVisible();

  const mail = await lastEmail(page, newEmail);
  expect(mail.tag).toBe('email-change-confirm');
  await page.goto(mail.links.find((l) => l.startsWith('/confirm-email-change'))!);
  await expect(page.getByRole('heading', { name: 'Email alterado' })).toBeVisible();
  expect((await lastEmail(page, email)).tag).toBe('email-changed-notice');

  await dropSession(page);
  await login(page, newEmail, PASSWORD);
  await page.waitForURL('**/today');
});

test('exportar → descarrega JSON myglow-export-v1 sem segredos', async ({ page }) => {
  const email = await registerAndOnboard(page);
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Exportar os meus dados' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^myglow-export-\d{4}-\d{2}-\d{2}\.json$/);
  const text = readFileSync((await download.path())!, 'utf8');
  const data = JSON.parse(text);
  expect(data.format).toBe('myglow-export-v1');
  expect(data.user.email).toBe(email);
  expect(data.birthProfile.birthDate).toBe('1990-07-15');
  expect(text).not.toContain('passwordHash');
});

test('apagar conta com palavra-passe + APAGAR → /goodbye; login falha', async ({ page }) => {
  const email = await registerAndOnboard(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Apagar conta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Apagar a conta?' });
  await dialog.locator('#delete-password').fill(PASSWORD);
  await dialog.locator('#delete-confirm').fill('APAGA');
  await dialog.getByRole('button', { name: 'Apagar para sempre' }).click();
  await expect(dialog.getByText('Escreve a palavra exactamente como pedido.')).toBeVisible();

  await dialog.locator('#delete-confirm').fill('APAGAR');
  await dialog.getByRole('button', { name: 'Apagar para sempre' }).click();
  await page.waitForURL('**/goodbye');
  await expect(page.getByRole('heading', { name: 'Conta apagada' })).toBeVisible();
  expect(await withTestDb((db) => db.user.count({ where: { email } }))).toBe(0);

  await login(page, email, PASSWORD);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('terminar sessão em todos os dispositivos: o outro dispositivo volta ao login', async ({ page, browser }) => {
  const email = await registerAndOnboard(page);
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await login(page2, email, PASSWORD);
  await page2.waitForURL('**/today');

  await openSettings(page);
  await page.getByRole('button', { name: 'Terminar sessão em todos os dispositivos' }).click();
  await page.waitForURL('**/login');

  await expireSessionCheck(other);
  await page2.goto('/today');
  await page2.waitForURL('**/login');
  await other.close();
});

test('páginas legais públicas nas 3 línguas, marcadas como rascunho', async ({ page, context }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();
  await expect(page.getByText('Rascunho — rever com jurista antes do lançamento.')).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de Utilização' })).toBeVisible();

  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() }]);
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'pt-BR', url: page.url() }]);
  await page.goto('/terms');
  await expect(page.getByText('Rascunho — revisar com advogado antes do lançamento.')).toBeVisible();
});

test('menor de 16 anos não passa do onboarding', async ({ page }) => {
  const email = `e2e-menor-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.locator('#register-name').fill('Menor');
  await page.locator('#register-email').fill(email);
  await page.locator('#register-password').fill(PASSWORD);
  await page.locator('input[name=acceptTerms]').check();
  await page.locator('input[name=wellbeingConsent]').check();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL('**/onboarding');
  await page.waitForLoadState('networkidle');
  await page.locator('#birth-date').fill('2015-03-10');
  await page.locator('#birth-time').fill('10:00');
  await page.getByRole('button', { name: 'Seguinte' }).click();
  await expect(page.getByRole('heading', { name: 'A MYGLOW é para maiores de 16 anos' })).toBeVisible();
  await page.goto('/today');
  await page.waitForURL('**/onboarding');
});
