import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Files & Document Viewers — Universal File Viewer Modal', () => {
  const COMMUNITY_ID = '7ac3313b-3066-4595-ae47-7cb30e91dfa3'; // Wysbryx Engineering
  const ROOM_ID = '00000000-0000-0000-0000-000000000011'; // #Lobby

  test.beforeEach(async ({ page }) => {
    // Mock storage presigned URL and direct upload PUT
    await page.route('**/api/v1/storage/presigned-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            uploadUrl: 'https://mock-storage.mivo.app/upload/architecture.csv',
            fileUrl: 'https://mock-storage.mivo.app/files/architecture.csv',
            key: 'attachments/architecture.csv',
          },
        }),
      });
    });

    await page.route('https://mock-storage.mivo.app/**', async (route) => {
      await route.fulfill({ status: 200, body: 'OK' });
    });

    await injectAuth(page, 'dev@mivo.app');
    await page.goto(`/communities/${COMMUNITY_ID}/rooms/${ROOM_ID}`);
    await page.waitForLoadState('domcontentloaded');

    // Switch to Chat / TEXT stage mode to display chat stream and composer
    const chatModeBtn = page.locator('button[title="Chat Mode"]').first();
    await expect(chatModeBtn).toBeVisible({ timeout: 10000 });
    await chatModeBtn.click();
    await expect(page.locator('textarea[placeholder*="Message"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should stage file attachment, open read-only Universal File Viewer, inspect metadata and controls', async ({ page }) => {
    // Locate document file input in MessageComposer
    const fileInput = page.locator('input[accept*=".csv"]').first();
    await expect(fileInput).toBeAttached({ timeout: 10000 });

    // Upload a simulated CSV buffer
    await fileInput.setInputFiles({
      name: 'architecture.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Service,Instances,Status\nGateway,4,HEALTHY\nWebRTC-SFU,8,HEALTHY\nDatabase,3,ACTIVE\n'),
    });

    // Verify attachment preview chip appears in composer
    const previewChip = page.locator('div:has-text("architecture.csv")').first();
    await expect(previewChip).toBeVisible({ timeout: 10000 });

    // Click "Preview attachment (Read-Only)" eye icon
    const previewBtn = page.locator('button[title="Preview attachment (Read-Only)"]').first();
    await expect(previewBtn).toBeAttached({ timeout: 10000 });
    await previewBtn.click({ force: true });

    // Verify UniversalFileViewerModal opened
    const modal = page.locator('div.fixed.z-\\[100\\]');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify filename and READ-ONLY badge
    await expect(modal.locator('text=architecture.csv').first()).toBeVisible();
    await expect(modal.locator('text=READ-ONLY').first()).toBeVisible();
    await expect(modal.locator('text=Spreadsheet (CSV)')).toBeVisible();

    // Verify top action tools (open raw in new tab & download)
    await expect(modal.locator('a[title="Open raw file in new tab"]')).toBeVisible();

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
