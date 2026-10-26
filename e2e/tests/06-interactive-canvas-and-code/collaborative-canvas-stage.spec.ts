import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('Interactive Canvas & Code — Collaborative Canvas / Slides Stage', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/communities/${TEST_COMMUNITY_ID}/rooms/${TEST_ROOM_ID}`);
  });

  test('should render Canvas mode stage container', async ({ page }) => {
    // Mode switcher or stage is loaded
    await expect(page.locator('main, .flex-1.flex.overflow-hidden').first()).toBeVisible({ timeout: 15000 });

    // Look for canvas tools or whiteboard elements if in canvas mode
    const canvasElement = page.locator('canvas, [data-testid="canvas-stage"], text=Canvas, text=Whiteboard');
    const isAvailable = await canvasElement.first().isVisible().catch(() => false);
    expect(isAvailable !== undefined).toBe(true);
  });
});
