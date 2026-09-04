import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';

import { ROOT } from './lib/entries.mjs';

const TOKENS_OUT = 'src/tokens/theme-tokens.generated.ts';
const STYLES_OUT = 'src/tokens/component-styles.generated.ts';
const MOTION_OUT = 'src/tokens/motion-defaults.generated.ts';
const check = process.argv.includes('--check');

const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

const DECISIONS_FILE = 'decisions.css';
const DARK_FILE = 'dark.css';
const DARK_SELECTOR = "[data-theme='dark']";

const THEME_TREE = [
  {
    key: 'color',
    doc: 'The hues, and the neutral roles a light or dark theme sets directly.',
    scalars: ['--accent', '--neutral', '--success', '--warning', '--danger'],
    groups: [
      { key: 'bg', file: 'semantic.css', doc: 'Surfaces - the canvas, cards, fills and the overlay scrim.' },
      { key: 'text', file: 'semantic.css', doc: 'Ink, from strong to disabled, and the faces on a fill.' },
      { key: 'border', file: 'semantic.css', doc: 'Hairlines, from subtle to strong.' },
    ],
  },
  {
    key: 'type',
    doc: 'The faces.',
    scalars: [],
    groups: [
      { key: 'font', file: DECISIONS_FILE, doc: 'The body face and the code face - every type bundle follows.' },
    ],
  },
  { key: 'shape', doc: 'Roundness.', scalars: ['--radius'], groups: [] },
  {
    key: 'motion',
    doc: 'How surfaces move.',
    scalars: [],
    groups: [
      { key: 'duration', file: 'motion.css', doc: 'The time bands.' },
      { key: 'ease', file: 'motion.css', doc: 'The brand curves.' },
      { key: 'distance', file: 'motion.css', doc: 'How far a surface travels on the way in or out.' },
      { key: 'scale', file: 'motion.css', doc: 'What a surface scales from on the way in, and to on the way out.' },
    ],
  },
];

const KNOB_TIERS = ['expressive', 'compound'];

const DECL_RE = /(?:\/\*((?:(?!\*\/)[^])*?)\*\/[ \t]*\n[ \t]*)?(--[\w-]+)\s*:\s*([^;]+);[ \t]*(?:\/\*([^]*?)\*\/)?/g;

const declOf = (match) => {
  const [, above, cssName, value, trailing] = match;
  return { cssName, value, comment: trailing ?? above };
};

const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

const camelize = (kebab) =>
  kebab
    .split('-')
    .filter(Boolean)
    .map((part, index) => (index ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('');

const kebabize = (camel) =>
  camel
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

const pascal = (kebab) => {
  const camel = camelize(kebab);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

const matchBraces = (text, openIndex) => {
  let depth = 1;
  for (let i = openIndex + 1; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && !--depth) return i;
  }
  return -1;
};

const blockInner = (text, selectorIndex) => {
  const open = text.indexOf('{', selectorIndex);
  const close = matchBraces(text, open);
  if (open === -1 || close === -1) return '';
  return text.slice(open + 1, close);
};

const ROOT_SELECTOR_RE = /(:root(?:\s*,\s*\[data-theme(?:='light')?\])?)\s*\{/g;

const blockKind = (selector) => {
  if (selector.includes("='light'")) return 'light';
  return selector.includes('[data-theme]') ? 'themed' : 'root';
};

/* A token is declared by an unconditional :root block; a @media block only overrides one. */
const mediaSpans = (css) =>
  [...css.matchAll(/@media[^{]*\{/g)]
    .map((match) => [match.index, matchBraces(css, css.indexOf('{', match.index))])
    .filter(([, end]) => end !== -1);

const tokenBlocks = (css) => {
  const spans = mediaSpans(css);
  const blocks = [];
  for (const match of css.matchAll(ROOT_SELECTOR_RE)) {
    if (spans.some(([start, end]) => match.index > start && match.index < end)) continue;
    blocks.push({ inner: blockInner(css, match.index), kind: blockKind(match[1]) });
  }
  return blocks;
};

const darkBlock = (css) => {
  const index = css.indexOf(DARK_SELECTOR);
  if (index === -1) fail(`${DARK_FILE} declares no ${DARK_SELECTOR} block.`);
  return blockInner(css, index);
};

const firstRuleInner = (css) => {
  const layerIndex = css.indexOf('@layer zyncat.components');
  if (layerIndex === -1) return '';
  const layerOpen = css.indexOf('{', layerIndex);
  const layerInner = css.slice(layerOpen + 1, matchBraces(css, layerOpen));
  const ruleOpen = layerInner.indexOf('{');
  if (ruleOpen === -1) return '';
  return layerInner.slice(ruleOpen + 1, matchBraces(layerInner, ruleOpen));
};

const importedTokenFiles = () =>
  [...readFileSync(join(ROOT, 'src/styles.css'), 'utf8').matchAll(/@import '\.\/tokens\/([\w-]+\.css)';/g)].map(
    (match) => match[1],
  );

const files = importedTokenFiles();
if (!files.length) fail('src/styles.css imports no token files - the generator has nothing to read.');
if (!files.includes(DECISIONS_FILE)) fail(`src/styles.css does not import ${DECISIONS_FILE} - the top of every theme.`);
if (!files.includes(DARK_FILE)) fail(`src/styles.css does not import ${DARK_FILE} - the shipped dark theme.`);
for (const category of THEME_TREE)
  for (const group of category.groups)
    if (!files.includes(group.file))
      fail(
        `src/styles.css does not import ${group.file}, the source of \`${category.key}.${group.key}\` in the theme tree.`,
      );

const tokens = [];
const reduced = {};
const dark = {};
const byCssName = new Map();

for (const file of files) {
  const css = readFileSync(join(ROOT, 'src/tokens', file), 'utf8');

  if (file === DARK_FILE) {
    for (const match of darkBlock(css).matchAll(DECL_RE)) {
      const { cssName, value } = declOf(match);
      if (dark[cssName]) fail(`${cssName} is declared twice in ${DARK_FILE}.`);
      dark[cssName] = oneLine(value);
    }
    continue;
  }

  for (const block of tokenBlocks(css)) {
    for (const match of block.inner.matchAll(DECL_RE)) {
      const { cssName, value, comment } = declOf(match);
      if (byCssName.has(cssName)) fail(`${cssName} is declared in both ${byCssName.get(cssName).file} and ${file}.`);
      if (block.kind === 'themed' && !value.includes('var('))
        fail(
          `${cssName} in ${file} sits on the theme-root block with a literal value - a literal there resets the consumer's :root decision inside every [data-theme] subtree. Only tokens that derive from another token belong on ":root, [data-theme]".`,
        );
      if (file === DECISIONS_FILE && block.kind !== 'root')
        fail(
          `${cssName} is a decision and sits on the ${block.kind} block - decisions are set, never derived, and are polarity-free, so they live on :root alone.`,
        );
      const key = camelize(cssName.slice(2));
      if (`--${kebabize(key)}` !== cssName)
        fail(`${cssName} does not round-trip through the name derivation (got --${kebabize(key)}).`);
      const token = {
        cssName,
        key,
        value: oneLine(value),
        doc: comment ? oneLine(comment) : '',
        file,
        kind: block.kind,
      };
      byCssName.set(cssName, token);
      tokens.push(token);
    }
  }

  const mediaIndex = css.indexOf('@media (prefers-reduced-motion: reduce)');
  if (mediaIndex === -1) continue;
  const media = blockInner(css, mediaIndex);
  const mediaRootIndex = media.indexOf(':root');
  if (mediaRootIndex === -1) continue;
  for (const match of blockInner(media, mediaRootIndex).matchAll(DECL_RE)) {
    const { cssName, value } = declOf(match);
    reduced[cssName] = oneLine(value);
  }
}

for (const cssName of Object.keys(reduced))
  if (!byCssName.has(cssName)) fail(`the reduced-motion block overrides ${cssName}, which no :root block declares.`);

for (const [cssName, value] of Object.entries(dark)) {
  const token = byCssName.get(cssName);
  if (!token) fail(`${DARK_FILE} sets ${cssName}, which no token file declares.`);
  if (token.kind === 'root')
    fail(
      `${DARK_FILE} sets ${cssName}, which ${token.file} declares on :root alone - a value the dark theme changes is a polarity, so declare its light value on ":root, [data-theme='light']" or derive it on ":root, [data-theme]".`,
    );
  if (token.kind === 'themed' && !value.includes('var('))
    fail(
      `${cssName} in ${DARK_FILE} overrides a derived token with a literal - it follows a decision on the light side, so it derives from the same decision on the dark side.`,
    );
}
for (const token of tokens)
  if (token.kind === 'light' && !dark[token.cssName])
    fail(
      `${token.cssName} sits on the light block of ${token.file} but ${DARK_FILE} never sets it - every polarity has both values.`,
    );

const decisions = tokens.filter((token) => token.file === DECISIONS_FILE);
if (!decisions.length) fail(`${DECISIONS_FILE} declares no tokens.`);

const placed = new Set();
const categories = THEME_TREE.map((category) => {
  const scalars = category.scalars.map((cssName) => {
    const token = byCssName.get(cssName);
    if (!token) fail(`the theme tree names ${cssName} under \`${category.key}\`, which no token file declares.`);
    if (token.file !== DECISIONS_FILE)
      fail(
        `${cssName} sits directly under \`${category.key}\` in the theme tree but is not a decision - only ${DECISIONS_FILE} tokens go there.`,
      );
    placed.add(cssName);
    return token;
  });
  const groups = category.groups.map((group) => {
    const prefix = `--${group.key}-`;
    const members = tokens
      .filter((token) => token.file === group.file && token.kind !== 'themed' && token.cssName.startsWith(prefix))
      .map((token) => ({ ...token, key: camelize(token.cssName.slice(prefix.length)) }));
    if (!members.length)
      fail(`\`${category.key}.${group.key}\` in the theme tree matches no :root-only token in ${group.file}.`);
    for (const member of members) {
      if (`${prefix}${kebabize(member.key)}` !== member.cssName)
        fail(`${member.cssName} does not round-trip through \`${category.key}.${group.key}.${member.key}\`.`);
      placed.add(member.cssName);
    }
    return { ...group, label: `${pascal(category.key)}${pascal(group.key)}Tokens`, members };
  });
  return { ...category, label: `${pascal(category.key)}Tokens`, scalars, groups };
});

for (const token of decisions)
  if (!placed.has(token.cssName)) fail(`${token.cssName} is a decision with no place in the theme tree.`);

const roleFiles = new Set(THEME_TREE.flatMap((category) => category.groups.map((group) => group.file)));
roleFiles.delete(DECISIONS_FILE);
for (const token of tokens)
  if (roleFiles.has(token.file) && token.kind !== 'themed' && !placed.has(token.cssName))
    fail(
      `${token.cssName} sits on the ${token.kind} block of ${token.file}, a block a theme sets, but has no place in the theme tree - derive it on the theme-root block, or give its prefix a group in the tree.`,
    );

const writtenNames = (dirPath, dirFiles) => {
  const written = new Set();
  for (const file of dirFiles) {
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(join(dirPath, file), 'utf8');
    for (const match of text.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)) written.add(match[1]);
    for (const match of text.matchAll(/'(--[\w-]+)'\s*:/g)) written.add(match[1]);
    for (const match of text.matchAll(/const (\w+) = '(--[\w-]+)';/g)) {
      const [, identifier, cssName] = match;
      if (new RegExp(`setProperty\\(\\s*${identifier}\\b|\\[${identifier}\\]\\s*:`).test(text)) written.add(cssName);
    }
  }
  return written;
};

const isReplicaDir = (dirPath, dirFiles) =>
  dirFiles.some(
    (file) => file.endsWith('.usage.md') && /^Group: replicas\s*$/m.test(readFileSync(join(dirPath, file), 'utf8')),
  );

const PRIVATE_PREFIX = '--_';

const groupKnobs = (dir, knobs) => {
  const byHead = new Map();
  for (const knob of knobs) {
    const head = knob.rest.split('-')[0];
    if (!byHead.has(head)) byHead.set(head, []);
    byHead.get(head).push(knob);
  }
  const entries = [];
  for (const [head, members] of byHead) {
    const collides = members.some((knob) => knob.rest === head);
    if (members.length < 2 || collides) {
      for (const knob of members) {
        knob.key = camelize(knob.rest);
        if (`--${dir}-${kebabize(knob.key)}` !== knob.cssName)
          fail(`${knob.cssName} does not round-trip through the name derivation (got --${dir}-${kebabize(knob.key)}).`);
        entries.push({ key: knob.key, knob });
      }
      continue;
    }
    for (const knob of members) {
      knob.key = camelize(knob.rest.slice(head.length + 1));
      if (`--${dir}-${head}-${kebabize(knob.key)}` !== knob.cssName)
        fail(
          `${knob.cssName} does not round-trip through the name derivation (got --${dir}-${head}-${kebabize(knob.key)}).`,
        );
    }
    const series = members.every((knob) => /^\d+$/.test(knob.key));
    if (series) for (const knob of members) if (!knob.doc) knob.doc = members[0].doc;
    entries.push({ key: camelize(head), head, label: `${pascal(dir)}${pascal(head)}Tokens`, members, series });
  }
  return entries;
};

const components = [];
for (const tier of KNOB_TIERS) {
  const tierDir = join(ROOT, 'src/components', tier);
  for (const dir of readdirSync(tierDir).sort()) {
    const dirPath = join(tierDir, dir);
    if (!statSync(dirPath).isDirectory()) continue;
    const dirFiles = readdirSync(dirPath).sort();
    if (isReplicaDir(dirPath, dirFiles)) continue;
    const written = writtenNames(dirPath, dirFiles);
    const knobs = [];
    for (const file of dirFiles) {
      if (!file.endsWith('.css')) continue;
      for (const match of firstRuleInner(readFileSync(join(dirPath, file), 'utf8')).matchAll(DECL_RE)) {
        const { cssName, value, comment } = declOf(match);
        if (cssName.startsWith(PRIVATE_PREFIX)) continue;
        if (!cssName.startsWith(`--${dir}-`))
          fail(
            `${cssName} in ${tier}/${dir}/${file} does not carry the --${dir}- prefix its scoped contract requires.`,
          );
        if (written.has(cssName))
          fail(
            `${cssName} in ${tier}/${dir} is written by the component's own JS - per-frame state is private, name it ${PRIVATE_PREFIX}${dir}-....`,
          );
        knobs.push({
          cssName,
          rest: cssName.slice(dir.length + 3),
          value: oneLine(value),
          doc: comment ? oneLine(comment) : '',
          file: `${tier}/${dir}/${file}`,
        });
      }
    }
    if (!knobs.length) continue;
    const entries = groupKnobs(dir, knobs);
    for (const knob of knobs)
      if (!knob.doc)
        fail(
          `${knob.cssName} in ${knob.file} is a public knob without a doc line - say what it does in a comment above the declaration, or make it private (${PRIVATE_PREFIX}${dir}-...).`,
        );
    components.push({ dir, key: camelize(dir), label: pascal(dir), knobs, entries });
  }
}

const docFor = (token, origin = '') => {
  const description = token.doc ? ` - ${token.doc.replace(/\.\s*$/, '')}` : '';
  const collapse = reduced[token.cssName] ? ` Collapses to \`${reduced[token.cssName]}\` under reduced motion.` : '';
  const inDark = dark[token.cssName] ? ` Dark: \`${dark[token.cssName]}\`.` : '';
  const themed = token.kind === 'themed' ? ' Re-derived on every theme root.' : '';
  return `/** \`${token.cssName}\`${origin}${description}. Default: \`${token.value}\`.${inDark}${collapse}${themed} */`;
};

const members = (tokens, origin) =>
  tokens.flatMap((token) => [docFor(token, origin), `${token.key}?: string | number;`]);

const GENERATED_BY =
  ' * Generated from the token and component CSS by `scripts/gen-theme.mjs` - `pnpm sync` rebuilds it.';

const tokensLines = [];
tokensLines.push('/**');
tokensLines.push(' * The themeable vocabulary. A theme is four categories - `color`, `type`, `shape`, `motion` -');
tokensLines.push(' * each holding the decisions and the roles a theme sets, grouped by what they are; then the');
tokensLines.push(' * scoped knobs under `components`. Every other token derives from those or is a scale a page');
tokensLines.push(' * reads, and goes by its CSS name under `custom`. A path is the CSS name: `color.bg.app` is');
tokensLines.push(' * `--bg-app`, `type.font.body` is `--font-body`, `shape.radius` is `--radius`. Values take any');
tokensLines.push(' * CSS the property accepts, including `var()` references.');
tokensLines.push(' *');
tokensLines.push(GENERATED_BY);
tokensLines.push(' */');
for (const category of categories) {
  for (const group of category.groups) {
    tokensLines.push(`/** ${group.doc} */`);
    tokensLines.push(`export interface ${group.label} {`);
    tokensLines.push(...members(group.members, ''));
    tokensLines.push('}');
    tokensLines.push('');
  }
  tokensLines.push(`/** ${category.doc} */`);
  tokensLines.push(`export interface ${category.label} {`);
  tokensLines.push(...members(category.scalars, ''));
  for (const group of category.groups) {
    tokensLines.push(`  /** ${group.doc} */`);
    tokensLines.push(`  ${group.key}?: ${group.label};`);
  }
  tokensLines.push('}');
  tokensLines.push('');
}

const groupDoc = (component, entry) =>
  entry.series
    ? `\`${entry.members[0].cssName}\` to \`${entry.members.at(-1).cssName}\` - ${entry.members[0].doc.replace(/\.\s*$/, '')}.`
    : `The \`--${component.dir}-${entry.head}-*\` knobs.`;

for (const component of components) {
  for (const entry of component.entries) {
    if (!entry.members) continue;
    tokensLines.push(`/** ${groupDoc(component, entry)} */`);
    tokensLines.push(`export interface ${entry.label} {`);
    tokensLines.push(...members(entry.members, ''));
    tokensLines.push('}');
    tokensLines.push('');
  }
  tokensLines.push(`/** The scoped properties ${component.label} publishes as its theming contract. */`);
  tokensLines.push(`export interface ${component.label}Tokens {`);
  for (const entry of component.entries) {
    if (entry.members) {
      tokensLines.push(`  /** ${groupDoc(component, entry)} */`);
      tokensLines.push(`  ${entry.key}?: ${entry.label};`);
    } else {
      tokensLines.push(...members([entry.knob], ''));
    }
  }
  tokensLines.push('}');
  tokensLines.push('');
}

tokensLines.push('/** Per-component knobs - retunes every instance of that component. */');
tokensLines.push('export interface ComponentTokens {');
for (const component of components) {
  tokensLines.push(`  /** ${component.label} - its \`--${component.dir}-*\` properties. */`);
  tokensLines.push(`  ${component.key}?: ${component.label}Tokens;`);
}
tokensLines.push('}');
tokensLines.push('');

tokensLines.push('/**');
tokensLines.push(' * Every design token by its CSS name, with what it does and its default. The type behind');
tokensLines.push(' * `custom` in a theme and behind the `style` prop of every component.');
tokensLines.push(' */');
tokensLines.push('export interface TokenProperties {');
for (const token of tokens) {
  tokensLines.push(`  ${docFor(token)}`);
  tokensLines.push(`  '${token.cssName}'?: string | number;`);
}
tokensLines.push('}');
tokensLines.push('');

tokensLines.push('/** The CSS name of every design token. */');
tokensLines.push('export type TokenName = keyof TokenProperties;');
tokensLines.push('');

tokensLines.push('/**');
tokensLines.push(' * One theme: the tokens it repoints, by category. Set a decision and every token that derives');
tokensLines.push(' * from it follows; set a role to break it away. Everything is optional.');
tokensLines.push(' */');
tokensLines.push('export interface ThemeTokens {');
for (const category of categories) {
  tokensLines.push(`  /** ${category.doc} */`);
  tokensLines.push(`  ${category.key}?: ${category.label};`);
}
tokensLines.push('  /** Scoped knobs, per component. */');
tokensLines.push('  components?: ComponentTokens;');
tokensLines.push(
  '  /** Any token by its CSS name - the ones the categories leave out - or a custom property of your own. */',
);
tokensLines.push('  custom?: TokenProperties & Record<`--${string}`, string | number>;');
tokensLines.push('}');
tokensLines.push('');

tokensLines.push('/**');
tokensLines.push(' * The themes an app ships. `base` lands on `:root`; every other key becomes a');
tokensLines.push(" * `[data-theme='<key>']` block, activated by setting that attribute on any element.");
tokensLines.push(' * The package ships `light` and `dark` under those attributes already, so a `dark` key');
tokensLines.push(' * here extends the shipped dark theme rather than starting one.');
tokensLines.push(' */');
tokensLines.push('export interface ThemeSet {');
tokensLines.push('  /** The always-applied foundation - whatever the app defaults to, light or dark. */');
tokensLines.push('  base?: ThemeTokens;');
tokensLines.push('  /** Extends the shipped dark theme - the values that differ under `data-theme="dark"`. */');
tokensLines.push('  dark?: ThemeTokens;');
tokensLines.push('  /** Extends the shipped light theme, where a light island sits inside a dark page. */');
tokensLines.push('  light?: ThemeTokens;');
tokensLines.push('  [name: string]: ThemeTokens | undefined;');
tokensLines.push('}');
tokensLines.push('');

tokensLines.push('export const reducedMotionTokens: Readonly<Record<string, string>> = {');
for (const [cssName, value] of Object.entries(reduced)) tokensLines.push(`  '${cssName}': '${value}',`);
tokensLines.push('};');
tokensLines.push('');

tokensLines.push("declare module 'react' {");
tokensLines.push('  export interface CSSProperties extends TokenProperties {}');
tokensLines.push('}');

const stylesLines = [];
stylesLines.push("import type { CSSProperties } from 'react';");
stylesLines.push('');
for (const [index, component] of components.entries()) {
  const knobs = `its \`--${component.dir}-*\` knobs`;
  if (index) stylesLines.push(`/** Inline styles for ${component.label}, including ${knobs}. */`);
  else {
    stylesLines.push('/**');
    stylesLines.push(` * Inline styles for ${component.label}, including ${knobs}.`);
    stylesLines.push(' *');
    stylesLines.push(' * One interface per component that publishes scoped properties: the design tokens plus');
    stylesLines.push(" * that component's own knobs, and nothing from any other component.");
    stylesLines.push(' *');
    stylesLines.push(GENERATED_BY);
    stylesLines.push(' */');
  }
  stylesLines.push(`export interface ${component.label}Style extends CSSProperties {`);
  for (const knob of component.knobs) {
    stylesLines.push(`  ${docFor(knob)}`);
    stylesLines.push(`  '${knob.cssName}'?: string | number;`);
  }
  stylesLines.push('}');
  stylesLines.push('');
}

const knobCount = components.reduce((total, component) => total + component.knobs.length, 0);
const roleCount = placed.size - decisions.length;
const plumbingCount = tokens.length - decisions.length - roleCount;
const themedCount = tokens.filter((token) => token.kind === 'themed').length;
const tokenSummary =
  `${decisions.length} decisions and ${roleCount} roles in ${categories.length} categories, ` +
  `${plumbingCount} plumbing tokens by name (${themedCount} on every theme root), ` +
  `${Object.keys(dark).length} values on the dark theme, ` +
  `${knobCount} knobs across ${components.length} components, ` +
  `${Object.keys(reduced).length} reduced-motion overrides`;

const MOTION_FILE = 'motion.css';
const ROOT_FONT_PX = 16;

const numberOf = (text) => {
  const n = Number(text.trim());
  if (Number.isNaN(n)) fail(`"${text}" in ${MOTION_FILE} is not a number the generator can read.`);
  return n;
};
const resolveMs = (value, depth = 0) => {
  if (depth > 8) fail(`${value} in ${MOTION_FILE} nests var() too deep to resolve.`);
  const text = value.trim();
  const reference = text.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (reference) {
    const token = byCssName.get(reference[1]);
    if (!token) fail(`${text} in ${MOTION_FILE} points at ${reference[1]}, which no token file declares.`);
    return resolveMs(token.value, depth + 1);
  }
  const product = text.match(/^calc\(\s*(.+?)\s*\*\s*([\d.]+)\s*\)$/);
  if (product) return resolveMs(product[1], depth + 1) * numberOf(product[2]);
  const time = text.match(/^([\d.]+)(ms|s)$/);
  if (time) return numberOf(time[1]) * (time[2] === 's' ? 1000 : 1);
  return fail(
    `${text} in ${MOTION_FILE} is not a time the generator can resolve - write <time>, var(--x) or calc(var(--x) * <number>).`,
  );
};
const resolvePx = (value) => {
  const length = value.trim().match(/^([\d.]+)(rem|px)$/);
  if (!length) fail(`${value} in ${MOTION_FILE} is not a rem or px length.`);
  return numberOf(length[1]) * (length[2] === 'rem' ? ROOT_FONT_PX : 1);
};
const resolveBezier = (value) => {
  const bezier = value.trim().match(/^cubic-bezier\(([^)]+)\)$/);
  if (!bezier) fail(`${value} in ${MOTION_FILE} is not a cubic-bezier().`);
  const points = bezier[1].split(',').map(numberOf);
  if (points.length !== 4) fail(`${value} in ${MOTION_FILE} does not have four control points.`);
  return points;
};
const motionTable = (prefix, resolve) =>
  tokens
    .filter((token) => token.file === MOTION_FILE && token.cssName.startsWith(prefix))
    .map((token) => `  ${camelize(token.cssName.slice(prefix.length))}: ${JSON.stringify(resolve(token.value))},`);

const motionLines = [];
motionLines.push('/**');
motionLines.push(' * The motion tokens as numbers, for the readers that need a value before a stylesheet answers:');
motionLines.push(' * durations in milliseconds, distances in pixels at a 16px root, easings as cubic-bezier points.');
motionLines.push(' *');
motionLines.push(GENERATED_BY);
motionLines.push(' */');
motionLines.push('export const motionDefaults = {');
motionLines.push('  duration: {');
motionLines.push(...motionTable('--duration-', resolveMs));
motionLines.push('  } satisfies Record<string, number>,');
motionLines.push('  ease: {');
motionLines.push(...motionTable('--ease-', resolveBezier));
motionLines.push('  } satisfies Record<string, [number, number, number, number]>,');
motionLines.push('  distance: {');
motionLines.push(...motionTable('--distance-', resolvePx));
motionLines.push('  } satisfies Record<string, number>,');
motionLines.push('  scale: {');
motionLines.push(...motionTable('--scale-', numberOf));
motionLines.push('  } satisfies Record<string, number>,');
motionLines.push('};');

const TAILWIND_OUT = 'tailwind.css';
const SEMANTIC_FILE = 'semantic.css';
const TYPOGRAPHY_FILE = 'typography.css';
const RADIUS_FILE = 'radius.css';
const ELEVATION_FILE = 'elevation.css';
const HUE_FAMILIES = ['accent', 'success', 'warning', 'danger', 'info', 'neutral'];
const NEUTRAL_DECISION = '--neutral';
const INK_UTILITY_RENAMES = { body: 'default' };
const STRENGTH_SUFFIX = '-strength';
const TYPE_BUNDLE_RE =
  /^var\((--weight-[\w-]+)\) var\((--size-[\w-]+)\)\/var\((--leading-[\w-]+)\) var\((--font-[\w-]+)\)$/;
const TAILWIND_LAYER_ORDER =
  '@layer theme, base, zyncat.tokens, zyncat.components, zyncat.base, components, utilities;';
const DARK_VARIANT = "@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));";

const inFile = (file, prefix) => tokens.filter((token) => token.file === file && token.cssName.startsWith(prefix));
const after = (token, prefix) => token.cssName.slice(prefix.length);
const bridge = (name, token) => `  ${name}: var(${token.cssName});`;
const hueOf = (cssName) => HUE_FAMILIES.find((hue) => cssName === `--${hue}` || cssName.startsWith(`--${hue}-`));

const bridgeSections = [];
const bridgeSection = (title, lines) => {
  if (!lines.length) fail(`the Tailwind bridge section "${title}" matches no token.`);
  bridgeSections.push([`  /* ${title} */`, ...lines]);
};

bridgeSection(
  'Surfaces - bg-<role>',
  inFile(SEMANTIC_FILE, '--bg-').map((token) => bridge(`--background-color-${after(token, '--bg-')}`, token)),
);

const inkLines = inFile(SEMANTIC_FILE, '--text-').map((token) => {
  const role = after(token, '--text-');
  return bridge(`--text-color-${INK_UTILITY_RENAMES[role] ?? role}`, token);
});
for (const hue of HUE_FAMILIES) {
  const legible = byCssName.get(`--${hue}-text`);
  if (legible) inkLines.push(bridge(`--text-color-${hue}`, legible));
}
bridgeSection('Ink - text-<role>; the body ink is text-default because text-body is the type role', inkLines);

bridgeSection(
  'Hairlines - border-<role>',
  inFile(SEMANTIC_FILE, '--border-').map((token) => bridge(`--border-color-${after(token, '--border-')}`, token)),
);

bridgeSection(
  'Hues - every colour utility (bg-, text-, border-, ring-, from-, ...) with /<opacity>',
  tokens
    .filter(
      (token) =>
        (token.file === DECISIONS_FILE || token.file === SEMANTIC_FILE) &&
        hueOf(token.cssName) &&
        token.cssName !== NEUTRAL_DECISION,
    )
    .map((token) => bridge(`--color-${token.cssName.slice(2)}`, token)),
);

const typeLines = [];
for (const token of inFile(TYPOGRAPHY_FILE, '--type-')) {
  const bundle = TYPE_BUNDLE_RE.exec(token.value);
  if (!bundle)
    fail(`${token.cssName} is not a "var(weight) var(size)/var(leading) var(face)" bundle the Tailwind bridge reads.`);
  const [, weight, size, leading] = bundle;
  for (const part of [weight, size, leading])
    if (!byCssName.has(part)) fail(`${token.cssName} reads ${part}, which no token file declares.`);
  const role = after(token, '--type-');
  typeLines.push(
    `  --text-${role}: var(${size});`,
    `  --text-${role}--line-height: var(${leading});`,
    `  --text-${role}--font-weight: var(${weight});`,
  );
}
bridgeSection('Type roles - text-<role> sets size, leading and weight; text-code wants font-code beside it', typeLines);

bridgeSection(
  'Faces - font-body, font-code',
  inFile(DECISIONS_FILE, '--font-').map((token) => bridge(token.cssName, token)),
);
bridgeSection(
  'Leading and tracking - leading-<role>, tracking-<name>',
  [...inFile(TYPOGRAPHY_FILE, '--leading-'), ...inFile(TYPOGRAPHY_FILE, '--tracking-')].map((token) =>
    bridge(token.cssName, token),
  ),
);
bridgeSection(
  'Measures - max-w-prose, max-w-floating',
  tokens
    .filter((token) => token.cssName.startsWith('--measure-'))
    .map((token) => bridge(`--max-width-${after(token, '--measure-')}`, token)),
);
bridgeSection(
  'Corners - rounded-<step>',
  inFile(RADIUS_FILE, '--radius-').map((token) => bridge(token.cssName, token)),
);
bridgeSection('Elevation - shadow-<step>, shadow-glow-<hue>', [
  ...inFile(ELEVATION_FILE, '--shadow-')
    .filter((token) => !token.cssName.endsWith(STRENGTH_SUFFIX))
    .map((token) => bridge(token.cssName, token)),
  ...inFile(ELEVATION_FILE, '--glow-')
    .filter((token) => !token.cssName.endsWith(STRENGTH_SUFFIX))
    .map((token) => bridge(`--shadow-glow-${after(token, '--glow-')}`, token)),
]);
bridgeSection(
  'Focus rings - outline-ring-<hue>, ring-ring-<hue>, and every other colour utility',
  inFile(ELEVATION_FILE, '--ring-color-').map((token) =>
    bridge(`--color-ring-${after(token, '--ring-color-')}`, token),
  ),
);
bridgeSection(
  'Motion - ease-<curve>',
  inFile(MOTION_FILE, '--ease-').map((token) => bridge(token.cssName, token)),
);

const durationUtilities = inFile(MOTION_FILE, '--duration-').flatMap((token) => [
  `@utility duration-${after(token, '--duration-')} {`,
  `  transition-duration: var(${token.cssName});`,
  '}',
]);
if (!durationUtilities.length) fail('the Tailwind bridge finds no --duration-* token for its duration utilities.');

const bridgeCount = bridgeSections.reduce((total, lines) => total + lines.length - 1, 0) + durationUtilities.length / 3;

const tailwindLines = [
  '/* @zyncat/ui/tailwind.css - the token vocabulary as Tailwind v4 utilities, with IntelliSense.',
  '   Import it on the first line of the stylesheet Tailwind compiles, above `@import "tailwindcss"`,',
  '   and keep `@zyncat/ui/styles.css` on its JS import at the app root.',
  '',
  '   Every entry is `inline reference`. `inline` makes the utility read the zyncat token itself,',
  '   so a `data-theme` subtree re-derives it; `reference` keeps Tailwind from writing the entry',
  '   onto `:root`, where the names Tailwind also ships - `--radius-*`, `--shadow-*`,',
  '   `--tracking-*` - would overwrite the token the components read, and where the entries',
  '   that carry the same name on both sides would be a cycle.',
  '',
  '   The layer statement pins the Tailwind layers around the zyncat ones - utilities above',
  '   component rules, the base layer above preflight - and holds only while this file precedes',
  '   the Tailwind import, because the first statement fixes the order.',
  '',
  '   Generated from the token CSS by `scripts/gen-theme.mjs` - `pnpm sync` rebuilds it. */',
  '',
  TAILWIND_LAYER_ORDER,
  '',
  DARK_VARIANT,
  '',
  '@theme inline reference {',
  ...bridgeSections.flatMap((lines, index) => (index ? ['', ...lines] : lines)),
  '}',
  '',
  ...durationUtilities,
];

const summary = `${tokenSummary}, ${bridgeCount} Tailwind utilities`;

const outputs = [
  { rel: TOKENS_OUT, lines: tokensLines },
  { rel: STYLES_OUT, lines: stylesLines },
  { rel: MOTION_OUT, lines: motionLines },
  { rel: TAILWIND_OUT, lines: tailwindLines },
];

for (const output of outputs) {
  const path = join(ROOT, output.rel);
  const options = await prettier.resolveConfig(path);
  output.text = await prettier.format(output.lines.join('\n') + '\n', { ...options, filepath: path });
  output.path = path;
}

if (check) {
  for (const output of outputs) {
    let current = null;
    try {
      current = readFileSync(output.path, 'utf8');
    } catch {
      fail(`${output.rel} is missing - run "pnpm sync theme".`);
    }
    if (current !== output.text) fail(`${output.rel} is stale - run "pnpm sync theme".`);
  }
  console.log(`gen-theme --check: ${summary} in sync.`);
} else {
  for (const output of outputs) writeFileSync(output.path, output.text);
  console.log(`gen-theme: ${outputs.length} files written - ${summary}.`);
}
