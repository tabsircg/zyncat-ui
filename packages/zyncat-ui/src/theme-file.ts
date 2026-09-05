import { isOlder } from './detect';

export interface Decision {
  name: string;
  value: string;
  comment: string;
}

export interface TokenNote {
  since?: string;
  deprecated?: string;
  removed?: string;
  use?: string;
}

export interface Flagged {
  name: string;
  note: TokenNote;
}

export interface Drift {
  added: Decision[];
  deprecated: Flagged[];
  removed: Flagged[];
}

export const BASELINE_VERSION = '0.15.0';

export const TOKEN_HISTORY: Record<string, TokenNote> = {};

const ROOT_BLOCK = /^[ \t]*:root\b[^{]*\{/m;
const STAMP = /@zyncat-ui\s+(\d+\.\d+\.\d+)/;
const COMMENT_OR_DECLARATION = /\/\*[\s\S]*?\*\/|(--[\w-]+)\s*:\s*([^;]+);/g;
const COMMENT_OR_NAME = /\/\*[\s\S]*?\*\/|(--[\w-]+)\s*:/g;

function rootBlock(css: string): { start: number; end: number } | null {
  const rule = ROOT_BLOCK.exec(css);
  if (!rule) return null;
  const start = rule.index + rule[0].length;
  let depth = 1;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { start, end: i };
  }
  return null;
}

export function parseDecisions(css: string): Decision[] {
  const block = rootBlock(css);
  if (!block) return [];
  const body = css.slice(block.start, block.end);
  const decisions: Decision[] = [];
  let comment = '';
  COMMENT_OR_DECLARATION.lastIndex = 0;
  for (let match = COMMENT_OR_DECLARATION.exec(body); match; match = COMMENT_OR_DECLARATION.exec(body)) {
    if (match[1] === undefined) {
      comment = match[0];
      continue;
    }
    decisions.push({ name: match[1], value: match[2].trim(), comment });
    comment = '';
  }
  return decisions;
}

export function declaredNames(css: string): Set<string> {
  const names = new Set<string>();
  COMMENT_OR_NAME.lastIndex = 0;
  for (let match = COMMENT_OR_NAME.exec(css); match; match = COMMENT_OR_NAME.exec(css))
    if (match[1] !== undefined) names.add(match[1]);
  return names;
}

export const readStamp = (css: string): string | null => STAMP.exec(css)?.[1] ?? null;

export const stampOf = (css: string): string => readStamp(css) ?? BASELINE_VERSION;

export function themeDrift(existing: string, shipped: Decision[]): Drift {
  const declared = declaredNames(existing);
  const stamp = stampOf(existing);
  const added = shipped.filter((decision) => {
    if (declared.has(decision.name)) return false;
    const since = TOKEN_HISTORY[decision.name]?.since;
    return since !== undefined && isOlder(stamp, since);
  });
  const deprecated: Flagged[] = [];
  const removed: Flagged[] = [];
  for (const name of declared) {
    const note = TOKEN_HISTORY[name];
    if (!note) continue;
    if (note.removed) removed.push({ name, note });
    else if (note.deprecated) deprecated.push({ name, note });
  }
  return { added, deprecated, removed };
}

export function renderDecision(decision: Decision, indent: string): string {
  const comment = decision.comment
    ? `${decision.comment
        .split('\n')
        .map((line, index) => `${indent}${index === 0 ? '' : '   '}${line.trim()}`)
        .join('\n')}\n`
    : '';
  return `${comment}${indent}${decision.name}: ${decision.value};`;
}

function stampCss(css: string, version: string): string {
  if (STAMP.test(css)) return css.replace(STAMP, `@zyncat-ui ${version}`);
  const header = /^\s*\/\*[\s\S]*?\*\//.exec(css);
  const line = `@zyncat-ui ${version} - the version whose decisions this mirrors; \`npx zyncat-ui update\` refreshes it.`;
  if (!header) return `/* ${line} */\n${css}`;
  const close = header.index + header[0].length - 2;
  return `${css.slice(0, close).trimEnd()}\n   ${line} */${css.slice(close + 2)}`;
}

export function withDecisions(css: string, decisions: Decision[], version: string): string {
  const stamped = stampCss(css, version);
  if (!decisions.length) return stamped;
  const body = decisions.map((decision) => renderDecision(decision, '  ')).join('\n');
  const block = rootBlock(stamped);
  if (!block) return `${stamped.trimEnd()}\n\n:root {\n${body}\n}\n`;
  return `${stamped.slice(0, block.end).trimEnd()}\n${body}\n${stamped.slice(block.end)}`;
}
