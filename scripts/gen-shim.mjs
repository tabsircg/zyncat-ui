import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT } from './lib/entries.mjs';

const check = process.argv.includes('--check');
const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const shimPath = join(ROOT, 'packages/zyncat-ui/package.json');
const cliEntry = join(ROOT, 'packages/zyncat-ui/src/cli.ts');

if (!existsSync(shimPath)) {
  console.error('✗ packages/zyncat-ui/package.json is missing - the registry shim must ship with the CLI.');
  process.exit(1);
}

const current = readFileSync(shimPath, 'utf8');
const shim = JSON.parse(current);

const failures = [];
if (shim.name !== 'zyncat-ui') failures.push(`name is "${shim.name}", expected "zyncat-ui"`);
if (shim.bin?.['zyncat-ui'] !== './dist/cli.js') failures.push('bin.zyncat-ui must point at ./dist/cli.js');
if (Object.keys(shim.dependencies ?? {}).length) failures.push('the shim must have zero dependencies');
if (!existsSync(cliEntry)) failures.push('src/cli.ts is missing - the package owns the CLI source');
if (rootPkg.bin?.['zyncat-ui'] !== './dist/cli.js')
  failures.push('@zyncat/ui must keep bin.zyncat-ui at ./dist/cli.js for the mirrored bundle');
if (failures.length) {
  for (const failure of failures) console.error(`✗ packages/zyncat-ui/package.json: ${failure}`);
  process.exit(1);
}

if (shim.version !== rootPkg.version) {
  if (check) {
    console.error(
      `✗ packages/zyncat-ui version ${shim.version} != @zyncat/ui ${rootPkg.version} - run "pnpm sync shim".`,
    );
    process.exit(1);
  }
  shim.version = rootPkg.version;
  writeFileSync(shimPath, `${JSON.stringify(shim, null, 2)}\n`);
  console.log(`gen-shim: packages/zyncat-ui pinned to v${rootPkg.version}.`);
} else {
  console.log(`gen-shim${check ? ' --check' : ''}: registry shim in lockstep at v${rootPkg.version}.`);
}
