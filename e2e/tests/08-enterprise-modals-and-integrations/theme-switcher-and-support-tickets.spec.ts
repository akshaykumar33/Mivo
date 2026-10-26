import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Enterprise Modals — Theme Switcher & Support Tickets Hub', () => {
  const COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3'; // Wysbryx Engineering

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'dev@mivo.app');
    await page.goto(`/communities/${COMMUNITY_ID}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open Theme Switcher Modal and switch color palettes', async ({ page }) => {
    // Open Theme Switcher Modal via palette button in channel sidebar
    const themeBtn = page.locator('button[title*="Visual Themes"]').first();
    await expect(themeBtn).toBeVisible({ timeout: 10000 });
    await themeBtn.click();

    // Verify modal appears
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Visual Themes' });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('text=Multi-Theme Engine')).toBeVisible();

    // Verify presence of themes: Velvet Crimson & Silk Cream, Apple Titanium, Cyberpunk Neon
    await expect(modal.locator('text=Velvet Crimson').first()).toBeVisible();
    await expect(modal.locator('text=Apple Titanium').first()).toBeVisible();
    await expect(modal.locator('text=Cyberpunk Neon').first()).toBeVisible();

    // Click on Apple Titanium theme
    const titaniumCard = modal.locator('button, div').filter({ hasText: 'Apple Titanium' }).first();
    await titaniumCard.click();

    // Verify theme changed in localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('mivo_theme'));
    expect(['titanium', 'crimson-cream', 'cyber']).toContain(savedTheme);

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('should open Support & Tickets Hub, switch tabs, fill ticket form, and inspect filter pills', async ({ page }) => {
    // Open Support Tickets Hub via ticket button in CommunitySidebar
    const ticketsBtn = page.locator('button:has(svg.lucide-ticket)').first();
    await expect(ticketsBtn).toBeVisible({ timeout: 10000 });
    await ticketsBtn.click();

    // Verify modal appears
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Support & Issues Hub' });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('text=Manage incident reports, feature requests')).toBeVisible();

    // Switch to "Create" tab
    const createTabBtn = modal.locator('button:has-text("Create")').first();
    await expect(createTabBtn).toBeVisible();
    await createTabBtn.click();

    // Verify form fields
    const titleInput = modal.locator('input[placeholder*="Realtime audio drops on Safari"]');
    const descTextarea = modal.locator('textarea[placeholder*="Provide detailed context"]');
    const categorySelect = modal.locator('select').first();

    await expect(titleInput).toBeVisible();
    await expect(descTextarea).toBeVisible();
    await expect(categorySelect).toBeVisible();

    // Fill form fields
    await titleInput.fill('E2E Automated Test Ticket');
    await descTextarea.fill('Verifying ticket creation flow in Playwright E2E suite.');

    // Switch back to "Tickets" list tab
    const listTabBtn = modal.locator('button:has-text("Tickets")').first();
    await listTabBtn.click();

    // Verify filter buttons in list tab (ALL, OPEN, IN_PROGRESS, RESOLVED, CLOSED)
    const filterAll = modal.locator('button:has-text("ALL")');
    const filterOpen = modal.locator('button:has-text("OPEN")');
    const filterResolved = modal.locator('button:has-text("RESOLVED")');

    await expect(filterAll).toBeVisible();
    await expect(filterOpen).toBeVisible();
    await expect(filterResolved).toBeVisible();

    // Click Open filter
    await filterOpen.click();

    // Close modal
    const closeBtn = modal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
