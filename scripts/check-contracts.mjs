import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

import { ROOT } from './lib/entries.mjs';

const write = process.argv.includes('--write');
const BASELINE_PATH = join(ROOT, 'scripts/contracts-baseline.json');

const SKIP_DIRS = new Set(['node_modules', '.next', 'out', 'dist', 'temp', '.git']);

function walk(dir, exts) {
  const results = [];
  function step(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) step(full);
      else if (exts.some((ext) => entry.name.endsWith(ext))) results.push(full);
    }
  }
  step(dir);
  return results;
}

const rel = (file) => relative(ROOT, file);
const failures = [];
const fail = (file, message) => failures.push(`${rel(file)}: ${message}`);

const debts = {};
const debt = (rule, file) => {
  const byFile = (debts[rule] ??= {});
  byFile[rel(file)] = (byFile[rel(file)] ?? 0) + 1;
};

const tsFiles = walk(join(ROOT, 'src'), ['.ts', '.tsx']).filter((f) => !f.endsWith('.d.ts'));
const cssFiles = walk(join(ROOT, 'src'), ['.css']);

const under = (file, prefix) => rel(file).startsWith(prefix);
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const ENGINE = 'src/engine/';
const DEV = 'src/components/dev/';
const TOKENS = 'src/tokens/';
const MEDIA_QUERY_HOOK = 'src/components/internal/hooks/use-media-query.ts';

for (const file of tsFiles) {
  const text = readFileSync(file, 'utf8');

  if (!under(file, ENGINE)) {
    for (const match of text.matchAll(/\btransitionend\b|\banimationend\b/g))
      fail(file, `line ${lineOf(text, match.index)}: "${match[0]}" - chain the Playback finished promise instead`);
  }

  if (!under(file, ENGINE) && !under(file, TOKENS) && !under(file, DEV) && rel(file) !== MEDIA_QUERY_HOOK) {
    for (const match of text.matchAll(/\bmatchMedia\b/g))
      fail(
        file,
        `line ${lineOf(text, match.index)}: matchMedia - reduced motion is global, media queries go through use-media-query`,
      );
  }

  if (!under(file, ENGINE) && !under(file, DEV))
    for (const _ of text.matchAll(/\brequestAnimationFrame\b/g)) debt('raf-outside-engine', file);

  for (const match of text.matchAll(/^.*\bsetTimeout\b.*\bUIMotion\b.*$/gm))
    (void match, debt('timer-coupled-to-motion', file));

  if (under(file, 'src/components/') || under(file, 'src/motion/')) {
    const usesClientApis =
      /\buse(State|Effect|LayoutEffect|InsertionEffect|Ref|Reducer|SyncExternalStore|Callback|Memo|Context|Id|Transition|DeferredValue|ImperativeHandle)\s*\(/.test(
        text,
      ) || /\son[A-Z]\w+=\{/.test(text);
    if (usesClientApis && !/^\s*['"]use client['"]/.test(text))
      fail(file, `uses client-only React APIs but does not start with 'use client'`);
  }

  if ((under(file, 'src/components/expressive/') || under(file, 'src/components/compound/')) && /\.tsx?$/.test(file)) {
    for (const match of text.matchAll(/'#[0-9a-fA-F]{3,8}'/g))
      fail(
        file,
        `line ${lineOf(text, match.index)}: hex literal ${match[0]} - freedom props default from semantic tokens`,
      );
  }

  debtCommentCount(file, text);
}

function debtCommentCount(file, text) {
  const scriptKind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, scriptKind);

  const all = new Map();
  const record = (ranges) => {
    for (const range of ranges ?? []) all.set(range.pos, range);
  };
  record(ts.getLeadingCommentRanges(text, 0));
  const collect = (node) => {
    record(ts.getLeadingCommentRanges(text, node.getFullStart()));
    record(ts.getTrailingCommentRanges(text, node.getEnd()));
    node.forEachChild(collect);
  };
  collect(sourceFile);

  const legal = new Set();
  const markJsDoc = (node) => {
    for (const range of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? [])
      if (text.startsWith('/**', range.pos)) legal.add(range.pos);
  };
  const walkTypes = (node) => {
    const exported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (exported && ts.isInterfaceDeclaration(node)) {
      markJsDoc(node);
      node.members.forEach(markJsDoc);
    }
    if (exported && ts.isTypeAliasDeclaration(node)) {
      markJsDoc(node);
      if (ts.isTypeLiteralNode(node.type)) node.type.members.forEach(markJsDoc);
    }
    node.forEachChild(walkTypes);
  };
  walkTypes(sourceFile);

  for (const [pos] of all) if (!legal.has(pos)) (debt('comments-ts', file), void pos);
}

const PREFIX_ABBREVIATIONS = {
  btn: 'button',
  sw: 'toggle',
  cbx: 'checkbox',
  txa: 'textarea',
  tbl: 'table',
  row: 'table',
  ov: 'overlay',
  menu: 'menu',
  dtp: 'date-picker',
  numf: 'input',
  odo: 'badge',
  glass: 'glass',
};

const registeredPrefixes = new Set(Object.keys(PREFIX_ABBREVIATIONS));
for (const tier of ['primitives', 'composites', 'compound', 'expressive', 'internal']) {
  const tierDir = join(ROOT, 'src/components', tier);
  if (!existsSync(tierDir)) continue;
  for (const entry of readdirSync(tierDir, { withFileTypes: true }))
    if (entry.isDirectory()) registeredPrefixes.add(entry.name);
}
registeredPrefixes.add('avatar').add('collapse');

const hasRegisteredPrefix = (name) =>
  [...registeredPrefixes].some((prefix) => name.startsWith(`--${prefix}-`) || name.startsWith(`--_${prefix}-`));

const ORDER_STATEMENT = '@layer zyncat.reset, zyncat.tokens, zyncat.base, zyncat.components;';

const KNOB_DOC_ABOVE = /^[ \t]*\n[ \t]*--[a-z][\w-]*\s*:/;
const KNOB_DOC_TRAILING = /--[a-z][\w-]*\s*:[^;]*;[ \t]*$/;

for (const file of cssFiles) {
  const raw = readFileSync(file, 'utf8');
  const stripped = stripCssComments(raw);
  const inTokens = under(file, TOKENS);
  const isStyles = rel(file) === 'src/styles.css';
  const inComponents = under(file, 'src/components/') || under(file, 'src/motion/');
  const systemTier = under(file, 'src/components/primitives/') || under(file, 'src/components/composites/');

  if (!inTokens)
    for (const match of raw.matchAll(/\/\*[^]*?\*\//g)) {
      const after = raw.slice(match.index + match[0].length);
      const lineBefore = raw.slice(raw.lastIndexOf('\n', match.index) + 1, match.index);
      if (KNOB_DOC_ABOVE.test(after) || KNOB_DOC_TRAILING.test(lineBefore)) continue;
      debt('comments-css', file);
    }

  for (const match of stripped.matchAll(/@import[^;]*\blayer\(/g))
    fail(
      file,
      `line ${lineOf(stripped, match.index)}: @import with layer() - webpack css-loader rewrites it into a dead @media block; the imported file wraps its own rules in the layer instead`,
    );

  if (inTokens && stripped.includes('{')) {
    if (
      !stripped.trimStart().startsWith(ORDER_STATEMENT) ||
      !/@layer zyncat\.(?:tokens|base|reset)\s*\{/.test(stripped)
    )
      fail(
        file,
        `token declarations sit outside the zyncat layers - start with "${ORDER_STATEMENT}" and wrap the rules in @layer zyncat.tokens (or zyncat.base for the page defaults, zyncat.reset for the reset)`,
      );
  }

  if (!inTokens && !isStyles) {
    for (const match of stripped.matchAll(/(^|[}\s,])(:root)\b/g))
      fail(file, `line ${lineOf(stripped, match.index)}: :root declaration - only src/tokens may write the root scope`);
  }

  if (!inTokens) {
    for (const match of stripped.matchAll(/font-family\s*:\s*([^;]+);/g)) {
      const value = match[1].trim();
      if (!/^var\(--font-[\w-]+[,)]/.test(value) && value !== 'inherit')
        fail(
          file,
          `line ${lineOf(stripped, match.index)}: font-family "${value}" - type reads var(--font-*) or inherit`,
        );
    }
  }

  if (inComponents) {
    if (!stripped.trimStart().startsWith(ORDER_STATEMENT) || !stripped.includes('@layer zyncat.components'))
      fail(
        file,
        `not wrapped in the zyncat cascade layers - start with "${ORDER_STATEMENT}" and wrap rules in @layer zyncat.components`,
      );
  }
  if (isStyles && !stripped.includes(ORDER_STATEMENT)) fail(file, `missing the cascade layer order statement`);

  if (inComponents && !under(file, DEV)) {
    for (const match of stripped.matchAll(/(^|[{;\s])(--[\w-]+)\s*:/gm)) {
      const name = match[2];
      if (hasRegisteredPrefix(name)) continue;
      fail(
        file,
        `declares ${name} - custom properties carry a registered component prefix (--<component>-<name>, or --_<component>-<name> when private)`,
      );
    }
  }

  if (systemTier) {
    const values = stripped.replace(/--[\w-]+\s*:[^;]*;/g, '').replace(/@[\w-]+[^{;]*(\{|;)/g, '$1');
    for (const match of values.matchAll(/#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|oklch|oklab)\(/g))
      fail(
        file,
        `colour literal "${match[0]}" - name it as a --${rel(file).split('/').at(-2)}-* knob or use a semantic token`,
      );
    for (const match of values.matchAll(/(?<![\w.-])\d*\.?\d+(?:ms|s)\b|cubic-bezier\(/g)) {
      if (['0s', '0ms', '1ms'].includes(match[0])) continue;
      fail(file, `timing literal "${match[0]}" - durations and easings come from the motion tokens or a named knob`);
    }
    for (const _ of values.matchAll(/\d+px\b/g)) debt('px-in-system-css', file);
  }
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
if (Object.keys(pkg.dependencies ?? {}).length)
  fail(join(ROOT, 'package.json'), `runtime dependencies are not allowed: ${Object.keys(pkg.dependencies).join(', ')}`);

const baseline = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {};

if (write) {
  const snapshot = {};
  for (const rule of Object.keys(debts).sort()) {
    snapshot[rule] = {};
    for (const file of Object.keys(debts[rule]).sort()) snapshot[rule][file] = debts[rule][file];
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(
    `check-contracts --write: baseline snapshot of ${Object.keys(snapshot).length} ratcheted rule(s) written.`,
  );
}

let debtTotal = 0;
let debtOver = 0;
for (const [rule, byFile] of Object.entries(debts)) {
  for (const [file, count] of Object.entries(byFile)) {
    debtTotal += count;
    const allowed = baseline[rule]?.[file] ?? 0;
    if (count > allowed) {
      debtOver++;
      failures.push(
        `${file}: ${rule} count ${count} exceeds the ratchet baseline (${allowed}) - fix it, or consciously run "pnpm check contracts --write"`,
      );
    }
  }
}

if (failures.length && !write) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  console.error(`\n${failures.length} contract violation(s).`);
  process.exit(1);
}
console.log(
  `check-contracts: ${tsFiles.length + cssFiles.length} files clean, ${debtTotal} ratcheted debt(s) within baseline${debtOver && write ? ` (${debtOver} rebaselined)` : ''}.`,
);
