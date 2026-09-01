/**
 * Unit Test: Multilingual Translation Engine
 */

const DICT = {
  es: {
    'starting our architecture sync': 'iniciando nuestra sincronización de arquitectura',
    'we are ready to deploy': 'estamos listos para desplegar',
    'sounds good': 'suena bien',
  },
  fr: {
    'starting our architecture sync': 'démarrage de notre synchronisation architecturale',
    'we are ready to deploy': 'nous sommes prêts à déployer',
  },
  hi: {
    'starting our architecture sync': 'हमारा आर्किटेक्चर सिंक शुरू हो रहा है',
    'we are ready to deploy': 'हम परिनियोजन के लिए तैयार हैं',
  },
};

function translateText(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  const lower = text.toLowerCase().trim();
  const dict = DICT[targetLang];
  if (dict) {
    for (const [phrase, translated] of Object.entries(dict)) {
      if (lower.includes(phrase)) {
        return text.replace(new RegExp(phrase, 'gi'), translated);
      }
    }
  }
  return `[${targetLang.toUpperCase()}]: ${text}`;
}

function runTests() {
  console.log('🧪 Running Unit Test: translation-engine.test.js...');

  // Test 1: Spanish Translation Match
  const esResult = translateText('We are ready to deploy', 'es');
  if (esResult !== 'estamos listos para desplegar') {
    throw new Error(`Expected Spanish translation, got: ${esResult}`);
  }
  console.log('   ✅ Test 1: Spanish phrase dictionary lookup passed.');

  // Test 2: French Translation Match
  const frResult = translateText('We are ready to deploy', 'fr');
  if (frResult !== 'nous sommes prêts à déployer') {
    throw new Error(`Expected French translation, got: ${frResult}`);
  }
  console.log('   ✅ Test 2: French phrase dictionary lookup passed.');

  // Test 3: Hindi Translation Match
  const hiResult = translateText('starting our architecture sync', 'hi');
  if (hiResult !== 'हमारा आर्किटेक्चर सिंक शुरू हो रहा है') {
    throw new Error(`Expected Hindi translation, got: ${hiResult}`);
  }
  console.log('   ✅ Test 3: Hindi phrase dictionary lookup passed.');

  // Test 4: Pass-through for English
  const enResult = translateText('Hello World', 'en');
  if (enResult !== 'Hello World') {
    throw new Error(`Expected identity for en, got: ${enResult}`);
  }
  console.log('   ✅ Test 4: English identity pass-through passed.');

  // Test 5: Fallback Prefix for unknown phrases
  const fallbackResult = translateText('Random custom text', 'ja');
  if (!fallbackResult.startsWith('[JA]:')) {
    throw new Error(`Expected fallback prefix [JA]:, got: ${fallbackResult}`);
  }
  console.log('   ✅ Test 5: Dynamic language fallback prefixing passed.');

  console.log('   🎉 Translation Engine Unit Tests: 5/5 PASSED\n');
}

runTests();
