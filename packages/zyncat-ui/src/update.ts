import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cancel, confirm, intro, isCancel, log, outro } from '@clack/prompts';

import { findAppEntry, findOwnRoot, installedVersion, readJson } from './detect';
import { deprecatedNote, driftHint, removedWarning, shippedDecisionsCss, sourceRoot, themePath } from './init';
import { accentDeep, bold, dim, red } from './palette';
import { parseDecisions, renderDecision, stampOf, themeDrift, withDecisions } from './theme-file';
import { arrow, check, row, wordmark } from './ui';

export interface UpdateFlags {
  yes: boolean;
}

const PACKAGE = '@zyncat/ui';
const DOCS_URL = 'https://ui.zyncat.app';

const interactive = () => Boolean(process.stdout.isTTY && process.stdin.isTTY);

function stop(message: string, hint?: string): never {
  log.error(message);
  if (hint) log.message(dim(hint), { spacing: 0 });
  outro(red('Nothing was changed.'));
  process.exit(1);
}

export async function update(flags: UpdateFlags): Promise<void> {
  const { root: ownRoot, version } = findOwnRoot();
  const cwd = process.cwd();

  intro(wordmark(version));

  const targetPkg = readJson(join(cwd, 'package.json'));
  if (!targetPkg) stop('No package.json here - update runs inside a React project that already ran init.');
  if (targetPkg.name === PACKAGE || targetPkg.name === 'zyncat-ui')
    stop('This is the zyncat-ui repository - update runs in a consumer project.');

  const packageRoot = sourceRoot(cwd, ownRoot);
  const landed = installedVersion(cwd, PACKAGE);
  if (!landed) stop(`${PACKAGE} is not installed here.`, 'Run npx zyncat-ui init first.');
  log.message(dim(`${targetPkg.name ?? 'unnamed project'} · ${PACKAGE} ${landed}`));

  const shipped = shippedDecisionsCss(packageRoot);
  if (!shipped) stop(`${PACKAGE} ${landed} ships no decisions to compare against.`);

  const { rel, path } = themePath(cwd, findAppEntry(cwd));
  if (!existsSync(path)) stop(`No ${rel} here.`, 'Run npx zyncat-ui init to write one.');

  const current = readFileSync(path, 'utf8');
  const stamp = stampOf(current);
  const drift = themeDrift(current, parseDecisions(shipped));

  if (drift.deprecated.length) log.message(dim(deprecatedNote(drift.deprecated)), { spacing: 0 });
  if (drift.removed.length) log.warn(removedWarning(drift.removed));

  if (!drift.added.length) {
    if (stamp !== landed) writeFileSync(path, withDecisions(current, [], landed));
    log.message(row('Theme file', `${rel} · every decision in ${landed} is already in your file`), { symbol: check });
    outro(bold(stamp === landed ? 'Up to date.' : `Up to date. Stamp ${stamp} ${arrow} ${landed}.`));
    return;
  }

  log.message(
    `${bold(`${drift.added.length} new decision${drift.added.length === 1 ? '' : 's'}`)} ${dim(`since ${stamp}`)}\n\n${drift.added
      .map((decision) => renderDecision(decision, '  '))
      .join('\n')}`,
  );
  log.message(dim(driftHint(drift, 'This')), { spacing: 0 });

  if (!flags.yes && interactive()) {
    const answer = await confirm({ message: `Add ${drift.added.length === 1 ? 'it' : 'them'} to ${rel}?` });
    if (isCancel(answer) || !answer) {
      cancel('Cancelled - nothing was changed.');
      process.exit(isCancel(answer) ? 130 : 0);
    }
  }

  writeFileSync(path, withDecisions(current, drift.added, landed));
  log.message(row('Theme file', `${rel} · ${drift.added.length} added, stamped ${landed}`), { symbol: check });
  log.message(`${dim('Docs')} ${arrow} ${accentDeep(`${DOCS_URL}/theming`)}`);
  outro(bold('Your values were not touched.'));
}
