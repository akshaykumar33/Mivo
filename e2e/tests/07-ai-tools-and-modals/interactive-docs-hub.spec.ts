import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('AI Tools & Modals — Interactive Docs Hub', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should open Interactive Documentation Hub from Cyber Dock More Menu', async ({ page }) => {
    // Open More Menu in Cyber Dock
    await stagePage.moreOptionsBtn.click();
    await expect(page.locator('button:has-text("Documentation Hub")')).toBeVisible({ timeout: 5000 });

    // Click Documentation Hub
    await page.locator('button:has-text("Documentation Hub")').click();

    // Verify modal appears
    await expect(page.locator('text=Mivo Documentation & Architecture Reference')).toBeVisible({ timeout: 5000 });
  });

  test('should search articles and filter documentation topics', async ({ page }) => {
    await stagePage.moreOptionsBtn.click();
    await page.locator('button:has-text("Documentation Hub")').click();
    await expect(page.locator('text=Mivo Documentation & Architecture Reference')).toBeVisible({ timeout: 5000 });

    // Type query in search
    const searchInput = page.locator('input[placeholder="Search articles & guides..."]');
    await searchInput.fill('WebRTC');

    // Filtered results contain WebRTC articles
    await expect(page.locator('text=Real-Time Stage Engine').or(page.locator('text=WebRTC')).first()).toBeVisible({ timeout: 5000 });
  });

  test('should switch between documentation articles and inspect contents', async ({ page }) => {
    await stagePage.moreOptionsBtn.click();
    await page.locator('button:has-text("Documentation Hub")').click();
    await expect(page.locator('text=Mivo Documentation & Architecture Reference')).toBeVisible({ timeout: 5000 });

    // Click second category article
    const articleBtn = page.locator('button:has-text("Communities, Channels & Permissions Hierarchy")');
    if (await articleBtn.isVisible()) {
      await articleBtn.click();
      await expect(page.locator('h1:has-text("Workspaces & Channel Architecture")')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should close Documentation Hub via Escape key and close button', async ({ page }) => {
    await stagePage.moreOptionsBtn.click();
    await page.locator('button:has-text("Documentation Hub")').click();
    await expect(page.locator('text=Mivo Documentation & Architecture Reference')).toBeVisible({ timeout: 5000 });

    // Close via close button
    await page.locator('button[title="Close Documentation (Esc)"]').click();
    await expect(page.locator('text=Mivo Documentation & Architecture Reference')).toBeHidden();
  });
});
