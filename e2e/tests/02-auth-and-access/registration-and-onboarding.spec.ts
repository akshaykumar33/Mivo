import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/AuthPage';

test.describe('Auth Module — Registration & Onboarding', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.gotoRegister();
  });

  test('should render registration form with all required fields', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Create an Account');
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.usernameInput).toBeVisible();
    await expect(authPage.displayNameInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.registerSubmitBtn).toBeVisible();
  });

  test('should register a new unique user and redirect to dashboard', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `test_user_${timestamp}@test.mivo.dev`;
    const uniqueUsername = `user_${timestamp}`.slice(0, 20);
    const displayName = `Test User ${timestamp.toString().slice(-4)}`;

    await authPage.register(uniqueEmail, uniqueUsername, displayName, 'Password123!');

    await expect(page).toHaveURL(/\/channels/, { timeout: 15000 });

    const token = await page.evaluate(() => localStorage.getItem('mivo_access_token'));
    expect(token).toBeTruthy();
  });
});
