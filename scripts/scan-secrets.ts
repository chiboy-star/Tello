import * as fs from 'fs';
import * as path from 'path';

const patterns = [
  { name: 'Supabase secret key', regex: /sb_secret_[a-zA-Z0-9_\-]{16,}/ },
  { name: 'Supabase publishable key', regex: /sb_publishable_[a-zA-Z0-9_\-]{16,}/ },
  { name: 'Google AI Studio / Gemini API key', regex: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Supabase Service Role reference in code', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-\.]{20,}/ },
];

const ignoredDirs = new Set(['node_modules', '.next', '.git', 'test-results', 'playwright-report', 'coverage', 'tmp']);

let issuesFound = 0;

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        scanDir(fullPath);
      }
    } else if (entry.isFile()) {
      // Ignore env files except .env.example
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') {
        continue;
      }
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.ico') || entry.name.endsWith('.webm')) {
        continue;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of patterns) {
        const match = content.match(pattern.regex);
        if (match) {
          console.error(`[SECRET FOUND] ${pattern.name} in ${fullPath}: "${match[0].slice(0, 10)}..."`);
          issuesFound++;
        }
      }
    }
  }
}

console.log('Running secret scan across repository...');
scanDir(process.cwd());
if (issuesFound === 0) {
  console.log('PASSED: Zero secrets, service keys, AIza keys, or live JWT tokens found in tracked files.');
} else {
  console.error(`FAILED: ${issuesFound} secret issue(s) detected!`);
  process.exit(1);
}
