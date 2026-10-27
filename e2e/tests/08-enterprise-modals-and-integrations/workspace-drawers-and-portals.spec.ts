import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';

test.describe('Workspace Drawers, Portals & Hubs', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    dashboard = new DashboardPage(page);
    await dashboard.gotoCommunity(TEST_COMMUNITY_ID);
  });

  test('should open Notifications Hub from leftmost navigation rail', async ({ page }) => {
    // Click Notification bell in CommunitySidebar
    const bellBtn = page.locator('button[title*="Notification"], button[aria-label*="Notification"]').or(
      page.locator('aside').first().locator('button:has(svg.lucide-bell)')
    ).first();
    await expect(bellBtn).toBeVisible({ timeout: 10000 });
    await bellBtn.click();

    // Verify Notifications Hub modal
    await expect(page.locator('text=Notifications Hub')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Real-time updates')).toBeVisible();

    // Close modal via close button
    const closeBtn = page.locator('div.fixed.z-50 button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(page.locator('text=Notifications Hub')).toBeHidden();
  });

  test('should open Developer Projects Showcase Hub', async ({ page }) => {
    // Click Developer Projects Showcase button in CommunitySidebar
    const projectsBtn = page.locator('aside').first().locator('button:has(svg.lucide-folder-git-2), button:has(svg.lucide-folder-git2)').first();
    await expect(projectsBtn).toBeVisible({ timeout: 10000 });
    await projectsBtn.click();

    // Verify modal title
    await expect(page.locator('text=Developer Project Showcase')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Creator & Dev Hub')).toBeVisible();

    // Filter tags
    await expect(page.locator('button:has-text("React")')).toBeVisible();

    // Close modal via close button
    const closeBtn = page.locator('div.fixed.z-50 button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(page.locator('text=Developer Project Showcase')).toBeHidden();
  });

  test('should open Support & Tickets Hub modal', async ({ page }) => {
    // Click Support & Tickets button in CommunitySidebar
    const ticketsBtn = page.locator('aside').first().locator('button:has(svg.lucide-ticket)').first();
    await expect(ticketsBtn).toBeVisible({ timeout: 10000 });
    await ticketsBtn.click();

    // Verify modal title
    await expect(page.locator('text=Support & Issues Hub')).toBeVisible({ timeout: 5000 });

    // Switch to Create Ticket tab
    const createTicketTab = page.locator('button:has-text("Create")').first();
    if (await createTicketTab.isVisible()) {
      await createTicketTab.click();
      await expect(page.locator('input[placeholder*="summary"], input[placeholder*="Title"], textarea').first()).toBeVisible({ timeout: 5000 });
    }

    // Close modal via close button
    const closeBtn = page.locator('div.fixed.z-50 button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(page.locator('text=Support & Issues Hub')).toBeHidden();
  });
});
