import { test, expect } from '@playwright/test';
import { LandingPage } from '../../page-objects/LandingPage';

test.describe('Landing Page & Navigation Module', () => {
  let landingPage: LandingPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test('should render the landing page with hero banner and typography', async () => {
    await landingPage.verifyElements();
  });

  test('should display all 5 core feature capability pills', async ({ page }) => {
    const featureLabels = ['Real-time Chat', 'Voice Huddles', 'HD Video', 'Screen Share', 'Live Stages'];
    for (const label of featureLabels) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('should navigate to /login when clicking "Sign In"', async ({ page }) => {
    await landingPage.signInButton.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to /register when clicking "Launch Mivo" or "Get Started Free"', async ({ page }) => {
    await landingPage.launchButton.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should navigate to /login when clicking "Instant Guest Mode"', async ({ page }) => {
    await landingPage.guestModeButton.click();
    await expect(page).toHaveURL(/\/login/);
  });
});
