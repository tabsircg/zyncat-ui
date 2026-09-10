import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cancel, confirm, intro, isCancel, log, outro, select, spinner } from '@clack/prompts';

import {
  detectPm,
  findAppEntry,
  findOwnRoot,
  findTailwindEntry,
  installedVersion,
  isOlder,
  majorOf,
  PACKAGE_MANAGERS,
  pmVersion,
  readJson,
  TAILWIND_IMPORT,
  tailwindMajor,
  type PackageJson,
  type PackageManager,
} from './detect';
import { runInstall, type InstallFailure, type InstallProgress } from './install';
import { accentDeep, bold, dim, red } from './palette';
import { parseDecisions, themeDrift, type Drift, type Flagged } from './theme-file';
import {
  arrow,
  bar,
  check,
  kilobytes,
  row,
  seconds,
  shimmer,
  skip,
  SPINNER_DELAY,
  SPINNER_FRAMES,
  styleFrame,
  wordmark,
} from './ui';

export interface InitFlags {
  yes: boolean;
  pm?: PackageManager;
}

const PACKAGE = '@zyncat/ui';
const MCP_SERVER_ENTRY = { command: 'node', args: ['./node_modules/@zyncat/ui/dist/mcp.js'] };
const STYLES_IMPORT = "import '@zyncat/ui/styles.css';";
const THEME_FILE = 'zyncat.theme.css';
const THEME_IMPORT = `import './${THEME_FILE}';`;
const THEME_SOURCE = 'src/tokens/decisions.css';
const TAILWIND_BRIDGE = '@zyncat/ui/tailwind.css';
const DOCS_URL = 'https://ui.zyncat.app';

const interactive = () => Boolean(process.stdout.isTTY && process.stdin.isTTY);

let installTouchedProject = false;

function bail(message: string, hint?: string): never {
  log.error(message);
  if (hint) log.message(dim(hint), { spacing: 0 });
  outro(
    red(installTouchedProject ? 'Stopped here - the install ran, nothing else was wired.' : 'Nothing was changed.'),
  );
  process.exit(1);
}

async function pickPm(cwd: string, targetPkg: PackageJson, flags: InitFlags): Promise<PackageManager> {
  if (flags.pm) return flags.pm;
  const detected = detectPm(cwd, targetPkg);
  if (detected) return detected;
  if (!interactive() || flags.yes) return 'npm';
  const choice = await select<PackageManager>({
    message: 'No lockfile found - which package manager runs this project?',
    options: PACKAGE_MANAGERS.map((pm) => ({ value: pm, label: pm })),
  });
  if (isCancel(choice)) {
    cancel('Cancelled - nothing was changed.');
    process.exit(130);
  }
  return choice;
}

const ADD_COMMAND: Record<PackageManager, string> = {
  pnpm: 'pnpm add',
  npm: 'npm install',
  yarn: 'yarn add',
  bun: 'bun add',
};

interface Plan {
  specs: string[];
  restore: boolean;
  reactNote: string | null;
}

interface Wired {
  line: string;
  done: boolean;
  hints?: string[];
  warn?: string;
}

export function removedWarning(removed: Flagged[]): string {
  const one = removed.length === 1;
  const named = removed
    .map(({ name, note }) => `${name} (removed in ${note.removed}${note.use ? ` - use ${note.use}` : ''})`)
    .join(', ');
  const lead = one
    ? 'A token your theme file sets no longer exists'
    : `${removed.length} tokens your theme file sets no longer exist`;
  return `${lead}: ${named}. Nothing reads ${one ? 'it' : 'them'} now, so ${one ? 'that line is' : 'those lines are'} dead.`;
}

export function deprecatedNote(deprecated: Flagged[]): string {
  const one = deprecated.length === 1;
  const named = deprecated
    .map(({ name, note }) => `${name} (deprecated in ${note.deprecated}${note.use ? ` - now feeds ${note.use}` : ''})`)
    .join(', ');
  const lead = one ? 'A token your theme file sets is deprecated' : `${deprecated.length} tokens are deprecated`;
  return `${lead}: ${named}. ${one ? 'It still works' : 'They still work'} - rename ${one ? 'it' : 'them'} before the alias goes.`;
}

const minorOf = (version: string): number => Number(version.split('.')[1] ?? 0);

export function crossedVersions(before: string, after: string): string {
  const minors = minorOf(after) - minorOf(before);
  if (minors < 1) return row('Upgraded', `${before} ${arrow} ${after}`);
  const releases = `${minors} minor release${minors === 1 ? '' : 's'}`;
  return row('Upgraded', `${before} ${arrow} ${after} · ${releases}, each breaking before 1.0`);
}

export function driftHint(drift: Drift, command: string): string {
  const one = drift.added.length === 1;
  const names = drift.added.map((decision) => decision.name).join(', ');
  const running = one ? 'it already runs on its default' : 'each already runs on its default';
  return `${names} - ${running}, so nothing is broken. ${command} adds ${one ? 'it' : 'them'} to your file.`;
}

async function planInstall(cwd: string, targetPkg: PackageJson, flags: InitFlags, version: string): Promise<Plan> {
  const deps = { ...targetPkg.dependencies, ...targetPkg.devDependencies };
  const specs: string[] = [];
  let reactNote: string | null = null;

  const hasPackage = PACKAGE in deps;
  const onDisk = installedVersion(cwd, PACKAGE);
  const outdated = onDisk !== null && isOlder(onDisk, version);
  if (!hasPackage || outdated) specs.push(`${PACKAGE}@^${version}`);

  if (!('react' in deps)) {
    specs.push('react', 'react-dom');
  } else {
    const major = majorOf(deps.react) ?? majorOf(installedVersion(cwd, 'react') ?? undefined);
    if (major !== null && major < 19) {
      let upgrade = flags.yes;
      if (!flags.yes && interactive()) {
        const answer = await confirm({
          message: `React ${major} is installed, and ${PACKAGE} needs React 19. Upgrade react and react-dom?`,
        });
        if (isCancel(answer)) {
          cancel('Cancelled - nothing was changed.');
          process.exit(130);
        }
        upgrade = answer;
      }
      if (upgrade) specs.push('react@^19', 'react-dom@^19');
      else reactNote = `React ${major} stays as it is - ${PACKAGE} requires React 19, so upgrade before shipping.`;
    }
  }

  return { specs, restore: hasPackage && onDisk === null, reactNote };
}

function renderProgress(pm: PackageManager, progress: InstallProgress | null, tick: number): string {
  if (pm !== 'pnpm') return shimmer(`Installing with ${pm}`, tick);
  if (!progress || progress.stage === 'resolving') {
    const found = progress?.resolved ? dim(` ${progress.resolved} found`) : '';
    return `${shimmer('Resolving dependencies', tick)}${found}`;
  }
  if (progress.stage === 'linking') return `${shimmer('Linking packages', tick)} ${bar(1)}`;
  const ratio = progress.resolved ? progress.satisfied / progress.resolved : 0;
  const counts = dim(`${progress.satisfied}/${progress.resolved}`);
  let current = '';
  if (progress.fetchingId && progress.fetchingSize) {
    const name = progress.fetchingId.split('@').slice(0, -1).join('@') || progress.fetchingId;
    const bytes = progress.fetchingDone
      ? `${kilobytes(progress.fetchingDone)} / ${kilobytes(progress.fetchingSize)}`
      : kilobytes(progress.fetchingSize);
    current = dim(` · ${name} ${bytes}`);
  }
  return `${shimmer('Fetching packages', tick)} ${bar(ratio)} ${counts}${current}`;
}

async function installPhase(pm: PackageManager, plan: Plan, cwd: string): Promise<{ line: string } | null> {
  if (!plan.specs.length && !plan.restore) {
    const version = installedVersion(cwd, PACKAGE);
    log.message(`${bold(PACKAGE)} ${dim(`${version} already installed`)}`, { symbol: check });
    return null;
  }

  const live = interactive();
  const spin = spinner({ indicator: 'timer', frames: SPINNER_FRAMES, delay: SPINNER_DELAY, styleFrame });
  let progress: InstallProgress | null = null;
  let tick = 0;

  const handle = runInstall(pm, plan.restore ? [] : plan.specs, cwd, (latest) => {
    progress = latest;
  });

  let interval: ReturnType<typeof setInterval> | undefined;
  if (live) {
    spin.start(renderProgress(pm, progress, tick));
    interval = setInterval(() => {
      tick++;
      spin.message(renderProgress(pm, progress, tick));
    }, SPINNER_DELAY);
  } else {
    log.message(
      dim(plan.restore ? `Restoring node_modules with ${pm}` : `Installing ${plan.specs.join(' ')} with ${pm}`),
    );
  }

  const finish = () => {
    if (interval) clearInterval(interval);
    if (live) spin.clear();
  };

  const cancelInstall = () => {
    handle.cancel();
    finish();
    cancel('Cancelled - the install was stopped before it finished.');
    process.exit(130);
  };
  if (live) process.once('SIGINT', cancelInstall);

  try {
    const result = await handle.done;
    if (live) process.removeListener('SIGINT', cancelInstall);
    finish();
    const version = result.roots.find((entry) => entry.name === PACKAGE)?.version ?? installedVersion(cwd, PACKAGE);
    const react = result.roots.find((entry) => entry.name === 'react');
    const parts = [
      `${bold(PACKAGE)} ${dim(version ?? '')}`.trimEnd(),
      result.added ? dim(`${result.added} package${result.added === 1 ? '' : 's'}`) : '',
      react ? dim(`react ${react.version}`) : '',
      dim(seconds(result.ms)),
    ].filter(Boolean);
    return { line: parts.join(dim(' · ')) };
  } catch (failure) {
    if (live) process.removeListener('SIGINT', cancelInstall);
    finish();
    const { detail } = failure as InstallFailure;
    log.error(`${pm} could not finish the install.`);
    for (const line of detail.slice(-12)) log.message(dim(line), { spacing: 0 });
    outro(red('Fix the install error above, then re-run init.'));
    process.exit(1);
  }
}

async function alignVersion(pm: PackageManager, cwd: string, version: string): Promise<void> {
  const onDisk = installedVersion(cwd, PACKAGE);
  if (!onDisk || !isOlder(onDisk, version)) return;
  log.warn(
    `${PACKAGE} ${onDisk} landed, older than the CLI (${version}) - upgrading so the skill and MCP server match.`,
  );
  const upgraded = await installPhase(pm, { specs: [`${PACKAGE}@^${version}`], restore: false, reactNote: null }, cwd);
  if (upgraded) log.message(upgraded.line, { symbol: check });
}

export function sourceRoot(cwd: string, ownRoot: string): string {
  const installed = join(cwd, 'node_modules', PACKAGE);
  if (existsSync(join(installed, 'skills'))) return installed;
  return ownRoot;
}

function wireSkill(cwd: string, packageRoot: string, pm: PackageManager): Wired {
  const source = join(packageRoot, 'skills');
  if (!existsSync(source)) {
    const onDisk = installedVersion(cwd, PACKAGE);
    return {
      line: row('Agent skill', `skipped · ${PACKAGE}${onDisk ? ` ${onDisk}` : ''} ships no skills/`),
      done: false,
      hints: [`Upgrade it with ${ADD_COMMAND[pm]} ${PACKAGE}@latest, then re-run init.`],
    };
  }
  const dest = join(cwd, '.claude/skills');
  const existed = existsSync(join(dest, 'zyncat-ui'));
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(source))
    cpSync(join(source, name), join(dest, name), { recursive: true, force: true });
  return { line: row('Agent skill', `.claude/skills/zyncat-ui · ${existed ? 'refreshed' : 'installed'}`), done: true };
}

function wireMcp(cwd: string): Wired {
  const path = join(cwd, '.mcp.json');
  let config: { mcpServers?: Record<string, unknown> } = {};
  if (existsSync(path)) {
    const parsed = readJson(path);
    if (!parsed) bail(`.mcp.json exists but is not valid JSON - fix it, then re-run init.`);
    config = parsed as typeof config;
  }
  if (JSON.stringify(config.mcpServers?.['zyncat-ui']) === JSON.stringify(MCP_SERVER_ENTRY))
    return { line: row('MCP server', '.mcp.json · kept'), done: true };
  config.mcpServers = { ...config.mcpServers, 'zyncat-ui': MCP_SERVER_ENTRY };
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  return { line: row('MCP server', `.mcp.json ${arrow} zyncat-ui`), done: true };
}

export function shippedDecisionsCss(packageRoot: string): string | null {
  const source = join(packageRoot, THEME_SOURCE);
  return existsSync(source) ? readFileSync(source, 'utf8') : null;
}

function themeFileText(css: string, version: string): string | null {
  const rule = /^\s*:root\b[^{]*\{/m.exec(css);
  if (!rule) return null;
  const open = rule.index + rule[0].length - 1;
  const close = css.indexOf('}', open);
  if (close === -1) return null;
  const lines = css
    .slice(open + 1, close)
    .split('\n')
    .filter((line) => line.trim());
  const indent = Math.min(...lines.map((line) => line.length - line.trimStart().length));
  const body = lines.map((line) => `  ${line.slice(indent)}`).join('\n');
  return [
    `/* ${THEME_FILE} - the decisions every other token derives from, written by zyncat-ui init.`,
    '   Loaded after @zyncat/ui/styles.css, so a value here wins; whatever you delete keeps the default.',
    "   A [data-polarity='dark'] block here extends the dark polarity, a [data-theme='<name>'] one adds a",
    '   palette, and data-theme="default" on a subtree brings these back inside another palette.',
    '   Docs: https://ui.zyncat.app/theming',
    `   @zyncat-ui ${version} - the version whose decisions this mirrors; \`npx zyncat-ui update\` refreshes it. */`,
    ':root,',
    "[data-theme='default'] {",
    body,
    '}',
    '',
  ].join('\n');
}

export const themePath = (cwd: string, entry: string | null): { rel: string; path: string } => {
  const dir = entry ? dirname(entry) : '.';
  const rel = dir === '.' ? THEME_FILE : `${dir}/${THEME_FILE}`;
  return { rel, path: join(cwd, rel) };
};

function wireTheme(cwd: string, packageRoot: string, pm: PackageManager, entry: string | null, version: string): Wired {
  const { rel, path } = themePath(cwd, entry);
  const css = shippedDecisionsCss(packageRoot);
  if (!css)
    return {
      line: row('Theme file', `skipped · ${PACKAGE} ships no ${THEME_SOURCE}`),
      done: false,
      hints: [`Upgrade it with ${ADD_COMMAND[pm]} ${PACKAGE}@latest, then re-run init.`],
    };
  if (existsSync(path)) {
    const drift = themeDrift(readFileSync(path, 'utf8'), parseDecisions(css));
    const news = drift.added.length
      ? ` · ${drift.added.length} new decision${drift.added.length === 1 ? '' : 's'} available`
      : '';
    const hints: string[] = [];
    if (drift.added.length) hints.push(driftHint(drift, 'npx zyncat-ui update'));
    if (drift.deprecated.length) hints.push(deprecatedNote(drift.deprecated));
    return {
      line: row('Theme file', `${rel} · kept${news}`),
      done: true,
      hints,
      warn: drift.removed.length ? removedWarning(drift.removed) : undefined,
    };
  }
  const text = themeFileText(css, version);
  if (!text)
    return {
      line: row('Theme file', `skipped · ${THEME_SOURCE} has no :root block`),
      done: false,
      hints: [`Upgrade it with ${ADD_COMMAND[pm]} ${PACKAGE}@latest, then re-run init.`],
    };
  writeFileSync(path, text);
  return { line: row('Theme file', `${rel} · written`), done: true };
}

const STYLES_LINE = /^\s*import\s+(['"])@zyncat\/ui\/styles\.css\1;?\s*$/;
const THEME_LINE = new RegExp(`^\\s*import\\s+(['"])[^'"]*${THEME_FILE.replace(/\./g, '\\.')}\\1;?\\s*$`);
const CSS_LINE = /^\s*import\s+(['"])(\.[^'"]*\.css)\1;?\s*$/;

const slashes = (path: string) => path.split(/[\\/]/).filter(Boolean).join('/');

function importsStylesheet(line: string, fromDir: string, target: string): boolean {
  const spec = CSS_LINE.exec(line)?.[2];
  return spec !== undefined && slashes(join(fromDir, spec)) === slashes(target);
}

function wireStyles(cwd: string, entry: string | null, tailwindEntry: string | null): Wired {
  const below = tailwindEntry ? `below the ${tailwindEntry} import` : 'above your own stylesheets';
  if (!entry)
    return {
      line: row('Stylesheet', 'no app entry found · add the imports yourself'),
      done: false,
      hints: [`Put ${STYLES_IMPORT} then ${THEME_IMPORT} at your app root, ${below}.`],
    };
  const path = join(cwd, entry);
  const text = readFileSync(path, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const dir = dirname(entry);
  const hasTheme = existsSync(join(cwd, dir, THEME_FILE));

  const mine = (line: string) => STYLES_LINE.test(line) || (hasTheme && THEME_LINE.test(line));
  const had = text.split(eol).some(mine);
  const kept = text.split(eol).filter((line) => !mine(line));
  const bridgeAt = tailwindEntry ? kept.findIndex((line) => importsStylesheet(line, dir, tailwindEntry)) : -1;

  let at = 0;
  if (bridgeAt !== -1) at = bridgeAt + 1;
  else while (at < kept.length && (kept[at].trim() === '' || /^(['"])use [\w-]+\1;?$/.test(kept[at].trim()))) at++;

  kept.splice(at, 0, STYLES_IMPORT, ...(hasTheme ? [THEME_IMPORT] : []));
  const next = kept.join(eol);
  if (next === text) return { line: row('Stylesheet', `${entry} · already imported`), done: true };

  writeFileSync(path, next);
  const what =
    had && bridgeAt !== -1 ? `imports moved below ${tailwindEntry}` : had ? 'imports updated' : 'imports added';
  return { line: row('Stylesheet', `${entry} · ${what}`), done: true };
}

function wireTailwind(cwd: string, targetPkg: PackageJson): (Wired & { bridge?: string }) | null {
  const major = tailwindMajor(cwd, targetPkg);
  if (major === null) return null;
  if (major < 4)
    return {
      line: row('Tailwind', `skipped · Tailwind ${major} has no @theme`),
      done: false,
      hints: [`The bridge needs Tailwind v4 - ${DOCS_URL}/theming#tailwind.`],
    };
  const entry = findTailwindEntry(cwd);
  if (!entry)
    return {
      line: row('Tailwind', 'no stylesheet imports tailwindcss · add the line yourself'),
      done: false,
      hints: [`Put @import '${TAILWIND_BRIDGE}'; above @import 'tailwindcss'; in the stylesheet Tailwind compiles.`],
    };
  const path = join(cwd, entry);
  const text = readFileSync(path, 'utf8');
  if (text.includes(TAILWIND_BRIDGE))
    return { line: row('Tailwind', `${entry} · already imported`), done: true, bridge: entry };
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const at = lines.findIndex((line) => TAILWIND_IMPORT.test(line));
  const quote = lines[at].includes('"') ? '"' : "'";
  lines.splice(at, 0, `@import ${quote}${TAILWIND_BRIDGE}${quote};`);
  writeFileSync(path, lines.join(eol));
  return { line: row('Tailwind', `${entry} · import added`), done: true, bridge: entry };
}

export async function init(flags: InitFlags): Promise<void> {
  const startedAt = performance.now();
  const { root: ownRoot, version } = findOwnRoot();
  const cwd = process.cwd();

  intro(wordmark(version));

  const targetPkgPath = join(cwd, 'package.json');
  const targetPkg = readJson(targetPkgPath);
  if (!targetPkg) {
    bail(
      'No package.json here - init sets up an existing React app.',
      `Create one first (pnpm create vite my-app, pnpm create next-app my-app), then run init inside it.`,
    );
  }
  if (targetPkg.name === PACKAGE || targetPkg.name === 'zyncat-ui') {
    bail('This is the zyncat-ui repository - init sets up a consumer project.');
  }

  const pm = await pickPm(cwd, targetPkg, flags);
  const pmVer = pmVersion(pm);
  const project = targetPkg.name ?? 'unnamed project';
  log.message(dim(`${project} · ${pm}${pmVer ? ` ${pmVer}` : ''}`));

  const before = installedVersion(cwd, PACKAGE);
  const plan = await planInstall(cwd, targetPkg, flags, version);
  const installed = await installPhase(pm, plan, cwd);
  installTouchedProject = true;
  if (installed) log.message(installed.line, { symbol: check });
  if (plan.reactNote) log.warn(plan.reactNote);
  await alignVersion(pm, cwd, version);

  const packageRoot = sourceRoot(cwd, ownRoot);
  const landed = installedVersion(cwd, PACKAGE) ?? version;
  if (before && isOlder(before, landed)) log.message(crossedVersions(before, landed), { symbol: check });
  const entry = findAppEntry(cwd);
  const tailwind = wireTailwind(cwd, targetPkg);
  const rows: Wired[] = [
    wireSkill(cwd, packageRoot, pm),
    wireMcp(cwd),
    wireTheme(cwd, packageRoot, pm, entry, landed),
    wireStyles(cwd, entry, tailwind?.bridge ?? null),
    ...(tailwind ? [tailwind] : []),
  ];
  for (const [index, entry] of rows.entries()) {
    log.message(entry.line, { symbol: entry.done ? check : skip, spacing: index === 0 ? 1 : 0 });
    for (const hint of entry.hints ?? []) log.message(dim(hint), { spacing: 0 });
    if (entry.warn) log.warn(entry.warn);
  }

  log.message(`${dim('Docs')} ${arrow} ${accentDeep(DOCS_URL)}`);
  const skipped = rows.filter((entry) => !entry.done).length;
  const closing = skipped
    ? `${bold(`Done in ${seconds(performance.now() - startedAt)}.`)} ${skipped} step${skipped === 1 ? '' : 's'} left for you, above.`
    : `${bold(`Ready in ${seconds(performance.now() - startedAt)}.`)} Restart your agent session to load the skill.`;
  outro(closing);
}
