// Official WCAG 2.1 Contrast Ratio Calculator for Tallo design tokens

function sRGBtoLin(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const L1 = getLuminance(hex1);
  const L2 = getLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const tokens = {
  light: {
    bg: '#F7F6F2',
    surface: '#FFFFFF',
    surface2: '#EFEDE6',
    border: '#E2DFD5',
    text: '#14201B',
    textMuted: '#5B6760',
    brand: '#0E7C57',
    brandHover: '#0B6647',
    brandSoft: '#DDF1E8',
    onBrand: '#FFFFFF',
    accent: '#F5B83D',
    accentSoft: '#FDF0D0',
    danger: '#C8372D',
    dangerSoft: '#FBE4E1',
    warning: '#B7791F',
  },
  dark: {
    bg: '#0E1512',
    surface: '#151E1A',
    surface2: '#1C2722',
    border: '#2A3731',
    text: '#EAF0EC',
    textMuted: '#9AA9A1',
    brand: '#3CC38C',
    brandHover: '#5ED3A3',
    brandSoft: '#143A2B',
    onBrand: '#08140F',
    accent: '#F5B83D',
    accentSoft: '#3A2E10',
    danger: '#F07A70',
    dangerSoft: '#3A1714',
    warning: '#E5A94B',
  },
};

console.log('=== WCAG 2.1 Contrast Ratio Verification ===\n');

console.log('--- Light Theme ---');
const lightPairs: [string, string, string][] = [
  ['text on surface (#14201B on #FFFFFF)', tokens.light.text, tokens.light.surface],
  ['text on bg (#14201B on #F7F6F2)', tokens.light.text, tokens.light.bg],
  ['text-muted on surface (#5B6760 on #FFFFFF)', tokens.light.textMuted, tokens.light.surface],
  ['text-muted on bg (#5B6760 on #F7F6F2)', tokens.light.textMuted, tokens.light.bg],
  ['on-brand on brand (#FFFFFF on #0E7C57)', tokens.light.onBrand, tokens.light.brand],
  ['brand on surface (#0E7C57 on #FFFFFF)', tokens.light.brand, tokens.light.surface],
  ['danger on surface (#C8372D on #FFFFFF)', tokens.light.danger, tokens.light.surface],
  ['danger on danger-soft (#C8372D on #FBE4E1)', tokens.light.danger, tokens.light.dangerSoft],
  ['warning on surface (#B7791F on #FFFFFF)', tokens.light.warning, tokens.light.surface],
];

for (const [desc, fg, bg] of lightPairs) {
  const cr = contrastRatio(fg, bg);
  const aa = cr >= 4.5 ? 'PASS (AA)' : cr >= 3.0 ? 'PASS (AA-large/UI)' : 'FAIL';
  console.log(`${desc.padEnd(46)} -> ${cr.toFixed(2)}:1 [${aa}]`);
}

console.log('\n--- Dark Theme ---');
const darkPairs: [string, string, string][] = [
  ['text on surface (#EAF0EC on #151E1A)', tokens.dark.text, tokens.dark.surface],
  ['text on bg (#EAF0EC on #0E1512)', tokens.dark.text, tokens.dark.bg],
  ['text-muted on surface (#9AA9A1 on #151E1A)', tokens.dark.textMuted, tokens.dark.surface],
  ['text-muted on bg (#9AA9A1 on #0E1512)', tokens.dark.textMuted, tokens.dark.bg],
  ['on-brand on brand (#08140F on #3CC38C)', tokens.dark.onBrand, tokens.dark.brand],
  ['brand on surface (#3CC38C on #151E1A)', tokens.dark.brand, tokens.dark.surface],
  ['danger on surface (#F07A70 on #151E1A)', tokens.dark.danger, tokens.dark.surface],
  ['danger on danger-soft (#F07A70 on #3A1714)', tokens.dark.danger, tokens.dark.dangerSoft],
  ['warning on surface (#E5A94B on #151E1A)', tokens.dark.warning, tokens.dark.surface],
];

for (const [desc, fg, bg] of darkPairs) {
  const cr = contrastRatio(fg, bg);
  const aa = cr >= 4.5 ? 'PASS (AA)' : cr >= 3.0 ? 'PASS (AA-large/UI)' : 'FAIL';
  console.log(`${desc.padEnd(46)} -> ${cr.toFixed(2)}:1 [${aa}]`);
}
