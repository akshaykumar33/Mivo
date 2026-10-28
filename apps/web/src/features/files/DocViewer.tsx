'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Lock,
  Download,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Search,
} from 'lucide-react';
import { getFileExtension, resolveStorageUrl } from './fileViewerUtils';

interface DocViewerProps {
  url: string;
  fileName?: string;
  size?: number;
  content?: string;
}

export const DocViewer: React.FC<DocViewerProps> = ({
  url,
  fileName = 'document.docx',
  size,
  content,
}) => {
  const resolvedUrl = resolveStorageUrl(url);
  const ext = getFileExtension(fileName, resolvedUrl || url);
  const isBinaryDoc = ['docx', 'doc', 'rtf', 'odt'].includes(ext);
  const isPlainText = ['txt', 'md', 'markdown', 'log', 'text'].includes(ext);

  const [textContent, setTextContent] = useState<string | null>(content || null);
  const [isLoading, setIsLoading] = useState<boolean>(!content && isPlainText);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // If plain text or markdown, fetch text
  useEffect(() => {
    if (!isPlainText) return;
    if (content) {
      setTextContent(content);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(resolvedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch text`);
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setTextContent(text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to read document');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedUrl, isPlainText, content]);

  const handleCopy = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // For DOCX / DOC: use Office Apps Live Viewer or Google Docs Viewer
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolvedUrl)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;

  if (isBinaryDoc) {
    return (
      <div className="flex flex-col h-full w-full bg-[#1C202B] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-[#131722] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Read-Only Document</span>
            </div>
            <span className="text-xs font-semibold text-white truncate max-w-xs">{fileName}</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono uppercase">
              {ext}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={officeViewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Office Online</span>
            </a>
            <a
              href={resolvedUrl}
              download={fileName}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Embedded Document Viewer Frame with Fallback */}
        <div className="relative flex-1 w-full h-[65vh] bg-[#0E1118] flex items-center justify-center">
          <iframe
            src={officeViewerUrl}
            title={fileName}
            className="w-full h-full border-none"
            onError={() => setError('Office viewer unavailable')}
          />
        </div>
      </div>
    );
  }

  // Plain Text / Markdown Reader
  return (
    <div className="flex flex-col h-full w-full bg-[#141822] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Reader Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1B2130] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Reader</span>
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-xs">{fileName}</span>
          {textContent && (
            <span className="text-xs text-white/40 hidden sm:inline">
              {textContent.split(/\s+/).filter(Boolean).length} words • {textContent.split('\n').length} lines
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search in document */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search document..."
              className="pl-7 pr-2 py-1 rounded-lg bg-black/30 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 w-36 sm:w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <a
            href={resolvedUrl}
            download={fileName}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Reader Body */}
      <div className="flex-1 overflow-auto max-h-[60vh] p-6 text-sm leading-relaxed select-text font-serif text-slate-200 scrollbar-thin scrollbar-thumb-white/20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/60">
            <RefreshCw className="w-7 h-7 animate-spin text-emerald-400" />
            <p className="text-xs">Loading document contents...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-400">
            <p className="font-semibold">Unable to read text document</p>
            <p className="text-xs text-white/50 mt-1">{error}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto whitespace-pre-wrap font-sans">
            {textContent}
          </div>
        )}
      </div>
    </div>
  );
};
