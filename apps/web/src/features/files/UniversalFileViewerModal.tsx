'use client';

import React, { useEffect } from 'react';
import {
  X,
  Download,
  Lock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Presentation,
  FolderArchive,
  File,
  ShieldAlert,
} from 'lucide-react';
import { YouTubeIcon } from './YouTubeIcon';
import {
  FileViewerItem,
  detectFileCategory,
  getFileExtension,
  formatFileSize,
  resolveStorageUrl,
} from './fileViewerUtils';
import { CsvViewer } from './CsvViewer';
import { PdfViewer } from './PdfViewer';
import { ImageViewer } from './ImageViewer';
import { CodeSnippetViewer } from './CodeSnippetViewer';
import { MediaViewer } from './MediaViewer';
import { DocViewer } from './DocViewer';
import { PresentationViewer } from './PresentationViewer';
import { HexViewer } from './HexViewer';

interface UniversalFileViewerModalProps {
  file: FileViewerItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UniversalFileViewerModal: React.FC<UniversalFileViewerModalProps> = ({
  file,
  isOpen,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const resolvedUrl = resolveStorageUrl(file.url);
  const category = detectFileCategory(file.name, file.type, resolvedUrl || file.url);
  const ext = getFileExtension(file.name, resolvedUrl || file.url);

  // Category Icon & Color
  const getCategoryMeta = () => {
    switch (category) {
      case 'csv':
        return {
          icon: FileSpreadsheet,
          color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
          label: 'Spreadsheet (CSV)',
        };
      case 'pdf':
        return {
          icon: FileText,
          color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
          label: 'PDF Document',
        };
      case 'image':
        return {
          icon: ImageIcon,
          color: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
          label: 'Image',
        };
      case 'youtube':
        return {
          icon: YouTubeIcon,
          color: 'text-red-400 bg-red-500/15 border-red-500/30',
          label: 'YouTube Video',
        };
      case 'video':
        return {
          icon: Film,
          color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
          label: 'Video',
        };
      case 'audio':
        return {
          icon: Music,
          color: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
          label: 'Audio Stream',
        };
      case 'presentation':
        return {
          icon: Presentation,
          color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
          label: 'Presentation (Slides)',
        };
      case 'code':
        return {
          icon: FileCode,
          color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
          label: 'Source Code Snippet',
        };
      case 'doc':
        return {
          icon: FileText,
          color: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
          label: 'Document',
        };
      case 'archive':
        return {
          icon: FolderArchive,
          color: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30',
          label: 'Archive',
        };
      default:
        return {
          icon: File,
          color: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
          label: 'File Inspector',
        };
    }
  };

  const meta = getCategoryMeta();
  const IconComponent = meta.icon;

  // Render specific viewer
  const renderViewer = () => {
    switch (category) {
      case 'csv':
        return <CsvViewer url={resolvedUrl} fileName={file.name} csvText={file.content} />;
      case 'pdf':
        return <PdfViewer url={resolvedUrl} fileName={file.name} size={file.size} />;
      case 'image':
        return <ImageViewer url={resolvedUrl} fileName={file.name} size={file.size} />;
      case 'youtube':
        return <MediaViewer url={resolvedUrl} fileName={file.name} type="youtube" />;
      case 'video':
        return (
          <MediaViewer
            url={resolvedUrl}
            fileName={file.name}
            type="video"
            posterUrl={file.posterUrl ? resolveStorageUrl(file.posterUrl) : undefined}
            isOptimized={file.isOptimized}
          />
        );
      case 'audio':
        return <MediaViewer url={resolvedUrl} fileName={file.name} type="audio" />;
      case 'presentation':
        return <PresentationViewer url={resolvedUrl} fileName={file.name} size={file.size} />;
      case 'code':
        return <CodeSnippetViewer url={resolvedUrl} code={file.content} fileName={file.name} />;
      case 'doc':
        return (
          <DocViewer
            url={resolvedUrl}
            fileName={file.name}
            size={file.size}
            content={file.content}
          />
        );
      case 'archive':
      case 'generic':
      default:
        return (
          <HexViewer
            url={resolvedUrl}
            fileName={file.name}
            size={file.size}
            mimeType={file.type}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
      {/* Dark Frosted Glass Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl cursor-pointer"
      />

      {/* Modal Window Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="universal-file-viewer-title"
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--bg-surface-0)] border border-[var(--border-subtle)] shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
          {/* Universal Header */}
          <div className="flex items-center justify-between p-3.5 px-5 bg-[var(--bg-surface-1)] border-b border-[var(--border-subtle)] flex-shrink-0">
            {/* File Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 id="universal-file-viewer-title" className="text-sm font-bold text-[var(--text-primary)] truncate max-w-sm sm:max-w-md">
                    {file.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] text-[var(--text-secondary)] flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Read-Only
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] mt-0.5">
                  <span>{meta.label}</span>
                  {file.size ? (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                    </>
                  ) : null}
                  {ext && (
                    <>
                      <span>•</span>
                      <span className="uppercase font-mono text-[10px]">{ext}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Open raw file in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <a
                href={resolvedUrl}
                download={file.name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-primary,#dc2626)] hover:brightness-105 text-white text-xs font-semibold shadow-xs transition-all active:scale-98"
                title="Download original file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-1"
                title="Close viewer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dynamic Content Body */}
          <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-[var(--bg-canvas)] flex flex-col justify-center items-center min-h-[50vh]">
            <div className="w-full h-full flex flex-col items-center justify-center">
              {renderViewer()}
            </div>
          </div>

          {/* Bottom Security Notice Banner */}
          <div className="flex items-center justify-between p-2.5 px-5 bg-[var(--bg-surface-1)] border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[var(--brand-primary,#dc2626)]" />
              <span>
                Safe Read-Only Display Mode — Content is strictly protected from modification.
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[var(--text-muted)]">
              <span>Press <kbd className="px-1 rounded bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] font-mono text-[9px]">ESC</kbd> to exit</span>
            </div>
          </div>
      </div>
    </div>
  );
};
