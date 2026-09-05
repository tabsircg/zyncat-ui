import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from './lib/entries.mjs';

const DECISIONS = 'src/tokens/decisions.css';
const TOKENS_DIR = 'src/tokens';
const HISTORY = 'packages/zyncat-ui/src/theme-file.ts';

const failures = [];
const fail = (message, ...detail) => failures.push([message, ...detail.map((line) => `  ${line}`)]);

const stop = (message, ...detail) => {
  console.error(`✗ ${message}`);
  for (const line of detail) console.error(`  ${line}`);
  process.exit(1);
};

const decisionsCss = readFileSync(join(ROOT, DECISIONS), 'utf8');
const historyTs = readFileSync(join(ROOT, HISTORY), 'utf8');
const tokenCss = readdirSync(join(ROOT, TOKENS_DIR))
  .filter((name) => name.endsWith('.css'))
  .map((name) => readFileSync(join(ROOT, TOKENS_DIR, name), 'utf8'))
  .join('\n');

const rootBody = /^[ \t]*:root\b[^{]*\{([\s\S]*?)\n[ \t]*\}/m.exec(decisionsCss);
if (!rootBody) stop(`${DECISIONS} has no :root block - the CLI reads it to write zyncat.theme.css.`);

const declared = [...rootBody[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);

const baseline = /BASELINE_VERSION\s*=\s*'([\d.]+)'/.exec(historyTs);
if (!baseline) stop(`${HISTORY} has no BASELINE_VERSION.`);

const historyBlock = /TOKEN_HISTORY:\s*Record<string,\s*TokenNote>\s*=\s*\{([\s\S]*?)\};/.exec(historyTs);
if (!historyBlock) stop(`${HISTORY} has no TOKEN_HISTORY map.`);

const notes = new Map(
  [...historyBlock[1].matchAll(/'(--[\w-]+)':\s*\{([^}]*)\}/g)].map(([, name, body]) => [
    name,
    {
      since: /since:\s*'([\d.]+)'/.exec(body)?.[1],
      deprecated: /deprecated:\s*'([\d.]+)'/.exec(body)?.[1],
      removed: /removed:\s*'([\d.]+)'/.exec(body)?.[1],
      use: /use:\s*'(--[\w-]+)'/.exec(body)?.[1],
    },
  ]),
);

const BASELINE = new Set([
  '--accent',
  '--success',
  '--warning',
  '--danger',
  '--neutral',
  '--radius',
  '--font-body',
  '--font-code',
]);

const order = (version) => version.split('.').map(Number);
const olderThan = (a, b) => {
  const [x, y] = [order(a), order(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
};

const defines = (name) => new RegExp(`^\\s*${name}\\s*:`, 'm').test(tokenCss);
const readsAsFallback = (name) => tokenCss.includes(`var(${name},`) || tokenCss.includes(`var(${name})`);

const missing = declared.filter((name) => !BASELINE.has(name) && !notes.get(name)?.since);
if (missing.length)
  fail(
    `${DECISIONS} declares ${missing.length} decision(s) with no "since" in TOKEN_HISTORY.`,
    `Add them to ${HISTORY}, or "zyncat-ui update" will never offer them to a project:`,
    ...missing.map((name) => `  '${name}': { since: '<the version that ships it>' },`),
  );

const everShipped = [...BASELINE, ...[...notes].filter(([, note]) => note.since).map(([name]) => name)];
const vanished = everShipped.filter(
  (name) => !declared.includes(name) && !notes.get(name)?.deprecated && !notes.get(name)?.removed,
);
if (vanished.length)
  fail(
    `${vanished.length} decision(s) the library has shipped are gone from ${DECISIONS} with nothing in TOKEN_HISTORY.`,
    'Every project that sets one is silently on the default now. Deprecate first - alias the survivor to it,',
    'ship a release, then remove:',
    ...vanished.map((name) => `  '${name}': { deprecated: '<this version>', use: '--<the survivor>' },`),
  );

for (const [name, note] of notes) {
  if (note.removed && !note.deprecated)
    fail(
      `${name} is marked removed in ${note.removed} with no deprecation before it.`,
      'A token has to ship deprecated - aliased and still working - for at least one release first.',
      `  '${name}': { deprecated: '<earlier version>', removed: '${note.removed}', use: '--<replacement>' },`,
    );

  if (note.removed && note.deprecated && !olderThan(note.deprecated, note.removed))
    fail(
      `${name} is deprecated in ${note.deprecated} and removed in ${note.removed}.`,
      'The deprecation has to land in an earlier release than the removal.',
    );

  if (note.deprecated && !note.removed && note.use && !readsAsFallback(name))
    fail(
      `${name} is deprecated but nothing in ${TOKENS_DIR} reads it, so a project setting it is already broken.`,
      `While it is deprecated, ${note.use} must fall back to it:`,
      `  ${note.use}: var(${name}, <the default>);`,
    );

  if (note.deprecated && !note.removed && defines(name))
    fail(
      `${name} is deprecated but ${TOKENS_DIR} still defines it.`,
      'A deprecated token is read as a fallback, never defined - the definition would shadow the project value.',
    );

  if (note.removed && (defines(name) || readsAsFallback(name)))
    fail(
      `${name} is marked removed in ${note.removed} but ${TOKENS_DIR} still references it.`,
      'Drop the alias in the same release that marks it removed.',
    );

  if (note.use && !defines(note.use)) fail(`${name} points at ${note.use}, which ${TOKENS_DIR} does not define.`);
}

if (failures.length) {
  for (const [message, ...detail] of failures) {
    console.error(`✗ ${message}`);
    for (const line of detail) console.error(line);
  }
  process.exit(1);
}

const tracked = declared.filter((name) => !BASELINE.has(name)).length;
const deprecated = [...notes.values()].filter((note) => note.deprecated && !note.removed).length;
const removed = [...notes.values()].filter((note) => note.removed).length;
console.log(
  `check-token-history: ${declared.length} decisions, ${BASELINE.size} baseline at v${baseline[1]}, ${tracked} tracked since, ${deprecated} deprecated, ${removed} removed.`,
);
