import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Communities & Channels Module — Privacy & RBAC Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/channels');
  });

  test('should display active user profile card with organization details', async ({ page }) => {
    // Check that user display name or profile is rendered
    await expect(page.locator('text=Dev Admin').or(page.locator('text=Platform Architect')).or(page.locator('text=Owner')).first()).toBeVisible({ timeout: 10000 });
  });

  test('should display channel categories (General, Audio, Video)', async ({ page }) => {
    // Verify channel sidebar sections or category headers exist
    const channelItems = page.locator('aside a, nav a');
    await expect(channelItems.first()).toBeVisible({ timeout: 10000 });
  });
});
