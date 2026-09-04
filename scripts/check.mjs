import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT } from './lib/entries.mjs';
import { lane, report } from './lib/run.mjs';
import { CHECKS, NEEDS_DIST, select, usage } from './lib/tasks.mjs';

const startedAt = Date.now();
const argv = process.argv.slice(2);
const flags = argv.filter((arg) => arg.startsWith('-'));
const picked = select(
  CHECKS,
  argv.filter((arg) => !arg.startsWith('-')),
);

if (picked.unknown) {
  console.error(`unknown check "${picked.unknown}"`);
  console.error(usage('check', CHECKS));
  process.exit(1);
}

const hasDist = existsSync(resolve(ROOT, 'dist'));
const runnable = picked.filter((name) => hasDist || !NEEDS_DIST.has(name));
const skipped = picked.filter((name) => !runnable.includes(name));

const results = (await Promise.all(runnable.map((name) => lane([() => CHECKS[name](...flags)])))).flat();
const failures = report(results, (Date.now() - startedAt) / 1000);
if (skipped.length) console.error(`  ${skipped.join(', ')} skipped - no dist/. Run pnpm build first.`);
process.exit(failures ? 1 : 0);
