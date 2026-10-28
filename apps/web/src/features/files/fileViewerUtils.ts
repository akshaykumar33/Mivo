/**
 * Utility helpers for Universal File Viewer
 * Supports CSV, PDF, Images, Docs (DOCX/DOC/MD/TXT), YouTube videos, PPTs, Code Snippets, Audio/Video & Generic files.
 * Strictly non-editable / read-only viewing.
 */

export type FileCategory =
  | 'csv'
  | 'pdf'
  | 'image'
  | 'youtube'
  | 'video'
  | 'audio'
  | 'doc'
  | 'presentation'
  | 'code'
  | 'archive'
  | 'generic';

export interface FileViewerItem {
  name: string;
  url: string;
  type?: string;
  size?: number;
  content?: string; // Optional raw string for snippets
  posterUrl?: string; // Companion poster frame extracted by FFmpeg
  isOptimized?: boolean; // FFmpeg +faststart enabled indicator
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Handles watch?v=, youtu.be/, /embed/, /v/, /shorts/
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

/**
 * Scan a text string and extract all YouTube URLs along with their video IDs
 */
export function extractYouTubeUrls(text: string): { url: string; videoId: string }[] {
  if (!text) return [];
  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s]+|youtu\.be\/[^\s]+|youtube\.com\/shorts\/[^\s]+|youtube\.com\/embed\/[^\s]+))/gi;
  const matches = text.match(urlRegex) || [];
  const seen = new Set<string>();
  const results: { url: string; videoId: string }[] = [];

  for (const rawUrl of matches) {
    const videoId = extractYouTubeId(rawUrl);
    if (videoId && !seen.has(videoId)) {
      seen.add(videoId);
      results.push({ url: rawUrl, videoId });
    }
  }

  return results;
}

/**
 * Get file extension cleanly in lowercase without dot
 */
export function getFileExtension(fileName?: string, url?: string): string {
  const target = fileName || url || '';
  const cleanTarget = target.split('?')[0].split('#')[0];
  const lastDot = cleanTarget.lastIndexOf('.');
  if (lastDot === -1) return '';
  return cleanTarget.substring(lastDot + 1).toLowerCase();
}

/**
 * Detect file category based on name, mimeType, and URL
 */
export function detectFileCategory(
  fileName?: string,
  mimeType?: string,
  url?: string
): FileCategory {
  const ext = getFileExtension(fileName, url);
  const mime = (mimeType || '').toLowerCase();
  const rawUrl = (url || '').toLowerCase();

  // Check YouTube first
  if (extractYouTubeId(rawUrl) || extractYouTubeId(fileName || '')) {
    return 'youtube';
  }

  // CSV / TSV / Tabular data
  if (['csv', 'tsv', 'tab'].includes(ext) || mime.includes('csv') || mime.includes('tab-separated')) {
    return 'csv';
  }

  // PDF
  if (ext === 'pdf' || mime.includes('pdf')) {
    return 'pdf';
  }

  // Images
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff'].includes(ext) ||
    mime.startsWith('image/')
  ) {
    return 'image';
  }

  // Video
  if (
    ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi', 'm4v'].includes(ext) ||
    mime.startsWith('video/')
  ) {
    return 'video';
  }

  // Audio
  if (
    ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext) ||
    mime.startsWith('audio/')
  ) {
    return 'audio';
  }

  // Presentations
  if (
    ['ppt', 'pptx', 'odp', 'key'].includes(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  ) {
    return 'presentation';
  }

  // Spreadsheet (XLSX, XLS) - If not raw CSV
  if (
    ['xlsx', 'xls', 'ods'].includes(ext) ||
    mime.includes('sheet') ||
    mime.includes('excel')
  ) {
    return 'csv'; // Can be viewed with Office/Google table viewer or CSV fallback
  }

  // Code Snippets & Source Files
  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'json',
      'html',
      'css',
      'scss',
      'less',
      'sql',
      'rs',
      'go',
      'sh',
      'bash',
      'zsh',
      'yaml',
      'yml',
      'xml',
      'java',
      'c',
      'cpp',
      'h',
      'hpp',
      'cs',
      'php',
      'rb',
      'swift',
      'kt',
      'lua',
      'env',
      'dockerfile',
      'prisma',
      'graphql',
      'gql',
    ].includes(ext)
  ) {
    return 'code';
  }

  // Documents
  if (
    ['docx', 'doc', 'md', 'markdown', 'txt', 'rtf', 'log', 'odt'].includes(ext) ||
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessingml') ||
    mime.includes('text/markdown') ||
    mime.includes('text/plain')
  ) {
    return 'doc';
  }

  // Archives
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext) || mime.includes('zip') || mime.includes('archive')) {
    return 'archive';
  }

  return 'generic';
}

/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Pure RFC 4180 CSV / TSV parser that supports quoted values and delimiter auto-detection
 */
export function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  if (!text || !text.trim()) {
    return { headers: [], rows: [] };
  }

  // Auto-detect delimiter: comma, tab, semicolon
  const firstLine = text.split(/\r\n|\n|\r/)[0] || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  } else if (semiCount > commaCount) {
    delimiter = ';';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0] || [];
  const bodyRows = rows.slice(1);

  // Normalize all rows to match header length
  const normalizedRows = bodyRows.map((r) => {
    if (r.length < headers.length) {
      return [...r, ...Array(headers.length - r.length).fill('')];
    }
    return r.slice(0, Math.max(headers.length, r.length));
  });

  return { headers, rows: normalizedRows };
}

/**
 * Detect language identifier for code display
 */
export function detectCodeLanguage(fileName?: string): string {
  const ext = getFileExtension(fileName);
  const map: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'React JSX',
    ts: 'TypeScript',
    tsx: 'React TSX',
    py: 'Python',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sql: 'SQL',
    rs: 'Rust',
    go: 'Go',
    sh: 'Bash / Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    cs: 'C#',
    php: 'PHP',
    rb: 'Ruby',
    swift: 'Swift',
    kt: 'Kotlin',
    lua: 'Lua',
    env: 'Env Config',
    prisma: 'Prisma Schema',
    graphql: 'GraphQL',
    gql: 'GraphQL',
    md: 'Markdown',
    txt: 'Plain Text',
  };
  return map[ext] || (ext ? ext.toUpperCase() : 'Code');
}

/**
 * Resolves a storage URL or file path against the backend API base when relative.
 * Converts `/api/v1/storage/files/...` to `http://localhost:4000/api/v1/storage/files/...`
 */
export function resolveStorageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:4000'
      : '');
  const cleanBase = apiBase.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath;
}
