'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Lock,
  Search,
  RefreshCw,
  FileCode,
  AlignLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { detectCodeLanguage } from './fileViewerUtils';

interface CodeSnippetViewerProps {
  code?: string;
  url?: string;
  fileName?: string;
}

// Lightweight syntax tokenizer for fast, read-only formatting
function tokenizeCode(code: string): Array<{ text: string; className: string }> {
  const tokens: Array<{ text: string; className: string }> = [];

  // Regex patterns
  const tokenRegex =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:function|const|let|var|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|interface|type|extends|implements|new|this|typeof|async|await|try|catch|finally|throw|public|private|protected|static|readonly|def|self|None|True|False|elif|lambda|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP|ORDER|BY|CREATE|TABLE|ALTER|DROP)\b)|(\b(?:true|false|null|undefined|nil)\b)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\())|([{}()[\].,;:+\-*/%=<>!&|^~?]+)|([^\s{}()[\].,;:+\-*/%=<>!&|^~?]+)|(\s+)/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(code)) !== null) {
    const [full, comment, stringVal, keyword, booleanVal, numberVal, funcCall, punct] = match;

    if (comment) {
      tokens.push({ text: full, className: 'text-slate-500 italic' });
    } else if (stringVal) {
      tokens.push({ text: full, className: 'text-emerald-400' });
    } else if (keyword) {
      tokens.push({ text: full, className: 'text-violet-400 font-semibold' });
    } else if (booleanVal) {
      tokens.push({ text: full, className: 'text-amber-400 font-semibold' });
    } else if (numberVal) {
      tokens.push({ text: full, className: 'text-orange-300' });
    } else if (funcCall) {
      tokens.push({ text: full, className: 'text-cyan-300' });
    } else if (punct) {
      tokens.push({ text: full, className: 'text-slate-400' });
    } else {
      tokens.push({ text: full, className: 'text-slate-200' });
    }
  }

  return tokens;
}

export const CodeSnippetViewer: React.FC<CodeSnippetViewerProps> = ({
  code: initialCode,
  url,
  fileName = 'snippet.ts',
}) => {
  const [content, setContent] = useState<string>(initialCode || '');
  const [isLoading, setIsLoading] = useState<boolean>(!initialCode && !!url);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Fetch file if url provided
  useEffect(() => {
    if (initialCode !== undefined) {
      setContent(initialCode);
      setIsLoading(false);
      return;
    }

    if (!url) {
      setError('No source code provided');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch source code`);
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load code file');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialCode, url]);

  const language = useMemo(() => detectCodeLanguage(fileName), [fileName]);
  const lines = useMemo(() => content.split('\n'), [content]);

  // Search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: Array<{ lineIndex: number; colIndex: number }> = [];

    lines.forEach((line, lineIdx) => {
      let startIndex = 0;
      const lowerLine = line.toLowerCase();
      while ((startIndex = lowerLine.indexOf(q, startIndex)) !== -1) {
        matches.push({ lineIndex: lineIdx, colIndex: startIndex });
        startIndex += q.length;
      }
    });

    return matches;
  }, [lines, searchQuery]);

  // Jump to match
  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % searchMatches.length;
    setCurrentMatchIdx(nextIdx);
    scrollToLine(searchMatches[nextIdx].lineIndex);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIdx(prevIdx);
    scrollToLine(searchMatches[prevIdx].lineIndex);
  };

  const scrollToLine = (lineIdx: number) => {
    const el = document.getElementById(`code-line-${lineIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-white/60">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm">Loading and syntax highlighting source code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-center px-6">
        <FileCode className="w-12 h-12 text-rose-400 mb-2" />
        <h4 className="text-base font-semibold text-white">Source File Unreadable</h4>
        <p className="text-xs text-white/60 max-w-md">{error}</p>
        {url && (
          <a
            href={url}
            download={fileName}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
          >
            <Download className="w-4 h-4" />
            Download Source File
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0D1117] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 px-4 bg-[#161B22] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Snippet</span>
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] font-mono text-cyan-300 uppercase">
            {language}
          </span>
          <span className="text-xs text-white/40 hidden sm:inline">
            {lines.length} lines • {content.length} chars
          </span>
        </div>

        {/* Toolbar & Search */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-2.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIdx(0);
              }}
              placeholder="Find in code..."
              className="pl-7 pr-2 py-1 rounded bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 w-32 sm:w-44"
            />
            {searchMatches.length > 0 && (
              <div className="flex items-center gap-1 ml-1 text-[11px] text-white/50">
                <span>
                  {currentMatchIdx + 1}/{searchMatches.length}
                </span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  className="p-0.5 hover:text-white"
                  title="Previous match"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  className="p-0.5 hover:text-white"
                  title="Next match"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Toggle Wrap */}
          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              wordWrap
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-black/40 text-white/60 hover:text-white border-white/10'
            }`}
            title="Toggle Word Wrap"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download */}
          {url && (
            <a
              href={url}
              download={fileName}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      {/* Code Body (Read-Only) */}
      <div
        ref={codeContainerRef}
        className="flex-1 overflow-auto max-h-[60vh] font-mono text-xs p-3 leading-relaxed select-text scrollbar-thin scrollbar-thumb-white/20"
      >
        <div className="min-w-full inline-block">
          {lines.map((lineText, lineIdx) => {
            const tokens = tokenizeCode(lineText || ' ');
            const isMatchLine = searchMatches.some((m) => m.lineIndex === lineIdx);

            return (
              <div
                key={lineIdx}
                id={`code-line-${lineIdx}`}
                className={`flex group hover:bg-white/[0.04] transition-colors rounded ${
                  isMatchLine ? 'bg-cyan-500/10' : ''
                }`}
              >
                {/* Gutter Line Number (Read-only, Unselectable) */}
                <span className="w-12 text-right pr-4 text-white/25 select-none shrink-0 group-hover:text-white/50 border-r border-white/5">
                  {lineIdx + 1}
                </span>

                {/* Line Tokens */}
                <span
                  className={`pl-4 flex-1 ${
                    wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  }`}
                >
                  {tokens.map((token, tokenIdx) => (
                    <span key={tokenIdx} className={token.className}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
