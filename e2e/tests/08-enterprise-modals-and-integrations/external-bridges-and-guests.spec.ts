import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('Enterprise Integrations & External Bridges', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should open and inspect External Meeting Hub (Google Meet & MS Teams)', async ({ page }) => {
    // Open External Meeting Hub from Room Header
    const hubBtn = page.locator('button[title*="External Meeting Hub"]');
    await expect(hubBtn).toBeVisible({ timeout: 10000 });
    await hubBtn.click();

    // Verify modal title & integration badge
    await expect(page.locator('h3:has-text("Meeting Hub")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Google & Teams')).toBeVisible();

    // Verify provider cards
    await expect(page.locator('text=Google Meet').first()).toBeVisible();
    await expect(page.locator('text=Microsoft Teams').first()).toBeVisible();

    // Switch provider to Microsoft Teams
    await page.locator('text=Microsoft Teams').first().click();
    await expect(page.locator('button:has-text("Generate & Launch MS Teams")')).toBeVisible();

    // Close modal via its close button
    const hubModal = page.locator('div.fixed.z-50').filter({ hasText: 'Meeting Hub' });
    await hubModal.locator('button:has(svg.lucide-x)').first().click();
    await expect(page.locator('h3:has-text("Meeting Hub")')).toBeHidden();
  });

  test('should open Connect with Anonymous Users & Guests modal', async ({ page }) => {
    // Click Connect with Anonymous Users button in Room Header
    const anonBtn = page.locator('button[title*="Connect with Anonymous Users"]');
    await expect(anonBtn).toBeVisible({ timeout: 10000 });
    await anonBtn.click();

    // Modal appears (either Enterprise compliance message or Trivia Jam playground)
    const modalContent = page.locator('text=Enterprise Organization').or(page.locator('text=Canvas & Trivia Jam')).first();
    await expect(modalContent).toBeVisible({ timeout: 10000 });

    // Close modal
    const closeOrReturnBtn = page.locator('button:has-text("Return to Workspace")')
      .or(page.locator('div.fixed.z-50 button:has(svg.lucide-x)'))
      .first();
    await closeOrReturnBtn.click();

    await expect(modalContent).toBeHidden();
  });
});
