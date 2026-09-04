import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import prettier from 'prettier';

import { publicEntries, ROOT } from './lib/entries.mjs';

const tsconfigPath = join(ROOT, 'apps/docs/tsconfig.json');
const current = readFileSync(tsconfigPath, 'utf8');
const tsconfig = JSON.parse(current);

const paths = {
  '@/*': ['./*'],
  react: ['../../node_modules/@types/react'],
  'react/*': ['../../node_modules/@types/react/*'],
  'react-dom': ['../../node_modules/@types/react-dom'],
  'react-dom/*': ['../../node_modules/@types/react-dom/*'],
  '@zyncat/ui/styles.css': ['../../src/styles.css'],
};
for (const [name, path] of Object.entries(publicEntries())) paths[`@zyncat/ui/${name}`] = [`../../${path}`];

tsconfig.compilerOptions.paths = paths;

const options = await prettier.resolveConfig(tsconfigPath);
const next = await prettier.format(JSON.stringify(tsconfig), { ...options, filepath: tsconfigPath });

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('✗ apps/docs/tsconfig.json does not map every subpath - run "pnpm sync tsconfig".');
    process.exit(1);
  }
  console.log(`sync-tsconfig --check: ${Object.keys(paths).length} subpaths mapped.`);
} else {
  writeFileSync(tsconfigPath, next);
  console.log(`sync-tsconfig: apps/docs/tsconfig.json now maps ${Object.keys(paths).length} subpaths.`);
}
