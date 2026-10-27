import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Interactive Canvas Module — Architecture Nodes, Whiteboard Tools & AI Dictation', () => {
  const communityId = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
  const roomId = '00000000-0000-0000-0000-000000000011';

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/communities/${communityId}/rooms/${roomId}`);
    await page.waitForLoadState('domcontentloaded');

    // Switch to Canvas mode
    const canvasBtn = page.locator('button[title="Canvas Mode"], button:has-text("Canvas Stage")').first();
    await expect(canvasBtn).toBeVisible({ timeout: 10000 });
    await canvasBtn.click();
  });

  test('should render node tool palette, activate tools, and test zoom controls', async ({ page }) => {
    // Verify canvas stage title / subtitle
    await expect(page.locator('text=Infinite Multiplayer Whiteboard & Flowchart Engine').first()).toBeVisible({ timeout: 10000 });

    // Verify tools palette
    const tools = [
      'Select & Move',
      'Sticky Note',
      'API Gateway',
      'Microservice',
      'Redis Pub/Sub',
      'PostgreSQL DB',
      'Connect Flow',
      'Text Box',
    ];

    for (const toolName of tools) {
      const toolBtn = page.locator(`button[title*="${toolName}"], button[title="${toolName}"]`).first();
      await expect(toolBtn).toBeVisible();
    }

    // Click API Gateway tool
    const gatewayTool = page.locator('button[title*="API Gateway"]').first();
    await gatewayTool.click();

    // Verify Zoom Controls: starts at 100%
    const zoomText = page.locator('span.font-mono:has-text("%")').first();
    await expect(zoomText).toContainText('100%');

    // Zoom In
    const zoomInBtn = page.locator('button[title="Zoom In"]').first();
    await zoomInBtn.click();
    await expect(zoomText).toContainText('110%');

    // Reset Zoom
    const resetZoomBtn = page.locator('button[title="Reset Zoom"]').first();
    await resetZoomBtn.click();
    await expect(zoomText).toContainText('100%');
  });

  test('should display AI Architecture Seeds prompt chips and voice dictation button', async ({ page }) => {
    // Verify voice dictation button exists
    const micDictationBtn = page.locator('button[title="Voice-to-Canvas Audio Dictation"]').first();
    await expect(micDictationBtn).toBeVisible({ timeout: 10000 });

    // Verify AI prompt text input
    const aiInput = page.locator('input[placeholder*="Let\'s build a microservice"]').first();
    await expect(aiInput).toBeVisible();

    // Verify architecture seeds chips
    const seeds = [
      "Let's build a microservice",
      'Event-Driven Microservices',
      'WebRTC Mesh Media Pipeline',
    ];

    for (const seed of seeds) {
      await expect(page.locator(`button:has-text("${seed}")`).first()).toBeVisible();
    }
  });
});
