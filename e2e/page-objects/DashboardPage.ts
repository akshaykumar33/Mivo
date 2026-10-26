import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly communityRail: Locator;
  readonly directMessagesTab: Locator;
  readonly newDirectMessageBtn: Locator;
  readonly searchInput: Locator;
  readonly userCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.communityRail = page.locator('aside, nav').first();
    this.directMessagesTab = page.getByRole('link', { name: /direct messages|friends/i });
    this.newDirectMessageBtn = page.getByRole('button', { name: /new conversation|new message|\+/i }).first();
    this.searchInput = page.locator('input[placeholder*="Search"]');
    this.userCard = page.locator('.flex.items-center.gap-2').filter({ hasText: /dev admin|alex/i }).first();
  }

  async gotoChannels() {
    await this.page.goto('/channels');
  }

  async gotoConversations() {
    await this.page.goto('/conversations');
  }

  async gotoCommunity(communityId: string) {
    await this.page.goto(`/communities/${communityId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async verifyDashboardLoaded() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
