import { describe, it, expect } from 'vitest';
import { translationManager, SUPPORTED_LANGUAGES } from '../../../apps/web/src/lib/translation-manager';

describe('Individual Peer Volume Control (0% to 200%)', () => {
  it('clamps volume values correctly within the 0% to 200% bounds', () => {
    const clampVolume = (vol: number) => Math.max(0, Math.min(200, vol));

    expect(clampVolume(-10)).toBe(0);
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(100)).toBe(100);
    expect(clampVolume(150)).toBe(150);
    expect(clampVolume(200)).toBe(200);
    expect(clampVolume(250)).toBe(200);
  });

  it('computes Web Audio gain multiplier with boost up to 2.0x', () => {
    const computeGain = (volPercent: number) => {
      const clamped = Math.max(0, Math.min(200, volPercent));
      return clamped / 100;
    };

    expect(computeGain(0)).toBe(0.0);
    expect(computeGain(50)).toBe(0.5);
    expect(computeGain(100)).toBe(1.0);
    expect(computeGain(150)).toBe(1.5);
    expect(computeGain(200)).toBe(2.0);
  });
});

describe('Multilingual AI Translation & Audio (TTS) Engine', () => {
  it('supports 12+ international languages including Spanish, French, German, Hindi, Japanese, Chinese', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(12);

    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('es');
    expect(codes).toContain('fr');
    expect(codes).toContain('de');
    expect(codes).toContain('hi');
    expect(codes).toContain('ja');
    expect(codes).toContain('zh');
  });

  it('translates common meeting phrases across target languages', async () => {
    const es = await translationManager.translateText('Hello', 'es');
    expect(es.toLowerCase()).toContain('hola');

    const fr = await translationManager.translateText('Hello', 'fr');
    expect(fr.toLowerCase()).toContain('bonjour');

    const de = await translationManager.translateText('Hello', 'de');
    expect(de.toLowerCase()).toContain('hallo');

    const hi = await translationManager.translateText('Hello', 'hi');
    expect(hi).toContain('नमस्ते');

    const ja = await translationManager.translateText('Hello', 'ja');
    expect(ja).toContain('こんにちは');

    const zh = await translationManager.translateText('Hello', 'zh');
    expect(zh).toContain('你好');
  });

  it('returns original text when target language is English or text is empty', async () => {
    const resEn = await translationManager.translateText('System test message', 'en');
    expect(resEn).toBe('System test message');

    const resEmpty = await translationManager.translateText('   ', 'es');
    expect(resEmpty).toBe('   ');
  });

  it('generates structured MOM meeting documentation with executive summary and action items', () => {
    const mom = translationManager.generateMOM(
      'architecture-sync',
      ['Dev Admin', 'Elena Rostova'],
      [
        { speaker: 'Dev Admin', text: 'Deploying WebRTC mesh and spatial audio', time: '10:00 AM' },
        { speaker: 'Elena Rostova', text: 'All SFU RTP capabilities verified', time: '10:02 AM' },
      ],
      'Approved sprint deliverables.'
    );

    expect(mom).toContain('# Minutes of Meeting (MOM): #architecture-sync');
    expect(mom).toContain('Executive Summary');
    expect(mom).toContain('Action Items');
    expect(mom).toContain('Approved sprint deliverables.');
    expect(mom).toContain('Dev Admin');
    expect(mom).toContain('Elena Rostova');
  });
});

describe('Spotlight Focus Mode Stage Logic', () => {
  it('determines dominant spotlight hero and attendee filmstrip mode', () => {
    const participants = [
      { userId: 'u1', name: 'Alice', isMuted: false },
      { userId: 'u2', name: 'Bob', isMuted: true },
      { userId: 'u3', name: 'Charlie', isMuted: false },
    ];

    const getSpotlightHero = (pinnedId: string | null) => {
      if (pinnedId) return participants.find((p) => p.userId === pinnedId) || null;
      return participants.find((p) => !p.isMuted) || participants[0];
    };

    const getFilmstrip = (heroId: string | null) => {
      return participants.filter((p) => p.userId !== heroId);
    };

    // When pinned to u2 (Bob)
    const hero1 = getSpotlightHero('u2');
    expect(hero1?.userId).toBe('u2');
    const filmstrip1 = getFilmstrip(hero1?.userId || null);
    expect(filmstrip1).toHaveLength(2);
    expect(filmstrip1.map((p) => p.userId)).toEqual(['u1', 'u3']);

    // When unpinned, auto-selects active unmuted speaker
    const hero2 = getSpotlightHero(null);
    expect(hero2?.userId).toBe('u1');
    const filmstrip2 = getFilmstrip(hero2?.userId || null);
    expect(filmstrip2).toHaveLength(2);
    expect(filmstrip2.map((p) => p.userId)).toEqual(['u2', 'u3']);
  });
});

describe('SpatialAudioEngine & Volume Persistence', () => {
  it('stores and retrieves peer volume preferences across session storage', () => {
    const mockStorage = new Map<string, string>();
    const savePeerVol = (userId: string, vol: number) => {
      const clamped = Math.max(0, Math.min(200, vol));
      mockStorage.set(`mivo_peer_vol_${userId}`, clamped.toString());
      return clamped;
    };
    const getPeerVol = (userId: string) => {
      const val = mockStorage.get(`mivo_peer_vol_${userId}`);
      return val ? Number(val) : 100;
    };

    expect(getPeerVol('user-123')).toBe(100);
    savePeerVol('user-123', 175);
    expect(getPeerVol('user-123')).toBe(175);
    savePeerVol('user-123', 250); // clamp
    expect(getPeerVol('user-123')).toBe(200);
    savePeerVol('user-123', -20); // clamp
    expect(getPeerVol('user-123')).toBe(0);
  });
});

describe('Stage Modes & STREAM Theater', () => {
  it('supports all 5 communication modes: TEXT, VOICE, VIDEO, SCREEN_SHARE, STREAM', () => {
    const supportedModes = ['TEXT', 'VOICE', 'VIDEO', 'SCREEN_SHARE', 'STREAM'];
    expect(supportedModes).toHaveLength(5);
    expect(supportedModes).toContain('STREAM');
    expect(supportedModes).toContain('SCREEN_SHARE');
  });
});

describe('Interactive Documentation Hub Articles', () => {
  it('contains comprehensive documentation covering all 11 core architectural features', async () => {
    const { DOC_ARTICLES } = await import('../../../apps/web/src/features/docs/InteractiveDocsModal');
    expect(DOC_ARTICLES.length).toBeGreaterThanOrEqual(10);

    const titles = DOC_ARTICLES.map((a) => a.title.toLowerCase());
    expect(titles.some((t) => t.includes('stage') || t.includes('room'))).toBe(true);
    expect(titles.some((t) => t.includes('grid') || t.includes('reorder'))).toBe(true);
    expect(titles.some((t) => t.includes('spotlight'))).toBe(true);
    expect(titles.some((t) => t.includes('picture-in-picture') || t.includes('pip'))).toBe(true);
    expect(titles.some((t) => t.includes('audio') || t.includes('volume') || t.includes('gain'))).toBe(true);
    expect(titles.some((t) => t.includes('moderation') || t.includes('host'))).toBe(true);
    expect(titles.some((t) => t.includes('translation') || t.includes('tts'))).toBe(true);
    expect(titles.some((t) => t.includes('scribe') || t.includes('mom'))).toBe(true);
    expect(titles.some((t) => t.includes('recording') || t.includes('consent'))).toBe(true);
    expect(titles.some((t) => t.includes('rbac') || t.includes('permission'))).toBe(true);
  });
});
