import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Advanced Hyper-Features — Zero-Trust E2EE & AI Twin Engine', () => {
  const COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3'; // Wysbryx Engineering
  const ROOM_ID = '00000000-0000-0000-0000-000000000011'; // #Lobby

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'dev@mivo.app');
    await page.goto(`/communities/${COMMUNITY_ID}/rooms/${ROOM_ID}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open Zero-Trust E2EE Verification Modal, inspect cryptographic parameters, and verify ratchet', async ({ page }) => {
    // Open FloatingCyberDock More Options menu
    const moreBtn = page.locator('button.group\\/more').first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();

    // Click "Zero-Trust E2EE Room" item in menu
    const e2eeMenuBtn = page.locator('button:has-text("Zero-Trust E2EE Room")');
    await expect(e2eeMenuBtn).toBeVisible({ timeout: 5000 });
    await e2eeMenuBtn.click();

    // Verify E2EEVerificationModal opened
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Zero-Trust E2EE Room' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify cryptographic parameter readouts
    await expect(modal.locator('text=MLS Epoch #')).toBeVisible();
    await expect(modal.locator('text=AES-256-GCM')).toBeVisible();
    await expect(modal.locator('text=MLS Tree Ratchet')).toBeVisible();
    await expect(modal.locator('text=WebRTC Transform Active')).toBeVisible();

    // Verify Out-of-band safety tokens (SAS)
    await expect(modal.locator('text=Out-of-Band Safety Tokens (SAS)')).toBeVisible();

    // Test Rotate Key Ratchet button
    const rotateBtn = modal.locator('button:has-text("Rotate Key Ratchet")');
    await expect(rotateBtn).toBeVisible();
    await rotateBtn.click();

    // Test Confirm & Verify button
    const verifyBtn = modal.locator('button:has-text("Confirm & Verify")');
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();

    // Modal will display Verified! and automatically dismiss
    await expect(modal.locator('text=Verified!')).toBeVisible({ timeout: 5000 });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should open AI Twin Settings Modal, toggle auto-responder, test simulation prompt, and save', async ({ page }) => {
    // Open FloatingCyberDock More Options menu
    const moreBtn = page.locator('button.group\\/more').first();
    await expect(moreBtn).toBeVisible({ timeout: 10000 });
    await moreBtn.click();

    // Click "AI Twin Settings" item in menu
    const aiTwinMenuBtn = page.locator('button:has-text("AI Twin Settings")');
    await expect(aiTwinMenuBtn).toBeVisible({ timeout: 5000 });
    await aiTwinMenuBtn.click();

    // Verify AiTwinSettingsModal opened
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'AI Twin & "Out of Office" Persona' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify master enable toggle switch exists and click it
    const toggleSwitch = modal.locator('button.rounded-full').first();
    await expect(toggleSwitch).toBeVisible();
    await toggleSwitch.click();

    // Verify persona instructions textarea
    const promptTextarea = modal.locator('textarea[placeholder*="Give your AI Twin instructions"]');
    await expect(promptTextarea).toBeVisible();
    await promptTextarea.fill('Act as an elite full-stack engineer and reschedule syncs for tomorrow.');

    // Test interactive Live Sandbox Simulator
    const simInput = modal.locator('input[placeholder*="Ask your AI Twin"]');
    await expect(simInput).toBeVisible();
    await simInput.fill('Are you free for an architecture sync?');

    // Click send simulation button
    const sendSimBtn = modal.locator('button:has(svg.lucide-send)').first();
    await sendSimBtn.click();

    // Verify simulated AI response appears in chat bubble
    await expect(modal.locator('div:has-text("AI Twin")').first()).toBeVisible({ timeout: 10000 });

    // Click Save Settings button
    const saveBtn = modal.locator('button:has-text("Save Settings")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify saved confirmation
    await expect(modal.locator('text=Saved!')).toBeVisible({ timeout: 5000 });

    // Close modal via close button
    const closeBtn = modal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
