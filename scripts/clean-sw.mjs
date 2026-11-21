import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir);
  for (const file of files) {
    if (
      file === 'sw.js' ||
      file === 'sw.js.map' ||
      file.startsWith('swe-worker-') ||
      file.startsWith('workbox-')
    ) {
      const fullPath = path.join(publicDir, file);
      try {
        fs.unlinkSync(fullPath);
        console.log(`[clean-sw] Removed stale file: ${file}`);
      } catch (err) {
        console.warn(`[clean-sw] Could not remove ${file}:`, err instanceof Error ? err.message : String(err));
      }
    }
  }
}
