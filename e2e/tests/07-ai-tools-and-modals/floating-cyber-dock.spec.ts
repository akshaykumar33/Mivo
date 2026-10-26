import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('AI Tools & Modals — Floating Cyber Dock & Preferences', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should render Floating Cyber Dock with all media controls', async ({ page }) => {
    await expect(stagePage.cyberDock).toBeVisible({ timeout: 10000 });
    await expect(stagePage.micBtn).toBeVisible();
    await expect(stagePage.camBtn).toBeVisible();
    await expect(stagePage.screenShareBtn).toBeVisible();
    await expect(stagePage.pipBtn).toBeVisible();
    await expect(stagePage.reactionsBtn).toBeVisible();
    await expect(stagePage.aiScribeBtn).toBeVisible();
    await expect(stagePage.participantsBtn).toBeVisible();
    await expect(stagePage.moreOptionsBtn).toBeVisible();
  });

  test('should toggle workspace mode pills (Chat, Canvas, Code)', async ({ page }) => {
    // 1. Switch to Canvas mode
    const canvasBtn = stagePage.cyberDock.locator('button:has-text("Canvas")');
    await canvasBtn.click();
    await expect(page.locator('text=Canvas Stage').first()).toBeVisible({ timeout: 10000 });

    // 2. Switch to Code mode
    const codeBtn = stagePage.cyberDock.locator('button:has-text("Code")');
    await codeBtn.click();
    await expect(page.locator('button:has-text("Run Code")').first()).toBeVisible({ timeout: 10000 });

    // 3. Switch back to Chat mode
    const chatBtn = stagePage.cyberDock.locator('button:has-text("Chat")');
    await chatBtn.click();
    await expect(page.locator('input[placeholder*="Message #"], textarea[placeholder*="Message #"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should toggle microphone and camera controls', async () => {
    // Toggle mic
    await stagePage.toggleMic();
    await expect(stagePage.micBtn).toBeVisible();

    // Toggle camera
    await stagePage.toggleCam();
    await expect(stagePage.camBtn).toBeVisible();
  });

  test('should open reactions tray and send reaction', async ({ page }) => {
    // Click reactions button to open tray
    await stagePage.reactionsBtn.click();

    // Verify reactions popover is mounted
    const reactionsTray = page.locator('button:has-text("Raise")');
    await expect(reactionsTray).toBeVisible({ timeout: 5000 });

    // Click Raise Hand reaction
    await reactionsTray.click();

    // Popover automatically closes after reaction
    await expect(page.locator('button:has-text("Raise")')).toBeHidden();
  });

  test('should open Stage Preferences More Menu and trigger Theme Switcher', async ({ page }) => {
    // Open More Menu
    await stagePage.moreOptionsBtn.click();

    // Verify items in popover
    await expect(page.locator('text=Stage Preferences')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Picture-in-Picture")')).toBeVisible();
    await expect(page.locator('button:has-text("Documentation Hub")')).toBeVisible();
    await expect(page.locator('button:has-text("Switch Visual Theme")')).toBeVisible();

    // Click Switch Visual Theme
    await page.locator('button:has-text("Switch Visual Theme")').click();

    // Verify Theme Switcher modal opens
    await expect(page.locator('text=Visual Themes').first()).toBeVisible({ timeout: 5000 });

    // Close Theme Switcher
    await page.keyboard.press('Escape');
  });
});
