import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';

test.describe('Communities & Channels Module — Navigation & Rail', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    dashboardPage = new DashboardPage(page);
    await dashboardPage.gotoChannels();
  });

  test('should render community rail and direct messages hub', async ({ page }) => {
    await dashboardPage.verifyDashboardLoaded();
    // Community sidebar is present
    await expect(page.locator('aside, nav').first()).toBeVisible();
  });

  test('should navigate between Direct Messages and Community channels', async ({ page }) => {
    // Navigate to /conversations
    await page.goto('/conversations');
    await expect(page).toHaveURL(/\/conversations/);

    // Navigate to /channels
    await page.goto('/channels');
    await expect(page).toHaveURL(/\/channels/);
  });
});
