---
name: zyncat-ui
description: Use when writing or reviewing React code in a project that uses @zyncat/ui - picking which component fits a job, rendering or composing components, styling/theming them, or debugging their behavior. Load BEFORE importing or rendering any @zyncat/ui component.
---

# Building with @zyncat/ui

React 19 design system: accessible, animated components on a closed CSS token vocabulary.
No Tailwind, no CSS-in-JS, no animation library - a built-in WAAPI motion engine drives everything.

## The contract

1. **Never write a component's props from memory or from this skill.** Before writing any JSX that
   renders a Zyncat UI component, call the `get_component` MCP tool with EVERY component the change
   touches, in one call: `get_component(["select", "text-field", "dialog"])`. It returns the
   maintainers' usage notes, the live docs URL and the complete prop types for the version actually
   installed. An unknown name returns the full catalog, so a wrong guess self-corrects.
2. Unsure which component owns a behavior? `search_api("drag dismiss")` - ranked, and a miss
   returns the catalog.
3. Styling or theming? Read [references/theming.md](references/theming.md) first, then `get_tokens`
   for the real values.
4. Full component inventory: [references/components.md](references/components.md) - generated, and
   stamped with the version it came from. If `node_modules/@zyncat/ui/package.json` shows a
   different version, trust `get_component` over the file and re-run `npx zyncat-ui init`.
5. If the MCP tools are missing, register the server and reinstall this skill: `npx zyncat-ui init`
   (one command: installs the package if absent, imports the stylesheet, writes `.mcp.json`,
   `.claude/skills/` and the theme scaffold).

## Setup (once per app)

Everything here is what `npx zyncat-ui init` wires up - when a piece is missing, prefer re-running
init over hand-wiring it.

- `import '@zyncat/ui/styles.css'` once at the root - fonts + tokens; each component lazy-loads its
  own CSS. `import './zyncat.theme.css'` right after it - the eight decisions init wrote beside the
  entry; a retheme is editing a value there.
- Theming that is data: `defineTheme` + `<ZyncatTheme themes={{ default: { light, dark } }} />` from
  `@zyncat/ui/theme`, once at the root. Typed, server-rendered, no build config. See
  references/theming.md before writing one.
- One subpath per component: `import { Button } from '@zyncat/ui/button'`. There is no barrel.
- Peers: react and react-dom 19. Ships built ESM with `'use client'` intact - no bundler or
  transpile config, works as-is in the Next.js App Router.
- Icons: the library bundles its own internal glyphs but exports NO Icon component. Every
  icon-shaped prop or slot takes YOUR ReactNode (e.g. an `@phosphor-icons/react` element).

## Picking the component

The catalog is 9 groups (~50 components): primitives, forms, data display, date/time & tabs,
overlays & feedback, expressive, compound, replicas, dev tools. The full index is in
[references/components.md](references/components.md). The choices agents get wrong:

| Job                                              | Use                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Standard modal: title, body, actions             | **Dialog** - the default choice for modals                                                         |
| Modality with zero chrome (lightbox, full-bleed) | **Modal** - you supply the surface AND role="dialog"                                               |
| Edge-docked panel, drag-to-dismiss               | **Sheet**                                                                                          |
| Anchored non-modal panel                         | **Popover**                                                                                        |
| Menu of actions on a trigger                     | **Dropdown** - commands only, never holds a value                                                  |
| Pick one value from options                      | **Select** (or **RadioGroup** when all options should be visible)                                  |
| Pick many values                                 | **MultiSelect** (form value) / **ToggleTag** (filter chips)                                        |
| Transient hint on hover/focus                    | **Tooltip**                                                                                        |
| Persistent in-flow status                        | **Alert**                                                                                          |
| Transient notification                           | **toast()** - needs `<Toaster />` mounted once                                                     |
| Ambient status chip                              | **Badge** / **StatusBadge** (canonical post status)                                                |
| User-owned removable label                       | **Tag**                                                                                            |
| Rolling number                                   | **CountBadge roll** (inline) / **Odometer** (display size)                                         |
| Persistent support entry point                   | **SupportRail** (edge tab)                                                                         |
| Social post mock                                 | **InstagramFeed / FacebookFeed / TikTok / YouTube** - pixel-pinned replicas, unthemeable by design |

## Conventions the system assumes

- Sentence case everywhere; no emoji or exclamation marks in UI copy.
- Exactly one primary `<Button>` per view.
- Numbers, times, IDs and status read mono + tabular.
- Status hues (info/success/warning/danger) only for genuine status; hierarchy comes from the
  neutral ramp.

## Pitfalls that bite

- `toast()` silently no-ops until `<Toaster />` is mounted once at the app root.
- `EmojiPickerPanel` throws unless `loadEmojiData(...)` ran before first open; `getEmojiUrl` is
  required.
- Overlays (Dialog, Modal, Sheet, Popover, Tooltip, Dropdown) take no `className` - pass
  `htmlProps={{ className }}` to reach the panel.
- `Modal` renders zero semantics - you render `role="dialog"` plus a label yourself.
- `Collapse`'s `animation` takes motion TOKENS only (`fast|base|slow|...`), never millisecond
  values.
- Replicas pin platform metrics as constants - tokens cannot move them, on purpose.
- Every component's docs page is live at the `Docs:` URL `get_component` returns
  (`https://ui.zyncat.app/<slug>`) - open or screenshot it to see the component rendered.

## References

- [references/components.md](references/components.md) - the generated component index
- [references/theming.md](references/theming.md) - the four override levels + token vocabulary
- [references/recipes.md](references/recipes.md) - assembled patterns: forms, tables, confirm
  flows, notifications, drawers
