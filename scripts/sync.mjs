import { lane, report } from './lib/run.mjs';
import { BUILD, select, SYNCS, usage } from './lib/tasks.mjs';

const startedAt = Date.now();
const names = process.argv.slice(2);
const picked = select(SYNCS, names);

if (picked.unknown) {
  console.error(`unknown target "${picked.unknown}"`);
  console.error(usage('sync', SYNCS));
  process.exit(1);
}

const ORDER = ['theme', 'shim', 'exports', 'tsconfig', 'props', 'skill'];
const ordered = ORDER.filter((name) => picked.includes(name));
const steps = ordered.flatMap((name) => (name === 'props' && !names.length ? [...BUILD, SYNCS[name]] : [SYNCS[name]]));

const results = await lane(steps);
const failures = report(results, (Date.now() - startedAt) / 1000);
process.exit(failures ? 1 : 0);
