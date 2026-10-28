'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Lock,
  RefreshCw,
  Sun,
  Copy,
  Check,
} from 'lucide-react';
import { resolveStorageUrl } from './fileViewerUtils';

interface ImageViewerProps {
  url: string;
  fileName?: string;
  size?: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  url,
  fileName = 'image.png',
  size,
}) => {
  const resolvedUrl = resolveStorageUrl(url);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transforms
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setScale((s) => Math.min(5, s + 0.25));
  const handleZoomOut = () => setScale((s) => Math.max(0.2, s - 0.25));
  const handleRotateCw = () => setRotation((r) => (r + 90) % 360);
  const handleRotateCcw = () => setRotation((r) => (r - 90 + 360) % 360);

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(5, s + 0.15));
    } else {
      setScale((s) => Math.max(0.2, s - 0.15));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
      if (e.key === '0') handleReset();
      if (e.key === 'r') handleRotateCw();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-[#0A0D14] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl relative select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'max-h-[75vh]'
      }`}
    >
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-4 bg-white/[0.04] border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Image</span>
          </div>
          <span className="text-xs text-white/70 truncate max-w-xs">{fileName}</span>
          {dimensions && (
            <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
              ({dimensions.width} × {dimensions.height} px)
            </span>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={handleReset}
              className="px-2 text-xs font-mono text-white/80 cursor-pointer hover:text-blue-400"
              title="Click to reset (100%)"
            >
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate Controls */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={handleRotateCcw}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Rotate Counter-Clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRotateCw}
              className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Rotate Clockwise (R)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Reset Transform (0)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Invert / Contrast mode */}
          <button
            type="button"
            onClick={() => setHighContrast((c) => !c)}
            className={`p-1.5 rounded-lg border transition-colors ${
              highContrast
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-black/40 text-white/70 hover:text-white border-white/10 hover:bg-white/10'
            }`}
            title="Toggle High Contrast Filter"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          {/* Copy link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Copy Image URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Download */}
          <a
            href={resolvedUrl}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm ml-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Main Image Stage (Drag, Zoom, Pan) */}
      <div
        className="relative flex-1 w-full h-[60vh] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing bg-radial from-white/[0.03] to-black"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={fileName}
          onLoad={(e) => {
            const img = e.currentTarget;
            setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            filter: highContrast ? 'contrast(1.5) brightness(1.1)' : 'none',
          }}
          className="max-w-[85vw] max-h-[55vh] object-contain pointer-events-none drop-shadow-2xl"
          draggable={false}
        />

        {/* Drag Hint when Zoomed */}
        {scale > 1 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white/60 pointer-events-none">
            Click & drag to pan • Scroll to zoom
          </div>
        )}
      </div>
    </div>
  );
};
