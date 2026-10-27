import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Communities & Channels Module — Channels Hub & Explore Workspaces', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/channels');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render channels hub page with joined workspaces list and direct messages link', async ({ page }) => {
    // Verify welcome heading
    await expect(page.locator('h2')).toContainText(/Welcome back/i, { timeout: 10000 });

    // Verify Direct Messages link with text
    const dmLink = page.locator('a[href="/conversations"]:has-text("Direct & Group Chats")').first();
    await expect(dmLink).toBeVisible();

    // Verify Joined Workspaces section
    await expect(page.locator('aside').filter({ hasText: 'Joined Workspaces' })).toBeVisible();

    // Verify community cards in the main hub view
    const communityCards = page.locator('section a[href*="/communities/"]');
    await expect(communityCards.first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Wysbryx Engineering').first()).toBeVisible();
  });

  test('should navigate into community channels stage from a workspace card', async ({ page }) => {
    const communityCard = page.locator('section a[href*="/communities/"]').first();
    await expect(communityCard).toBeVisible({ timeout: 10000 });
    await communityCard.click();

    await expect(page).toHaveURL(/\/communities\//, { timeout: 10000 });

    // Verify channel sidebar loaded
    await expect(page.locator('aside, nav').filter({ hasText: /channels|stages/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
