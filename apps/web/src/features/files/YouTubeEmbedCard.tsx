'use client';

import React, { useState } from 'react';
import { Play, ExternalLink, Maximize2 } from 'lucide-react';
import { extractYouTubeId } from './fileViewerUtils';
import { YouTubeIcon } from './YouTubeIcon';

interface YouTubeEmbedCardProps {
  url: string;
  onOpenViewer?: (url: string, videoId: string) => void;
}

export const YouTubeEmbedCard: React.FC<YouTubeEmbedCardProps> = ({
  url,
  onOpenViewer,
}) => {
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const videoId = extractYouTubeId(url);

  if (!videoId) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <div className="mt-2 rounded-2xl overflow-hidden border border-white/10 bg-black/40 hover:border-red-500/40 transition-all max-w-lg shadow-md group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-white/5 text-xs">
        <div className="flex items-center gap-1.5 text-red-400 font-medium">
          <YouTubeIcon className="w-3.5 h-3.5" />
          <span>YouTube</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/50">
          {onOpenViewer && (
            <button
              type="button"
              onClick={() => onOpenViewer(url, videoId)}
              className="p-1 rounded hover:text-white hover:bg-white/10 transition-colors"
              title="Expand in full File Viewer"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:text-white hover:bg-white/10 transition-colors"
            title="Open on YouTube"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Frame / Thumbnail Stage */}
      <div className="relative aspect-video w-full bg-black">
        {isPlayingInline ? (
          <iframe
            src={embedUrl}
            title="YouTube video player"
            className="w-full h-full border-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            onClick={() => setIsPlayingInline(true)}
            className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="YouTube Video Thumbnail"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

            {/* Glowing Play Button */}
            <div className="absolute w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-red-500 transition-all">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
