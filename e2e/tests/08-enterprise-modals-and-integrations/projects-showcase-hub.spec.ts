import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Enterprise Modals — Developer Projects Showcase Hub', () => {
  const COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3'; // Wysbryx Engineering

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, 'dev@mivo.app');
    await page.goto(`/communities/${COMMUNITY_ID}`);
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open Projects Showcase Hub, filter by tags, and search projects', async ({ page }) => {
    // Open Developer Projects Showcase modal via CommunitySidebar
    const projectsBtn = page.locator('button:has(svg.lucide-folder-git-2)').first();
    await expect(projectsBtn).toBeVisible({ timeout: 10000 });
    await projectsBtn.click();

    // Verify modal appears
    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Developer Project Showcase' });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.locator('text=Creator & Dev Hub')).toBeVisible();

    // Verify tech tag filter buttons exist
    const tagAll = modal.locator('button:has-text("All")');
    const tagTypeScript = modal.locator('button:has-text("TypeScript")');
    const tagReact = modal.locator('button:has-text("React")');

    await expect(tagAll).toBeVisible();
    await expect(tagTypeScript).toBeVisible();
    await expect(tagReact).toBeVisible();

    // Click TypeScript filter tag
    await tagTypeScript.click();
    await expect(tagTypeScript).toHaveClass(/bg-cyan-500/);

    // Click back to All
    await tagAll.click();
    await expect(tagAll).toHaveClass(/bg-cyan-500/);

    // Test search filter input
    const searchInput = modal.locator('input[placeholder*="Search title, tech, author"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('NonExistentQuantumProjectXYZ');

    // Should show no projects found state
    await expect(modal.locator('text=No projects found')).toBeVisible();
    await expect(modal.locator('text=No projects matched your search criteria.')).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Close modal via close button
    const closeBtn = modal.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('should open Publish Project form and allow cancellation', async ({ page }) => {
    // Open Developer Projects Showcase modal
    const projectsBtn = page.locator('button:has(svg.lucide-folder-git-2)').first();
    await expect(projectsBtn).toBeVisible({ timeout: 10000 });
    await projectsBtn.click();

    const modal = page.locator('div.fixed.z-50').filter({ hasText: 'Developer Project Showcase' });
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Click Publish Project button
    const publishBtn = modal.locator('button:has-text("Publish Project")');
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();

    // Nested Publish Project Form modal appears
    const publishModal = page.locator('div.fixed.z-60').filter({ hasText: 'Publish Developer Project' });
    await expect(publishModal).toBeVisible({ timeout: 10000 });

    // Verify inputs
    const titleInput = publishModal.locator('input[placeholder*="Next.js Realtime Audio Canvas"]');
    const descInput = publishModal.locator('textarea[placeholder*="Explain what the project does"]');
    const demoUrlInput = publishModal.locator('input[placeholder="https://..."]');

    await expect(titleInput).toBeVisible();
    await expect(descInput).toBeVisible();
    await expect(demoUrlInput).toBeVisible();

    // Close publish dialog
    const cancelBtn = publishModal.locator('button:has(svg.lucide-x)').first();
    await cancelBtn.click();
    await expect(publishModal).not.toBeVisible();

    // Main modal is still visible, close it via Escape
    await page.keyboard.press('Escape');
  });
});
