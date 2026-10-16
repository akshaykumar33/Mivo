'use client';

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  ExternalLink,
  Film,
  Music,
  Lock,
} from 'lucide-react';
import { extractYouTubeId } from './fileViewerUtils';
import { YouTubeIcon } from './YouTubeIcon';

interface MediaViewerProps {
  url: string;
  fileName?: string;
  type?: 'youtube' | 'video' | 'audio';
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  url,
  fileName = 'Media Playback',
  type = 'video',
}) => {
  const youtubeId = extractYouTubeId(url);
  const isYouTube = type === 'youtube' || !!youtubeId;
  const isAudio = type === 'audio';

  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    if (audioRef.current) audioRef.current.playbackRate = speed;
  };

  if (isYouTube && youtubeId) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
    return (
      <div className="flex flex-col h-full w-full bg-black text-white rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        {/* YouTube Header */}
        <div className="flex items-center justify-between p-3 bg-[#111] border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-medium">
              <YouTubeIcon className="w-3.5 h-3.5" />
              <span>YouTube Video</span>
            </div>
            <span className="text-xs text-white/70 truncate max-w-sm">{fileName}</span>
          </div>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Watch on YouTube</span>
          </a>
        </div>

        {/* Responsive 16:9 Video Embed */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <iframe
            src={embedUrl}
            title={fileName || 'YouTube Video Player'}
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#12161F] text-slate-100 rounded-xl border border-white/10 shadow-2xl max-w-lg mx-auto w-full">
        <div className="w-20 h-20 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4 shadow-lg">
          <Music className="w-10 h-10 animate-pulse" />
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Audio</span>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-white truncate max-w-sm mb-1">{fileName}</h4>
        <p className="text-xs text-white/50 mb-6">High-Fidelity Audio Stream</p>

        {/* Native Audio Tag */}
        <audio ref={audioRef} controls src={url} className="w-full mb-6 accent-violet-500" />

        {/* Speed Controls */}
        <div className="flex items-center justify-between w-full text-xs text-white/60 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <span>Speed:</span>
            {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  playbackRate === speed
                    ? 'bg-violet-600 text-white font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <a
            href={url}
            download={fileName}
            className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    );
  }

  // Native Video (MP4, WebM, MOV)
  return (
    <div className="flex flex-col h-full w-full bg-black text-white rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Video Header */}
      <div className="flex items-center justify-between p-3 bg-[#111] border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-medium">
            <Film className="w-3.5 h-3.5" />
            <span>Video Player</span>
          </div>
          <span className="text-xs text-white/70 truncate max-w-sm">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5 border border-white/10">
            {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  playbackRate === speed
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <a
            href={url}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          controls
          autoPlay
          src={url}
          className="w-full h-full max-h-[65vh] object-contain"
        />
      </div>
    </div>
  );
};
