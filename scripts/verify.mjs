import { lane, report } from './lib/run.mjs';
import { BUILD, CHECKS } from './lib/tasks.mjs';

const startedAt = Date.now();

const STANDALONE = [
  'exports',
  'tsconfig',
  'typecheck:node',
  'typecheck:cli',
  'format',
  'css',
  'authoring',
  'contracts',
  'skill',
  'theme',
  'shim',
];
const DIST_DEPENDENT = ['usage', 'props'];

const independent = [...STANDALONE.map((name) => lane([CHECKS[name]])), lane(BUILD)];

const first = (await Promise.all(independent)).flat();
const buildBroken = first.some((result) => result.label.startsWith('build:') && result.code);

const second = buildBroken ? [] : (await Promise.all(DIST_DEPENDENT.map((name) => lane([CHECKS[name]])))).flat();

const failures = report([...first, ...second], (Date.now() - startedAt) / 1000);
if (buildBroken) console.error(`  ${DIST_DEPENDENT.join(' and ')} skipped - the build failed.`);
process.exit(failures ? 1 : 0);
