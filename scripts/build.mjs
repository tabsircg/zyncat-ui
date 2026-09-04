import { spawn } from 'node:child_process';

import { ROOT } from './lib/entries.mjs';
import { bin, lane, report } from './lib/run.mjs';
import { BUILD } from './lib/tasks.mjs';

const [target] = process.argv.slice(2);

const passthrough = (command, args) =>
  new Promise((done) => spawn(command, args, { cwd: ROOT, env: process.env, stdio: 'inherit' }).on('close', done));

if (target === 'watch') process.exit((await passthrough(bin('tsup'), ['--watch'])) ?? 1);
if (target === 'docs')
  process.exit((await passthrough('pnpm', ['turbo', 'run', 'build', '--filter=zyncat-ui-docs'])) ?? 1);

if (target) {
  console.error(`unknown target "${target}"`);
  console.error('usage: pnpm build [docs | watch]');
  process.exit(1);
}

const startedAt = Date.now();
const results = await lane(BUILD);
process.exit(report(results, (Date.now() - startedAt) / 1000) ? 1 : 0);
