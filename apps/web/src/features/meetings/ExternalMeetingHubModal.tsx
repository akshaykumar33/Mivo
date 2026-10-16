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
      console.error('Failed to remove bridge:', err);
    }
  };

  const QUICK_TOPICS = [
    'Quick Sync',
    'Architecture Review',
    'Customer Walkthrough',
    'Sprint Demo',
    'Incident War Room',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#0F1220]/95 border border-white/[0.12] shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-gradient-to-r from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5E5CE6] to-[#0A84FF] p-2 flex items-center justify-center shadow-lg shadow-[#5E5CE6]/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>External Meeting Hub</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#5E5CE6]/20 text-[#64D2FF] border border-[#5E5CE6]/40">
                  Google & Teams
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Generate instant meetings, bridge calls to this stage, or sync enterprise calendars.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/[0.08] px-6 bg-black/20 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('instant')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'instant'
                ? 'border-[#5E5CE6] text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span>Instant Launcher</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'active'
                ? 'border-[#5E5CE6] text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#30D158]" />
            <span>Active Bridge</span>
            {activeBridge && (
              <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#5E5CE6] text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-white/60" />
            <span>Enterprise Settings</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'instant' && (
            <>
              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2.5">
                  1. Select Platform
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Meet Option */}
                  <div
                    onClick={() => setProvider('GOOGLE_MEET')}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                      provider === 'GOOGLE_MEET'
                        ? 'bg-gradient-to-b from-[#00AC47]/20 to-[#0B1811]/70 border-[#00AC47] shadow-[0_4px_20px_rgba(0,172,71,0.25)] ring-1 ring-[#00AC47]'
                        : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#00AC47]/20 border border-[#00AC47]/40 flex items-center justify-center p-2 flex-shrink-0">
                      <GoogleMeetIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Google Meet</div>
                      <div className="text-[11px] text-[#34D399]">meet.google.com</div>
                    </div>
                  </div>

                  {/* MS Teams Option */}
                  <div
                    onClick={() => setProvider('MS_TEAMS')}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-3 relative overflow-hidden ${
                      provider === 'MS_TEAMS'
                        ? 'bg-gradient-to-b from-[#505AC9]/25 to-[#131530]/70 border-[#505AC9] shadow-[0_4px_20px_rgba(80,90,201,0.25)] ring-1 ring-[#505AC9]'
                        : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#505AC9]/25 border border-[#505AC9]/50 flex items-center justify-center p-2 flex-shrink-0">
                      <MicrosoftTeamsIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Microsoft Teams</div>
                      <div className="text-[11px] text-[#A5B4FC]">teams.microsoft.com</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                  2. Meeting Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sprint Sync with Engineering"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#5E5CE6] focus:ring-2 focus:ring-[#5E5CE6]/30 transition-all font-medium"
                />

                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setTitle(topic)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Checkboxes */}
              {(roomId || conversationId) && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <input
                      type="checkbox"
                      checked={shareToChat}
                      onChange={(e) => setShareToChat(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E5CE6] bg-black/40 border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white">
                        {roomId ? 'Post invitation card to Room Chat' : 'Post invitation card to Group Chat'}
                      </span>
                      <p className="text-[11px] text-white/40">
                        Automatically broadcasts an interactive join card into the conversation for all members.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <input
                      type="checkbox"
                      checked={bridgeToRoom}
                      onChange={(e) => setBridgeToRoom(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5E5CE6] bg-black/40 border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white">
                        {roomId ? 'Bridge directly to Room Stage banner' : 'Bridge directly to Group Header banner'}
                      </span>
                      <p className="text-[11px] text-white/40">
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
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#5E5CE6] to-[#0A84FF] hover:from-[#4E4CD6] hover:to-[#0074E0] disabled:opacity-50 text-white font-bold text-sm shadow-[0_8px_24px_rgba(94,92,230,0.35)] border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
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
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#30D158]/40 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
                      <span className="text-xs font-bold text-[#30D158] uppercase tracking-wider">
                        Session Ready!
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-white/50">{generatedMeeting.meetingCode}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-white/90 break-all select-all">
                    {generatedMeeting.meetingUrl}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={generatedMeeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-10 rounded-xl bg-[#30D158] hover:bg-[#28B84B] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <span>Open Meeting in New Tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(generatedMeeting.meetingUrl)}
                      className="px-4 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#30D158]" /> : <Copy className="w-4 h-4" />}
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
                <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.12] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.08] p-2 flex items-center justify-center">
                        {activeBridge.meeting.provider === 'GOOGLE_MEET' ? (
                          <GoogleMeetIcon className="w-6 h-6" />
                        ) : (
                          <MicrosoftTeamsIcon className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{activeBridge.meeting.title}</div>
                        <div className="text-xs text-white/50">
                          {activeBridge.meeting.provider === 'GOOGLE_MEET' ? 'Google Meet' : 'Microsoft Teams'} • Code:{' '}
                          <span className="font-mono text-white/80">{activeBridge.meeting.meetingCode}</span>
                        </div>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-xs text-[#30D158] font-bold bg-[#30D158]/15 border border-[#30D158]/30 px-2.5 py-1 rounded-full">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>Live Stage Bridge</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
                    <a
                      href={activeBridge.meeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-xl bg-[#5E5CE6] hover:bg-[#4E4CD6] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Join External Call</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(activeBridge.meeting.meetingUrl)}
                      className="px-3 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#30D158]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveBridge}
                      className="px-3 h-9 rounded-xl bg-[#FF453A]/15 hover:bg-[#FF453A] text-[#FF453A] hover:text-white border border-[#FF453A]/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Disconnect Bridge
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-white/40">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">No Active Meeting Bridge</h4>
                  <p className="text-xs text-white/40 max-w-xs mb-4">
                    Bridge a Google Meet or Microsoft Teams session to this room to display a persistent banner and allow 1-click cross-platform entry.
                  </p>
                  <button
                    onClick={() => setActiveTab('instant')}
                    className="px-4 py-2 rounded-xl bg-[#5E5CE6] text-white text-xs font-bold hover:bg-[#4E4CD6] transition-all cursor-pointer"
                  >
                    Launch a Meeting Now
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-[#30D158]" />
                  <span>Hybrid Mode Architecture</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Mivo operates in <strong>Hybrid Instant Mode</strong> out-of-the-box. Instant Google Meet and Microsoft Teams join URLs are generated immediately with zero cloud account friction.
                </p>
              </div>

              {/* Status items */}
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GoogleMeetIcon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-bold text-white">Google Meet & Calendar</div>
                      <div className="text-[11px] text-white/40">
                        Status: <span className="text-[#34D399] font-medium">Hybrid Instant Active</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-lg">
                    {config?.google.mode || 'HYBRID_INSTANT'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MicrosoftTeamsIcon className="w-5 h-5" />
                    <div>
                      <div className="text-xs font-bold text-white">Microsoft Teams & Graph</div>
                      <div className="text-[11px] text-white/40">
                        Status: <span className="text-[#A5B4FC] font-medium">Hybrid Instant Active</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-lg">
                    {config?.teams.mode || 'HYBRID_INSTANT'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#5E5CE6]/10 border border-[#5E5CE6]/20 text-[11px] text-white/70">
                To connect corporate Google Workspace or Microsoft 365 Entra OAuth credentials, define <code>GOOGLE_CLIENT_ID</code> and <code>MS_TEAMS_CLIENT_ID</code> in your <code>.env</code> file.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
