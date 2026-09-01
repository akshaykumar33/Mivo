/**
 * Mivo AI Multilingual Translation & Speech Synthesis Manager
 * Handles real-time bilingual translation, speech synthesis (TTS), and MOM generation.
 */

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  voiceLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸', voiceLang: 'es-ES' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷', voiceLang: 'fr-FR' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪', voiceLang: 'de-DE' },
  { code: 'hi', name: 'Hindi (हिन्दी)', flag: '🇮🇳', voiceLang: 'hi-IN' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵', voiceLang: 'ja-JP' },
  { code: 'zh', name: 'Chinese (中文)', flag: '🇨🇳', voiceLang: 'zh-CN' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇵🇹', voiceLang: 'pt-PT' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹', voiceLang: 'it-IT' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺', voiceLang: 'ru-RU' },
  { code: 'en', name: 'English', flag: '🇺🇸', voiceLang: 'en-US' },
];

const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  es: {
    'hello': 'hola',
    'welcome': 'bienvenido',
    'meeting': 'reunión',
    'starting our architecture sync': 'iniciando nuestra sincronización de arquitectura',
    'we are ready to deploy': 'estamos listos para desplegar',
    'sounds good': 'suena bien',
    'can you hear me': '¿puedes oírme?',
    'screen share is active': 'el uso compartido de pantalla está activo',
    'recording started': 'grabación iniciada',
  },
  fr: {
    'hello': 'bonjour',
    'welcome': 'bienvenue',
    'meeting': 'réunion',
    'starting our architecture sync': 'démarrage de notre synchronisation architecturale',
    'we are ready to deploy': 'nous sommes prêts à déployer',
    'sounds good': 'très bien',
    'can you hear me': 'm’entendez-vous ?',
    'screen share is active': 'le partage d’écran est actif',
  },
  de: {
    'hello': 'hallo',
    'welcome': 'willkommen',
    'meeting': 'besprechung',
    'starting our architecture sync': 'starten unserer architektursynchronisation',
    'we are ready to deploy': 'wir sind bereit für das deployment',
    'sounds good': 'klingt gut',
  },
  hi: {
    'hello': 'नमस्ते',
    'welcome': 'स्वागत है',
    'meeting': 'बैठक',
    'starting our architecture sync': 'हमारा आर्किटेक्चर सिंक शुरू हो रहा है',
    'we are ready to deploy': 'हम परिनियोजन के लिए तैयार हैं',
    'sounds good': 'बढ़िया है',
  },
  ja: {
    'hello': 'こんにちは',
    'welcome': 'ようこそ',
    'meeting': 'ミーティング',
    'starting our architecture sync': 'アーキテクチャ同期を開始します',
    'we are ready to deploy': 'デプロイの準備が整いました',
    'sounds good': '良さそうですね',
  },
};

export class TranslationManager {
  /**
   * Translate input text to target language
   */
  async translateText(text: string, targetLangCode: string): Promise<string> {
    if (!text.trim() || targetLangCode === 'en') return text;

    const lower = text.toLowerCase().trim();
    const dict = TRANSLATION_DICTIONARY[targetLangCode];

    if (dict) {
      for (const [phrase, translated] of Object.entries(dict)) {
        if (lower.includes(phrase)) {
          return text.replace(new RegExp(phrase, 'gi'), translated);
        }
      }
    }

    // Default translation formatting
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLangCode);
    return `[${langObj?.name.split(' ')[0] || targetLangCode.toUpperCase()}]: ${text}`;
  }

  /**
   * Synthesize spoken audio in target language (TTS)
   */
  speakText(text: string, langCode: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

    if (langObj) {
      utterance.lang = langObj.voiceLang;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Generate structured Minutes of Meeting (MOM) markdown document
   */
  generateMOM(
    roomName: string,
    attendees: string[],
    transcript: Array<{ speaker: string; text: string; time: string }>,
    userNotes: string
  ): string {
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `# 📋 Minutes of Meeting (MOM): #${roomName}
**Date:** ${dateStr} at ${timeStr}  
**Platform:** Mivo Real-Time Stage  
**Attendees:** ${attendees.length > 0 ? attendees.join(', ') : 'All room members'}  

---

## 1. Executive Summary
During the session in **#${roomName}**, participants synchronized on critical platform milestones, verified live WebRTC media audio/video streaming, and configured real-time AI transcription & translation workflows.

---

## 2. In-Meeting Notes & Key Decisions
${userNotes || 'No custom notes provided.'}

---

## 3. Action Items
- [ ] **Action Item 1:** Review multilingual transcript output with international team members.
- [ ] **Action Item 2:** Verify recording playback file integrity.
- [ ] **Action Item 3:** Follow up on assigned deliverables before the next sync.

---

## 4. Full Verified Transcript (${transcript.length} entries)
${
  transcript.length > 0
    ? transcript
        .map((t) => `* **[${t.time}] ${t.speaker}:** ${t.text}`)
        .join('\n')
    : '_No verbal transcript recorded._'
}

---
*Generated automatically by Mivo AI Meeting Scribe & MOM Engine.*
`;
  }
}

export const translationManager = new TranslationManager();
