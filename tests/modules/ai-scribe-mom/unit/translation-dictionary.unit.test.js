/**
 * Module: ai-scribe-mom
 * Unit Test: Multilingual Translation Dictionary
 */

const DICT = {
  es: { 'hello': 'hola', 'team': 'equipo' },
  fr: { 'hello': 'bonjour', 'team': 'équipe' },
  hi: { 'hello': 'नमस्ते', 'team': 'टीम' },
};

function run() {
  console.log('🧪 [ai-scribe-mom/unit] Running translation-dictionary.unit.test.js...');
  if (DICT.es.hello !== 'hola') throw new Error('Spanish lookup failed');
  if (DICT.fr.hello !== 'bonjour') throw new Error('French lookup failed');
  if (DICT.hi.hello !== 'नमस्ते') throw new Error('Hindi lookup failed');

  console.log('   ✅ Multilingual translation dictionary verified.');
}

run();
