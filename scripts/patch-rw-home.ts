/**
 * Applies professional Kinyarwanda homepage translations onto rw.ts
 * Run after generate-rw-locale: npx tsx scripts/patch-rw-home.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rw from '../src/i18n/locales/rw.ts';
import rwHome from '../src/i18n/locales/overrides/rw-home.ts';
import { deepMerge } from '../src/i18n/utils/deepMerge.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function serialize(obj: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return JSON.stringify(obj);
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([key, value]) => {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return `${padInner}${safeKey}: ${serialize(value, indent + 1)},`;
    }
    return `${padInner}${safeKey}: ${JSON.stringify(value)},`;
  });
  return `{\n${lines.join('\n')}\n${pad}}`;
}

const merged = deepMerge(structuredClone(rw), { landing: { home: rwHome } });
const output = `const rw = ${serialize(merged)} as const;\n\nexport default rw;\n`;
fs.writeFileSync(path.join(__dirname, '../src/i18n/locales/rw.ts'), output, 'utf8');
console.log('Patched Kinyarwanda homepage translations in rw.ts');
