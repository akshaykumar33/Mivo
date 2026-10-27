import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Interactive Code Stage Module — Language Tabs, AI Pair Programmer & Execution Runtime', () => {
  const communityId = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
  const roomId = '00000000-0000-0000-0000-000000000011';

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/communities/${communityId}/rooms/${roomId}`);
    await page.waitForLoadState('domcontentloaded');

    // Switch to Code Mode
    const codeBtn = page.locator('button[title="Code Mode"], button:has-text("Code Stage")').first();
    await expect(codeBtn).toBeVisible({ timeout: 10000 });
    await codeBtn.click();
  });

  test('should switch between language files and test copy button', async ({ page }) => {
    // Verify file tabs exist
    const tabs = ['index.ts', 'server.py', 'algorithm.rs'];
    for (const tabName of tabs) {
      await expect(page.locator(`button:has-text("${tabName}")`).first()).toBeVisible({ timeout: 8000 });
    }

    // Switch to server.py
    await page.locator('button:has-text("server.py")').first().click();
    await expect(page.locator('span:has-text("PYTHON")').first()).toBeVisible({ timeout: 5000 });

    // Switch to algorithm.rs
    await page.locator('button:has-text("algorithm.rs")').first().click();
    await expect(page.locator('span:has-text("RUST")').first()).toBeVisible({ timeout: 5000 });

    // Test Copy button
    const copyBtn = page.locator('button:has-text("Copy"), button[title="Copy code to clipboard"]').first();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.locator('text=Copied').first()).toBeVisible({ timeout: 5000 });
  });

  test('should trigger AI Pair Programmer actions and run code in isolated sandbox', async ({ page }) => {
    // Run Code
    const runBtn = page.locator('button:has-text("Run Code")').first();
    await expect(runBtn).toBeVisible({ timeout: 10000 });
    await runBtn.click();

    // Verify Execution Console output shows executed statements
    const consoleBody = page.locator('div:has-text("Execution Console")').locator('..').locator('pre').first();
    await expect(consoleBody).toBeVisible({ timeout: 8000 });

    // Verify AI Pair Programmer Action Buttons
    const aiExplainBtn = page.locator('button:has-text("Explain Code")').first();
    const aiOptimizeBtn = page.locator('button:has-text("Optimize")').first();
    const aiTestBtn = page.locator('button:has-text("Gen Tests")').first();

    await expect(aiExplainBtn).toBeVisible();
    await expect(aiOptimizeBtn).toBeVisible();
    await expect(aiTestBtn).toBeVisible();

    // Click "Explain Code"
    await aiExplainBtn.click();
    await expect(page.locator('text=[AI Pair Programmer] Code Explanation').first()).toBeVisible({ timeout: 8000 });

    // Click "Gen Tests"
    await aiTestBtn.click();
    await expect(page.locator('text=[AI Pair Programmer] Unit Test Suite Generated').first()).toBeVisible({ timeout: 8000 });
  });
});
