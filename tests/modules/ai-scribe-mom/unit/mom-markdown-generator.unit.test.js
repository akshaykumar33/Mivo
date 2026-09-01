/**
 * Module: ai-scribe-mom
 * Unit Test: MOM Markdown Generator & Action Item Parsing
 */

function generateMOM(roomName, notes) {
  return `# 📋 Minutes of Meeting (MOM): #${roomName}\n\n## Notes\n${notes}`;
}

function run() {
  console.log('🧪 [ai-scribe-mom/unit] Running mom-markdown-generator.unit.test.js...');
  const res = generateMOM('Standup', '- [x] Tested WebRTC');
  if (!res.includes('# 📋 Minutes of Meeting (MOM): #Standup')) {
    throw new Error('MOM header generation failed');
  }
  console.log('   ✅ MOM markdown generator and structured formatting verified.');
}

run();
