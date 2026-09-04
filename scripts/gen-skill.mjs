import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import prettier from 'prettier';

import { buildIndex, loadModules } from './lib/usage-format.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'skills/zyncat-ui/references/components.md');

const check = process.argv.includes('--check');

const { version, modules } = loadModules(ROOT);
const missing = modules.filter((m) => !m.usage && m.subpath !== 'next');
if (missing.length) {
  console.error(`✗ gen-skill: no usage doc for ${missing.map((m) => m.subpath).join(', ')} - fix check usage first.`);
  process.exit(1);
}

const raw = [
  '# @zyncat/ui component index',
  '',
  `Generated from @zyncat/ui v${version} by \`pnpm sync skill\` - do not edit by hand.`,
  'If node_modules/@zyncat/ui/package.json shows a DIFFERENT version, this index is stale:',
  'trust the get_component MCP tool and re-run `npx zyncat-ui init` to refresh the skill.',
  '',
  'This is an index, not the API - prop lists here are incomplete by design.',
  'Call get_component (it accepts a list) before writing any JSX.',
  '',
  buildIndex(modules),
  '',
].join('\n');

const content = await prettier.format(raw, { ...(await prettier.resolveConfig(OUT)), filepath: OUT });
if (content !== raw) {
  console.error(
    '✗ gen-skill: a usage summary or group note does not survive prettier - rewrite it so the plain text is stable (backtick-free markdown emphasis characters are the usual cause).',
  );
  process.exit(1);
}

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== content) {
    console.error('✗ skills/zyncat-ui/references/components.md is stale - run "pnpm sync skill".');
    process.exit(1);
  }
  console.log('check-skill: the generated component index is current.');
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, content);
  console.log(`gen-skill: component index regenerated from ${modules.length} subpaths (v${version}).`);
}
