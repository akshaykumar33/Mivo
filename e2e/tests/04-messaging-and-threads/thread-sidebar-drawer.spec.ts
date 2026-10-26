import { test, expect } from '@playwright/test';
import { injectAuth } from '../../fixtures/auth.fixture';

test.describe('Messaging Module — Slack-Style Thread Sidebar Drawer & Message Replies', () => {
  const communityId = '7ac3313b-3066-4595-ae47-7cb30e91dfa3';
  const roomId = '00000000-0000-0000-0000-000000000011';

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    await page.goto(`/communities/${communityId}/rooms/${roomId}`);
    await page.waitForLoadState('domcontentloaded');

    // Switch to Chat Mode so ChatStream is active
    const chatBtn = page.locator('button[title="Chat Mode"], button:has-text("Chat Stage")').first();
    await expect(chatBtn).toBeVisible({ timeout: 10000 });
    await chatBtn.click();

    // Verify message composer is ready
    await expect(page.locator('textarea[placeholder*="Message"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open ThreadSidebar drawer on message hover and display parent message card', async ({ page }) => {
    // Send a message first so there is a target message
    const msgInput = page.locator('textarea[placeholder*="Message"]').first();
    const testContent = `Thread Root Msg ${Date.now()}`;
    await msgInput.fill(testContent);
    await msgInput.press('Enter');

    // Wait for the message bubble to appear in chat
    const msgBubble = page.locator(`text=${testContent}`).first();
    await expect(msgBubble).toBeVisible({ timeout: 8000 });

    // Hover the message bubble's parent container
    const msgContainer = page.locator('div.group\\/msg, div.group').filter({ hasText: testContent }).first();
    await msgContainer.hover();

    // Click "Reply in thread (Slack style)" button
    const replyThreadBtn = msgContainer.locator('button[title*="Reply in thread"], button:has(svg.lucide-message-square-reply)').first();
    await expect(replyThreadBtn).toBeVisible({ timeout: 5000 });
    await replyThreadBtn.click();

    // Assert ThreadSidebar drawer opens
    const threadDrawer = page.locator('aside').filter({ has: page.locator('h3:has-text("Thread")') }).first();
    await expect(threadDrawer).toBeVisible({ timeout: 8000 });

    // Verify parent message card contains the test message text
    await expect(threadDrawer.locator(`text=${testContent}`).first()).toBeVisible();

    // Verify thread reply textarea
    const threadTextarea = threadDrawer.locator('textarea[placeholder*="Reply in thread"]').first();
    await expect(threadTextarea).toBeVisible();

    // Close thread drawer
    const closeBtn = threadDrawer.locator('button[title="Close Thread"], button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(threadDrawer).not.toBeVisible({ timeout: 5000 });
  });

  test('should type and send a reply in thread and close thread drawer', async ({ page }) => {
    // Send message to start thread
    const msgInput = page.locator('textarea[placeholder*="Message"]').first();
    const testContent = `Thread Discussion ${Date.now()}`;
    await msgInput.fill(testContent);
    await msgInput.press('Enter');

    const msgContainer = page.locator('div.group\\/msg, div.group').filter({ hasText: testContent }).first();
    await expect(msgContainer).toBeVisible({ timeout: 8000 });
    await msgContainer.hover();

    const replyThreadBtn = msgContainer.locator('button[title*="Reply in thread"], button:has(svg.lucide-message-square-reply)').first();
    await replyThreadBtn.click();

    const threadDrawer = page.locator('aside').filter({ has: page.locator('h3:has-text("Thread")') }).first();
    await expect(threadDrawer).toBeVisible({ timeout: 8000 });

    // Type a reply in the thread textarea
    const threadTextarea = threadDrawer.locator('textarea[placeholder*="Reply in thread"]').first();
    const replyContent = `Nested Thread Reply ${Date.now()}`;
    await threadTextarea.fill(replyContent);

    // Send reply via Enter
    await threadTextarea.press('Enter');

    // Verify reply appears inside the thread drawer
    await expect(threadDrawer.locator(`text=${replyContent}`).first()).toBeVisible({ timeout: 8000 });

    // Close thread drawer
    const closeBtn = threadDrawer.locator('button[title="Close Thread"], button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await expect(threadDrawer).not.toBeVisible({ timeout: 5000 });
  });
});
