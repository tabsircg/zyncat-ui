# Zyncat UI

A premium React 19 design system: modern CSS, a small closed token vocabulary, a WAAPI motion engine. No Tailwind dependency, no CSS-in-JS, no UI library, zero runtime dependencies. Ships compiled ESM + types, one component per subpath, each loading its own CSS.

Built first for my own applications: every component exists because a product needed it, and the API is the one that made that product simpler. MIT-licensed and yours to use, but not run as a community project - no public roadmap, support commitment, issue triage or contribution process - and parts may later move to an open-core or commercial arrangement. Pin a version.

## Install

```bash
pnpm dlx zyncat-ui init
# npx zyncat-ui init · yarn dlx zyncat-ui init · bunx zyncat-ui init
```

One command, inside your React project. It installs `@zyncat/ui` (and React 19 if missing), imports the base stylesheet at your app root, writes `zyncat.theme.css` beside it, installs the agent skill into `.claude/skills/` and registers the MCP server in `.mcp.json`. Every step is idempotent and printed as it lands. `--yes` accepts every default, `--pm <pnpm|npm|yarn|bun>` pins the package manager, and non-interactive shells get plain logs.

After upgrading, `npx zyncat-ui update` offers any new theme decisions without touching your values, and `init` again refreshes the skill.

Peers: `react` and `react-dom` `^19`. Animation and icons (a curated Phosphor set) are bundled.

## Use it

```tsx
import '@zyncat/ui/styles.css'; // once, at the app root - init adds it

import { Button } from '@zyncat/ui/button';
import { toast } from '@zyncat/ui/toast-store';
```

`styles.css` is the base layer only: fonts, tokens, the shared `glass` utility. Each component imports its own stylesheet, so `@zyncat/ui/dialog` ships `dialog.css` and no one else's. No bundler config: the ESM keeps its `'use client'` directives, so Next.js App Router boundaries just work.

There is no barrel entry, deliberately. `import … from '@zyncat/ui'` does not resolve; subpaths make "one import, one component" structural instead of a tree-shaking promise.

## Theme it

Eight decisions, everything else derives. `init` wrote them into `zyncat.theme.css`; a retheme is editing a value there:

```css
:root {
  --accent: oklch(0.58 0.19 292); /* hover, active, wash, ring and info follow */
  --radius: 0.75rem; /* every corner step follows */
}
```

Dark ships. `data-theme="dark"` on `<html>` turns the page, on any element it turns that subtree, and `data-theme="light"` inside makes a light island. Extend it in a `[data-theme='dark']` block of the same file.

For a theme that is data - several named themes, computed values - the same level has a type:

```tsx
import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

const base = defineTheme({ color: { accent: 'oklch(0.58 0.19 292)' }, shape: { radius: '0.75rem' } });
const dark = defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' } });

<ZyncatTheme theme={{ base, dark }} />; // once, at the app root
```

`ZyncatTheme` renders a `<style>` element: server-rendered, no provider, no build step, about a kilobyte. `base` lands on `:root` and every other key is a `[data-theme='<key>']` block, so switching is one attribute. The types are generated from the token CSS, so a typo is a compile error and an upgrade surfaces new tokens.

Four override levels, lowest first: **0** your own unlayered CSS beats every shipped rule, since all of it sits in `@layer zyncat.components`; **1** the tokens above; **2** an expressive component's `--<component>-*` properties; **3** `className` and `style` per instance, `htmlProps` for an overlay's panel. Replicas answer to none of them. Reduced motion is handled at the token layer, so repoint durations on `:root`, not a nested scope. The [theming docs](https://ui.zyncat.app/theming) walk through each level.

### With Tailwind v4

`init` puts one line above `tailwindcss` in the stylesheet Tailwind compiles:

```css
@import '@zyncat/ui/tailwind.css';
@import 'tailwindcss';
```

Every role becomes a utility named after its token - `bg-surface`, `text-muted`, `border-subtle`, `text-caption`, `rounded-md`, `shadow-md`, `duration-fast` - reading the token itself, so themes and `dark:` (which follows `data-theme`) reach it. Spacing stays Tailwind's own scale.

## Components

| Group               | Components                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Primitives          | Button, Collapse, Badge, StatusBadge, CountBadge                                              |
| Forms               | TextField, NumberField, OtpField, Textarea, Checkbox, Toggle, RadioGroup, Select, MultiSelect |
| Data                | Avatar, AvatarGroup, Tag, ToggleTag, Table, Pagination                                        |
| Date, time & tabs   | DateField, DateTimeField, DateRangeField, TimeField, Tabs                                     |
| Overlays & feedback | Alert, Toast, Tooltip, Dialog, Popover, Sheet, Dropdown, EmojiPickerPanel                     |
| Expressive          | Odometer, TypingLines, Lens, MorphingText, WeightField, FlowField, Confetti                   |
| Compound            | SupportRail                                                                                   |
| Replicas            | FacebookFeed, InstagramFeed, TikTok, YouTube                                                  |
| Motion & dev        | Glide / GlidePill, MotionDevtools                                                             |

Each is a named export from `@zyncat/ui/<kebab-name>`, with inline prop docs and a usage doc (`*.usage.md` beside its source). Replicas pin platform metrics as constants, so your theme cannot move them. Components take icons as any `ReactNode`; there is no `Icon` export.

## For AI coding agents

`init` installs the `zyncat-ui` skill (component map, picker tables, recipes, theming guide) and registers the zero-dependency MCP server, also exposed as the `zyncat-ui-mcp` bin:

```json
{ "mcpServers": { "zyncat-ui": { "command": "node", "args": ["./node_modules/@zyncat/ui/dist/mcp.js"] } } }
```

Three tools: `get_component` (batch: usage doc, docs URL, complete prop types), `search_api` (ranked search across usage docs, props and tokens), `get_tokens` (the vocabulary with live values and the theming levels). The server reads the installed package at call time, so answers match the installed version. Without MCP, the same contract is `dist/types/**/*.d.ts` and `src/**/*.usage.md` inside `node_modules/@zyncat/ui`.

## Copy-paste instead

The tarball ships `src/`, so a component can be lifted from `node_modules/@zyncat/ui/src/components/<tier>/<name>/`. Bring `src/tokens/`, the `motion-tokens` bridge, the internal `icon/` and the `*-core` helpers it shares.

## Notes

- Fonts: `src/tokens/fonts.css` pulls Geist and Geist Mono from Google Fonts. Self-host them to drop the network hop.
- Layout: `src/` (tokens, engine, motion, components, mcp; shipped for reading), `skills/` the agent skill, `dist/` what you import.

## Develop

```bash
pnpm install
pnpm build              # dist/ (ESM + .d.ts) and the CLI
pnpm verify             # every check plus the build, in parallel lanes
pnpm check <name...>    # css contracts authoring exports tsconfig skill theme history shim usage props format typecheck
pnpm sync <name...>     # theme shim exports tsconfig props skill
```

Contributing? Start at [`CLAUDE.md`](CLAUDE.md), then [`docs/authoring/`](docs/authoring/).
