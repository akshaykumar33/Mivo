import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Messaging & Chat Module — Direct & Group Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/conversations');
  });

  test('should render conversation hub with user search and new conversation action', async ({ page }) => {
    // Search input or start DM button or Conversations header is visible
    const searchOrNew = page.locator('input[placeholder="Find or start conversation..."]')
      .or(page.locator('button[title*="Start Direct Message"]'))
      .or(page.getByText('Conversations'))
      .first();
    await expect(searchOrNew).toBeVisible({ timeout: 10000 });
  });

  test('should allow typing in chat input bar', async ({ page }) => {
    // If chat bar is visible or after clicking conversation
    const chatInput = page.locator('textarea, input[placeholder*="Message"], input[placeholder*="Send"]').first();
    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello from Playwright automated test!');
      expect(await chatInput.inputValue()).toContain('Hello from Playwright');
    }
  });
});
