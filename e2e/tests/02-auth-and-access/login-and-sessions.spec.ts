import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/AuthPage';
import { DEMO_USERS } from '../../fixtures/auth.fixture';

test.describe('Auth Module — Login & Sessions', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.gotoLogin();
  });

  test('should render login card with branding, inputs, and demo profiles', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome to Mivo');
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitButton).toBeVisible();
    await expect(authPage.quickDevAdminBtn).toBeVisible();
    await expect(authPage.quickAlexBtn).toBeVisible();
  });

  test('should display error message on invalid credentials', async ({ page }) => {
    await authPage.login('wrong@mivo.app', 'IncorrectPassword123!');
    await expect(page.locator('.animate-shake, .bg-rose-50').first()).toBeVisible({ timeout: 10000 });
  });

  test('should log in successfully with valid credentials and redirect to dashboard', async ({ page }) => {
    await authPage.login(DEMO_USERS.devAdmin.email, DEMO_USERS.devAdmin.password);
    await expect(page).toHaveURL(/\/channels/, { timeout: 15000 });

    // Verify localStorage has access token
    const token = await page.evaluate(() => localStorage.getItem('mivo_access_token'));
    expect(token).toBeTruthy();
  });

  test('should log in via quick demo profile button', async ({ page }) => {
    await authPage.quickDevAdminBtn.click();
    await expect(page).toHaveURL(/\/channels/, { timeout: 15000 });
  });
});
