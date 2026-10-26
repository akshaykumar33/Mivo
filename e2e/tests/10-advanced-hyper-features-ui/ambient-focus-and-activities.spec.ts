import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Advanced Hyper-Features — Ambient Focus & Collaborative Activities', () => {
  const COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3'; // Wysbryx Engineering
  const ROOM_ID = '00000000-0000-0000-0000-000000000011'; // #Lobby

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'dev@mivo.app');
    await page.goto(`/communities/${COMMUNITY_ID}/rooms/${ROOM_ID}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open Ambient Focus Bar, verify Pomodoro timer, ambient sound tracks and audio sliders', async ({ page }) => {
    // Open FloatingCyberDock More Options menu
    const moreBtn = page.locator('button.group\\/more').first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();

    // Click "Focus & Ambient Sounds"
    const focusBtn = page.locator('button:has-text("Focus & Ambient Sounds")');
    await expect(focusBtn).toBeVisible({ timeout: 5000 });
    await focusBtn.click();

    // Verify AmbientFocusBar appears
    const focusBar = page.locator('div:has-text("Ambient Spatial Focus")').first();
    await expect(focusBar).toBeVisible({ timeout: 10000 });

    // Verify Pomodoro sprint timer readout
    await expect(focusBar.locator('text=Deep Focus Sprint')).toBeVisible();
    await expect(focusBar.locator('text=25:00')).toBeVisible();

    // Test Play Pomodoro button
    const playPomodoroBtn = focusBar.locator('button[title*="Start Pomodoro"], button[title*="Pause Pomodoro"]').first();
    await expect(playPomodoroBtn).toBeVisible();

    // Verify Ambient Sound track choices exist
    const lofiBtn = focusBar.locator('button:has-text("Lo-Fi Chill Beats")');
    const rainBtn = focusBar.locator('button:has-text("Rainy Window")');
    const coffeeBtn = focusBar.locator('button:has-text("Cozy Coffee Shop")');
    const synthBtn = focusBar.locator('button:has-text("Cyber Synthwave")');

    await expect(lofiBtn).toBeVisible();
    await expect(rainBtn).toBeVisible();
    await expect(coffeeBtn).toBeVisible();
    await expect(synthBtn).toBeVisible();

    // Select Rainy Window track
    await rainBtn.click();
    await expect(rainBtn).toHaveClass(/border-\[#5E5CE6\]/);

    // Verify Ambient Volume & 3D Spatial Pan sliders exist
    const sliders = focusBar.locator('input[type="range"]');
    await expect(sliders.first()).toBeVisible();
    expect(await sliders.count()).toBeGreaterThanOrEqual(2);

    // Close AmbientFocusBar via close button
    const closeBtn = focusBar.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(focusBar).not.toBeVisible();
  });

  test('should open Activity Launcher Modal, launch an activity, interact with sandbox stage, and close', async ({ page }) => {
    // Open FloatingCyberDock More Options menu
    const moreBtn = page.locator('button.group\\/more').first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();

    // Click "Activities & Sandbox"
    const activityBtn = page.locator('button:has-text("Activities & Sandbox")');
    await expect(activityBtn).toBeVisible({ timeout: 5000 });
    await activityBtn.click();

    // Verify ActivityLauncherModal opened
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Launch Mini-App Activity' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify activity cards: Multiplayer Speed Chess, Figma Live Stage Review, GitHub PR Live Diff Review
    await expect(modal.locator('text=Multiplayer Speed Chess')).toBeVisible();
    await expect(modal.locator('text=Figma Live Stage Review')).toBeVisible();
    await expect(modal.locator('text=GitHub PR Live Diff Review')).toBeVisible();

    // Launch GitHub PR Live Diff Review
    const prCard = modal.locator('div.group').filter({ hasText: 'GitHub PR Live Diff Review' });
    const launchBtn = prCard.locator('button:has-text("Launch")');
    await expect(launchBtn).toBeVisible();
    await launchBtn.click();

    // Modal closes and ActivitySandboxStage takes the stage
    await expect(modal).not.toBeVisible();

    const sandbox = page.locator('div:has-text("Mivo Sandbox")').first();
    await expect(sandbox).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=PR #104: Hyper SFU Engine, E2EE, and Code Sandbox')).toBeVisible();

    // Test Fullscreen toggle button
    const fullscreenBtn = sandbox.locator('button[title*="Full Screen"]').first();
    await expect(fullscreenBtn).toBeVisible();
    await fullscreenBtn.click();

    // Exit Fullscreen
    const exitFullscreenBtn = sandbox.locator('button[title*="Exit Full Screen"]').first();
    await expect(exitFullscreenBtn).toBeVisible();
    await exitFullscreenBtn.click();

    // Close Activity Stage via top close button
    const closeActivityBtn = sandbox.locator('button[title="Close Activity"]').first();
    await expect(closeActivityBtn).toBeVisible();
    await closeActivityBtn.click();

    // Verify sandbox stage is dismissed
    await expect(page.locator('text=PR #104: Hyper SFU Engine, E2EE, and Code Sandbox')).not.toBeVisible();
  });
});
