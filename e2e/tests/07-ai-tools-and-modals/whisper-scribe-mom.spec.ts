import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { RoomStagePage } from '../../page-objects/RoomStagePage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
const TEST_ROOM_ID = '00000000-0000-0000-0000-000000000011';

test.describe('AI Tools & Modals — Whisper Scribe & Automated MOM', () => {
  let stagePage: RoomStagePage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    stagePage = new RoomStagePage(page);
    await stagePage.gotoRoom(TEST_COMMUNITY_ID, TEST_ROOM_ID);
  });

  test('should open Whisper Scribe & AI Copilot drawer via Cyber Dock', async () => {
    await stagePage.toggleAiScribe();

    // Verify drawer appears with AI title
    await expect(stagePage.page.locator('text=Multilingual AI, Copilot & Executive MOM')).toBeVisible({ timeout: 10000 });
  });

  test('should switch between tabs: Live Voice, Translator, Copilot, Notes, and MOM', async ({ page }) => {
    await stagePage.toggleAiScribe();
    await expect(page.locator('text=Multilingual AI, Copilot & Executive MOM')).toBeVisible({ timeout: 10000 });

    // 1. Live Voice tab (active by default)
    await expect(page.getByRole('button', { name: 'Live Voice', exact: true })).toBeVisible();
    await expect(page.locator('text=Translate Speech Into:')).toBeVisible();

    // 2. Translator tab
    await page.getByRole('button', { name: 'Translator', exact: true }).click();
    await expect(page.locator('textarea[placeholder*="Type any message"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Translate & Synthesize Audio")')).toBeVisible();

    // 3. Copilot tab
    await page.getByRole('button', { name: 'Copilot', exact: true }).click();
    await expect(page.locator('text=Gemini Copilot').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="Ask Gemini anything"]')).toBeVisible();

    // 4. Notes tab
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await expect(page.locator('textarea').filter({ hasText: /Key Decisions/i })).toBeVisible({ timeout: 5000 });

    // 5. MOM tab
    await page.getByRole('button', { name: 'MOM', exact: true }).click();
    await expect(page.locator('text=Executive Minutes of Meeting').first()).toBeVisible({ timeout: 5000 });
  });

  test('should open and close Gemini API Key Settings modal', async ({ page }) => {
    await stagePage.toggleAiScribe();
    await expect(page.locator('text=Multilingual AI, Copilot & Executive MOM')).toBeVisible({ timeout: 10000 });

    // Click Settings icon
    await page.locator('button[title="Configure Gemini API Key"]').click();

    // Verify settings modal
    const geminiModal = page.locator('div.max-w-lg').filter({ hasText: 'Gemini AI Configuration' });
    await expect(geminiModal).toBeVisible({ timeout: 5000 });
    await expect(geminiModal.locator('input[placeholder*="AIzaSy"]')).toBeVisible();

    // Close settings modal
    await geminiModal.locator('button:has(svg.lucide-x)').click();
    await expect(geminiModal).toBeHidden();
  });

  test('should interact with Gemini Copilot chat prompt', async ({ page }) => {
    await stagePage.toggleAiScribe();
    await page.getByRole('button', { name: 'Copilot', exact: true }).click();

    const input = page.locator('input[placeholder*="Ask Gemini anything"]');
    await expect(input).toBeVisible({ timeout: 5000 });
    await input.fill('Summarize today meeting key objectives');
    await page.keyboard.press('Enter');

    // Message is displayed in message stream
    await expect(page.locator('text=Summarize today meeting key objectives')).toBeVisible({ timeout: 5000 });
  });

  test('should close Whisper Scribe drawer', async ({ page }) => {
    await stagePage.toggleAiScribe();
    await expect(page.locator('text=Multilingual AI, Copilot & Executive MOM')).toBeVisible({ timeout: 10000 });

    // Click close button in drawer header
    await page.locator('button:has(svg.lucide-x)').first().click();
    await expect(page.locator('text=Multilingual AI, Copilot & Executive MOM')).toBeHidden();
  });
});
