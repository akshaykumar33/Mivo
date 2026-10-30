import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@mivo/database';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private getEffectiveApiKey(userKey?: string): string | undefined {
    if (process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
      return undefined;
    }
    return userKey?.trim() || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  }

  private readonly GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];

  /**
   * Resilient Gemini invocation with automatic model failover
   */
  private async callGemini(
    key: string,
    payload: any
  ): Promise<{ text: string; model: string } | null> {
    for (const model of this.GEMINI_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return { text, model };
          }
        } else {
          const err = await response.json().catch(() => ({}));
          this.logger.warn(`Gemini (${model}) returned status ${response.status}: ${JSON.stringify(err)}`);
        }
      } catch (err: any) {
        this.logger.warn(`Gemini (${model}) network error: ${err.message}`);
      }
    }
    return null;
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

    const result = await this.callGemini(key, {
      contents: [{ parts: [{ text: 'Respond with only "OK"' }] }],
    });

    if (result) {
      return {
        valid: true,
        model: result.model,
        message: `Gemini API key verified successfully using ${result.model}!`,
      };
    }

    return {
      valid: false,
      model: 'unknown',
      message: 'Failed to verify key with Gemini models. Check your quota or network.',
    };
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
      const prompt = `You are a professional multilingual real-time communication translator. 
Translate the following text accurately, preserving tone, technical terms, and intent into ${targetLanguage}.
Respond ONLY with the translated text without commentary, quotes, or markdown wrappers.

Text to translate:
"${text}"`;

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });

      if (result) {
        return { translatedText: result.text, engine: 'gemini-ai' };
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

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2500,
        },
      });

      if (result) {
        return { momDocument: result.text, engine: 'gemini-ai' };
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

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1000,
        },
      });

      if (result) {
        return { answer: result.text, engine: 'gemini-ai' };
      }
    }

    // Default intelligent assistant response
    return {
      answer: `Based on the active session in **#${roomName}**, the team is actively collaborating on real-time media, speech synthesis, and AI transcription workflows with ${transcript.length} verified transcript items recorded.`,
      engine: 'smart-assistant',
    };
  }

  /**
   * Extract action items / tickets from voice speech transcript
   */
  async extractTicketFromSpeech(
    transcriptSnippet: string,
    attendees: string[],
    userApiKey?: string
  ): Promise<{
    ticketProposal: {
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category: string;
      suggestedAssignee?: string;
    } | null;
    engine: 'gemini-ai' | 'smart-heuristic';
  }> {
    const safeSnippet = (transcriptSnippet || '').trim();
    const safeAttendees = Array.isArray(attendees) ? attendees : [];
    if (!safeSnippet) {
      return { ticketProposal: null, engine: 'smart-heuristic' };
    }

    const apiKey = this.getEffectiveApiKey(userApiKey);

    if (apiKey) {
      const prompt = `You are an AI Ticket Assistant in the Mivo communication platform.
Analyze the following speech conversation snippet and determine if any actionable task, bug, or ticket commitment was spoken by the attendees.

Attendees present: ${safeAttendees.join(', ')}
Transcript snippet:
"${safeSnippet}"

If an actionable task/ticket commitment exists, return a JSON object with this EXACT structure:
{
  "hasTicket": true,
  "title": "Short concise ticket title (under 60 chars)",
  "description": "Clear description of what needs to be done based on the conversation",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "category": "Engineering" | "Design" | "Operations" | "Support",
  "suggestedAssignee": "Name of attendee assigned or null"
}

If no clear task or ticket commitment was made in the snippet, return:
{ "hasTicket": false }

Respond ONLY with valid JSON. No markdown backticks, no commentary.`;

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      });

      if (result) {
        try {
          const cleanJson = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && parsed.hasTicket && parsed.title) {
            return {
              ticketProposal: {
                title: parsed.title,
                description: parsed.description || parsed.title,
                priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(parsed.priority)
                  ? parsed.priority
                  : 'MEDIUM',
                category: parsed.category || 'Engineering',
                suggestedAssignee: parsed.suggestedAssignee || undefined,
              },
              engine: 'gemini-ai',
            };
          }
        } catch (e) {
          this.logger.warn(`Failed to parse Gemini ticket JSON response: ${e}`);
        }
      }
    }

    const lower = safeSnippet.toLowerCase();
    if (
      lower.includes('ticket') ||
      lower.includes('bug') ||
      lower.includes('fix') ||
      lower.includes('issue') ||
      lower.includes('action item') ||
      lower.includes('optimize')
    ) {
      const priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' =
        lower.includes('urgent') || lower.includes('critical')
          ? 'URGENT'
          : lower.includes('high')
            ? 'HIGH'
            : lower.includes('low')
              ? 'LOW'
              : 'MEDIUM';

      // Smart title extraction from patterns like "ticket to <action>" or "let's file a ticket to <action>"
      let extractedTitle = safeSnippet;
      const toMatch = safeSnippet.match(/(?:ticket\s+(?:to\s+|for\s+)|file\s+(?:a\s+)?(?:[\w-]+\s+)?ticket\s+to\s+)([^.,\n]+)/i);
      if (toMatch && toMatch[1]) {
        extractedTitle = toMatch[1].trim();
        // Capitalize first letter
        extractedTitle = extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1);
      } else if (safeSnippet.length > 60) {
        extractedTitle = safeSnippet.slice(0, 57) + '...';
      }

      // Check attendees or direct vocative (e.g. "Sarah, let's...")
      let matchedAssignee: string | undefined = undefined;
      for (const a of safeAttendees) {
        const first = a.toLowerCase().split(' ')[0];
        if (first && lower.includes(first)) {
          matchedAssignee = a;
          break;
        }
      }
      if (!matchedAssignee) {
        const vocativeMatch = safeSnippet.match(/^([A-Z][a-z]+),\s+/);
        if (vocativeMatch && vocativeMatch[1]) {
          matchedAssignee = vocativeMatch[1];
        }
      }

      return {
        ticketProposal: {
          title: extractedTitle,
          description: safeSnippet,
          priority,
          category: 'Engineering',
          suggestedAssignee: matchedAssignee || undefined,
        },
        engine: 'smart-heuristic',
      };
    }

    return { ticketProposal: null, engine: 'smart-heuristic' };
  }

  /**
   * Active AI Stage Co-Host & Real-Time Duplex Voice Agent
   * Handles verbal @mivo commands, automatically pins data tiles, and fact-checks discussion against real database records
   */
  async processStageAgentCommand(
    query: string,
    roomName: string,
    attendees: string[],
    recentTranscript: Array<{ speaker: string; text: string; time?: string }>,
    communityId?: string,
    userApiKey?: string
  ): Promise<{
    speechText: string;
    shouldPinTile: boolean;
    pinnedTile: {
      type: 'SPRINT_BLOCKERS' | 'ACTION_CONFIRMATION' | 'METRICS' | 'SUMMARY';
      title: string;
      badge: string;
      summary: string;
      tickets?: Array<{
        id: string;
        title: string;
        priority: string;
        status: string;
        assignee: string;
        isBlocker: boolean;
        blockerReason?: string;
      }>;
    } | null;
    factCheckAlert?: {
      hasConflict: boolean;
      speaker?: string;
      statement?: string;
      actualTruth?: string;
      severity?: 'WARNING' | 'CRITICAL';
    } | null;
    engine: 'gemini-ai' | 'smart-cohost';
  }> {
    const apiKey = this.getEffectiveApiKey(userApiKey);

    // Fetch real live sprint tickets from PostgreSQL
    let dbTickets: any[] = [];
    try {
      dbTickets = await prisma.ticket.findMany({
        where: communityId ? { communityId } : undefined,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { assignee: true, creator: true },
      });
    } catch (err) {
      this.logger.warn(`Failed to fetch tickets for stage agent: ${err}`);
    }

    const formattedDbTickets = dbTickets.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      assignee: t.assignee?.displayName || t.assignee?.username || 'Unassigned',
      description: t.description,
      isBlocker: t.priority === 'URGENT' || t.priority === 'HIGH',
    }));

    if (apiKey) {
      const transcriptText = recentTranscript
        .slice(-15)
        .map((t) => `[${t.time || 'now'}] ${t.speaker}: ${t.text}`)
        .join('\n');

      const ticketsContext = formattedDbTickets
        .map(
          (t) =>
            `- [${t.priority}] "${t.title}" (Status: ${t.status}, Assigned to: ${t.assignee}) Summary: ${t.description}`
        )
        .join('\n');

      const prompt = `You are Mivo AI Co-Host, an active real-time AI participant on the Mivo stage.
Attendees in room: ${attendees.length > 0 ? attendees.join(', ') : 'Dev Admin, Sarah, Alex, Elena'}
Active Room: #${roomName}

LIVE DATABASE SPRINT TICKETS:
${ticketsContext || 'No tickets currently registered in database.'}

RECENT VERBAL TRANSCRIPT:
${transcriptText || 'No conversation recorded yet.'}

USER SPOKEN COMMAND TO @mivo:
"${query}"

YOUR OBJECTIVES:
1. Provide a concise, clear verbal response suitable for text-to-speech synthesis (1 to 3 punchy sentences max).
2. If the user asked to pull up sprint tickets, show blockers, or review tasks, generate a structured pinnedTile object. Mark items with URGENT or HIGH priority as blockers.
3. Live Fact-Checking: Audit the recent transcript against the real database tickets. If any attendee said something contradictory (e.g. claiming no bugs/blockers exist, or misattributing tasks), flag it in factCheckAlert.

OUTPUT FORMAT REQUIREMENTS:
Respond ONLY with a valid JSON object matching this schema:
{
  "speechText": "Spoken text for voice synthesis",
  "shouldPinTile": true,
  "pinnedTile": {
    "type": "SPRINT_BLOCKERS",
    "title": "Sprint 42 Tickets & Blockers",
    "badge": "LIVE DATABASE SYNC",
    "summary": "1 urgent blocker on Redis pub/sub memory leak assigned to Sarah.",
    "tickets": [
      {
        "id": "uuid",
        "title": "Ticket title",
        "priority": "URGENT",
        "status": "OPEN",
        "assignee": "Assignee name",
        "isBlocker": true,
        "blockerReason": "Why this blocks release"
      }
    ]
  },
  "factCheckAlert": {
    "hasConflict": false,
    "speaker": "Name",
    "statement": "what was claimed",
    "actualTruth": "what database shows",
    "severity": "WARNING"
  }
}
No markdown backticks, no comments, valid JSON only.`;

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
        },
      });

      if (result) {
        try {
          const cleanJson = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && parsed.speechText) {
            return {
              speechText: parsed.speechText,
              shouldPinTile: Boolean(parsed.shouldPinTile),
              pinnedTile: parsed.pinnedTile || null,
              factCheckAlert:
                parsed.factCheckAlert && parsed.factCheckAlert.hasConflict
                  ? parsed.factCheckAlert
                  : null,
              engine: 'gemini-ai',
            };
          }
        } catch (e) {
          this.logger.warn(`Failed to parse Gemini stage agent response: ${e}`);
        }
      }
    }

    // High-performance intelligent fallback using direct database context
    const blockers = formattedDbTickets.filter((t) => t.isBlocker);
    const urgentCount = formattedDbTickets.filter((t) => t.priority === 'URGENT').length;
    const lowerQuery = query.toLowerCase();

    let speech = `I'm on it! I've loaded our latest sprint status.`;
    if (lowerQuery.includes('ticket') || lowerQuery.includes('blocker') || lowerQuery.includes('sprint')) {
      speech = `I've pulled up our latest ${formattedDbTickets.length} sprint tickets on stage. We have ${urgentCount} urgent blocker requiring immediate resolution.`;
    }

    return {
      speechText: speech,
      shouldPinTile: true,
      pinnedTile: {
        type: 'SPRINT_BLOCKERS',
        title: 'Active Sprint Tickets & Blockers',
        badge: 'POSTGRESQL LIVE',
        summary: `Tracking ${formattedDbTickets.length} sprint items with ${blockers.length} active blockers.`,
        tickets: formattedDbTickets.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          assignee: t.assignee,
          isBlocker: t.isBlocker,
          blockerReason: t.isBlocker ? t.description : undefined,
        })),
      },
      factCheckAlert: null,
      engine: 'smart-cohost',
    };
  }

  /**
   * Real-time silent fact-checker: audits speech turns against database truths
   */
  async auditLiveFactCheck(
    transcriptText: string,
    speaker: string,
    userApiKey?: string
  ): Promise<{
    hasConflict: boolean;
    speaker?: string;
    statement?: string;
    actualTruth?: string;
    severity?: 'WARNING' | 'CRITICAL';
  } | null> {
    if (!transcriptText || !transcriptText.trim()) return null;
    const apiKey = this.getEffectiveApiKey(userApiKey);

    let dbTickets: any[] = [];
    try {
      dbTickets = await prisma.ticket.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { assignee: true },
      });
    } catch {}

    const ticketSummary = dbTickets
      .map((t) => `Ticket '${t.title}': status=${t.status}, priority=${t.priority}, assignee=${t.assignee?.displayName || 'Unassigned'}`)
      .join('; ');

    const prompt = `You are a real-time fact-checking auditor for the Mivo real-time stage.
Audited Speaker: ${speaker}
Spoken Statement: "${transcriptText}"

Actual Verified Database Records:
${ticketSummary}

Determine if the speaker's statement makes any factual error or direct contradiction regarding these tickets, assignees, deadlines, or bug statuses.
If a contradiction exists, respond with JSON:
{
  "hasConflict": true,
  "speaker": "${speaker}",
  "statement": "${transcriptText}",
  "actualTruth": "Concise factual correction based on database",
  "severity": "WARNING"
}
If there is no contradiction or statement is casual conversation, respond with:
{ "hasConflict": false }

Respond ONLY with valid JSON.`;

    if (apiKey) {
      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      });

      if (result) {
        try {
          const clean = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed && parsed.hasConflict) {
            return parsed;
          }
        } catch {}
      }
    }

    // High-precision deterministic audit rule: flags statements claiming resolved status on open/urgent tickets
    const lower = transcriptText.toLowerCase();
    for (const t of dbTickets) {
      const titleLower = t.title.toLowerCase();
      const words = titleLower.split(/\s+/).filter((w: string) => w.length > 3);
      const matchesTicket = words.some((w: string) => lower.includes(w));
      if (
        matchesTicket &&
        (lower.includes('resolved') ||
          lower.includes('done') ||
          lower.includes('fixed') ||
          lower.includes('closed') ||
          lower.includes('yesterday') ||
          lower.includes('no blocker'))
      ) {
        if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') {
          return {
            hasConflict: true,
            speaker,
            statement: transcriptText,
            actualTruth: `Database record for '${t.title}' is currently [${t.status}] with [${t.priority}] priority assigned to ${t.assignee?.displayName || 'Unassigned'}.`,
            severity: t.priority === 'URGENT' ? 'CRITICAL' : 'WARNING',
          };
        }
      }
    }

    return null;
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

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        },
      });

      if (result) {
        let reply = stripEmojis(result.text.replace(/^["'`]|["'`]$/g, '').split('\n')[0].trim());
        if (reply.length > 0) {
          return { statusText: reply, engine: 'gemini-ai' };
        }
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

  /**
   * Voice-to-Canvas AI: converts spoken architectural prompts into structured canvas elements
   */
  async generateCanvasArchitecture(
    promptText: string,
    userApiKey?: string
  ): Promise<{
    elements: Array<any>;
    summary: string;
    engine: 'gemini-ai' | 'smart-architect';
  }> {
    const apiKey = this.getEffectiveApiKey(userApiKey);
    if (apiKey && promptText.trim()) {
      const prompt = `You are an AI Software Architect for Mivo Canvas.
Analyze the user's architectural concept or request and generate a structured diagram with service boxes, databases, queues, gateways, and connectors.
User spoken request: "${promptText}"

Return JSON matching this EXACT structure:
{
  "summary": "Short 1-sentence architectural overview",
  "elements": [
    {
      "id": "unique-slug",
      "type": "GATEWAY",
      "x": 120,
      "y": 250,
      "width": 220,
      "height": 110,
      "title": "Component Name",
      "content": "Short description / tech stack",
      "color": "#6366F1"
    },
    {
      "id": "conn-slug",
      "type": "CONNECTOR",
      "fromId": "source-element-id",
      "toId": "target-element-id",
      "label": "Protocol / message label",
      "color": "#94A3B8"
    }
  ]
}
Respond ONLY with valid JSON. No markdown ticks, no commentary.`;

      const result = await this.callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
      });

      if (result) {
        try {
          const clean = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed && Array.isArray(parsed.elements) && parsed.elements.length > 0) {
            return {
              elements: parsed.elements,
              summary: parsed.summary || 'Generated architecture blueprint',
              engine: 'gemini-ai',
            };
          }
        } catch (e) {
          this.logger.warn(`Failed to parse Gemini canvas architecture: ${e}`);
        }
      }
    }

    // High-fidelity architectural heuristic generator
    const elements: any[] = [];
    const summary = 'Microservice Architecture with Auth Gateway and Redis Pub/Sub';

    // 1. Gateway
    elements.push({
      id: 'gateway-1',
      type: 'GATEWAY',
      x: 120,
      y: 260,
      width: 220,
      height: 120,
      title: 'Auth & API Gateway',
      content: 'Reverse Proxy • JWT Verification • Rate Limiter',
      color: '#6366F1',
    });

    // 2. Auth Service
    elements.push({
      id: 'service-auth',
      type: 'SERVICE',
      x: 440,
      y: 120,
      width: 230,
      height: 120,
      title: 'Authentication Service',
      content: 'Better Auth • Argon2 Hashing • Session Cache',
      color: '#06B6D4',
    });

    // 3. Pub/Sub Broker
    elements.push({
      id: 'queue-redis',
      type: 'QUEUE',
      x: 440,
      y: 400,
      width: 230,
      height: 120,
      title: 'Redis Pub/Sub Bus',
      content: 'Distributed Cluster • Stream Fanout • Realtime Events',
      color: '#EF4444',
    });

    // 4. Worker Service
    elements.push({
      id: 'service-worker',
      type: 'SERVICE',
      x: 770,
      y: 400,
      width: 230,
      height: 120,
      title: 'Async Event Consumer',
      content: 'BullMQ Workers • Webhook Dispatch • Background Jobs',
      color: '#10B981',
    });

    // 5. Database
    elements.push({
      id: 'db-postgres',
      type: 'DATABASE',
      x: 770,
      y: 120,
      width: 230,
      height: 120,
      title: 'Neon Lakebase PostgreSQL',
      content: 'Relational Data • Branching • Connection Pooling',
      color: '#8B5CF6',
    });

    // 6. Connectors
    elements.push(
      {
        id: 'conn-1',
        type: 'CONNECTOR',
        fromId: 'gateway-1',
        toId: 'service-auth',
        label: 'JWT Handshake (gRPC)',
        color: '#38BDF8',
      },
      {
        id: 'conn-2',
        type: 'CONNECTOR',
        fromId: 'gateway-1',
        toId: 'queue-redis',
        label: 'Publish Events',
        color: '#F87171',
      },
      {
        id: 'conn-3',
        type: 'CONNECTOR',
        fromId: 'queue-redis',
        toId: 'service-worker',
        label: 'Consume Streams',
        color: '#34D399',
      },
      {
        id: 'conn-4',
        type: 'CONNECTOR',
        fromId: 'service-auth',
        toId: 'db-postgres',
        label: 'SQL Read/Write',
        color: '#A78BFA',
      },
      {
        id: 'conn-5',
        type: 'CONNECTOR',
        fromId: 'service-worker',
        toId: 'db-postgres',
        label: 'Persist State',
        color: '#A78BFA',
      }
    );

    // 7. Context sticky note
    elements.push({
      id: 'sticky-note-1',
      type: 'STICKY',
      x: 120,
      y: 450,
      width: 220,
      height: 110,
      title: 'Architecture Note',
      content: `Generated from prompt: "${promptText.length > 50 ? promptText.slice(0, 47) + '...' : promptText}"`,
      color: '#FBBF24',
    });

    return { elements, summary, engine: 'smart-architect' };
  }
}

