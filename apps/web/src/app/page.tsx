'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@mivo/ui';
import Link from 'next/link';
import { MessageSquare, Mic, Video, Monitor, Radio, Shield, Sparkles, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/channels/@me');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen w-full bg-[#0B0E14] text-white flex flex-col justify-between overflow-y-auto">
      {/* Navigation Header */}
      <header className="h-20 max-w-7xl mx-auto w-full px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-600/30">
            M
          </div>
          <span className="text-xl font-bold font-display tracking-tight">Mivo</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started Free</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto my-12 z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-950/60 border border-violet-800/80 text-violet-300 text-xs font-semibold mb-6 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Next-Generation Real-Time Communication Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 max-w-4xl leading-tight">
          One Room. Dynamic Modes. Zero Context Switching.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Create communities, organize channels, and enter unified rooms where you can effortlessly switch between text chat, crystal-clear voice huddles, HD video meetings, screen sharing, and live broadcast stages.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="gap-2 text-base px-8 py-4">
              <span>Launch Mivo</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="text-base px-8 py-4">
              Sign in with Account
            </Button>
          </Link>
        </div>

        {/* Feature Grid Pills */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl w-full">
          {[
            { label: 'Real-time Chat', icon: MessageSquare, desc: 'Instant messaging' },
            { label: 'Voice Huddles', icon: Mic, desc: 'Low-latency SFU' },
            { label: 'HD Video', icon: Video, desc: 'Simulcast grid' },
            { label: 'Screen Share', icon: Monitor, desc: 'Frictionless transport' },
            { label: 'Live Stages', icon: Radio, desc: 'Audience broadcast' },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.label}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex flex-col items-center text-center"
              >
                <Icon className="w-5 h-5 text-violet-400 mb-2" />
                <span className="text-xs font-bold text-slate-200">{feat.label}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">{feat.desc}</span>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-slate-800/80 max-w-7xl mx-auto w-full px-6 flex items-center justify-between text-xs text-slate-500">
        <div>© 2026 Mivo Inc. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <span>PostgreSQL • Redis • WebRTC • Next.js • NestJS</span>
        </div>
      </footer>
    </div>
  );
}
