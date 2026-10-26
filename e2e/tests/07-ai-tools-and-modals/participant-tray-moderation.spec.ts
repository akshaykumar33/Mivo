import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('AI Tools & Modals — Participant Tray & Moderation', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should open and view Participant Tray with stage members', async ({ page }) => {
    await stagePage.toggleParticipants();

    // Verify tray header
    await expect(page.locator('text=Stage Members')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder*="Search stage members"]')).toBeVisible();
  });

  test('should filter participants roster via search input', async ({ page }) => {
    await stagePage.toggleParticipants();
    await expect(page.locator('text=Stage Members')).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="Search stage members"]');
    await searchInput.fill('Admin');

    // Filtered results match search query
    await expect(page.locator('text=Dev Admin').first()).toBeVisible({ timeout: 5000 });
  });

  test('should open and close Add User to Group modal from Participant Tray', async ({ page }) => {
    await stagePage.toggleParticipants();
    await expect(page.locator('text=Stage Members')).toBeVisible({ timeout: 10000 });

    // Click Add User button
    const addUserBtn = page.locator('button:has-text("+ Add User to Group")');
    await expect(addUserBtn).toBeVisible();
    await addUserBtn.click();

    // Verify Invite/Add Room Member Modal appears
    await expect(page.locator('text=Group & Room Access')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Single-org boundaries apply').first()).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Group & Room Access')).toBeHidden();
  });

  test('should close Participant Tray via close button', async ({ page }) => {
    await stagePage.toggleParticipants();
    await expect(page.locator('text=Stage Members')).toBeVisible({ timeout: 10000 });

    // Click close roster button
    await page.locator('button[title="Close Roster"]').click();
    await expect(page.locator('text=Stage Members')).toBeHidden();
  });
});
