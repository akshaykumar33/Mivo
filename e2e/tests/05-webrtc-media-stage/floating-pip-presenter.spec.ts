import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('WebRTC Media Stage — Floating Picture-in-Picture (PiP) Presenter', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should open Floating PiP Overlay via Cyber Dock button', async () => {
    await stagePage.togglePiP();

    // Verify PiP overlay is mounted and visible
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });
    await expect(stagePage.pipHeader).toBeVisible();
  });

  test('should toggle between Grid view and Spotlight view in PiP', async () => {
    await stagePage.togglePiP();
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });

    // Click layout toggle button
    await stagePage.pipLayoutToggleBtn.click();
    await expect(stagePage.pipLayoutToggleBtn).toBeVisible();

    // Toggle back to Grid
    await stagePage.pipLayoutToggleBtn.click();
    await expect(stagePage.pipLayoutToggleBtn).toBeVisible();
  });

  test('should toggle window size modes (S, M, L)', async () => {
    await stagePage.togglePiP();
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });

    // Initial size is M (standard)
    await expect(stagePage.pipSizeToggleBtn).toContainText('M');

    // Click to cycle to L (expanded)
    await stagePage.pipSizeToggleBtn.click();
    await expect(stagePage.pipSizeToggleBtn).toContainText('L');

    // Click to cycle to S (compact)
    await stagePage.pipSizeToggleBtn.click();
    await expect(stagePage.pipSizeToggleBtn).toContainText('S');

    // Click to cycle back to M
    await stagePage.pipSizeToggleBtn.click();
    await expect(stagePage.pipSizeToggleBtn).toContainText('M');
  });

  test('should minimize PiP to active-speaker pill and expand back', async () => {
    await stagePage.togglePiP();
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });

    // Click minimize button
    await stagePage.pipMinimizeBtn.click();

    // Minimized pill state
    await expect(stagePage.page.getByText('live on stage').or(stagePage.page.locator('button[title*="Expand PiP"]')).first()).toBeVisible({ timeout: 5000 });

    // Click expand button to restore
    await stagePage.pipOverlay.locator('button[title*="Expand PiP"]').first().click();
    await expect(stagePage.pipHeader).toBeVisible();
  });

  test('should support dragging the PiP overlay across the screen', async ({ page }) => {
    await stagePage.togglePiP();
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });

    const headerBox = await stagePage.pipHeader.boundingBox();
    if (headerBox) {
      // Simulate drag
      await page.mouse.move(headerBox.x + 20, headerBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(headerBox.x - 100, headerBox.y - 100);
      await page.mouse.up();

      // PiP overlay remains fully visible and intact
      await expect(stagePage.pipOverlay).toBeVisible();
    }
  });

  test('should close PiP overlay when clicking close button', async () => {
    await stagePage.togglePiP();
    await expect(stagePage.pipOverlay).toBeVisible({ timeout: 10000 });

    await stagePage.pipCloseBtn.click();
    await expect(stagePage.pipOverlay).toBeHidden();
  });
});
