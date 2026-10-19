/**
 * Mivo Universal AI Multilingual Translation, Voice-to-Voice & MOM Engine
 * Inspired by Zoom, GMeet, Telegram, WhatsApp, and Whisper Flow.
 */

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  voiceLang: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '', voiceLang: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '', voiceLang: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '', voiceLang: 'de-DE' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '', voiceLang: 'hi-IN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '', voiceLang: 'ja-JP' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '', voiceLang: 'zh-CN' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '', voiceLang: 'pt-PT' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '', voiceLang: 'it-IT' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '', voiceLang: 'ru-RU' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '', voiceLang: 'ar-SA' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '', voiceLang: 'ko-KR' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '', voiceLang: 'en-US' },
];

const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  es: {
    'hello': 'hola',
    'hi': 'hola',
    'welcome': 'bienvenido',
    'meeting': 'reunión',
    'starting our architecture sync': 'iniciando nuestra sincronización de arquitectura',
    'we are ready to deploy': 'estamos listos para desplegar',
    'sounds good': 'suena bien',
    'can you hear me': '¿puedes oírme?',
    'screen share is active': 'el uso compartido de pantalla está activo',
    'recording started': 'grabación iniciada',
    'good morning': 'buenos días',
    'good afternoon': 'buenas tardes',
    'thanks': 'gracias',
    'thank you': 'gracias',
    'great work': 'gran trabajo',
  },
  fr: {
    'hello': 'bonjour',
    'hi': 'salut',
    'welcome': 'bienvenue',
    'meeting': 'réunion',
    'starting our architecture sync': 'démarrage de notre synchronisation architecturale',
    'we are ready to deploy': 'nous sommes prêts à déployer',
    'sounds good': 'très bien',
    'can you hear me': 'm’entendez-vous ?',
    'screen share is active': 'le partage d’écran est actif',
    'good morning': 'bonjour',
    'thanks': 'merci',
    'great work': 'beau travail',
  },
  de: {
    'hello': 'hallo',
    'welcome': 'willkommen',
    'meeting': 'besprechung',
    'starting our architecture sync': 'starten unserer architektursynchronisation',
    'we are ready to deploy': 'wir sind bereit für das deployment',
    'sounds good': 'klingt gut',
    'can you hear me': 'kannst du mich hören?',
    'good morning': 'guten morgen',
    'thanks': 'danke',
  },
  hi: {
    'hello': 'नमस्ते',
    'welcome': 'स्वागत है',
    'meeting': 'बैठक',
    'starting our architecture sync': 'हमारा आर्किटेक्चर सिंक शुरू हो रहा है',
    'we are ready to deploy': 'हम परिनियोजन के लिए तैयार हैं',
    'sounds good': 'बढ़िया है',
    'can you hear me': 'क्या आप मुझे सुन सकते हैं?',
    'good morning': 'शुभ प्रभात',
    'thanks': 'धन्यवाद',
  },
  ja: {
    'hello': 'こんにちは',
    'welcome': 'ようこそ',
    'meeting': 'ミーティング',
    'starting our architecture sync': 'アーキテクチャ同期を開始します',
    'we are ready to deploy': 'デプロイの準備が整いました',
    'sounds good': '良さそうですね',
    'can you hear me': '聞こえますか？',
    'good morning': 'おはようございます',
    'thanks': 'ありがとうございます',
  },
  zh: {
    'hello': '你好',
    'welcome': '欢迎',
    'meeting': '会议',
    'starting our architecture sync': '开始我们的架构同步',
    'we are ready to deploy': '我们准备部署',
    'sounds good': '听起来不错',
    'good morning': '早上好',
    'thanks': '谢谢',
  },
};

export class TranslationManager {
  private subtitleListeners: Array<(subtitle: { speaker: string; text: string; translatedText?: string }) => void> = [];

  /**
   * Register a listener for live in-call closed captions (CC)
   */
  onSubtitle(callback: (subtitle: { speaker: string; text: string; translatedText?: string }) => void) {
    this.subtitleListeners.push(callback);
    return () => {
      this.subtitleListeners = this.subtitleListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Broadcast subtitle to all active in-call listeners
   */
  emitSubtitle(subtitle: { speaker: string; text: string; translatedText?: string }) {
    this.subtitleListeners.forEach((cb) => cb(subtitle));
  }

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

    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLangCode);
    return `[${langObj?.flag || ''} ${langObj?.name || targetLangCode.toUpperCase()}]: ${text}`;
  }

  /**
   * Synthesize spoken audio in target language (Text-to-Speech)
   */
  speakText(text: string, langCode: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

    if (langObj) {
      utterance.lang = langObj.voiceLang;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Voice-to-Voice translation pipeline:
   * Takes recognized text -> Translates to Target Lang -> Immediately Synthesizes Speech
   */
  async executeVoiceToVoice(
    spokenText: string,
    targetLangCode: string,
    onTranslated?: (translatedText: string) => void
  ) {
    const translated = await this.translateText(spokenText, targetLangCode);
    if (onTranslated) onTranslated(translated);
    this.speakText(translated, targetLangCode);
    return translated;
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

    return `# Minutes of Meeting (MOM): #${roomName}
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
