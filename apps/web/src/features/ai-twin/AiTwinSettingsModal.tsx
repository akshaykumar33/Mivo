'use client';

import * as React from 'react';
import { Bot, Sparkles, Calendar, Clock, Check, Send, X, Shield, MessageSquare, Power } from 'lucide-react';
import { AiTwinConfigDTO } from '@mivo/shared';
import { api } from '@/lib/api-client';

export interface AiTwinSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export const AiTwinSettingsModal: React.FC<AiTwinSettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
}) => {
  const [config, setConfig] = React.useState<AiTwinConfigDTO>({
    userId,
    enabled: true,
    personaPrompt: `I am ${userName}'s AI Twin. I assist the engineering team while they are away or in deep focus mode.`,
    autoReplyDnd: true,
    autoReplyOffline: true,
    autoCallbackEnabled: true,
    callbackSlots: [
      'Tomorrow at 10:00 AM - 10:30 AM (UTC)',
      'Tomorrow at 2:00 PM - 2:30 PM (UTC)',
      'Friday at 11:00 AM - 11:30 AM (UTC)',
    ],
    indexedContextSummary: 'Indexed 48 recent chat messages, 12 pull requests, and 6 assigned sprint tickets.',
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [newSlot, setNewSlot] = React.useState('');

  // Sandbox Test Simulator
  const [testInput, setTestInput] = React.useState('');
  const [testConversation, setTestConversation] = React.useState<Array<{ sender: 'user' | 'twin'; text: string; slot?: string }>>([
    {
      sender: 'twin',
      text: `Hello! I'm ${userName}'s AI Twin. ${userName} is currently Out of Office. How can I assist you with the project?`,
    },
  ]);
  const [isSimulating, setIsSimulating] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && userId) {
      api.get<AiTwinConfigDTO>(`/api/v1/ai/twin/config/${userId}`).then((res) => {
        if (res.success && res.data) {
          setConfig(res.data);
        }
      });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.patch<AiTwinConfigDTO>(`/api/v1/ai/twin/config/${userId}`, config);
      if (res.success && res.data) {
        setConfig(res.data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testInput.trim()) return;
    const query = testInput.trim();
    setTestConversation((prev) => [...prev, { sender: 'user', text: query }]);
    setTestInput('');
    setIsSimulating(true);

    try {
      const res = await api.post<{
        replied: boolean;
        replyContent: string;
        proposedCallbackSlot?: string;
      }>('/api/v1/ai/twin/reply', {
        recipientUserId: userId,
        senderUserId: userId,
        message: query,
      });

      if (res.success && res.data) {
        const d = res.data;
        setTestConversation((prev) => [
          ...prev,
          {
            sender: 'twin',
            text: d.replyContent,
            slot: d.proposedCallbackSlot,
          },
        ]);
      }
    } catch {
      setTestConversation((prev) => [
        ...prev,
        {
          sender: 'twin',
          text: `[AI Twin Demo]: ${userName} is in deep focus. I've noted down your request and offered a sync slot for tomorrow at 10:00 AM UTC.`,
          slot: 'Tomorrow at 10:00 AM UTC',
        },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlot.trim()) return;
    setConfig((prev) => ({
      ...prev,
      callbackSlots: [...prev.callbackSlots, newSlot.trim()],
    }));
    setNewSlot('');
  };

  const handleRemoveSlot = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      callbackSlots: prev.callbackSlots.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#BF5AF2] to-[#5E5CE6] flex items-center justify-center text-white shadow-[0_0_16px_rgba(191,90,242,0.3)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] font-display flex items-center gap-2">
                AI Twin & "Out of Office" Persona
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  config.enabled ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)]'
                }`}>
                  {config.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Autonomous agent answers team inquiries and schedules callbacks when you are away
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Tabs / Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Master Enable Switch */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Power className={`w-5 h-5 ${config.enabled ? 'text-[#30D158]' : 'text-[var(--text-muted)]'}`} />
              <div>
                <span className="text-sm font-bold text-[var(--text-primary)] block">
                  Activate AI Twin Auto-Responder
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Replies when your availability status is set to DND, Away, or Offline
                </span>
              </div>
            </div>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                config.enabled ? 'bg-[#30D158]' : 'bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform absolute top-0.5 ${
                  config.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Persona Prompt & Tone Customization */}
          <div>
            <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#BF5AF2]" />
              <span>Persona Guidelines & Custom Instructions</span>
            </label>
            <textarea
              value={config.personaPrompt}
              onChange={(e) => setConfig((prev) => ({ ...prev, personaPrompt: e.target.value }))}
              rows={3}
              className="w-full p-3 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6] transition-colors resize-none"
              placeholder="Give your AI Twin instructions on how to represent you..."
            />
          </div>

          {/* Available Callback Slots */}
          <div>
            <label className="text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#64D2FF]" />
              <span>Available Callback Slots for Team Syncs</span>
            </label>
            <div className="space-y-2 mb-2">
              {config.callbackSlots.map((slot, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-mono"
                >
                  <span className="text-[var(--text-primary)]">{slot}</span>
                  <button
                    onClick={() => handleRemoveSlot(index)}
                    className="text-[#FF453A] hover:bg-[#FF453A]/10 p-1 rounded transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                placeholder="e.g. Tomorrow at 3:00 PM - 3:30 PM UTC"
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6]"
              />
              <button
                onClick={handleAddSlot}
                className="px-3 py-2 rounded-xl bg-[var(--bg-surface-2)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[#5E5CE6] hover:text-white transition-all cursor-pointer"
              >
                Add Slot
              </button>
            </div>
          </div>

          {/* Interactive Live Sandbox Simulator */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#30D158]" />
              <span>Test My AI Twin (Live Simulation)</span>
            </span>

            <div className="max-h-36 overflow-y-auto space-y-2 p-2.5 bg-[var(--bg-surface-0)] rounded-lg border border-[var(--border-subtle)] text-xs mb-3">
              {testConversation.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-2 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-[#5E5CE6] text-white'
                        : 'bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {msg.sender === 'twin' && (
                      <span className="text-[9px] font-bold text-[#BF5AF2] uppercase flex items-center gap-1 mb-0.5">
                        <Bot className="w-2.5 h-2.5" />
                        AI Twin
                      </span>
                    )}
                    <p>{msg.text}</p>
                    {msg.slot && (
                      <div className="mt-1.5 p-1 rounded bg-[#30D158]/20 border border-[#30D158]/30 text-[10px] text-[#30D158] font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Proposed Slot: {msg.slot}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSimulating && (
                <div className="text-[10px] text-[#BF5AF2] animate-pulse">
                  AI Twin is drafting response...
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                placeholder="Ask your AI Twin: e.g. 'Can we sync tomorrow on the Redis adapter?'"
                className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#5E5CE6]"
              />
              <button
                onClick={handleSendTestMessage}
                disabled={isSimulating}
                className="p-2 rounded-lg bg-[#5E5CE6] text-white hover:bg-[#5E5CE6]/90 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {config.indexedContextSummary}
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
              savedSuccess ? 'bg-[#30D158]' : 'bg-[#5E5CE6] hover:bg-[#5E5CE6]/90'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
