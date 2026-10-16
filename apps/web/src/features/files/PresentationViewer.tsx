'use client';

import React, { useState, useRef } from 'react';
import {
  Presentation,
  Lock,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { getFileExtension } from './fileViewerUtils';

interface PresentationViewerProps {
  url: string;
  fileName?: string;
  size?: number;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  url,
  fileName = 'presentation.pptx',
}) => {
  const ext = getFileExtension(fileName, url);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useGoogleFallback, setUseGoogleFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  const activeViewerUrl = useGoogleFallback ? googleViewerUrl : officeViewerUrl;

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-[#18151D] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'max-h-[75vh]'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#241F2C] border-b border-white/10 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Slide Deck</span>
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono uppercase">
            {ext}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUseGoogleFallback((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs transition-colors"
            title="Switch presentation rendering engine"
          >
            {useGoogleFallback ? 'Switch to Office View' : 'Switch to Google View'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <a
            href={activeViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href={url}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Embed Frame */}
      <div className="relative flex-1 w-full h-[65vh] bg-[#110E14] flex items-center justify-center">
        <iframe
          src={activeViewerUrl}
          title={fileName}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
};
