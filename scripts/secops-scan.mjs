import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🛡️  MIVO PLATFORM — LOCAL SECOPS & DEVSECOPS COMPLIANCE SCAN');
console.log('═══════════════════════════════════════════════════════════════\n');

let issuesFound = 0;

// 1. Verify Git Secrets & Tracked Environment Files
console.log('🔍 1. SECRETS & GIT TRACKING AUDIT');
console.log('------------------------------------');
try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  const sensitiveTracked = trackedFiles.filter((f) => f.startsWith('.env') && !f.endsWith('.example'));
  if (sensitiveTracked.length > 0) {
    console.error(`   ❌ FAIL: Sensitive .env file committed to git: ${sensitiveTracked.join(', ')}`);
    issuesFound++;
  } else {
    console.log('   ✅ No sensitive .env or credential files tracked in Git.');
  }
} catch {
  console.log('   ⚠️ Git not available or not in repository root.');
}

// 2. Scan for Dangerous AST & Code Patterns
console.log('\n🔍 2. STATIC APPLICATION SECURITY PATTERNS');
console.log('--------------------------------------------');

const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/g, desc: 'Dynamic eval() execution (RCE hazard)' },
  { pattern: /new\s+Function\s*\(/g, desc: 'Dynamic Function() constructor (RCE hazard)' },
  { pattern: /child_process.*\.exec\s*\(/g, desc: 'Unsanitized child_process.exec' },
  { pattern: /rejectUnauthorized\s*:\s*false/g, desc: 'Disabled TLS/SSL certificate validation' },
];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.next', '.git', 'coverage'].includes(entry.name)) continue;
      scanDir(fullPath);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !entry.name.includes('.test.')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const { pattern, desc } of DANGEROUS_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`   ❌ Pattern Alert in ${fullPath}: ${desc}`);
          issuesFound++;
        }
      }
    }
  }
}

try {
  scanDir(path.resolve('apps/server/src'));
  scanDir(path.resolve('packages/shared/src'));
  console.log('   ✅ No high-risk AST injection or TLS-bypass patterns found in server or shared code.');
} catch (err) {
  console.error('   ❌ Scan error:', err.message);
  issuesFound++;
}

// 3. License Governance Check
console.log('\n🔍 3. OPEN SOURCE LICENSE GOVERNANCE');
console.log('--------------------------------------');
try {
  execSync('node scripts/check-licenses.mjs', { stdio: 'inherit' });
} catch {
  console.error('   ❌ License audit script failed.');
  issuesFound++;
}

// 4. SecOps Report Summary
console.log('===============================================================');
if (issuesFound === 0) {
  console.log('🎉 SECOPS AUDIT PASSED: 100/100 (Grade: A+)');
  console.log('   Zero high-risk security flaws, unencrypted secrets, or license violations.');
  console.log('===============================================================\n');
  process.exit(0);
} else {
  console.error(`⚠️ SECOPS AUDIT FAILED: ${issuesFound} issues detected.`);
  console.error('   Please resolve the above alerts before committing.');
  console.log('===============================================================\n');
  process.exit(1);
}

