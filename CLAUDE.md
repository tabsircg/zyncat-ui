# zyncat-ui

- React 19 design system. Modern CSS, a closed token vocabulary, a small WAAPI motion engine.
- No Tailwind, no CSS-in-JS, no UI library, no animation dependency.

## Mission

- Premium polish, genuinely good motion, creative components.
- Still a complete system a product is built on. Nothing else ships both.
- System components keep the closed token vocabulary.
- Expressive components get scoped freedom: named constants and `--<component>-<name>` properties.
- Replicas pin platform metrics as constants, immune to theming.
- Invariants bind every tier: focus, reduced motion, interruptibility, a11y, zero dependencies.

## Read the guidance before writing library code

- The rules live in `docs/authoring/`, served by the bundled MCP server (`.mcp.json`).
- Call the tool. Do not reconstruct the rules from source.
- Motion code: `motion_guide(topic?)` or `docs/authoring/motion.md`.
- Tokens, contracts, overrides, tiers: `design_rules(topic?)` or `docs/authoring/design-system.md`.
- Adding a component: `authoring_checklist()` or `docs/authoring/authoring.md`.
- Using components: `get_component` (batch), `search_api`, `get_tokens`, or the shipped skill in `skills/`.
- `pnpm check authoring` verifies the guidance against the code.

## Non-negotiables

- `pnpm`, never `npm`.
- No comments in source. Exceptions: public-props JSDoc, `src/tokens/*.css`, and a choice that
  reads as a mistake - code that deliberately goes against the standard, where the constraint
  forcing it cannot live in a name. Rare, and `check contracts --write` has to accept the count.
- Never sequence motion with `setTimeout`, `requestAnimationFrame`, `transitionend` or `animationend`.
- Chain the `Playback` `finished` promise instead. Wall-clock assumptions are wrong by construction.
- rAF exists only inside the engine `loop` simulation primitive.
- One writer per property. JS and CSS never animate the same property.
- Values follow the tier's contract. `design_rules('contracts')` has the rules.
- A shipped token is never deleted. Deprecate it, alias the survivor to it, ship, then remove it a release
  later. `design_rules('retiring')` has the steps; `pnpm check history` gates them and runs on push.
- Zero runtime dependencies.
- Do not commit or stage anything until the change has been reviewed.
- Never launch an agent, and never start satellite or chore work - docs, registry rows, SEO
  entries, formatting sweeps, cleanups - until the main task has been reviewed and approved.

## Layout

```
src/
  engine/        the WAAPI engine: animate, set, flip, measure, startDrag, loop
  motion/        the React layer: Presence, Motion, useMotion, presets, glide
  tokens/        *.css token vocabulary + the TypeScript readers + the typed theme API
  components/
    primitives/  one control or one visual atom            (system contract)
    composites/  several primitives plus behaviour         (system contract)
    compound/    whole assembled patterns                  (contract declared per component)
    expressive/  creative motion components and replicas   (expressive contract)
    internal/    shared machinery, never exported
    dev/         MotionDevtools
  mcp/           the bundled MCP server
skills/          the consumer agent skill, shipped in the npm package
packages/zyncat-ui/  the second published package: the `zyncat-ui init` CLI, and the claim on
                 the unscoped name so `npx zyncat-ui init` runs before @zyncat/ui exists in
                 the project. Owns its own src/, tsup.config.ts, tsconfig.json and the
                 terminal-UI devDeps (@clack/prompts + picocolors), bundled at build time so
                 both published packages keep zero runtime dependencies. Its build mirrors
                 dist/cli.js into the library dist for @zyncat/ui's own `zyncat-ui` bin;
                 gen-shim.mjs keeps the two versions in lockstep.
                 Publish both, or `npx zyncat-ui init` 404s for new users.
docs/authoring/  the guidance the MCP tools serve
scripts/         the generators and the lints
  lib/entries.mjs  the one scanner deriving the public entry list from the tree
apps/docs/       the Next.js docs site
.claude/agents/  zyncat-docs (owns consumer prose)
temp/            imported source material (dc.html decks, magicui reference) - never ships
```

## Delegate the satellite work

- Only after the main task is approved. Until then no agent runs, whatever the task looks like.
- You: the component, its CSS, its prop JSDoc, its demo page.
- The `zyncat-docs` agent: the usage doc, the registry row, the canonical example.
- `pnpm sync`: exports map, docs paths, prop tables, repo docs.
- Never hand-write a prop table. `pnpm sync props` generates it from `dist/*.d.ts`.

## Commands

Seven scripts. Three take a target; with none, they run everything they own.

- `pnpm verify`: the whole gate, in parallel lanes.
- `pnpm check [name...]`: `css` `contracts` `authoring` `exports` `tsconfig` `skill` `theme` `shim`
  `usage` `props` `format` `typecheck`. Flags pass through - `pnpm check contracts --write`.
- `pnpm sync [name...]`: `theme` `shim` `exports` `tsconfig` `props` `skill`. Bare, it builds
  before `props` so the prop tables read a fresh `dist/`.
- `pnpm build [docs | watch]`: bare builds js, types and the CLI.
- `pnpm dev`, `pnpm format`.

The task registry is `scripts/lib/tasks.mjs`. Adding a check means one line there, not a new
`package.json` script.

## Commits

- Never bypass a hook. Not with no-verify, not with -n. A failing hook is the work, not an obstacle.
- Subject line, then a list. No prose paragraphs, no narrative, no explaining the bug's history.
- Two or three list items, one line each. If it needs more, the commit is two commits.
