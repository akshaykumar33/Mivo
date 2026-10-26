import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';
import { DashboardPage } from '../../page-objects/DashboardPage';

const TEST_COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';

test.describe('Community Governance & Spaces Management', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    dashboard = new DashboardPage(page);
    await dashboard.gotoCommunity(TEST_COMMUNITY_ID);
  });

  test('should open and view Community Roles & Permissions hierarchy', async ({ page }) => {
    // Open Role Manager from ChannelSidebar
    const rolesBtn = page.locator('button[title="Community Roles & Permissions"]');
    await expect(rolesBtn).toBeVisible({ timeout: 10000 });
    await rolesBtn.click();

    // Verify modal title
    await expect(page.locator('text=Community Roles & Permissions').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Hierarchy')).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Community Roles & Permissions')).toBeHidden();
  });

  test('should open and view Add Organization Members modal with Tenancy policy', async ({ page }) => {
    // Open Add Organization Member from ChannelSidebar
    const addMemberBtn = page.locator('button[title="Add Organization Members"]');
    await expect(addMemberBtn).toBeVisible({ timeout: 10000 });
    await addMemberBtn.click();

    // Verify single-org tenancy banner
    await expect(page.locator('text=Single-Organization Tenancy Enforced')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="alex@wysbryx.com"]').first()).toBeVisible();

    // Switch to Current Members tab
    await page.locator('button:has-text("Current Members")').click();
    await expect(page.locator('text=Dev Admin').first()).toBeVisible({ timeout: 5000 });

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Single-Organization Tenancy Enforced')).toBeHidden();
  });

  test('should open Create Space modal and validate form inputs', async ({ page }) => {
    // Open Create Space modal
    const createSpaceBtn = page.locator('button[title="Create Space"]');
    await expect(createSpaceBtn).toBeVisible({ timeout: 10000 });
    await createSpaceBtn.click();

    // Verify modal title & inputs
    await expect(page.locator('text=Create Space').first()).toBeVisible({ timeout: 5000 });
    const nameInput = page.locator('input[placeholder="e.g. design-critique"]');
    await expect(nameInput).toBeVisible();

    // Fill sample space name
    await nameInput.fill('qa-testing-space');

    // Click Cancel button to close safely without mutating db
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Create Space').first()).toBeHidden();
  });
});
