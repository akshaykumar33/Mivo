import { describe, it, expect } from 'vitest';
import { translationManager } from '@/lib/translation-manager';

export function parseMomActionItems(momMarkdown: string): string[] {
  const lines = momMarkdown.split('\n');
  const actionItems: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
      actionItems.push(trimmed.replace(/^-\s*\[[ x]\]\s*/, ''));
    }
  }
  return actionItems;
}

export function validateEmailSummaryPayload(payload: {
  notes?: string;
  transcript?: any[];
  email: string;
  name: string;
}): boolean {
  if (!payload.email || !payload.email.includes('@')) return false;
  if (!payload.name || payload.name.trim().length === 0) return false;
  return true;
}

describe('MOM (Minutes of Meeting) Generator and Email Distribution', () => {
  it('generates structured Markdown Minutes of Meeting document with executive summary and attendees', () => {
    const roomName = 'architecture-war-room';
    const attendees = ['Elena Rostova', 'Dev Admin', 'Sarah Connor'];
    const transcript = [
      { speaker: 'Elena Rostova', text: 'Reviewed PR #104 for WebRTC SFU', time: '10:00 AM' },
      { speaker: 'Dev Admin', text: 'All integration checks passed with 100% green rate', time: '10:02 AM' },
    ];
    const userNotes = 'Agreed to release v2.0 tomorrow morning.';

    const mom = translationManager.generateMOM(roomName, attendees, transcript, userNotes);

    expect(mom).toContain('# Minutes of Meeting (MOM): #architecture-war-room');
    expect(mom).toContain('Elena Rostova, Dev Admin, Sarah Connor');
    expect(mom).toContain('## 1. Executive Summary');
    expect(mom).toContain('## 2. In-Meeting Notes & Key Decisions');
    expect(mom).toContain('Agreed to release v2.0 tomorrow morning.');
    expect(mom).toContain('## 3. Action Items');
    expect(mom).toContain('## 4. Full Verified Transcript (2 entries)');
    expect(mom).toContain('* **[10:00 AM] Elena Rostova:** Reviewed PR #104 for WebRTC SFU');
    expect(mom).toContain('* **[10:02 AM] Dev Admin:** All integration checks passed with 100% green rate');
  });

  it('correctly extracts and parses action checklist items from generated MOM document', () => {
    const mom = translationManager.generateMOM(
      'standup',
      ['Alice', 'Bob'],
      [],
      '### Sprint Goals\n- [ ] Deploy canary build to staging\n- [x] Merge PR #42'
    );

    const actionItems = parseMomActionItems(mom);
    expect(actionItems.length).toBeGreaterThanOrEqual(3);
    expect(actionItems.some((item) => item.includes('Review multilingual transcript'))).toBe(true);
    expect(actionItems.some((item) => item.includes('Deploy canary build to staging'))).toBe(true);
  });

  it('validates email summary dispatch payloads for recipient formatting and completeness', () => {
    const valid = validateEmailSummaryPayload({
      email: 'tech-lead@mivo.app',
      name: 'Alex Rivera',
      notes: 'Meeting recap',
      transcript: [],
    });
    expect(valid).toBe(true);

    const invalidEmail = validateEmailSummaryPayload({
      email: 'not-an-email',
      name: 'Alex Rivera',
    });
    expect(invalidEmail).toBe(false);

    const missingName = validateEmailSummaryPayload({
      email: 'valid@mivo.app',
      name: '',
    });
    expect(missingName).toBe(false);
  });
});
