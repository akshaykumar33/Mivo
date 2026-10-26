import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Auth & Profile Module — Slack Status Presets & Profile Customization', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto('/channels');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open SlackStatusModal and display all availability preset chips and status options', async ({ page }) => {
    // Click the dedicated Smile button with exact title "Set Availability & Status" in channels sidebar
    const smileBtn = page.locator('button[title="Set Availability & Status"]').first();
    await expect(smileBtn).toBeVisible({ timeout: 10000 });
    await smileBtn.click();

    // Verify SlackStatusModal is visible
    const statusModal = page.locator('div.fixed.z-50').filter({ hasText: 'Set Availability & Status' });
    await expect(statusModal).toBeVisible({ timeout: 8000 });

    // Verify all 7 Slack status preset buttons exist
    const presets = [
      'In a meeting',
      'Commuting',
      'Out sick',
      'Vacationing',
      'Working remotely',
      'Deep work & focus',
      'Out to lunch',
    ];

    for (const preset of presets) {
      await expect(statusModal.locator(`button:has-text("${preset}")`)).toBeVisible();
    }

    // Close modal
    const closeBtn = statusModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(statusModal).not.toBeVisible({ timeout: 5000 });
  });

  test('should select a preset status, toggle active/away presence, and save availability', async ({ page }) => {
    const smileBtn = page.locator('button[title="Set Availability & Status"]').first();
    await expect(smileBtn).toBeVisible({ timeout: 10000 });
    await smileBtn.click();

    const statusModal = page.locator('div.fixed.z-50').filter({ hasText: 'Set Availability & Status' });
    await expect(statusModal).toBeVisible({ timeout: 8000 });

    // Click "Working remotely" preset
    const presetBtn = statusModal.locator('button:has-text("Working remotely")');
    await presetBtn.click();

    // Verify the status input received the text
    const statusInput = statusModal.locator('input[placeholder*="What\'s your status"]').first();
    await expect(statusInput).toHaveValue('Working remotely');

    // Quick toggle: switch between Active and Away
    const awayToggle = statusModal.locator('button:has-text("Set as away"), button:has-text("Set as active")').first();
    await expect(awayToggle).toBeVisible();
    await awayToggle.click();

    // Click Save button
    const saveBtn = statusModal.locator('button:has-text("Save Status"), button:has-text("Save")').first();
    await saveBtn.click();

    // Modal should close automatically after saving
    await expect(statusModal).not.toBeVisible({ timeout: 8000 });
  });

  test('should open EditProfileModal and update display name and bio', async ({ page }) => {
    // Open the Slack User Popover
    const userFooterBtn = page.locator('button[title="Set availability & status (like Slack)"]').first();
    await expect(userFooterBtn).toBeVisible({ timeout: 10000 });
    await userFooterBtn.click();

    // Click "Edit Profile & Avatar" in the popover
    const editProfileBtn = page.locator('button:has-text("Edit Profile & Avatar"), button:has-text("Edit Profile")').first();
    await expect(editProfileBtn).toBeVisible({ timeout: 5000 });
    await editProfileBtn.click();

    // Verify EditProfileModal is visible
    const editModal = page.locator('div.fixed.z-50').filter({ hasText: 'Edit Profile' });
    await expect(editModal).toBeVisible({ timeout: 8000 });

    // Fill Display Name using text input (avoiding the hidden file input)
    const nameInput = editModal.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Dev Architect Lead');

    // Fill Bio
    const bioTextarea = editModal.locator('textarea').first();
    if (await bioTextarea.isVisible()) {
      await bioTextarea.fill('Specializing in real-time WebRTC media and distributed systems.');
    }

    // Verify avatar change trigger exists
    await expect(editModal.locator('button:has-text("Change Avatar"), button:has-text("Supabase S3")')).toBeVisible();

    // Close modal
    const closeBtn = editModal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(editModal).not.toBeVisible({ timeout: 5000 });
  });
});
