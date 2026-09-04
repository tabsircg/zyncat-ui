import { pkg, script, tool } from './run.mjs';

export const CHECKS = {
  exports: script('check:exports', 'sync-exports.mjs'),
  tsconfig: script('check:tsconfig', 'sync-tsconfig.mjs', '--check'),
  css: script('check:css', 'check-css-graph.mjs'),
  authoring: script('check:authoring', 'check-authoring.mjs'),
  contracts: script('check:contracts', 'check-contracts.mjs'),
  skill: script('check:skill', 'gen-skill.mjs', '--check'),
  theme: script('check:theme', 'gen-theme.mjs', '--check'),
  shim: script('check:shim', 'gen-shim.mjs', '--check'),
  usage: script('check:usage', 'check-usage.mjs'),
  props: script('check:props', 'gen-props.mjs', '--check'),
  format: tool('format:check', 'prettier', '--check', '--cache', '.'),
  'typecheck:src': tool('typecheck:src', 'tsc', '-p', 'tsconfig.build.json', '--noEmit', '--declaration', 'false'),
  'typecheck:node': tool('typecheck:node', 'tsc', '-p', 'tsconfig.node.json'),
  'typecheck:cli': pkg('typecheck:cli', 'zyncat-ui', 'typecheck'),
};

export const SYNCS = {
  theme: script('sync:theme', 'gen-theme.mjs'),
  shim: script('sync:shim', 'gen-shim.mjs'),
  exports: script('sync:exports', 'sync-exports.mjs', '--write'),
  tsconfig: script('sync:tsconfig', 'sync-tsconfig.mjs'),
  props: script('sync:props', 'gen-props.mjs'),
  skill: script('sync:skill', 'gen-skill.mjs'),
};

export const BUILD = [
  tool('build:js', 'tsup'),
  tool('build:types', 'tsc', '-p', 'tsconfig.build.json', '--emitDeclarationOnly'),
  pkg('build:cli', 'zyncat-ui', 'build'),
];

export const GROUPS = { typecheck: ['typecheck:src', 'typecheck:node', 'typecheck:cli'] };

export const NEEDS_DIST = new Set(['usage', 'props']);

export function select(registry, names) {
  if (!names.length) return Object.keys(registry);
  const picked = [];
  for (const name of names) {
    const expanded = GROUPS[name] ?? [name];
    for (const key of expanded) {
      if (!registry[key]) return { unknown: name };
      picked.push(key);
    }
  }
  return picked;
}

export function usage(command, registry) {
  const names = [...Object.keys(registry), ...Object.keys(GROUPS).filter((g) => registry[GROUPS[g][0]])];
  return `usage: pnpm ${command} [${names.sort().join(' | ')}]`;
}
