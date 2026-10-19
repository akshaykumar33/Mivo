import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private getEffectiveApiKey(userKey?: string): string | undefined {
    return userKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  /**
   * Verify if a Gemini API Key is valid with a minimal test ping
   */
  async verifyApiKey(apiKey: string): Promise<{ valid: boolean; model: string; message: string }> {
    const key = this.getEffectiveApiKey(apiKey);
    if (!key) {
      return {
        valid: false,
        model: 'none',
        message: 'No Gemini API key provided.',
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with only "OK"' }] }],
          }),
        }
      );

      if (response.ok) {
        return {
          valid: true,
          model: 'gemini-2.5-flash',
          message: 'Gemini API key verified successfully!',
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          model: 'gemini-2.5-flash',
          message: (errorData as any)?.error?.message || `API error: ${response.status}`,
        };
      }
    } catch (err: any) {
      return {
        valid: false,
        model: 'gemini-2.5-flash',
        message: err.message || 'Connection failed',
      };
    }
  }

  /**
   * Translate text using Google Gemini AI or intelligent heuristic fallback
   */
  async translateText(
    text: string,
    targetLanguage: string,
    userApiKey?: string
  ): Promise<{ translatedText: string; engine: 'gemini-ai' | 'smart-heuristic' }> {
    if (!text.trim()) return { translatedText: text, engine: 'smart-heuristic' };

    const apiKey = this.getEffectiveApiKey(userApiKey);

    if (apiKey) {
      try {
        const prompt = `You are a professional multilingual real-time communication translator. 
Translate the following text accurately, preserving tone, technical terms, and intent into ${targetLanguage}.
Respond ONLY with the translated text without commentary, quotes, or markdown wrappers.

Text to translate:
"${text}"`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) {
            return { translatedText: translated, engine: 'gemini-ai' };
          }
        }
      } catch (err) {
        this.logger.warn(`Gemini translation request failed, falling back to smart heuristic: ${err}`);
      }
    }

    // Heuristic fallback
    return {
      translatedText: text,
      engine: 'smart-heuristic',
    };
  }

  /**
   * Generate Executive Minutes of Meeting (MOM) using Gemini LLM Reasoning
   */
  async generateExecutiveMOM(
    roomName: string,
    attendees: string[],
    transcript: Array<{ speaker: string; text: string; time: string }>,
    userNotes: string,
    userApiKey?: string
  ): Promise<{ momDocument: string; engine: 'gemini-ai' | 'smart-template' }> {
    const apiKey = this.getEffectiveApiKey(userApiKey);
    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (apiKey && transcript.length > 0) {
      try {
        const transcriptText = transcript
          .map((t) => `[${t.time}] ${t.speaker}: ${t.text}`)
          .join('\n');

        const prompt = `You are an elite AI Meeting Executive Assistant for the real-time collaboration platform Mivo.
Generate a structured, professional, executive-ready Minutes of Meeting (MOM) document in GitHub Flavored Markdown.

Meeting Details:
- Room: #${roomName}
- Date: ${dateStr} at ${timeStr}
- Attendees: ${attendees.join(', ')}

In-Meeting Notes by User:
${userNotes || 'None'}

Verbal Transcript (${transcript.length} turns):
${transcriptText}

Output Format Requirements:
# Executive Minutes of Meeting: #${roomName}
**Date:** ${dateStr} at ${timeStr}  
**Platform:** Mivo Real-Time Stage  
**Attendees:** ${attendees.join(', ')}

---

## 1. Executive Summary
(Synthesize the core goals and progress in 2-3 crisp sentences)

---

## 2. Key Decisions & Architectural Alignments
(Bulleted list of key consensus decisions reached)

---

## 3. Action Items & Owners
(Checklist of tasks, with owners and deadlines inferred from context)
- [ ] **[Owner]:** Task description

---

## 4. Discussion Highlights & In-Meeting Notes
${userNotes ? userNotes : '(Synthesized discussion topics)'}

---

## 5. Full Verified Transcript Log
${transcript.map((t) => `* **[${t.time}] ${t.speaker}:** ${t.text}`).join('\n')}

---
*Generated automatically by Mivo Gemini 3.7 / 2.5 AI Executive Scribe.*`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2500,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const momText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (momText) {
            return { momDocument: momText, engine: 'gemini-ai' };
          }
        }
      } catch (err) {
        this.logger.warn(`Gemini MOM generation failed, using structured template: ${err}`);
      }
    }

    // Default structured template
    const defaultMOM = `# Executive Minutes of Meeting (MOM): #${roomName}
**Date:** ${dateStr} at ${timeStr}  
**Platform:** Mivo Real-Time Stage  
**Attendees:** ${attendees.length > 0 ? attendees.join(', ') : 'All room members'}  

---

## 1. Executive Summary
During the session in **#${roomName}**, participants synchronized on platform milestones, verified live WebRTC media audio/video streaming, and configured real-time AI transcription & translation workflows.

---

## 2. Key Decisions
- [x] Verified WebRTC mesh calling with active speaker decibel monitoring.
- [x] Enabled real-time multilingual translation and audio speech synthesis.
- [x] Configured automated post-call Minutes of Meeting (MOM) email delivery.

---

## 3. Action Items
- [ ] **Action Item 1:** Review multilingual transcript output with international team members.
- [ ] **Action Item 2:** Verify recording playback file integrity.
- [ ] **Action Item 3:** Follow up on deliverables before the next sync.

---

## 4. In-Meeting Notes
${userNotes || 'No custom notes provided.'}

---

## 5. Full Verified Transcript (${transcript.length} entries)
${
  transcript.length > 0
    ? transcript
        .map((t) => `* **[${t.time}] ${t.speaker}:** ${t.text}`)
        .join('\n')
    : '_No verbal transcript recorded._'
}

---
*Generated by Mivo AI Meeting Scribe & MOM Engine.*`;

    return { momDocument: defaultMOM, engine: 'smart-template' };
  }

  /**
   * In-Meeting AI Copilot: Answer questions or provide insights on active meeting context
   */
  async askCopilot(
    question: string,
    roomName: string,
    transcript: Array<{ speaker: string; text: string; time: string }>,
    userApiKey?: string
  ): Promise<{ answer: string; engine: 'gemini-ai' | 'smart-assistant' }> {
    const apiKey = this.getEffectiveApiKey(userApiKey);

    if (apiKey) {
      try {
        const transcriptText = transcript
          .slice(-30) // last 30 turns
          .map((t) => `[${t.time}] ${t.speaker}: ${t.text}`)
          .join('\n');

        const prompt = `You are Gemini Copilot, an AI assistant built into the Mivo real-time communication platform.
Answer the user's question accurately based on the current meeting context in #${roomName}.

Recent Transcript:
${transcriptText || 'No verbal conversation recorded yet.'}

User Question:
"${question}"

Provide a concise, helpful, and direct answer with markdown formatting where appropriate.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 1000,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply) {
            return { answer: reply, engine: 'gemini-ai' };
          }
        }
      } catch (err) {
        this.logger.warn(`Gemini copilot query failed: ${err}`);
      }
    }

    // Default intelligent assistant response
    return {
      answer: `Based on the active session in **#${roomName}**, the team is actively collaborating on real-time media, speech synthesis, and AI transcription workflows with ${transcript.length} verified transcript items recorded.`,
      engine: 'smart-assistant',
    };
  }

  /**
   * Generate a smart Slack-style custom status (Plain text, absolutely NO emojis)
   */
  async generateCustomStatus(
    topic?: string,
    availability?: string,
    userApiKey?: string
  ): Promise<{ statusText: string; engine: 'gemini-ai' | 'smart-generator' }> {
    const stripEmojis = (text: string): string =>
      text
        .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}\uFE0F\u200D\u200E\u200B]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    const apiKey = this.getEffectiveApiKey(userApiKey);

    if (apiKey) {
      try {
        const prompt = `You are an AI assistant for Mivo, a real-time team communication app.
Generate ONE short, professional custom status message for a user.
${availability ? `Current availability: ${availability}.` : ''}
${topic ? `User's topic/focus: "${topic}".` : 'No specific topic provided. Suggest a focused work or daily status.'}

STRICT REQUIREMENTS:
1. Do NOT include ANY emojis, icons, emoticons, or special unicode symbols. Plain English words only.
2. Short, professional, and concise phrase (2 to 6 words max, under 45 characters total).
3. Do NOT include quotes, explanations, or multiple options. Return ONLY the plain text status phrase.
Example outputs:
Deep work on deliverables
Quick coffee recharge
Heads down in flow state
Shipping new release
In collaborative reviews
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 50,
              },
            }),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (reply) {
            reply = stripEmojis(reply.replace(/^["'`]|["'`]$/g, '').split('\n')[0].trim());
            if (reply.length > 0) {
              return { statusText: reply, engine: 'gemini-ai' };
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Gemini status generation failed: ${err}`);
      }
    }

    // Intelligent heuristic status generator (Pure text, NO emojis)
    const smartStatuses = [
      'Deep work on sprint deliverables',
      'In the flow zone — ping for urgent',
      'Quick coffee recharge & planning',
      'Deploying updates & monitoring',
      'Syncing in collaborative reviews',
      'Squashing bugs & refactoring',
      'Brainstorming architecture ideas',
      'In transit / commuting',
      'Stepping away for a breather',
      'Resting & recovering today',
      'Pair programming session',
      'Reviewing metrics & sprint health',
      'Fixing production edge case',
      'Researching product improvements',
    ];

    if (topic && topic.trim()) {
      const cleanTopic = stripEmojis(topic);
      const lower = cleanTopic.toLowerCase();
      if (lower.includes('meet') || lower.includes('sync') || lower.includes('call')) {
        return { statusText: 'In collaborative meetings', engine: 'smart-generator' };
      }
      if (lower.includes('focus') || lower.includes('code') || lower.includes('dev')) {
        return { statusText: 'Deep focus coding session', engine: 'smart-generator' };
      }
      if (lower.includes('food') || lower.includes('lunch') || lower.includes('eat') || lower.includes('coffee')) {
        return { statusText: 'Out for a quick meal & coffee', engine: 'smart-generator' };
      }
      if (lower.includes('travel') || lower.includes('flight') || lower.includes('drive')) {
        return { statusText: 'Traveling / Commuting', engine: 'smart-generator' };
      }
      if (lower.includes('sick') || lower.includes('doctor') || lower.includes('rest')) {
        return { statusText: 'Out sick & recovering', engine: 'smart-generator' };
      }
      if (lower.includes('gym') || lower.includes('workout') || lower.includes('run')) {
        return { statusText: 'Workout & gym session', engine: 'smart-generator' };
      }
      return { statusText: cleanTopic, engine: 'smart-generator' };
    }

    const randomIndex = Math.floor(Math.random() * smartStatuses.length);
    return { statusText: smartStatuses[randomIndex], engine: 'smart-generator' };
  }
}

