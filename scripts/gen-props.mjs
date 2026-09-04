import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';
import ts from 'typescript';

import { distTypesPath, ROOT } from './lib/entries.mjs';

const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'apps/docs/content/props.generated.ts');

const SUBPATH_FOR_SLUG = { 'date-range': 'date-range-field' };

const HAND_WRITTEN = new Set(['icon', 'toast', 'introduction', 'installation', 'mcp', 'theming']);

const NESTED_TYPE_DEPTH = 1;

if (!existsSync(DIST)) {
  console.error('✗ dist/ not found - run "pnpm build" first.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

const slugs = [...readFileSync(join(ROOT, 'apps/docs/content/registry.tsx'), 'utf8').matchAll(/slug: '([^']+)'/g)].map(
  (m) => m[1],
);

const targets = [];
for (const slug of slugs) {
  if (HAND_WRITTEN.has(slug)) continue;
  const subpath = SUBPATH_FOR_SLUG[slug] ?? slug;
  const entry = pkg.exports[`./${subpath}`];
  if (!entry?.source) {
    console.error(`✗ docs slug "${slug}" maps to @zyncat/ui/${subpath}, which package.json does not export.`);
    process.exit(1);
  }
  const file = join(ROOT, distTypesPath(entry.source));
  if (!existsSync(file)) {
    console.error(`✗ ${distTypesPath(entry.source)} is missing - is the build stale?`);
    process.exit(1);
  }
  targets.push({
    slug,
    subpath,
    file,
    component: entry.source
      .split('/')
      .pop()
      .replace(/\.tsx?$/, ''),
  });
}

const program = ts.createProgram(
  targets.map((t) => t.file),
  { noEmit: true, skipLibCheck: true, strict: true, jsx: ts.JsxEmit.ReactJSX },
);
const checker = program.getTypeChecker();

const oneLine = (text) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\breact\./g, 'React.')
    .trim();

const isLibrarySymbol = (symbol) => {
  const declaration = symbol.declarations?.[0];
  return Boolean(declaration) && !declaration.getSourceFile().fileName.includes('node_modules');
};

function rowFor(symbol) {
  const declaration = symbol.declarations[0];
  const description = oneLine(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
  const tag = symbol.getJsDocTags(checker).find((t) => t.name === 'default');
  return {
    name: symbol.getName(),
    type: declaration.type ? oneLine(declaration.type.getText()) : 'unknown',
    default: tag ? oneLine(ts.displayPartsToString(tag.text)) : undefined,
    required: (symbol.flags & ts.SymbolFlags.Optional) === 0 || undefined,
    description,
  };
}

function propsOf(type) {
  return checker.getPropertiesOfType(type).filter(isLibrarySymbol).map(rowFor);
}

const ANOTHER_COMPONENTS_PROPS = /Props$/;

function referencedDeclarations(declaration) {
  const found = [];
  const visit = (node) => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const local = checker.getSymbolAtLocation(node.typeName);
      const symbol = local && local.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(local) : local;
      const target = symbol?.declarations?.[0];
      if (
        target &&
        (ts.isInterfaceDeclaration(target) || ts.isTypeAliasDeclaration(target)) &&
        !target.getSourceFile().fileName.includes('node_modules') &&
        !ANOTHER_COMPONENTS_PROPS.test(symbol.getName())
      )
        found.push([symbol.getName(), target]);
    }
    node.forEachChild(visit);
  };
  if (declaration.type) visit(declaration.type);
  return found;
}

function nestedTypesFor(propsType) {
  const collected = [];
  const seen = new Set();
  let frontier = checker
    .getPropertiesOfType(propsType)
    .filter(isLibrarySymbol)
    .flatMap((symbol) => referencedDeclarations(symbol.declarations[0]));

  for (let depth = 0; depth <= NESTED_TYPE_DEPTH && frontier.length; depth++) {
    const next = [];
    for (const [name, declaration] of frontier) {
      if (seen.has(name)) continue;
      seen.add(name);
      const members = checker.getPropertiesOfType(checker.getTypeAtLocation(declaration)).filter(isLibrarySymbol);
      if (!members.length) continue;
      collected.push({ name, rows: members.map(rowFor) });
      for (const member of members) next.push(...referencedDeclarations(member.declarations[0]));
    }
    frontier = next;
  }
  return collected.sort((a, b) => a.name.localeCompare(b.name));
}

const props = {};
const nested = {};
let propCount = 0;
let undocumented = 0;

for (const target of targets) {
  const sourceFile = program.getSourceFile(target.file);
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exported =
    moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((e) => e.getName() === target.component);
  if (!exported) {
    console.error(
      `✗ the built types for "${target.subpath}" export no "${target.component}" - rename or add "${target.slug}" to HAND_WRITTEN.`,
    );
    process.exit(1);
  }
  const signature = checker.getTypeOfSymbolAtLocation(exported, exported.declarations[0]).getCallSignatures()[0];
  const parameter = signature?.getParameters()[0];
  if (!parameter) {
    console.error(`✗ ${target.component} takes no props object - add "${target.slug}" to HAND_WRITTEN in this script.`);
    process.exit(1);
  }
  const propsType = checker.getTypeOfSymbolAtLocation(parameter, parameter.declarations[0]);

  const rows = propsOf(propsType);
  for (const row of rows) if (!row.description) undocumented++;
  propCount += rows.length;
  props[target.slug] = rows;

  const types = nestedTypesFor(propsType);
  if (types.length) nested[target.slug] = types;
}

if (undocumented) {
  console.error(`✗ ${undocumented} public prop(s) have no JSDoc - the docs table would render a blank cell.`);
  for (const [slug, rows] of Object.entries(props))
    for (const row of rows) if (!row.description) console.error(`  ${slug}.${row.name}`);
  process.exit(1);
}

const literal = (value) => JSON.stringify(value);
const rowSource = (row) =>
  '    { ' +
  [
    `name: ${literal(row.name)}`,
    `type: ${literal(row.type)}`,
    row.default !== undefined ? `default: ${literal(row.default)}` : null,
    row.required ? 'required: true' : null,
    `description: ${literal(row.description)}`,
  ]
    .filter(Boolean)
    .join(', ') +
  ' },';

const lines = [
  '/* Generated by scripts/gen-props.mjs from the built types in dist/types - run `pnpm sync props`, do not edit by hand.',
  '   The prop JSDoc on each public props interface is the single source of truth. */',
  "import type { PropRow } from '../components/PropsTable';",
  '',
  'export interface NestedType {',
  '  name: string;',
  '  rows: PropRow[];',
  '}',
  '',
  'export const GENERATED_PROPS: Record<string, PropRow[]> = {',
];
for (const [slug, rows] of Object.entries(props)) {
  lines.push(`  ${/^[a-z][a-z0-9]*$/i.test(slug) ? slug : literal(slug)}: [`, ...rows.map(rowSource), '  ],');
}
lines.push('};', '', 'export const GENERATED_TYPES: Record<string, NestedType[]> = {');
for (const [slug, types] of Object.entries(nested)) {
  lines.push(`  ${/^[a-z][a-z0-9]*$/i.test(slug) ? slug : literal(slug)}: [`);
  for (const type of types)
    lines.push(`    { name: ${literal(type.name)}, rows: [`, ...type.rows.map((r) => '  ' + rowSource(r)), '    ] },');
  lines.push('  ],');
}
lines.push('};', '');

const prettierOptions = await prettier.resolveConfig(OUT);
const content = await prettier.format(lines.join('\n'), { ...prettierOptions, filepath: OUT });
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== content) {
    console.error('✗ apps/docs/content/props.generated.ts is out of date - run "pnpm sync props".');
    process.exit(1);
  }
  console.log(`gen-props --check: ${propCount} props across ${targets.length} components up to date.`);
} else {
  writeFileSync(OUT, content);
  console.log(
    `gen-props: ${propCount} props across ${targets.length} components, ${Object.keys(nested).length} with nested types.`,
  );
}
