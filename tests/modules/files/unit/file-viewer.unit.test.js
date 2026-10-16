import assert from 'node:assert';
import {
  detectFileCategory,
  extractYouTubeId,
  extractYouTubeUrls,
  parseDelimitedText,
  getFileExtension,
  formatFileSize,
  detectCodeLanguage,
} from '../../../../apps/web/src/features/files/fileViewerUtils.ts';

console.log('🧪 [files/unit] Testing Universal File Viewer utilities...');

// 1. YouTube ID and URL Extraction
const ytWatchUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const ytShortUrl = 'https://youtu.be/dQw4w9WgXcQ';
const ytEmbedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
const ytShortsUrl = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';

assert.strictEqual(extractYouTubeId(ytWatchUrl), 'dQw4w9WgXcQ', 'Should extract ID from watch URL');
assert.strictEqual(extractYouTubeId(ytShortUrl), 'dQw4w9WgXcQ', 'Should extract ID from short youtu.be URL');
assert.strictEqual(extractYouTubeId(ytEmbedUrl), 'dQw4w9WgXcQ', 'Should extract ID from embed URL');
assert.strictEqual(extractYouTubeId(ytShortsUrl), 'dQw4w9WgXcQ', 'Should extract ID from shorts URL');
assert.strictEqual(extractYouTubeId('https://example.com/video.mp4'), null, 'Non-YouTube URL should return null');

const mixedText = 'Check this out: https://youtu.be/dQw4w9WgXcQ and this one https://www.youtube.com/watch?v=jNQXAC9IVRw cool!';
const extracted = extractYouTubeUrls(mixedText);
assert.strictEqual(extracted.length, 2, 'Should extract both YouTube links');
assert.strictEqual(extracted[0].videoId, 'dQw4w9WgXcQ');
assert.strictEqual(extracted[1].videoId, 'jNQXAC9IVRw');
console.log('   ✅ YouTube extraction verified across all URL formats.');

// 2. Category Detection
assert.strictEqual(detectFileCategory('data.csv'), 'csv');
assert.strictEqual(detectFileCategory('export.tsv'), 'csv');
assert.strictEqual(detectFileCategory('report.pdf'), 'pdf');
assert.strictEqual(detectFileCategory('photo.png'), 'image');
assert.strictEqual(detectFileCategory('photo.jpg'), 'image');
assert.strictEqual(detectFileCategory('diagram.svg'), 'image');
assert.strictEqual(detectFileCategory('clip.mp4'), 'video');
assert.strictEqual(detectFileCategory('recording.mp3'), 'audio');
assert.strictEqual(detectFileCategory('pitch.pptx'), 'presentation');
assert.strictEqual(detectFileCategory('slides.ppt'), 'presentation');
assert.strictEqual(detectFileCategory('proposal.docx'), 'doc');
assert.strictEqual(detectFileCategory('readme.md'), 'doc');
assert.strictEqual(detectFileCategory('notes.txt'), 'doc');
assert.strictEqual(detectFileCategory('index.ts'), 'code');
assert.strictEqual(detectFileCategory('script.py'), 'code');
assert.strictEqual(detectFileCategory('query.sql'), 'code');
assert.strictEqual(detectFileCategory('archive.zip'), 'archive');
assert.strictEqual(detectFileCategory('binary.bin'), 'generic');
assert.strictEqual(detectFileCategory('video', undefined, ytWatchUrl), 'youtube');
console.log('   ✅ Format classification verified for CSV, PDF, Img, Doc, YT, PPT, Code, Audio/Video.');

// 3. Delimited Text / CSV Parser
const sampleCsv = `Name,Role,Country\n"Alice, Dr.",Engineer,USA\nBob,Designer,"United Kingdom"\nCharlie,Manager,Canada`;
const parsed = parseDelimitedText(sampleCsv);
assert.strictEqual(parsed.headers.length, 3);
assert.deepStrictEqual(parsed.headers, ['Name', 'Role', 'Country']);
assert.strictEqual(parsed.rows.length, 3);
assert.strictEqual(parsed.rows[0][0], 'Alice, Dr.', 'Should respect commas inside quotes');
assert.strictEqual(parsed.rows[1][2], 'United Kingdom');

// Delimiter auto-detection: Tab-separated
const sampleTsv = `ID\tProduct\tPrice\n1\tLaptop\t$1200\n2\tMouse\t$25`;
const parsedTsv = parseDelimitedText(sampleTsv);
assert.strictEqual(parsedTsv.headers.length, 3);
assert.strictEqual(parsedTsv.headers[1], 'Product');
assert.strictEqual(parsedTsv.rows[0][1], 'Laptop');
console.log('   ✅ CSV and TSV parsing with quote handling verified.');

// 4. File Size and Language Detection
assert.strictEqual(formatFileSize(0), '0 B');
assert.strictEqual(formatFileSize(1024), '1 KB');
assert.strictEqual(formatFileSize(1048576), '1 MB');
assert.strictEqual(detectCodeLanguage('server.ts'), 'TypeScript');
assert.strictEqual(detectCodeLanguage('app.py'), 'Python');
assert.strictEqual(detectCodeLanguage('schema.sql'), 'SQL');
console.log('   ✅ File sizing and code language labels verified.');

console.log('🎉 All file viewer unit tests passed successfully!\n');
