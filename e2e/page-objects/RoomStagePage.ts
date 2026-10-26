import { Page, Locator, expect } from '@playwright/test';

export class RoomStagePage {
  readonly page: Page;

  // Cyber Dock buttons
  readonly cyberDock: Locator;
  readonly micBtn: Locator;
  readonly camBtn: Locator;
  readonly screenShareBtn: Locator;
  readonly pipBtn: Locator;
  readonly reactionsBtn: Locator;
  readonly aiScribeBtn: Locator;
  readonly participantsBtn: Locator;
  readonly moreOptionsBtn: Locator;

  // Floating PiP Overlay
  readonly pipOverlay: Locator;
  readonly pipHeader: Locator;
  readonly pipMinimizeBtn: Locator;
  readonly pipLayoutToggleBtn: Locator;
  readonly pipSizeToggleBtn: Locator;
  readonly pipCloseBtn: Locator;

  // Drawers and Modals
  readonly participantTray: Locator;
  readonly whisperDrawer: Locator;
  readonly docsModal: Locator;

  constructor(page: Page) {
    this.page = page;

    this.cyberDock = page.locator('.fixed.bottom-3, .fixed.bottom-5');
    this.micBtn = page.locator('button.group\\/mic');
    this.camBtn = page.locator('button.group\\/cam');
    this.screenShareBtn = page.locator('button.group\\/scr');
    this.pipBtn = page.locator('button.group\\/pip');
    this.reactionsBtn = page.locator('button.group\\/react');
    this.aiScribeBtn = page.locator('button.group\\/ai');
    this.participantsBtn = page.locator('button.group\\/ppl');
    this.moreOptionsBtn = page.locator('button.group\\/more');

    this.pipOverlay = page.locator('div.fixed.z-50').filter({ has: page.locator('button[title="Close PiP"]') });
    this.pipHeader = this.pipOverlay.locator('.cursor-grab').first();
    this.pipMinimizeBtn = this.pipOverlay.locator('button[title*="Minimize PiP"], button[title*="Expand PiP"]').first();
    this.pipLayoutToggleBtn = this.pipOverlay.locator('button[title*="Spotlight View"], button[title*="Grid View"]').first();
    this.pipSizeToggleBtn = this.pipOverlay.locator('button[title*="Size:"]').first();
    this.pipCloseBtn = this.pipOverlay.locator('button[title="Close PiP"]').first();

    this.participantTray = page.locator('aside, div').filter({ hasText: /participants/i }).first();
    this.whisperDrawer = page.locator('aside, div').filter({ hasText: /whisper|meeting summary/i }).first();
    this.docsModal = page.locator('div').filter({ hasText: /documentation hub/i }).first();
  }

  async gotoRoom(communityId: string, roomId: string) {
    await this.page.goto(`/communities/${communityId}/rooms/${roomId}`);
  }

  async toggleMic() {
    await this.micBtn.click();
  }

  async toggleCam() {
    await this.camBtn.click();
  }

  async togglePiP() {
    await this.pipBtn.click();
  }

  async toggleAiScribe() {
    await this.aiScribeBtn.click();
  }

  async toggleParticipants() {
    await this.participantsBtn.click();
  }
}
