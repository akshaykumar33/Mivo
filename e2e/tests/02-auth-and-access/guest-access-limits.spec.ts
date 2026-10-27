import { test, expect } from '@playwright/test';
import { AuthPage } from '../../page-objects/AuthPage';

test.describe('Auth Module — Guest Access & Tier Limits', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.gotoLogin();
  });

  test('should render guest login card on login page', async ({ page }) => {
    await expect(page.getByText('Instant Guest Access')).toBeVisible();
    await expect(authPage.enterAsGuestBtn.first()).toBeVisible();
  });

  test('should log in as instant guest and display guest restrictions banner', async ({ page }) => {
    const guestName = `Guest ${Date.now().toString().slice(-4)}`;
    await authPage.loginAsGuest(guestName);

    // Redirected to dashboard
    await expect(page).toHaveURL(/\/channels/, { timeout: 15000 });

    // Verify Guest Mode sticky banner is visible
    await expect(page.locator('text=Guest Account').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Claim Full Account').first()).toBeVisible();
  });
});
