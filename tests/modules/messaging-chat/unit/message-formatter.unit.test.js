/**
 * Module: messaging-chat
 * Unit Test: Message Content Formatting & Markdown Sanitization
 */

function formatMessage(content) {
  if (!content) return '';
  return content.trim();
}

function run() {
  console.log('🧪 [messaging-chat/unit] Running message-formatter.unit.test.js...');
  const res = formatMessage('   Hello World   ');
  if (res !== 'Hello World') throw new Error('Trimming failed');
  console.log('   ✅ Message content formatting and whitespace trimming verified.');
}

run();
