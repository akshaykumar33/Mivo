'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@mivo/ui';
import Link from 'next/link';
import {
  MessageSquare,
  Mic,
  Video,
  Monitor,
  Radio,
  Shield,
  ArrowRight,
  Zap,
  Users,
  Lock,
  Layers,
  Sparkles,
  CheckCircle2,
  Cpu,
  Volume2,
  Share2,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [activePreviewTab, setActivePreviewTab] = React.useState<'voice' | 'canvas' | 'chat'>('voice');

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/channels');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen w-full bg-[#090A0F] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-red-500/20 selection:text-white">
      {/* Subtle Structural Grid Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 h-18 w-full border-b border-white/[0.06] bg-[#090A0F]/80 backdrop-blur-xl z-40 transition-colors">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626] flex items-center justify-center font-extrabold text-base text-white shadow-[0_1px_8px_rgba(220,38,38,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] border border-red-500/40">
              M
            </div>
            <span className="text-lg font-bold tracking-tight font-display text-white">
              Mivo
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/[0.08] ml-1">
              v1.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Platform
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              SecOps & E2EE
            </a>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/[0.06]">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-semibold shadow-sm">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-12 sm:pt-20 pb-20 relative z-10 flex flex-col items-center">
        {/* Telemetry pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sub-50ms WebRTC SFU • Zero Context Switching</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display text-white max-w-4xl text-center leading-[1.12]">
          One room for your team&apos;s voice, video, canvas, and chat.
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl text-center leading-relaxed font-normal">
          Engineered for engineering and product teams who want instant voice huddles, collaborative whiteboard stages, and persistent threads without juggling five disconnected apps.
        </p>

        {/* Call-to-action buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 text-sm px-6 py-3 font-semibold shadow-[0_10px_30px_rgba(220,38,38,0.25)]">
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2 text-sm px-5 py-3 bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border-white/[0.1] shadow-none">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Instant Guest Mode</span>
            </Button>
          </Link>
        </div>

        {/* Realistic Interactive Room Stage Preview */}
        <div className="mt-14 sm:mt-18 w-full max-w-5xl rounded-2xl bg-[#0F1118] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden text-left">
          {/* Mock Window Top Bar */}
          <div className="h-11 px-4 bg-[#141620] border-b border-white/[0.06] flex items-center justify-between text-xs text-slate-400 select-none">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.12]" />
              </div>
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="text-red-500 font-mono">#</span>
                <span>engineering-sync</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.04]">
                128kbps Opus
              </span>
            </div>

            {/* Stage Mode Switcher */}
            <div className="flex items-center bg-[#090A0F] p-0.5 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActivePreviewTab('voice')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'voice'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-3 h-3" />
                <span>Voice Huddle</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('canvas')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'canvas'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>Whiteboard</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewTab('chat')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  activePreviewTab === 'chat'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Thread</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>SFU Connected</span>
            </div>
          </div>

          {/* Mock Stage Main Area */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#0B0D14]">
            {/* Left 2 Cols: Active Video/Voice Tiles */}
            <div className="lg:col-span-2 space-y-3">
              <div className="relative h-64 sm:h-80 rounded-xl bg-[#131622] border border-white/[0.06] overflow-hidden flex flex-col justify-between p-4">
                <div className="flex items-center justify-between z-10">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-semibold text-slate-200 border border-white/[0.08]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Presenter • Alex Rivera (Screen 4K)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-1 rounded border border-white/[0.08]">
                    <span>FPS: 60</span>
                    <span>•</span>
                    <span>1080p60</span>
                  </div>
                </div>

                {/* Simulated Content in the Stage */}
                {activePreviewTab === 'voice' && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <div className="space-y-4 max-w-sm">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary,#dc2626)] ring-2 ring-red-500/20 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                          AR
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center shadow-xs">
                          DA
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-lg flex items-center justify-center shadow-xs">
                          SC
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1 h-6">
                        <span className="w-1 bg-red-500 h-2 rounded-full animate-pulse" />
                        <span className="w-1 bg-red-500 h-5 rounded-full animate-pulse" />
                        <span className="w-1 bg-red-500 h-3 rounded-full animate-pulse" />
                        <span className="w-1 bg-red-500 h-6 rounded-full animate-pulse" />
                        <span className="w-1 bg-red-500 h-2 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        Alex is speaking with dynamic noise suppression enabled
                      </p>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'canvas' && (
                  <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300">
                        Auth Gateway (NestJS)
                      </div>
                      <span className="text-slate-500">&rarr;</span>
                      <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                        WebRTC SFU Node
                      </div>
                      <span className="text-slate-500">&rarr;</span>
                      <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300">
                        PostgreSQL 16
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewTab === 'chat' && (
                  <div className="absolute inset-0 p-6 flex flex-col justify-end space-y-2">
                    <div className="text-xs bg-white/[0.04] p-3 rounded-lg border border-white/[0.06] text-slate-300">
                      <span className="font-bold text-white mr-2">Dev Admin:</span>
                      PR merged cleanly. CI pipeline passed in 1m 15s.
                    </div>
                    <div className="text-xs bg-red-950/30 p-3 rounded-lg border border-red-500/20 text-slate-300">
                      <span className="font-bold text-red-400 mr-2">Alex Rivera:</span>
                      Verified the new button micro-interactions. Looks sharp.
                    </div>
                  </div>
                )}

                {/* Bottom Room Controls Dock */}
                <div className="flex items-center justify-between z-10 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-black/50 text-[10px] text-slate-400 font-mono">
                      Stage Mode
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="p-2 rounded-lg bg-white/[0.06] text-slate-200">
                      <Mic className="w-3.5 h-3.5" />
                    </span>
                    <span className="p-2 rounded-lg bg-white/[0.06] text-slate-200">
                      <Video className="w-3.5 h-3.5" />
                    </span>
                    <span className="p-2 rounded-lg bg-[#DC2626] text-white">
                      <Share2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Context Feed */}
            <div className="rounded-xl bg-[#131622] border border-white/[0.06] p-4 flex flex-col justify-between text-xs">
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span>Room Telemetry</span>
                  <span className="text-emerald-400 font-mono">0 Packet Loss</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                    <span className="text-slate-400">Media Pipeline</span>
                    <span className="font-mono text-slate-200 font-semibold">WebRTC Opus</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                    <span className="text-slate-400">Security Gate</span>
                    <span className="font-mono text-emerald-400 font-semibold">E2EE Verified</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-between">
                    <span className="text-slate-400">Screen Latency</span>
                    <span className="font-mono text-slate-200 font-semibold">18ms</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <div className="text-[11px] text-slate-500 leading-tight">
                  All communications streamed directly through distributed media gateways.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Bento Section */}
        <section id="features" className="mt-24 sm:mt-32 w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
              Built for speed. Designed for human focus.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Every detail engineered to eliminate meeting drag, link swapping, and cognitive fatigue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#0F1118] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-display mb-1.5">
                Dynamic Room Transformation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamlessly transition a silent text channel into an audio huddle or full screen-share review without generating meeting links.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#0F1118] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-display mb-1.5">
                Adaptive WebRTC Engine
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic audio gain, echo cancellation, and bitrate throttling from 24kbps voice to 128kbps stereo based on network capacity.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#0F1118] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white font-display mb-1.5">
                Zero-Trust Cryptographic Security
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Argon2id password hashing, RFC 7519 rotating tokens, timing-safe message signing, and scoped role governance.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#090A0F] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400 font-mono text-[11px]">All Systems Operational</span>
          </div>
          <div>&copy; 2026 Mivo Platform. Built for real-time team collaboration.</div>
        </div>
      </footer>
    </div>
  );
}
