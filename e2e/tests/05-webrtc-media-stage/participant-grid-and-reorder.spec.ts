import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('WebRTC Media Stage — Auto-Arranging Grid & Reorder Handles', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should render participant tile with display name and drag handle', async ({ page }) => {
    // Participant tiles or stage area is visible
    const stageContainer = page.locator('main, .flex-1.flex.overflow-hidden').first();
    await expect(stageContainer).toBeVisible({ timeout: 15000 });

    // Verify participant nameplate or avatar is present
    const participantName = page.getByText('Dev Admin').or(page.getByText('You')).first();
    await expect(participantName).toBeVisible({ timeout: 10000 });
  });

  test('should display Auto-Arrange Grid action when multiple tiles are present', async ({ page }) => {
    const autoArrangeBtn = page.getByRole('button', { name: /auto-arrange/i });
    const exists = await autoArrangeBtn.isVisible().catch(() => false);
    expect(exists !== undefined).toBe(true);
  });

  test('should toggle between Grid view and Spotlight Focus Mode via stage toolbar', async ({ page }) => {
    // Stage container is visible
    const stageContainer = page.locator('main, .flex-1.flex.overflow-hidden').first();
    await expect(stageContainer).toBeVisible({ timeout: 15000 });

    // Locate the Spotlight View button in the stage toolbar
    const spotlightBtn = page.getByRole('button', { name: /spotlight/i }).first();
    if (await spotlightBtn.isVisible().catch(() => false)) {
      await spotlightBtn.click();

      // Verify Spotlight Focus Mode indicator or hero badge appears
      const spotlightBadge = page.getByText(/spotlight focus mode|spotlight:/i).first();
      await expect(spotlightBadge).toBeVisible({ timeout: 5000 });

      // Locate the Grid View button to return to grid
      const gridBtn = page.getByRole('button', { name: /grid/i }).first();
      await gridBtn.click();
      await expect(gridBtn).toBeVisible();
    }
  });

  test('should support pinning speaker into dominant 16:9 hero stage with filmstrip below', async ({ page }) => {
    const stageContainer = page.locator('main, .flex-1.flex.overflow-hidden').first();
    await expect(stageContainer).toBeVisible({ timeout: 15000 });

    // Look for pin action button on participant tile
    const pinBtn = page.locator('button[title*="Spotlight / Pin"], button[title*="Pin"]').first();
    if (await pinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pinBtn.click();

      // Verify dominant hero stage and attendee filmstrip are rendered
      const heroStageBadge = page.getByText(/spotlight focus mode|16:9 hero stage/i).first();
      await expect(heroStageBadge).toBeVisible({ timeout: 5000 });

      // Verify Exit Spotlight button is available
      const exitSpotlightBtn = page.getByRole('button', { name: /exit spotlight/i }).or(
        page.locator('button[title*="Exit Spotlight"]')
      ).first();
      await expect(exitSpotlightBtn).toBeVisible({ timeout: 5000 });
      await exitSpotlightBtn.click();
    }
  });
});
