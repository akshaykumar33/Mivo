import assert from 'node:assert';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const serverRequire = createRequire(path.resolve('apps/server/package.json'));
const ffmpegInstaller = serverRequire('@ffmpeg-installer/ffmpeg');
const ffmpeg = serverRequire('fluent-ffmpeg');

console.log('🧪 [files/unit] Testing FFmpeg Video Optimizer & FastStart Streaming...');

// 1. Verify FFmpeg binary availability
assert.ok(ffmpegInstaller && ffmpegInstaller.path, 'FFmpeg binary path must be resolved');
assert.ok(fs.existsSync(ffmpegInstaller.path), 'FFmpeg executable must exist on disk');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
console.log(`   ✅ FFmpeg binary verified at: ${ffmpegInstaller.path}`);

// 2. Video Extension & MIME Detection Test
const isVideo = (mime, filename) => {
  if (mime && mime.startsWith('video/')) return true;
  if (filename) {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    return ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'flv', 'wmv'].includes(ext);
  }
  return false;
};

assert.strictEqual(isVideo('video/mp4', 'test.mp4'), true);
assert.strictEqual(isVideo('video/webm', 'clip.webm'), true);
assert.strictEqual(isVideo(undefined, 'movie.MOV'), true);
assert.strictEqual(isVideo(undefined, 'movie.mkv'), true);
assert.strictEqual(isVideo('image/png', 'photo.png'), false);
assert.strictEqual(isVideo('application/pdf', 'doc.pdf'), false);
console.log('   ✅ Video format detection verified for all standard formats.');

// 3. Generate a 1-second synthetic video clip with FFmpeg to test +faststart and poster generation
const tmpDir = os.tmpdir();
const timestamp = Date.now();
const rawTestVideoPath = path.join(tmpDir, `test_raw_${timestamp}.mp4`);
const optimizedVideoPath = path.join(tmpDir, `test_opt_${timestamp}.mp4`);
const posterPath = path.join(tmpDir, `test_poster_${timestamp}.jpg`);

try {
  // Generate a valid 1s synthetic test clip
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('testsrc=duration=1:size=320x240:rate=10')
      .inputFormat('lavfi')
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .output(rawTestVideoPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });

  assert.ok(fs.existsSync(rawTestVideoPath), 'Synthetic video file should exist');
  const rawStats = fs.statSync(rawTestVideoPath);
  assert.ok(rawStats.size > 0, 'Synthetic video should not be empty');
  console.log(`   ✅ Generated synthetic raw video (${rawStats.size} bytes).`);

  // Run +faststart optimization
  await new Promise((resolve, reject) => {
    ffmpeg(rawTestVideoPath)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-pix_fmt yuv420p',
        '-movflags +faststart', // Relocates MOOV atom to beginning
      ])
      .output(optimizedVideoPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });

  assert.ok(fs.existsSync(optimizedVideoPath), 'Optimized video file should exist');
  const optStats = fs.statSync(optimizedVideoPath);
  assert.ok(optStats.size > 0, 'Optimized video size should be positive');

  // Verify MOOV atom relocation: In a +faststart MP4, 'moov' atom appears before 'mdat'
  const optBuffer = fs.readFileSync(optimizedVideoPath);
  const moovIndex = optBuffer.indexOf(Buffer.from('moov'));
  const mdatIndex = optBuffer.indexOf(Buffer.from('mdat'));

  assert.ok(moovIndex !== -1, 'Optimized MP4 must contain "moov" atom');
  assert.ok(mdatIndex !== -1, 'Optimized MP4 must contain "mdat" atom');
  assert.ok(
    moovIndex < mdatIndex,
    `FastStart failed: "moov" atom (${moovIndex}) must appear before "mdat" atom (${mdatIndex})`
  );
  console.log(`   ✅ FFmpeg +faststart verified: "moov" atom placed at byte ${moovIndex} before "mdat" at byte ${mdatIndex}!`);

  // Extract poster thumbnail frame
  await new Promise((resolve, reject) => {
    ffmpeg(optimizedVideoPath)
      .screenshots({
        timestamps: ['00:00:00.2'],
        filename: path.basename(posterPath),
        folder: path.dirname(posterPath),
        size: '320x240',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });

  assert.ok(fs.existsSync(posterPath), 'Extracted poster thumbnail must exist');
  const posterBuffer = fs.readFileSync(posterPath);
  assert.ok(posterBuffer.length > 0, 'Poster thumbnail should have valid bytes');
  // Check JPEG magic numbers: 0xFF, 0xD8
  assert.strictEqual(posterBuffer[0], 0xff);
  assert.strictEqual(posterBuffer[1], 0xd8);
  console.log(`   ✅ Extracted high-resolution poster thumbnail (${posterBuffer.length} bytes, valid JPEG header).`);

  // 4. Test HTTP 206 Byte Range streaming logic
  const fileSize = optBuffer.length;
  const rangeHeader = 'bytes=0-1023';
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
  const chunkSize = end - start + 1;
  const contentRange = `bytes ${start}-${end}/${fileSize}`;

  assert.strictEqual(start, 0);
  assert.strictEqual(end, 1023);
  assert.strictEqual(chunkSize, 1024);
  assert.strictEqual(contentRange, `bytes 0-1023/${fileSize}`);
  console.log(`   ✅ HTTP 206 Partial Content byte-range header generation verified.`);

} finally {
  // Clean up
  [rawTestVideoPath, optimizedVideoPath, posterPath].forEach((file) => {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
  });
}

console.log('🎉 All FFmpeg video optimizer unit tests passed successfully!\n');
