import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Messaging Module — Conversations Hub, DM Creation & Calling Controls', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/conversations');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render conversations sidebar with search filter and create conversation modal', async ({ page }) => {
    // Verify conversations sidebar title
    await expect(page.locator('aside span:has-text("Conversations")').first()).toBeVisible({ timeout: 10000 });

    // Filter input
    const filterInput = page.locator('aside input[placeholder*="Find or start conversation"]').first();
    await expect(filterInput).toBeVisible();
    await filterInput.fill('Alex');

    // Click "+" to open CreateConversationModal
    const createBtn = page.locator('aside button[title*="Start Direct Message"]').first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify modal appears (scoped by tab container or dialog)
    const modal = page.locator('div.fixed.z-50').filter({ has: page.locator('button:has-text("Direct Message")') }).first();
    await expect(modal).toBeVisible({ timeout: 8000 });

    // Verify tabs: Direct Message and Custom Group
    const dmTab = modal.locator('button:has-text("Direct Message")');
    const groupTab = modal.locator('button:has-text("Custom Group")');
    await expect(dmTab).toBeVisible();
    await expect(groupTab).toBeVisible();

    // Switch to Custom Group tab
    await groupTab.click();
    await expect(modal.locator('text=Create Custom Group').or(modal.locator('input[placeholder*="Designers"]'))).toBeVisible({ timeout: 5000 });

    // Switch back to Direct Message tab
    await dmTab.click();
    const searchUser = modal.locator('input[placeholder*="Search by name"]').first();
    await expect(searchUser).toBeVisible();
    await searchUser.fill('alex');

    // Close modal
    const closeBtn = modal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should select an existing conversation or display select empty state with messaging and call controls', async ({ page }) => {
    // Check if there are conversation items in the list
    const convItems = page.locator('aside div.cursor-pointer');
    const count = await convItems.count();

    if (count > 0) {
      await convItems.first().click();

      // Verify active conversation header with call triggers
      await expect(page.locator('button:has-text("HD Audio Call")').or(page.locator('button:has(svg.lucide-phone)'))).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Meet & Teams")').or(page.locator('button[title*="Google Meet"]'))).toBeVisible();

      // Verify message composer textarea and attachments button
      const composer = page.locator('textarea[placeholder*="Message"]').first();
      await expect(composer).toBeVisible();
    } else {
      // Empty state view
      await expect(page.locator('text=Select or Create a Conversation').first()).toBeVisible({ timeout: 10000 });
    }
  });
});
