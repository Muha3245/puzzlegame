const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs'),
  path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.cjs'),
];

const replacements = [
  [
    /otelModulePromise = import\([^;]+OTEL_PKG\)\.catch\(\(\) => null\);/g,
    'otelModulePromise = Promise.resolve(null);',
  ],
  [
    /otelModulePromise = Promise\.resolve\(\)\.then\(\(\) => require\(OTEL_PKG\)\)\.catch\(\(\) => null\);/g,
    'otelModulePromise = Promise.resolve(null);',
  ],
];

let patched = 0;

for (const file of candidates) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const before = fs.readFileSync(file, 'utf8');
  let after = before;

  for (const [pattern, replacement] of replacements) {
    after = after.replace(pattern, replacement);
  }

  if (after !== before) {
    fs.writeFileSync(file, after);
    patched += 1;
  }
}

console.log(`Supabase Hermes patch checked (${patched} file${patched === 1 ? '' : 's'} updated).`);
