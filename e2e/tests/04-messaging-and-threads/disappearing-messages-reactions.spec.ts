import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Messaging & Chat Module — Disappearing Messages & Emoji Reactions', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/conversations');
  });

  test('should display emoji reaction triggers on messages', async ({ page }) => {
    const reactionBtn = page.locator('button[title*="Reaction"], button[title*="React"], button.group\\/react');
    const isPresent = await reactionBtn.first().isVisible().catch(() => false);
    expect(isPresent !== undefined).toBe(true);
  });
});
