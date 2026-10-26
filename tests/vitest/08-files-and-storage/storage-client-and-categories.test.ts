import { describe, it, expect } from 'vitest';
import {
  detectFileCategory,
  formatFileSize,
  extractYouTubeId,
  extractYouTubeUrls,
  parseDelimitedText,
  getFileExtension,
} from '@/features/files/fileViewerUtils';

describe('Universal Files & Document Storage Engine', () => {
  it('accurately parses and cleans file extensions ignoring query parameters and hashes', () => {
    expect(getFileExtension('architecture_diagram.png')).toBe('png');
    expect(getFileExtension('sprint_report.pdf?token=secret#page=2')).toBe('pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('no_extension_file')).toBe('');
  });

  it('classifies all standard file formats into their respective viewer categories', () => {
    expect(detectFileCategory('data.csv')).toBe('csv');
    expect(detectFileCategory('data.tsv')).toBe('csv');
    expect(detectFileCategory('spec.pdf')).toBe('pdf');
    expect(detectFileCategory('banner.webp')).toBe('image');
    expect(detectFileCategory('diagram.svg')).toBe('image');
    expect(detectFileCategory('demo.mp4')).toBe('video');
    expect(detectFileCategory('screencast.webm')).toBe('video');
    expect(detectFileCategory('podcast.mp3')).toBe('audio');
    expect(detectFileCategory('pitch.pptx')).toBe('presentation');
    expect(detectFileCategory('script.ts')).toBe('code');
    expect(detectFileCategory('algorithm.py')).toBe('code');
    expect(detectFileCategory('readme.md')).toBe('doc');
    expect(detectFileCategory('contract.docx')).toBe('doc');
    expect(detectFileCategory('bundle.zip')).toBe('archive');
    expect(detectFileCategory('binary.dat')).toBe('generic');
  });

  it('extracts YouTube IDs and URLs reliably across desktop, short, and embed formats', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');

    const multiText = 'Check out https://youtu.be/dQw4w9WgXcQ and also https://www.youtube.com/watch?v=9bZkp7q19f0 in today demo';
    const extracted = extractYouTubeUrls(multiText);
    expect(extracted).toHaveLength(2);
    expect(extracted[0].videoId).toBe('dQw4w9WgXcQ');
    expect(extracted[1].videoId).toBe('9bZkp7q19f0');
  });

  it('formats byte quantities into human-readable metric measurements', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
    expect(formatFileSize(undefined)).toBe('Unknown size');
  });

  it('parses delimited CSV and TSV content supporting headers, rows, and auto-detection', () => {
    const csvContent = 'id,name,role\n1,Alice,Engineer\n2,Bob,Architect';
    const parsedCsv = parseDelimitedText(csvContent);
    expect(parsedCsv.headers).toEqual(['id', 'name', 'role']);
    expect(parsedCsv.rows).toEqual([
      ['1', 'Alice', 'Engineer'],
      ['2', 'Bob', 'Architect'],
    ]);

    const tsvContent = 'id\tproduct\tprice\n101\tSFU Engine\tFree';
    const parsedTsv = parseDelimitedText(tsvContent);
    expect(parsedTsv.headers).toEqual(['id', 'product', 'price']);
    expect(parsedTsv.rows).toEqual([['101', 'SFU Engine', 'Free']]);
  });
});
