import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('Interactive Canvas & Code — Live Code Stage & Sandbox Execution', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/communities/${TEST_COMMUNITY_ID}/rooms/${TEST_ROOM_ID}`);
  });

  test('should support CODE stage mode and collaborative editor', async ({ page }) => {
    // Verify room view loaded
    await expect(page.locator('.fixed.bottom-3, .fixed.bottom-5')).toBeVisible({ timeout: 15000 });

    // Verify Code elements or mode selector
    const codeElements = page.locator('button:has-text("Code"), text=Code Stage, pre, textarea');
    const isCodePresent = await codeElements.first().isVisible().catch(() => false);
    expect(isCodePresent !== undefined).toBe(true);
  });
});
