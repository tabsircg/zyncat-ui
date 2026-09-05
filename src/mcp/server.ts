import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildIndex, GROUPS, loadModules, type UsageModule } from '../../scripts/lib/usage-format.mjs';

interface Db {
  root: string;
  version: string;
  modules: UsageModule[];
  index: string;
}

function findRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const pj = join(dir, 'package.json');
    if (existsSync(pj)) {
      try {
        if (JSON.parse(readFileSync(pj, 'utf8')).name === '@zyncat/ui') return dir;
      } catch {}
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error('@zyncat/ui package root not found');
    dir = parent;
  }
}

function db(): Db {
  const root = findRoot();
  const { version, modules } = loadModules(root);
  return { root, version, modules, index: buildIndex(modules) };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^@zyncat\/ui\//, '')
    .replace(/[^a-z0-9]/g, '');

function resolveModules(d: Db, inputs: string[]): UsageModule[] {
  const bySubpath = new Map(d.modules.map((m) => [m.subpath, m]));
  const candidates = new Map<string, UsageModule>();
  for (const m of d.modules) {
    candidates.set(norm(m.subpath), m);
    if (m.usage) {
      for (const part of m.usage.title.split('/')) {
        const key = norm(part);
        if (key) candidates.set(key, m);
      }
    }
  }
  const misses: string[] = [];
  const found: UsageModule[] = [];
  for (const input of inputs) {
    const q = norm(input);
    if (!q) {
      misses.push(`"${input}"`);
      continue;
    }
    const exact = candidates.get(q) ?? bySubpath.get(q);
    if (exact) {
      found.push(exact);
      continue;
    }
    const loose = new Set<UsageModule>();
    for (const [name, m] of candidates) if (name.includes(q) || q.includes(name)) loose.add(m);
    if (loose.size === 1) found.push([...loose][0]);
    else if (loose.size > 1) misses.push(`"${input}" (ambiguous: ${[...loose].map((m) => m.subpath).join(', ')})`);
    else misses.push(`"${input}"`);
  }
  if (misses.length) {
    throw new Error(`No component matches ${misses.join(', ')}. The catalog:\n\n${d.index}`);
  }
  return [...new Set(found)];
}

const RELATIVE_SPEC_RE = /(?:from\s+['"]|import\(['"])(\.[^'"]+)['"]/g;

function readTypes(root: string, typesPath: string): string {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (path: string) => {
    const full = resolve(root, path);
    if (seen.has(full) || !existsSync(full)) return;
    seen.add(full);
    const text = readFileSync(full, 'utf8');
    out.push(`--- ${relative(root, full)} ---\n${text.trimEnd()}`);
    for (const m of text.matchAll(RELATIVE_SPEC_RE)) {
      const base = join(dirname(full), m[1].replace(/\.js$/, ''));
      for (const candidate of [`${base}.d.ts`, `${base}.d.mts`, join(base, 'index.d.ts')]) {
        if (existsSync(candidate)) {
          walk(relative(root, candidate));
          break;
        }
      }
    }
  };
  walk(typesPath);
  if (!out.length) {
    throw new Error(
      `${typesPath} not found in the installed package - reinstall @zyncat/ui; in the zyncat-ui repo, run "pnpm build" first.`,
    );
  }
  return out.join('\n\n');
}

function renderModule(d: Db, m: UsageModule): string {
  const out: string[] = [];
  if (m.usage) {
    out.push(`# ${m.usage.title} - @zyncat/ui/${m.subpath}`, '');
    if (m.usage.docs) out.push(`Live docs page (see it rendered): ${m.usage.docs}`, '');
    out.push(m.usage.summary, '');
    const note = GROUPS.find((g) => g.id === m.usage!.group)?.note;
    if (note) out.push(`Applies to the whole ${m.usage.group} group: ${note}`, '');
    const prose = m.usage.prose.map((l) => l.text);
    if (prose.length) out.push(...prose, '');
    for (const example of m.usage.examples) out.push('## Example', '', '```' + example.lang, example.code, '```', '');
  } else {
    out.push(`# @zyncat/ui/${m.subpath}`, '', 'No usage doc - this module is documented by its types below.', '');
  }
  out.push('## Complete prop types (entry .d.ts + the shared chunks it imports)', '', readTypes(d.root, m.typesPath));
  return out.join('\n');
}

function getComponent(raw: unknown): string {
  const inputs = (Array.isArray(raw) ? raw : [raw]).filter((v): v is string => typeof v === 'string');
  if (!inputs.length) throw new Error('Pass one or more component names, e.g. ["select", "text-field"].');
  const d = db();
  const modules = resolveModules(d, inputs);
  return modules.map((m) => renderModule(d, m)).join('\n\n');
}

const DECISIONS_FILE = 'decisions.css';

const tokenFiles = (root: string): string[] =>
  existsSync(join(root, 'src/tokens'))
    ? readdirSync(join(root, 'src/tokens'))
        .filter((f) => f.endsWith('.css'))
        .sort((a, b) => Number(b === DECISIONS_FILE) - Number(a === DECISIONS_FILE) || a.localeCompare(b))
    : [];

interface Hit {
  module: UsageModule;
  score: number;
  matched: Set<string>;
  lines: string[];
}

function corpusFor(d: Db, m: UsageModule): { label: string; text: string }[] {
  const parts: { label: string; text: string }[] = [];
  if (m.usagePath && existsSync(join(d.root, m.usagePath))) {
    parts.push({ label: 'usage', text: readFileSync(join(d.root, m.usagePath), 'utf8') });
  }
  try {
    parts.push({ label: 'types', text: readTypes(d.root, m.typesPath) });
  } catch {}
  return parts;
}

function searchApi(query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) throw new Error('Pass one or more keywords, e.g. "searchable" or "drag dismiss".');
  const d = db();

  const hits: Hit[] = [];
  for (const m of d.modules) {
    const hit: Hit = { module: m, score: 0, matched: new Set(), lines: [] };
    const head = `${m.usage?.title ?? ''} ${m.subpath} ${m.usage?.summary ?? ''}`.toLowerCase();
    for (const w of words) {
      if (head.includes(w)) {
        hit.score += 4;
        hit.matched.add(w);
      }
    }
    for (const { label, text } of corpusFor(d, m)) {
      for (const line of text.split('\n')) {
        const lower = line.toLowerCase();
        const inLine = words.filter((w) => lower.includes(w));
        if (!inLine.length) continue;
        for (const w of inLine) hit.matched.add(w);
        hit.score += inLine.length * (label === 'usage' ? 2 : 1);
        const shown = line.trim();
        if (
          hit.lines.length < 4 &&
          shown &&
          !line.startsWith('---') &&
          shown !== m.usage?.summary &&
          !shown.startsWith('# ')
        )
          hit.lines.push(shown);
      }
    }
    if (hit.matched.size) hits.push(hit);
  }

  const full = hits.filter((h) => h.matched.size === words.length);
  const ranked = (full.length ? full : hits).sort((a, b) => b.score - a.score).slice(0, 8);

  const tokenHits: string[] = [];
  for (const f of tokenFiles(d.root)) {
    for (const line of readFileSync(join(d.root, 'src/tokens', f), 'utf8').split('\n')) {
      const lower = line.toLowerCase();
      if (words.some((w) => lower.includes(w)) && tokenHits.length < 12) tokenHits.push(`${f}: ${line.trim()}`);
    }
  }

  if (!ranked.length && !tokenHits.length) {
    return `No matches for "${query}". The catalog:\n\n${d.index}`;
  }

  const out: string[] = [];
  if (!full.length && ranked.length) out.push(`No component matches every word of "${query}"; closest by keyword:`, '');
  for (const h of ranked) {
    out.push(`## ${h.module.usage?.title ?? h.module.subpath} - @zyncat/ui/${h.module.subpath}`);
    if (h.module.usage) out.push(h.module.usage.summary);
    for (const line of h.lines) out.push(`  ${line}`);
    out.push('');
  }
  if (tokenHits.length) out.push('## Design tokens', ...tokenHits.map((l) => `  ${l}`), '');
  out.push(`Follow up with get_component([...names]) for complete APIs.`);
  return out.join('\n');
}

function getTokens(group?: string): string {
  const d = db();
  const files = tokenFiles(d.root);
  if (!files.length) throw new Error('src/tokens/*.css not found in the installed package.');
  let picked = files;
  if (group) {
    const q = norm(group);
    picked = files.filter((f) => {
      const name = norm(f.replace(/\.css$/, ''));
      return name.includes(q) || q.includes(name);
    });
    if (!picked.length) {
      throw new Error(
        `No token group matches "${group}". Groups: ${files.map((f) => f.replace(/\.css$/, '')).join(', ')}.`,
      );
    }
  }
  const out = picked.map(
    (f) => `/* ==== src/tokens/${f} ==== */\n${readFileSync(join(d.root, 'src/tokens', f), 'utf8').trimEnd()}`,
  );
  const theming = join(d.root, 'skills/zyncat-ui/references/theming.md');
  if (!group && existsSync(theming))
    out.push(`/* ==== theming & overrides ==== */\n${readFileSync(theming, 'utf8').trimEnd()}`);
  return out.join('\n\n');
}

const GUIDES = { motion: 'motion.md', design: 'design-system.md', authoring: 'authoring.md' } as const;

const inRepo = (root: string): boolean => existsSync(join(root, 'tsup.config.ts'));

function contributorRoot(tool: string): string {
  const root = findRoot();
  if (!inRepo(root)) {
    throw new Error(
      `${tool} is a contributor tool and is only available inside the zyncat-ui repository. ` +
        'In a consumer install use get_component / search_api / get_tokens.',
    );
  }
  return root;
}

interface GuideSection {
  title: string;
  subtitles: string[];
  lines: string[];
}

function guideSections(root: string, file: string): GuideSection[] {
  const path = join(root, 'docs/authoring', file);
  if (!existsSync(path)) throw new Error(`docs/authoring/${file} is missing from the repository.`);
  const sections: GuideSection[] = [{ title: '', subtitles: [], lines: [] }];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const head = line.match(/^##\s+(.+?)\s*$/);
    const sub = line.match(/^###\s+(.+?)\s*$/);
    if (head) sections.push({ title: head[1], subtitles: [], lines: [line] });
    else {
      const current = sections[sections.length - 1];
      if (sub) current.subtitles.push(sub[1]);
      current.lines.push(line);
    }
  }
  return sections;
}

function guide(tool: string, file: string, topic?: string): string {
  const sections = guideSections(contributorRoot(tool), file);
  const text = (picked: GuideSection[]) =>
    picked
      .flatMap((s) => s.lines)
      .join('\n')
      .trim();
  if (!topic) return text(sections);
  const q = norm(topic);
  const matches = (title: string) => norm(title).includes(q) || q.includes(norm(title));
  const named = sections.filter((s) => s.title);
  const hits = named.filter((s) => matches(s.title) || s.subtitles.some(matches));
  if (!hits.length) {
    const titles = named.flatMap((s) => [s.title, ...s.subtitles]);
    throw new Error(`No section of ${file} matches "${topic}". Sections: ${titles.join(', ')}.`);
  }
  return text(hits);
}

const CONSUMER_TOOLS = [
  {
    name: 'get_component',
    description:
      'Full current API for one or more components: the maintainers’ usage doc (purpose, when to pick it over ' +
      'its neighbours, example, live docs page URL) plus the complete TypeScript prop types with doc comments, ' +
      'shared type chunks inlined. Accepts a list - pass every component the change touches in ONE call. This is ' +
      'the only reliable source for props: call it before writing any Zyncat UI JSX. An unknown name returns the ' +
      'full component catalog, so a wrong guess still orients you.',
    inputSchema: {
      type: 'object',
      properties: {
        components: {
          description:
            'Component names or subpaths - ["select", "text-field", "dialog"], "Button", "@zyncat/ui/sheet".',
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, minItems: 1 }],
        },
      },
      required: ['components'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_api',
    description:
      'Ranked keyword search across every component’s usage doc, prop types and the design-token CSS. Finds ' +
      'which component owns a prop, behavior or token (e.g. "drag dismiss", "searchable", "DurationToken", ' +
      '"--accent"). Zero matches returns the whole catalog instead, so a miss still orients you. Follow up with ' +
      'get_component.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'One or more keywords.' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_tokens',
    description:
      'The design-token vocabulary as CSS custom properties with their real values - color, semantic, spacing, ' +
      'typography, radius, elevation, motion, icons, layers, glass, avatar, fonts - plus the theming/override ' +
      'levels. Optionally pass one group name; omit for all. Use for theming and for reading exact values.',
    inputSchema: {
      type: 'object',
      properties: {
        group: { type: 'string', description: 'One token group, e.g. "color" or "motion". Omit for all.' },
      },
      additionalProperties: false,
    },
  },
];

const CONTRIBUTOR_TOOLS = [
  {
    name: 'motion_guide',
    description:
      'How to animate inside this repo: the transitions-vs-simulations boundary, which layer to reach for (CSS transition vs the engine vs Presence vs FLIP vs glide), the complete Layer keyframe vocabulary, [to] vs [from,to] semantics, timing, the one-writer-per-property ownership rules, sequencing, global reduced motion, and the canonical enter/exit recipes. Read this before writing any motion code - most of it is not guessable from the source.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'One section, e.g. "ownership", "timing", "simulations", "recipes". Omit for all.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'design_rules',
    description:
      'The design-system rules for this repo: what the library is for, the system / expressive / replica contracts and the invariants that bind every tier, the token vocabulary and when to add a token rather than use an existing one, the consumer override levels, compose vs build a new component, which tier a component belongs in, and the internal machinery to reuse instead of hand-rolling.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description:
            'One section, e.g. "tokens", "retiring", "contracts", "overrides", "compose", "tier". Omit for all.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'authoring_checklist',
    description:
      'The complete checklist to add a component to this repo: file placement and tsup auto-discovery, the exports-map entry that fails silently when skipped, the per-component stylesheet and CSS-graph rule, the usage doc, which tests to write, and the checks to run.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

function tools() {
  try {
    return inRepo(findRoot()) ? [...CONSUMER_TOOLS, ...CONTRIBUTOR_TOOLS] : CONSUMER_TOOLS;
  } catch {
    return CONSUMER_TOOLS;
  }
}

const CONSUMER_INSTRUCTIONS =
  'Zyncat UI design-system API - the live truth for the installed version. Before writing any JSX that renders a ' +
  'Zyncat UI component, call get_component with every component the change touches (it accepts a list); prop lists ' +
  'remembered from training, a skill index or old code are not the API. search_api finds which component owns a ' +
  'keyword or behavior; get_tokens prints the token vocabulary with real values plus the theming levels. Imports ' +
  'are per-subpath (@zyncat/ui/button - no barrel); link @zyncat/ui/styles.css once at the root. The zyncat-ui ' +
  'skill (installed by `npx zyncat-ui init`) carries the component map, the recipes and the conventions.';

const CONTRIBUTOR_INSTRUCTIONS =
  ' You are inside the zyncat-ui repository, so the contributor tools are also available and you are ' +
  'expected to use them before writing library code: motion_guide (call it before any motion code - the ' +
  'keyframe vocabulary and the ownership rules are not guessable from the source), design_rules (tokens, ' +
  'compose vs build, the internals to reuse), authoring_checklist (adding a component end to end).';

function instructions(): string {
  try {
    return inRepo(findRoot()) ? CONSUMER_INSTRUCTIONS + CONTRIBUTOR_INSTRUCTIONS : CONSUMER_INSTRUCTIONS;
  } catch {
    return CONSUMER_INSTRUCTIONS;
  }
}

function callTool(name: string, args: Record<string, unknown>): string {
  const str = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : undefined);
  switch (name) {
    case 'get_component':
      return getComponent(args.components ?? args.component);
    case 'search_api': {
      const query = str('query');
      if (!query) throw new Error('Missing required argument "query".');
      return searchApi(query);
    }
    case 'get_tokens':
      return getTokens(str('group'));
    case 'motion_guide':
      return guide(name, GUIDES.motion, str('topic'));
    case 'design_rules':
      return guide(name, GUIDES.design, str('topic'));
    case 'authoring_checklist':
      return guide(name, GUIDES.authoring);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

type RpcId = number | string | null;
function send(msg: object): void {
  try {
    process.stdout.write(`${JSON.stringify(msg)}\n`);
  } catch {
    process.exit(0);
  }
}
const reply = (id: RpcId, result: object) => send({ jsonrpc: '2.0', id, result });
const replyError = (id: RpcId, code: number, message: string) => send({ jsonrpc: '2.0', id, error: { code, message } });

function handle(req: { id?: RpcId; method?: string; params?: Record<string, unknown> }): void {
  const { id, method, params } = req;
  const isNotification = id === undefined;
  switch (method) {
    case 'initialize': {
      let version = '0.0.0';
      try {
        version = db().version;
      } catch {}
      return reply(id!, {
        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'zyncat-ui', version },
        instructions: instructions(),
      });
    }
    case 'ping':
      return reply(id!, {});
    case 'tools/list':
      return reply(id!, { tools: tools() });
    case 'tools/call': {
      try {
        const name = typeof params?.name === 'string' ? params.name : '';
        const args = (params?.arguments ?? {}) as Record<string, unknown>;
        const text = callTool(name, args);
        return reply(id!, { content: [{ type: 'text', text }], isError: false });
      } catch (e) {
        const text = e instanceof Error ? e.message : String(e);
        return reply(id!, { content: [{ type: 'text', text }], isError: true });
      }
    }
    default:
      if (!isNotification) replyError(id ?? null, -32601, `Method not found: ${method}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  let nl: number;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      replyError(null, -32700, 'Parse error');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
process.stdout.on('error', () => process.exit(0));
