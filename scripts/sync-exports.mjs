import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { distTypesPath, publicEntries, ROOT } from './lib/entries.mjs';

const PKG_PATH = join(ROOT, 'package.json');
const TAIL_KEYS = ['./styles.css', './tailwind.css', './next', './package.json'];

const write = process.argv.includes('--write');
const raw = readFileSync(PKG_PATH, 'utf8');
const pkg = JSON.parse(raw);

const expected = new Map(
  Object.entries(publicEntries()).map(([name, source]) => [
    `./${name}`,
    { source: `./${source}`, types: `./${distTypesPath(source)}`, import: `./dist/${name}.js` },
  ]),
);

const problems = [];
const next = {};
for (const [key, value] of Object.entries(pkg.exports)) {
  const want = expected.get(key);
  if (!want) {
    if (!TAIL_KEYS.includes(key))
      problems.push(`package.json exports "${key}" has no source module - delete it, or add the component back.`);
    next[key] = value;
    continue;
  }
  for (const field of ['source', 'types', 'import'])
    if (value?.[field] !== want[field])
      problems.push(`package.json exports "${key}".${field} is "${value?.[field]}", expected "${want[field]}".`);
  next[key] = want;
  expected.delete(key);
}

for (const [key, value] of expected) {
  problems.push(`package.json has no exports entry for "${key}" - nothing can import it.`);
  next[key] = value;
}

const ordered = {};
for (const key of Object.keys(next)) if (!TAIL_KEYS.includes(key)) ordered[key] = next[key];
for (const key of TAIL_KEYS) if (key in next) ordered[key] = next[key];

if (!problems.length) {
  console.log(`sync-exports: ${Object.keys(pkg.exports).length} exports entries match the source tree.`);
  process.exit(0);
}

if (!write) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(`\n${problems.length} exports-map problem(s) - run "pnpm sync exports" to fix.`);
  process.exit(1);
}

pkg.exports = ordered;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
for (const problem of problems) console.log(`fixed: ${problem}`);
console.log(`sync-exports: package.json updated, ${Object.keys(ordered).length} exports entries.`);
