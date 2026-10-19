'use client';

import * as React from 'react';
import {
  ExternalMeetingProvider,
  ExternalMeetingDTO,
  ExternalMeetingBridgeDTO,
  ExternalMeetingConfigDTO,
} from '@mivo/shared';
import { GoogleMeetIcon, MicrosoftTeamsIcon } from './ExternalMeetingIcons';
import {
  X,
  Sparkles,
  Link as LinkIcon,
  Radio,
  Settings2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api-client';

export interface ExternalMeetingHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  roomName?: string;
  conversationId?: string;
  conversationName?: string;
  activeBridge?: ExternalMeetingBridgeDTO | null;
  onBridgeUpdated?: () => void;
}

const QUICK_TOPICS = [
  'Weekly Engineering Sync',
  'Architecture & Code Review',
  'Design & UX Alignment',
  'Product Sprint Planning',
  'Incident Triage & Post-Mortem',
];

export const ExternalMeetingHubModal: React.FC<ExternalMeetingHubModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  conversationId,
  conversationName,
  activeBridge,
  onBridgeUpdated,
}) => {
  const [activeTab, setActiveTab] = React.useState<'instant' | 'active' | 'settings'>('instant');
  const [provider, setProvider] = React.useState<ExternalMeetingProvider>('GOOGLE_MEET');
  const [title, setTitle] = React.useState('');
  const [shareToChat, setShareToChat] = React.useState(true);
  const [bridgeToRoom, setBridgeToRoom] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedMeeting, setGeneratedMeeting] = React.useState<ExternalMeetingDTO | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [config, setConfig] = React.useState<ExternalMeetingConfigDTO | null>(null);

  // Set default title based on room or conversation name
  React.useEffect(() => {
    if (isOpen) {
      if (conversationName) {
        setTitle(`${conversationName} Sync`);
      } else if (roomName) {
        setTitle(`${roomName} Sync`);
      } else {
        setTitle('Unified Team Standup');
      }
      setGeneratedMeeting(null);
      setCopied(false);

      // Fetch integration config
      api.get<ExternalMeetingConfigDTO>('/api/v1/meetings/config').then((res) => {
        if (res.success && res.data) {
          setConfig(res.data);
        }
      });
    }
  }, [isOpen, roomName, conversationName]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!title.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const res = await api.post<{ meeting: ExternalMeetingDTO; bridge?: ExternalMeetingBridgeDTO }>(
        '/api/v1/meetings/generate',
        {
          provider,
          title: title.trim(),
          roomId,
          conversationId,
          shareToChat,
          bridgeToRoom: !!roomId && bridgeToRoom,
          bridgeToConversation: !!conversationId && bridgeToRoom,
        }
      );

      if (res.success && res.data) {
        setGeneratedMeeting(res.data.meeting);
        if (onBridgeUpdated) {
          onBridgeUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to generate external meeting:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveBridge = async () => {
    const targetUrl = roomId
      ? `/api/v1/meetings/room/${roomId}/bridge`
      : conversationId
      ? `/api/v1/meetings/conversation/${conversationId}/bridge`
      : null;

    if (!targetUrl) return;
    try {
      await api.delete(targetUrl);
      if (onBridgeUpdated) {
        onBridgeUpdated();
      }
    } catch (err) {
      console.error('Failed to disconnect bridge:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 sm:gap-4 bg-[var(--bg-surface-1)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#DC2626] to-[#EF4444] p-2 flex items-center justify-center shadow-md shadow-red-600/30 flex-shrink-0 text-white">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#111827] tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2 font-display">
                <span>Meeting Hub</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 border border-red-500/25">
                  Google & Teams
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#71717A] truncate sm:whitespace-normal">
                Generate instant meetings or bridge cross-platform calls.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-[#71717A] hover:text-[#111827] hover:bg-black/[0.05] transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[var(--border-subtle)] px-3 sm:px-6 bg-[var(--bg-surface-0)] text-xs font-semibold overflow-x-auto scrollbar-none no-scrollbar">
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-2.5 sm:py-3 px-2.5 sm:px-3 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer flex-shrink-0 ${
              activeTab === 'instant'
                ? 'border-[#DC2626] text-red-600 font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#111827]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span>Instant Launcher</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'active'
                ? 'border-[#DC2626] text-red-600 font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#111827]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Bridge</span>
            {activeBridge && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#DC2626] text-red-600 font-bold'
                : 'border-transparent text-[#71717A] hover:text-[#111827]'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-[#71717A]" />
            <span>Enterprise Settings</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-[var(--bg-canvas)]">
          {activeTab === 'instant' && (
            <>
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2.5">
                  1. Select Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Meet Option */}
                  <div
                    onClick={() => setProvider('GOOGLE_MEET')}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                      provider === 'GOOGLE_MEET'
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30'
                        : 'bg-[var(--bg-surface-0)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-1)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center p-2 flex-shrink-0 shadow-xs">
                      <GoogleMeetIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#111827]">Google Meet</div>
                      <div className="text-[11px] text-emerald-700 font-medium">meet.google.com</div>
                    </div>
                  </div>

                  {/* MS Teams Option */}
                  <div
                    onClick={() => setProvider('MS_TEAMS')}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                      provider === 'MS_TEAMS'
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                        : 'bg-[var(--bg-surface-0)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-1)]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center p-2 flex-shrink-0 shadow-xs">
                      <MicrosoftTeamsIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#111827]">Microsoft Teams</div>
                      <div className="text-[11px] text-indigo-700 font-medium">teams.microsoft.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
                  2. Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sprint Sync with Engineering"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] text-sm text-[#111827] placeholder:[var(--text-muted)] focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all font-medium shadow-xs"
                />

                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setTitle(topic)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-surface-0)] hover:bg-[var(--bg-surface-2)] text-[#71717A] hover:text-[#111827] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Checkboxes */}
              {(roomId || conversationId) && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-surface-1)] transition-colors shadow-xs">
                    <input
                      type="checkbox"
                      checked={shareToChat}
                      onChange={(e) => setShareToChat(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#111827]">
                        {roomId ? 'Post invitation card to Room Chat' : 'Post invitation card to Group Chat'}
                      </span>
                      <p className="text-[11px] text-[#71717A]">
                        Automatically broadcasts an interactive join card into the conversation for all members.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-surface-1)] transition-colors shadow-xs">
                    <input
                      type="checkbox"
                      checked={bridgeToRoom}
                      onChange={(e) => setBridgeToRoom(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#111827]">
                        {roomId ? 'Bridge directly to Room Stage banner' : 'Bridge directly to Group Header banner'}
                      </span>
                      <p className="text-[11px] text-[#71717A]">
                        Pins this external call to the top banner so everyone in the group can join with 1 click.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {/* Generate Action Button */}
              {!generatedMeeting && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!title.trim() || isGenerating}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#DC2626] disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-red-600/30 border border-red-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {isGenerating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Generate & Launch {provider === 'GOOGLE_MEET' ? 'Google Meet' : 'MS Teams'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              )}

              {/* Generated Meeting Success Box */}
              {generatedMeeting && (
                <div className="p-4 rounded-2xl bg-[var(--bg-surface-0)] border border-emerald-500/40 space-y-3 animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                        Session Ready!
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#71717A] bg-black/[0.04] px-2 py-0.5 rounded-md font-semibold">
                      {generatedMeeting.meetingCode}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] text-xs font-mono text-[#111827] break-all select-all font-semibold">
                    {generatedMeeting.meetingUrl}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={generatedMeeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <span>Open Meeting in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(generatedMeeting.meetingUrl)}
                      className="px-4 h-10 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[#111827] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'active' && (
            <div className="space-y-4">
              {activeBridge ? (
                <div className="p-5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-1)] border border-[var(--border-subtle)] p-2 flex items-center justify-center">
                        {activeBridge.meeting.provider === 'GOOGLE_MEET' ? (
                          <GoogleMeetIcon className="w-6 h-6" />
                        ) : (
                          <MicrosoftTeamsIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#111827]">{activeBridge.meeting.title}</div>
                        <div className="text-xs text-[#71717A]">
                          {activeBridge.meeting.provider === 'GOOGLE_MEET' ? 'Google Meet' : 'Microsoft Teams'} • Code:{' '}
                          <span className="font-mono text-[#111827] font-bold">{activeBridge.meeting.meetingCode}</span>
                        </div>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>Live Stage Bridge</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <a
                      href={activeBridge.meeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <span>Join External Call</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(activeBridge.meeting.meetingUrl)}
                      className="px-3 h-9 rounded-xl bg-[var(--bg-surface-1)] hover:bg-[var(--bg-surface-2)] text-[#111827] border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveBridge}
                      className="px-3 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Disconnect Bridge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] flex items-center justify-center mb-3 text-[#71717A] shadow-xs">
                    <Radio className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="text-sm font-bold text-[#111827] mb-1 font-display">No Active Meeting Bridge</h4>
                  <p className="text-xs text-[#71717A] max-w-xs mb-4">
                    Bridge a Google Meet or Microsoft Teams session to this room to display a persistent banner and allow 1-click cross-platform entry.
                  </p>
                  <button
                    onClick={() => setActiveTab('instant')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white text-xs font-bold hover:shadow-md transition-all cursor-pointer"
                  >
                    Launch a Meeting Now
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-bold text-[#111827]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Hybrid Mode Architecture</span>
                </div>
                <p className="text-xs text-[#71717A] leading-relaxed">
                  Mivo operates in <strong>Hybrid Instant Mode</strong> out-of-the-box. Instant Google Meet and Microsoft Teams join URLs are generated immediately with zero cloud account friction.
                </p>
              </div>

              {/* Status items */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <GoogleMeetIcon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-bold text-[#111827]">Google Meet & Calendar</div>
                      <div className="text-[11px] text-[#71717A]">
                        Status: <span className="text-emerald-700 font-semibold">Hybrid Instant Active</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A] bg-black/[0.04] px-2 py-0.5 rounded-lg font-semibold">
                    {config?.google.mode || 'HYBRID_INSTANT'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <MicrosoftTeamsIcon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-bold text-[#111827]">Microsoft Teams & Graph</div>
                      <div className="text-[11px] text-[#71717A]">
                        Status: <span className="text-indigo-700 font-semibold">Hybrid Instant Active</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717A] bg-black/[0.04] px-2 py-0.5 rounded-lg font-semibold">
                    {config?.teams.mode || 'HYBRID_INSTANT'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-800">
                To connect corporate Google Workspace or Microsoft 365 Entra OAuth credentials, define <code>GOOGLE_CLIENT_ID</code> and <code>MS_TEAMS_CLIENT_ID</code> in your <code>.env</code> file.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
