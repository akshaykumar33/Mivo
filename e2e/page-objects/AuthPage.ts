import { Page, Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly quickDevAdminBtn: Locator;
  readonly quickAlexBtn: Locator;

  // Register Form elements
  readonly usernameInput: Locator;
  readonly displayNameInput: Locator;
  readonly registerSubmitBtn: Locator;

  // Guest Card elements
  readonly guestDisplayNameInput: Locator;
  readonly enterAsGuestBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('.animate-shake, .bg-rose-50');

    this.quickDevAdminBtn = page.getByRole('button', { name: /dev admin/i });
    this.quickAlexBtn = page.getByRole('button', { name: /alex rivera/i });

    this.usernameInput = page.locator('input[placeholder="johndoe"]');
    this.displayNameInput = page.locator('input[placeholder="John Doe"]');
    this.registerSubmitBtn = page.getByRole('button', { name: /create account/i });

    this.guestDisplayNameInput = page.locator('input[placeholder="e.g. Guest Explorer"]');
    this.enterAsGuestBtn = page.getByRole('button', { name: /continue as guest|join as guest/i });
  }

  async gotoLogin() {
    await this.page.goto('/login');
  }

  async gotoRegister() {
    await this.page.goto('/register');
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async register(email: string, username: string, displayName: string, pass: string) {
    await this.emailInput.fill(email);
    await this.usernameInput.fill(username);
    await this.displayNameInput.fill(displayName);
    await this.passwordInput.fill(pass);
    await this.registerSubmitBtn.click();
  }

  async loginAsGuest(guestName?: string) {
    if (guestName) {
      const customizeBtn = this.page.getByRole('button', { name: /customize/i });
      if (await customizeBtn.isVisible()) {
        await customizeBtn.click();
      }
      await this.guestDisplayNameInput.fill(guestName);
      await this.page.getByRole('button', { name: /join as guest/i }).click();
    } else {
      await this.enterAsGuestBtn.first().click();
    }
  }
}
