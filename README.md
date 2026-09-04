# Zyncat UI

A premium React design system - modern CSS + a small, closed token vocabulary, applied
consistently. Restraint, calm motion, no Tailwind, no CSS-in-JS, no UI libraries.

**React 19 - TypeScript - ships compiled ESM + types.** Import one component per subpath;
link one base stylesheet - each component loads its own CSS automatically.

## What this is, and who it is for

Zyncat UI is built first for my own applications. Every component exists because a real
product needed it, and the API is the one that made that product simpler - not the one that
covers the widest set of hypothetical uses. That it also serves as a portfolio piece is a
side effect, not the goal.

That focus is the point. The token vocabulary stays small because one person has to hold it
in their head; the component set stays narrow because every component is a permanent
maintenance surface; the motion engine is small because the alternative was a dependency
with a hundred features I would not use. A design system built to please everyone ends up
with a settings panel instead of a point of view.

**On licensing and openness.** The code here is MIT-licensed and you are welcome to use it.
It is not, however, run as a community open-source project: there is no public roadmap, no
support commitment, no issue triage and no contribution process, and none of those are
planned right now. Development is driven by what my own applications need. Parts of it may
later move to an open-core or commercial arrangement - that decision has not been made. Use
it with those expectations, and pin a version.

## Install

One command, run inside your React project - installing the package is part of it, so there is no
separate `pnpm add` step:

```bash
pnpm dlx zyncat-ui init
# or: npx zyncat-ui init · yarn dlx zyncat-ui init · bunx zyncat-ui init
```

It installs `@zyncat/ui` with your package manager (and React 19, if the project needs it), imports
the base stylesheet at your app root, writes `zyncat.theme.css` beside it with the eight decisions the
whole system derives from, installs the agent skill into `.claude/skills/`, registers the bundled MCP
server in `.mcp.json`. Every step is idempotent and printed as it lands - re-run the command after
upgrading to refresh the skill.
Non-interactive shells get plain logs and no prompts; pass `--yes` to accept every default and
`--pm <pnpm|npm|yarn|bun>` to pin the package manager.

| Peer                  | Range | Used for                                                             |
| --------------------- | ----- | -------------------------------------------------------------------- |
| `react` / `react-dom` | `^19` | components; `createRoot`/`createPortal` for imperative toast/tooltip |

Enter/exit, layout and gesture animation are built in (a small WAAPI engine) - no animation library to install.

Icons are **bundled** (a small curated Phosphor set) - there is no icon peer to install.

## Use it

No bundler config and no `transpilePackages` - the package ships built ESM with the `'use client'`
directives intact, so Next.js App Router boundaries just work.

```tsx
import { Button } from '@zyncat/ui/button';
import { toast } from '@zyncat/ui/toast-store';

import '@zyncat/ui/styles.css'; // base layer - init adds this at the app root for you
```

`styles.css` is the **base layer only** - fonts, design tokens (the `:root` custom
properties) and the shared `glass` utility. It is linked exactly once at the app root -
`init` inserts the import above your own stylesheets so yours keep winning the cascade.

You never import per-component CSS: every component imports its own stylesheet, so your
bundler code-splits and lazy-loads it with the component. Import `@zyncat/ui/dialog` and
only `dialog.css` ships (plus the `overlay`/`icon` styles it reuses, deduped) - not every
other component's CSS.

## Theme it

Eight values are decisions and everything else derives from them: the four hues, the gray ramp's
hue, the radius, the two faces. `init` writes them into `zyncat.theme.css` beside your app entry, so
a retheme is editing a value there:

```css
/* zyncat.theme.css */
:root {
  --accent: oklch(0.58 0.19 292); /* hover, active, wash, ring and info follow */
  --radius: 0.75rem; /* every corner step follows */
}
```

Dark ships. `data-theme="dark"` on `<html>` turns the page - the package paints the body in the
app surface - and on any element it turns that subtree, where `data-theme="light"` makes a light
island. The decisions cascade in, so the accent you set is the dark theme's accent too; extend it in
the same block:

```css
[data-theme='dark'] {
  --accent: oklch(0.72 0.14 292); /* a lighter accent for dark surfaces */
  --shadow-strength: 2.5; /* the lighting model is three numbers: shadows, top-light highlights, cast light */
}
```

For a theme that is data - several named themes, values computed at build time - the same level
has a type on it:

```tsx
import { defineTheme, ZyncatTheme } from '@zyncat/ui/theme';

const base = defineTheme({
  color: { accent: 'oklch(0.58 0.19 292)' },
  shape: { radius: '0.75rem' },
  components: { odometer: { accent: 'var(--warning)' } },
});
const dark = defineTheme({ color: { accent: 'oklch(0.72 0.14 292)' }, custom: { '--shadow-strength': 2.5 } });

// once, at the app root
<ZyncatTheme theme={{ base, dark }} />;
```

The type is the shape of a theme, not a list of every token: four categories - `color`, `type`,
`shape`, `motion` - each grouping what it holds (`color.bg.app`, `type.font.body`,
`motion.duration.base`), then the scoped knobs under `components` and any other token by its CSS
name under `custom`. Every level completes, hover shows the default, a typo is a compile error, and
values take any CSS. `base` lands on
`:root` and every other key becomes a `[data-theme='<key>']` block, so switching themes - globally
or for one subtree - is setting that attribute. The types are generated from the token stylesheets,
so upgrading the package surfaces new tokens rather than drifting from them.

`ZyncatTheme` is a plain component that renders a `<style>` element: it server-renders (no
flash, no client hook), needs no PostCSS plugin, bundler plugin or build step, and adds about
a kilobyte. Durations you repoint keep their `prefers-reduced-motion` collapse automatically.

### With Tailwind

On Tailwind v4 the vocabulary is a set of utilities with IntelliSense. `init` puts one line above
`tailwindcss` in the stylesheet Tailwind compiles; the base stylesheet stays on its JS import:

```css
@import '@zyncat/ui/tailwind.css';
@import 'tailwindcss';
```

Every role is a utility named after its token, reading the token itself so themes and `dark:` reach
it - `dark:` follows `data-theme`:

```tsx
<article className="bg-surface border border-subtle rounded-lg shadow-sm p-4 max-w-prose">
  <h3 className="text-heading text-strong">Weekly digest</h3>
  <p className="text-caption text-muted">Sent every Monday at 9:00.</p>
</article>
```

Surfaces `bg-*`, ink `text-*` (the body ink is `text-default`), hairlines `border-*`, the hues on
every colour utility with `/opacity`, the type roles as `text-<role>` with their leading and weight,
`rounded-*`, `shadow-*`, `outline-ring-<hue>`, `duration-*`, `ease-*`, `max-w-prose`. The names Tailwind
also ships, `rounded-md`, `shadow-md`, `tracking-tight`, read the zyncat token of the same name, so
`--radius` in your theme file moves your utilities and the components together. Spacing stays
Tailwind's own scale.

### One subpath per component

```tsx
import { Button } from '@zyncat/ui/button';
import { DateField } from '@zyncat/ui/date-field';
```

**There is no barrel entry, deliberately.** `import … from '@zyncat/ui'` does not resolve.
A barrel makes it possible for one import to pull in modules - and stylesheets - the app
never asked for, and no amount of tree-shaking makes that guarantee hold across every
bundler and every non-bundled setup. Subpaths make it structural instead.

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

Each is a named export from its own subpath (`@zyncat/ui/<kebab-name>`). Props are documented
inline in the types; each component also ships a usage doc (`*.usage.md` beside its source) with
a maintainer-written example.

The **Replicas** row is the exception to the token rule: those four reproduce a real platform
surface, so their metrics are pinned constants and your theme deliberately cannot move them.
Everything else answers to the token vocabulary.

## For AI coding agents

The same `init` from [Install](#install) is the whole agent setup: it installs the `zyncat-ui`
agent skill into `./.claude/skills/` (the component map, picker tables, recipes, theming guide -
the knowledge that should sit in the agent's context) and registers the bundled MCP server in
`./.mcp.json` (the live truth). Re-run it after upgrading the package so the skill matches the
installed version.

**The MCP server** is zero-dependency (stdio), also exposed as the `zyncat-ui-mcp` bin, and works
with any MCP client:

```json
{ "mcpServers": { "zyncat-ui": { "command": "node", "args": ["./node_modules/@zyncat/ui/dist/mcp.js"] } } }
```

Three tools: `get_component` (batch - the full current API for every component a change touches:
maintainer usage doc, live docs URL, complete prop types with the shared type chunks inlined;
an unknown name returns the whole catalog), `search_api` (ranked keyword search across usage
docs, prop types and tokens), `get_tokens` (the token vocabulary with real values plus the
theming levels). The server reads the installed package's usage docs, `dist/types/` declarations
and `src/tokens/*.css` at call time, so answers always match the installed version.

Without MCP, the same contract is readable directly:

- **Declaration files under `node_modules/@zyncat/ui/dist/types/`** - every component's props carry
  inline TSDoc, and this is the machine-readable source of truth. Each subpath's `types` entry in
  `package.json` points straight at its file: `./button` resolves to
  `dist/types/components/primitives/button/Button.d.ts`, which fully describes `ButtonProps`.
- **Usage docs** - `node_modules/@zyncat/ui/src/**/*.usage.md`, one per component: purpose, when
  to pick it, a verified example, the live docs URL.
- This README.

## Copy-paste instead

The tarball also ships `src/`, so you can lift a component straight from
`node_modules/@zyncat/ui/src/components/<tier>/<name>/` into your project. Components aren't fully
self-contained - they share `src/tokens/`, the `motion-tokens` bridge, the internal `icon/`, and a
few `*-core` helpers - so copy those alongside. (A shadcn-style registry/CLI could automate this
later.)

## Icons

Components render their own glyphs from a small curated Phosphor set, **bundled in** - no icon peer
to install. Zyncat UI does **not** export an `Icon` component, so where a prop takes an icon
(`leadingIcon`, a `Tag`'s `icon`, ...) or a component composes icons as children (`Button`), pass
your own node - any `ReactNode` (e.g. an `@phosphor-icons/react` element, if you choose to use it).

## What's inside

```
src/                source (also shipped, for reading)
-- styles.css       base layer: fonts + tokens + glass (link once)
-- tokens/          CSS custom properties + the TypeScript readers that mirror them
-- engine/          the WAAPI motion engine
-- motion/          the React motion layer: Presence, Motion, presets
-- components/      primitives/ composites/ compound/ expressive/ internal/ - each Tsx imports its own CSS
-- mcp/             the bundled MCP server
skills/             the agent skill `npx zyncat-ui init` installs into a consumer project
dist/               compiled ESM + .d.ts - what you import
```

## Notes

- **Fonts.** `src/tokens/fonts.css` pulls Geist + Geist Mono from Google Fonts via a remote
  `@import`. Self-host the families to drop the render-blocking network hop.
- **Four ways to override, and you never fork the source.** Load your stylesheet after
  `@zyncat/ui/styles.css`, then take the lowest level that works. **0** - every shipped rule
  sits in `@layer zyncat.components`, and unlayered CSS beats every layer at any specificity,
  so `.zc-btn { border-radius: 0 }` just lands. **1** - repoint the tokens to retheme the system,
  in TypeScript with `defineTheme` (below) or on `:root` in your own CSS; the motion engine
  reads the same values, so animation retimes with them.
  **2** - retune one expressive or compound component through its `--<component>-*` properties.
  **3** - `className` and `style` per instance (`htmlProps` for an overlay's panel).
  [`skills/zyncat-ui/references/theming.md`](./skills/zyncat-ui/references/theming.md) has the
  full vocabulary, and `get_tokens` prints it with live values.
- **Reduced motion is handled at the token layer.** Every `--duration-*` collapses to 1ms under
  `prefers-reduced-motion`, so components need no per-component media query - but that collapse
  targets `:root`, so repoint durations there and not on a nested scope. The engine re-reads the
  tokens when the theme attribute or the media query changes.

## Develop

```bash
pnpm install
pnpm build              # tsup - dist/ (ESM + .d.ts)
pnpm format             # prettier --write
pnpm check typecheck    # tsc --noEmit, across src, scripts and the CLI
pnpm check css          # every rendered class is reachable from its own module
pnpm check usage        # every subpath has a usage doc, and its example props are real
pnpm check authoring    # docs/authoring + CLAUDE.md still match the code
pnpm check              # all of the above
pnpm verify             # every check plus the build, in parallel lanes
```

Contributing to this repo? Start at [`CLAUDE.md`](CLAUDE.md), then
[`docs/authoring/`](docs/authoring/).
