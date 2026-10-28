'use client';

import React, { useState, useEffect } from 'react';
import { Download, File, Lock, RefreshCw, Terminal, Search, Copy, Check } from 'lucide-react';
import { formatFileSize, getFileExtension, resolveStorageUrl } from './fileViewerUtils';

interface HexViewerProps {
  url: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
}

export const HexViewer: React.FC<HexViewerProps> = ({
  url,
  fileName = 'file.bin',
  size,
  mimeType,
}) => {
  const resolvedUrl = resolveStorageUrl(url);
  const ext = getFileExtension(fileName, resolvedUrl || url);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Fetch first 8KB of the file
    fetch(resolvedUrl, { headers: { Range: 'bytes=0-8191' } })
      .then((res) => {
        if (!res.ok && res.status !== 206) {
          // If range header not supported, fetch full file up to blob
          return fetch(resolvedUrl).then((r) => r.arrayBuffer());
        }
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (isMounted) {
          const slice = new Uint8Array(buffer).slice(0, 8192);
          setBytes(slice);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Could not read raw binary data');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  // Format bytes into lines of 16 bytes: offset, hex bytes, ascii representation
  const hexLines = React.useMemo(() => {
    if (!bytes) return [];
    const lines: Array<{ offset: string; hex: string; ascii: string }> = [];

    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const offset = i.toString(16).padStart(8, '0');

      let hexParts: string[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const b = chunk[j];
          hexParts.push(b.toString(16).padStart(2, '0'));
          // Printable ASCII 32 to 126
          if (b >= 32 && b <= 126) {
            ascii += String.fromCharCode(b);
          } else {
            ascii += '·';
          }
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }

      // Group into 8 and 8
      const hex = `${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8, 16).join(' ')}`;
      lines.push({ offset, hex, ascii });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return lines.filter(
        (l) => l.hex.includes(q) || l.ascii.toLowerCase().includes(q) || l.offset.includes(q)
      );
    }

    return lines;
  }, [bytes, searchTerm]);

  const handleCopy = () => {
    if (!hexLines.length) return;
    const text = hexLines.map((l) => `${l.offset}  ${l.hex}  |${l.ascii}|`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0D1117] text-slate-100 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#161B22] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Read-Only Inspector</span>
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-xs">{fileName}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[10px] font-mono text-purple-300 uppercase">
            {ext || 'BIN'}
          </span>
          <span className="text-xs text-white/40 hidden sm:inline">
            {formatFileSize(size)} {mimeType ? `• ${mimeType}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hex / ASCII..."
              className="pl-7 pr-2 py-1 rounded bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 w-36 sm:w-44"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 hover:bg-white/10 text-white text-xs border border-white/10 transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* Hex Dump Viewport */}
      <div className="flex-1 overflow-auto max-h-[60vh] p-3 font-mono text-xs select-text bg-[#090D13] scrollbar-thin scrollbar-thumb-white/20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/60">
            <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
            <p className="text-xs">Analyzing binary data stream...</p>
          </div>
        ) : error || !bytes ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-6">
            <File className="w-10 h-10 text-white/30 mb-1" />
            <p className="text-sm font-semibold text-white">{fileName}</p>
            <p className="text-xs text-white/50">{formatFileSize(size)}</p>
            <p className="text-xs text-white/40 max-w-sm">
              Direct binary inspection is unavailable for this remote file, but you can download it directly.
            </p>
            <a
              href={url}
              download={fileName}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium"
            >
              <Download className="w-4 h-4" />
              Download File
            </a>
          </div>
        ) : (
          <div className="min-w-[620px]">
            {/* Column labels */}
            <div className="flex pb-2 mb-2 border-b border-white/10 text-white/30 text-[11px] select-none">
              <span className="w-20">Offset</span>
              <span className="w-[340px]">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
              <span className="flex-1 pl-4">Decoded Text</span>
            </div>

            {/* Hex Lines */}
            {hexLines.map((line, idx) => (
              <div
                key={idx}
                className="flex py-0.5 hover:bg-white/[0.04] transition-colors leading-5 group"
              >
                <span className="w-20 text-purple-400/70 select-none group-hover:text-purple-300">
                  {line.offset}
                </span>
                <span className="w-[340px] text-slate-300 font-mono tracking-wider">
                  {line.hex}
                </span>
                <span className="flex-1 pl-4 text-emerald-400/90 font-mono border-l border-white/5">
                  |{line.ascii}|
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hex Inspector Footer */}
      <div className="p-2 px-4 bg-white/[0.02] border-t border-white/10 text-[11px] text-white/40 flex items-center justify-between">
        <span>Showing up to 8KB binary header inspector</span>
        <span className="font-mono">Hex encoding (Base 16) • Strictly Read-Only</span>
      </div>
    </div>
  );
};
