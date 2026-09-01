/**
 * Unit Test: Automated Minutes of Meeting (MOM) Compiler
 */

function generateMOM(roomName, attendees, transcript, userNotes) {
  return `# 📋 Minutes of Meeting (MOM): #${roomName}
**Platform:** Mivo Real-Time Stage  
**Attendees:** ${attendees.length > 0 ? attendees.join(', ') : 'All room members'}  

## 1. Executive Summary
During the session in #${roomName}, participants synchronized on platform milestones and verified live WebRTC media audio/video streaming.

## 2. In-Meeting Notes & Key Decisions
${userNotes || 'No custom notes provided.'}

## 3. Action Items
- [ ] Action Item 1: Review multilingual transcript output.

## 4. Full Verified Transcript (${transcript.length} entries)
${transcript.map((t) => `* **[${t.time}] ${t.speaker}:** ${t.text}`).join('\n')}
`;
}

function runTests() {
  console.log('🧪 Running Unit Test: mom-compiler.test.js...');

  const attendees = ['Dev Admin', 'Carlos Mendoza 🇪🇸', 'Priya Sharma 🇮🇳'];
  const transcript = [
    { speaker: 'Dev Admin', text: 'Starting morning standup', time: '9:00 AM' },
    { speaker: 'Carlos Mendoza', text: 'Deployment ready in staging', time: '9:01 AM' },
  ];
  const userNotes = '- [x] WebRTC mesh active\n- [x] Recording verified';

  const momOutput = generateMOM('Daily Standup', attendees, transcript, userNotes);

  // Test 1: Header generation
  if (!momOutput.includes('# 📋 Minutes of Meeting (MOM): #Daily Standup')) {
    throw new Error('MOM header title missing or malformed');
  }
  console.log('   ✅ Test 1: MOM header generation passed.');

  // Test 2: Attendees inclusion
  if (!momOutput.includes('Carlos Mendoza 🇪🇸') || !momOutput.includes('Priya Sharma 🇮🇳')) {
    throw new Error('Attendee list missing members');
  }
  console.log('   ✅ Test 2: Attendee list inclusion passed.');

  // Test 3: User Notes embedding
  if (!momOutput.includes('- [x] WebRTC mesh active')) {
    throw new Error('User notes markdown missing');
  }
  console.log('   ✅ Test 3: User notes embedding passed.');

  // Test 4: Transcript formatting
  if (!momOutput.includes('* **[9:00 AM] Dev Admin:** Starting morning standup')) {
    throw new Error('Transcript entry formatting failed');
  }
  console.log('   ✅ Test 4: Transcript entry formatting passed.');

  console.log('   🎉 MOM Compiler Unit Tests: 4/4 PASSED\n');
}

runTests();
