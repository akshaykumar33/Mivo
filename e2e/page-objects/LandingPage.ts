import { Page, Locator, expect } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heroHeading: Locator;
  readonly launchButton: Locator;
  readonly signInButton: Locator;
  readonly getStartedButton: Locator;
  readonly guestModeButton: Locator;
  readonly featurePills: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroHeading = page.locator('h1');
    this.launchButton = page.getByRole('button', { name: /launch mivo/i });
    this.signInButton = page.getByRole('button', { name: /sign in/i }).first();
    this.getStartedButton = page.getByRole('button', { name: /get started free/i });
    this.guestModeButton = page.getByRole('button', { name: /instant guest mode/i });
    this.featurePills = page.locator('div.grid > div');
  }

  async goto() {
    await this.page.goto('/');
  }

  async verifyElements() {
    await expect(this.heroHeading).toBeVisible();
    await expect(this.heroHeading).toContainText('One Room. Dynamic Modes. Zero Context Switching.');
    await expect(this.launchButton).toBeVisible();
    await expect(this.signInButton).toBeVisible();
    await expect(this.getStartedButton).toBeVisible();
    await expect(this.guestModeButton).toBeVisible();
    await expect(this.featurePills.first()).toBeVisible();
  }
}
