'use client';

import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Table, Lock, RefreshCw } from 'lucide-react';
import { parseDelimitedText } from './fileViewerUtils';

interface CsvViewerProps {
  csvText?: string;
  url?: string;
  fileName?: string;
}

export const CsvViewer: React.FC<CsvViewerProps> = ({ csvText, url, fileName = 'data.csv' }) => {
  const [data, setData] = useState<{ headers: string[]; rows: string[][] } | null>(() => {
    if (csvText) {
      return parseDelimitedText(csvText);
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!csvText && !!url);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Fetch CSV if url provided and no inline csvText
  React.useEffect(() => {
    if (csvText) {
      setData(parseDelimitedText(csvText));
      setLoading(false);
      return;
    }

    if (!url) {
      setError('No file source provided');
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load file`);
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setData(parseDelimitedText(text));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to parse CSV content');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [csvText, url]);

  // Handle column sorting
  const handleSort = (colIndex: number) => {
    if (sortCol === colIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortCol(null);
      }
    } else {
      setSortCol(colIndex);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    if (!data || !data.rows) return [];
    let result = data.rows;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(q))
      );
    }

    if (sortCol !== null && data.headers[sortCol] !== undefined) {
      result = [...result].sort((a, b) => {
        const valA = (a[sortCol] || '').trim();
        const valB = (b[sortCol] || '').trim();

        // Check if numerical
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });
    }

    return result;
  }, [data, searchTerm, sortCol, sortDirection]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return filteredRows; // All
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filteredRows.length / pageSize);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-white/60">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm">Parsing and loading spreadsheet data...</p>
      </div>
    );
  }

  if (error || !data || data.headers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3 text-center px-6">
        <Table className="w-12 h-12 text-rose-400/80 mb-2" />
        <h4 className="text-base font-semibold text-white">Spreadsheet Preview Unavailable</h4>
        <p className="text-xs text-white/60 max-w-md">
          {error || 'The file is either empty or could not be formatted as tabular rows.'}
        </p>
        {url && (
          <a
            href={url}
            download={fileName}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download Original File
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0D1117] text-slate-100 select-text overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      {/* Read-Only Banner & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only View</span>
          </div>
          <span className="text-xs text-white/50">
            {data.rows.length} rows • {data.headers.length} columns
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-sm ml-auto">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search in table..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500/60 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Interactive Read-Only Table Container */}
      <div className="flex-1 overflow-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-white/20">
        <table className="w-full text-left text-xs border-collapse">
          {/* Header Row */}
          <thead className="sticky top-0 z-10 bg-[#161B22] border-b border-white/10 shadow-md">
            <tr>
              <th className="w-12 px-3 py-2.5 text-center font-mono text-[10px] text-white/40 bg-[#161B22]/90 border-r border-white/10 select-none">
                #
              </th>
              {data.headers.map((header, idx) => {
                const isSorted = sortCol === idx;
                return (
                  <th
                    key={idx}
                    onClick={() => handleSort(idx)}
                    className="px-4 py-2.5 font-semibold text-slate-200 hover:text-emerald-300 hover:bg-white/[0.04] cursor-pointer transition-colors border-r border-white/5 whitespace-nowrap select-none group"
                  >
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="truncate max-w-xs">{header || `Col ${idx + 1}`}</span>
                      <span className="text-white/40 group-hover:text-emerald-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body (Strictly Read-Only, Non-Editable Cells) */}
          <tbody className="divide-y divide-white/5">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.headers.length + 1}
                  className="py-12 text-center text-xs text-white/40 italic"
                >
                  No matching data rows found for &quot;{searchTerm}&quot;
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const actualIndex = (page - 1) * (pageSize || data.rows.length) + rowIdx + 1;
                return (
                  <tr
                    key={rowIdx}
                    className="hover:bg-white/[0.04] transition-colors odd:bg-white/[0.01] even:bg-transparent"
                  >
                    <td className="px-3 py-2 text-center font-mono text-[10px] text-white/30 border-r border-white/5 select-none">
                      {actualIndex}
                    </td>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-4 py-2 text-slate-300 font-sans border-r border-white/5 whitespace-nowrap max-w-md truncate hover:whitespace-normal transition-all"
                        title={cell}
                      >
                        {cell || <span className="text-white/20 italic">—</span>}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.03] border-t border-white/10 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 rounded bg-white/[0.08] border border-white/10 text-white text-xs focus:outline-none"
          >
            <option value={25} className="bg-[#161B22] text-white">25</option>
            <option value={50} className="bg-[#161B22] text-white">50</option>
            <option value={100} className="bg-[#161B22] text-white">100</option>
            <option value={0} className="bg-[#161B22] text-white">All ({filteredRows.length})</option>
          </select>
          {filteredRows.length !== data.rows.length && (
            <span className="text-emerald-400 font-medium ml-2">
              (Filtered from {data.rows.length} total)
            </span>
          )}
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            <span className="font-mono text-white/80">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
