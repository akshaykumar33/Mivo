import { describe, it, expect } from 'vitest';
import { translationManager, SUPPORTED_LANGUAGES, LanguageOption } from '@/lib/translation-manager';

describe('Whisper Scribe and Universal Translation Engine', () => {
  it('defines comprehensive list of 12 supported international languages with voice locales', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(12);

    const codes = SUPPORTED_LANGUAGES.map((l: LanguageOption) => l.code);
    expect(codes).toContain('es'); // Spanish
    expect(codes).toContain('fr'); // French
    expect(codes).toContain('de'); // German
    expect(codes).toContain('hi'); // Hindi
    expect(codes).toContain('ja'); // Japanese
    expect(codes).toContain('zh'); // Chinese
    expect(codes).toContain('pt'); // Portuguese
    expect(codes).toContain('it'); // Italian
    expect(codes).toContain('ru'); // Russian
    expect(codes).toContain('ar'); // Arabic
    expect(codes).toContain('ko'); // Korean
    expect(codes).toContain('en'); // English

    const spanish = SUPPORTED_LANGUAGES.find((l: LanguageOption) => l.code === 'es');
    expect(spanish?.voiceLang).toBe('es-ES');
    expect(spanish?.nativeName).toBe('Español');
  });

  it('translates canonical meeting utterances accurately across international language dictionaries', async () => {
    const esHello = await translationManager.translateText('Hello', 'es');
    expect(esHello.toLowerCase()).toBe('hola');

    const frWelcome = await translationManager.translateText('Welcome', 'fr');
    expect(frWelcome.toLowerCase()).toBe('bienvenue');

    const deMeeting = await translationManager.translateText('Meeting', 'de');
    expect(deMeeting.toLowerCase()).toBe('besprechung');

    const hiHello = await translationManager.translateText('Hello', 'hi');
    expect(hiHello).toBe('नमस्ते');

    const jaHello = await translationManager.translateText('Hello', 'ja');
    expect(jaHello).toBe('こんにちは');

    const zhHello = await translationManager.translateText('Hello', 'zh');
    expect(zhHello).toBe('你好');
  });

  it('preserves untranslated terminology gracefully with fallback', async () => {
    const untranslated = await translationManager.translateText('Kubernetes Ingress Controller', 'es');
    expect(untranslated).toContain('Kubernetes Ingress Controller');
  });

  it('subscribes to and emits realtime subtitles to registered listeners', () => {
    let capturedSubtitle: any = null;
    const unsubscribe = translationManager.onSubtitle((sub: any) => {
      capturedSubtitle = sub;
    });

    translationManager.emitSubtitle({
      speaker: 'Sarah Connor',
      text: 'Starting our architecture sync',
      translatedText: 'Iniciando nuestra sincronización de arquitectura',
    });

    expect(capturedSubtitle).not.toBeNull();
    expect(capturedSubtitle.speaker).toBe('Sarah Connor');
    expect(capturedSubtitle.text).toBe('Starting our architecture sync');
    expect(capturedSubtitle.translatedText).toBe('Iniciando nuestra sincronización de arquitectura');

    unsubscribe();
  });
});
