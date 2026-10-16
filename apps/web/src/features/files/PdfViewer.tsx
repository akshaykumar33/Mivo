'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, FileText, Lock, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  fileName?: string;
  size?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, fileName = 'document.pdf' }) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = React.useRef<HTMLDivElement>(null);

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

  // Adjust zoom for iframe display
  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 25));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 25));
  const handleResetZoom = () => setZoom(100);

  // Construct PDF URL with parameters to disable editing and configure toolbar
  const pdfEmbedUrl = `${url}#toolbar=1&navpanes=0&view=FitH&zoom=${zoom}`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-[#1e1e1e] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'max-h-[75vh]'
      }`}
    >
      {/* Top Read-Only PDF Action Bar */}
      <div className="flex items-center justify-between p-2.5 px-4 bg-[#252526] border-b border-white/10 flex-shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only PDF</span>
          </div>
          <span className="text-xs text-white/60 truncate max-w-xs">{fileName}</span>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={handleResetZoom}
              className="px-2 text-xs font-mono text-white/80 cursor-pointer hover:text-rose-400 select-none"
              title="Reset Zoom to 100%"
            >
              {zoom}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <a
            href={url}
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors shadow-sm ml-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className="relative flex-1 w-full h-[65vh] bg-[#2A2A2E] overflow-hidden flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1e1e1e]/80 z-10 text-white/60">
            <RefreshCw className="w-7 h-7 animate-spin text-rose-400" />
            <p className="text-xs">Loading secure PDF document...</p>
          </div>
        )}

        <object
          data={pdfEmbedUrl}
          type="application/pdf"
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
        >
          {/* Fallback iframe in case object tag fails */}
          <iframe
            src={pdfEmbedUrl}
            title={fileName}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
          >
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white/70">
              <FileText className="w-12 h-12 text-rose-400 mb-3" />
              <p className="text-sm font-semibold text-white">Browser Preview Not Supported</p>
              <p className="text-xs mt-1 max-w-sm text-white/50">
                Your browser could not render this PDF inline. You can safely download or open it in a dedicated viewer.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href={url}
                  download={fileName}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
                >
                  Download PDF
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </iframe>
        </object>
      </div>
    </div>
  );
};
