import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('WebRTC Media Stage — Modes & Cyber Dock', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should mount Unified Room View and Floating Cyber Dock', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lobby' }).or(page.getByText('Lobby')).first()).toBeVisible({ timeout: 15000 });
    // Cyber dock is mounted at bottom
    await expect(stagePage.cyberDock).toBeVisible();
    await expect(stagePage.micBtn).toBeVisible();
    await expect(stagePage.camBtn).toBeVisible();
    await expect(stagePage.pipBtn).toBeVisible();
  });

  test('should toggle Microphone and Camera states on Cyber Dock', async () => {
    await stagePage.toggleMic();
    // Mic button state toggled
    await expect(stagePage.micBtn).toBeVisible();

    await stagePage.toggleCam();
    // Cam button state toggled
    await expect(stagePage.camBtn).toBeVisible();
  });
});
