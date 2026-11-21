import * as fs from 'fs';
import * as path from 'path';

const b = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

const outDir = path.resolve(__dirname, '../../public/icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), b);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), b);
fs.writeFileSync(path.join(outDir, 'icon-512-maskable.png'), b);

console.log('PWA placeholder icons successfully generated.');
