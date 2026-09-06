# The design system

## Goal

- A premium, motion-first React 19 design system: modern CSS, a closed token vocabulary, a small WAAPI engine, zero runtime dependencies.
- Both a complete system to build products on and expressive components with real motion.
- Design every state. Make every motion interruptible.

## The two contracts

- The tier decides the contract. The invariants bind every tier.

### System contract

- `src/components/primitives/` and `src/components/composites/`.
- Every value is a named token. No literals, no local fonts, no filters, no canvas, no per-frame JS.
- Motion comes from the engine presets and the duration bands only.
- Fewer variants, fewer props. Pick the nearest token step; never invent a value.

### Expressive contract

- `src/components/expressive/`, and a `src/components/compound/` pattern that declares it in its registry row. Undeclared means system.
- Open axes: geometry, filters, canvas, variable fonts, particles, simulation, physics, colour ramps and lighting models.
- Freedom props are allowed - accent, speed, intensity - and default from a token, never a hex.
- Name every value. Used once: a module constant. Tunable by a consumer: a public `--<component>-<name>` property on the root class with a doc line above it. A constant, a derivation or per-frame state: `--_<component>-<name>`, private and untyped.
- Scoped properties are the component's theming contract. Default them from semantic tokens where one exists.
- Ink, surface and accent as roles resolve from semantic tokens. Ink as material does not: a ramp's stops are a lighting model, and snapping them to tokens deletes the component. A material is still named.
- Never declare anything on `:root`. Never leak into another component's stylesheet.
- Type reads `--font-body` / `--font-code` and the `--size-*` scale. No bundled faces, no local stacks.
- Simulations run only on the engine `loop` primitive (motion.md).

### Replica addendum

- A replica reproduces an external platform's surface. Fidelity is the contract.
- Platform metrics are named constants, not tokens. Consumer theming must not move them.
- Replicas live in the expressive tier, marked as replicas in their docs. A11y, focus, reduced motion and zero dependencies still bind.

### The focus ring

- A ring is an `outline`, never a `box-shadow`: `outline: var(--ring-accent)`, or `--ring-danger`, `--ring-warning`, `--ring-success`, `--focus-ring`. `box-shadow` stays the base rule's.
- A control transitioning with `var(--transition-control)` adds `outline: var(--ring-rest)` so the ring fades in.
- Every ring is outward, like a consumer's own focus rule. `outline-offset` appears on no component.
- A ring reaches `--ring-width` past the border box. A clipping container - `overflow` other than `visible`, or a mask - cuts it unless it holds `--ring-gutter` of room; the gutter is its own token because it is the one value to zero when rings turn inward.
- The gutter is padding on the element carrying `overflow`, whose padding box is the clip rectangle. Padding on the parent or the child does not move it.
- Take the gutter out of the gap on the other side of the clip edge instead of adding 3px: `Dialog` moves it from the header's `padding-bottom` into the body's `padding-top`.
- A scroller needs `padding` and `scroll-padding`, both `var(--ring-gutter)`: padding for the scroll extremes, `scroll-padding` for mid-travel focus.
- Never `padding` plus a negative `margin`: it inflates the clipper past its own clipping ancestor and the ring is cut again.
- `overflow: clip` plus `overflow-clip-margin` needs `clip` on both axes, and Safari lacks it.
- A clip that only rounds a child's corners goes; put the radius on the child (`NumberField`'s steppers). Clip one axis when only one has to: `overflow-x: visible` survives next to `overflow-y: clip` (`Collapse`).
- Owed: `--ring-inset` is unused. An inward ring belongs to a full-bleed panel or row, as a consumer opt-in that also zeroes `--ring-gutter`.

### Invariants

- Focus-visible treatment is the system's, everywhere.
- Never trade roles, keyboard contracts or aria for looks.
- Reduced motion collapses transitions and snaps simulations to their settled state.
- Every motion is interruptible. One writer owns a property (motion.md).
- Perceived settle stays inside the `--duration-*` bands.
- Zero runtime dependencies.
- Every component ships its own subpath, stylesheet, props JSDoc and usage doc.

## Tokens

- Custom properties on `:root` in `src/tokens/*.css`, served verbatim by `get_tokens`. The `.css` file is the source of truth and the documentation.
- A token file opens with the layer order statement and wraps its rules in `@layer zyncat.tokens`. Never `@import` with `layer()`: bundler css-loaders rewrite it into a dead `@media`.
- Eight decisions in `decisions.css`: `--accent`, `--success`, `--warning`, `--danger`, `--neutral`, `--radius`, `--font-body`, `--font-code`. Everything else derives: colour by relative colour syntax, `--radius-*` as fixed ratios, `--type-*` from the faces. A new colour token never pins a hue. `--radius-full` is a shape and stays literal.
- `--duration-*` stay literal: `UIMotion` and the slow-mo devtool read them off the DOM as numbers, and an unregistered `calc()` never resolves in a computed value. `UIMotion` reads them at `<body>` at load and again when `data-theme` or `data-polarity` changes anywhere, `prefers-reduced-motion` flips or `ZyncatTheme` renders; a subtree theme retimes CSS only.
- A decision sits on `:root` alone; `init` copies that block into the consumer's `zyncat.theme.css`. `gen-theme` fails on a decision or a literal on the theme-root block, which would reset the consumer's decision inside every themed subtree.
- Palette and polarity are two attributes. `data-theme='<name>'` picks the palette, `data-polarity='light|dark'` picks the side; a palette block is `[data-theme='<name>'][data-polarity='<side>']`, so it always outranks the default palette's own blocks and the two never tie.
- Three blocks per file. Polarity-free literals on `:root`. A polarity - the neutral roles, the shadow ink, the three strengths - on `:root, [data-polarity='light']`, with `dark.css` setting the same name on `[data-polarity='dark']`. Derived tokens on `:root, [data-theme], [data-polarity]`, so a subtree that sets either attribute re-derives them from its own decisions; a derived token on `:root` alone inherits already resolved.
- `gen-theme` holds the sides together: every light-block token has a dark value, and `dark.css` sets only polarities and derived tokens.
- Dark is the same decisions on dark surfaces and never sets one. Surfaces step lighter as they rise, ink steps down from near-white, and the lighting model scales by number: `--shadow-strength` up, `--sheen-strength` down, `--glow-strength` on.
- A filled face - `--accent-fill`, `--danger-fill` - is its own role, never the decision: dark drops it a step and leaves `--accent-lift` alone. A hue face reads the fill; a hairline or a marker reads the decision.
- Files: `decisions.css` the eight; `color.css` the neutral ramp and shadow ink; `semantic.css` the roles; `dark.css` the dark polarity; `base.css` the `zyncat.base` layer painting `body`, under any unlayered body rule; `spacing.css` a 4px base and the control and icon sizes; `typography.css`, `fonts.css`; `radius.css`, `elevation.css` - shadows, rings, strengths, `z-index` bands; `motion.css` durations, easings, distances, rest scales; `glass.css` the frosted pieces.
- A component-owned palette (the avatar's identity hues) lives on its root class and flips with `light-dark()`, keyed on the `color-scheme` the polarity blocks set. `light-dark()` is the browser floor: Chrome 123, Safari 17.5, Firefox 120.
- TypeScript reads tokens off the DOM: `UIMotion`, `tokenPx`. Never duplicate a token value as a literal.

### Retiring a token

- A shipped token is never deleted in one release. A consumer's `zyncat.theme.css` still sets it, and a token nothing reads is a silent visual regression: no build error, and TypeScript cannot see into CSS.
- Two releases. First: define the survivor as `var(--old-name, <default>)`, stop defining the old name, and add `{ deprecated: '<this version>', use: '--survivor' }` for it to `TOKEN_HISTORY` in `packages/zyncat-ui/src/theme-file.ts`. A later release: drop the alias and add `removed: '<this version>'`.
- A new decision gets `{ since: '<this version>' }` in the same map, or `zyncat-ui update` never offers it.
- `pnpm check history` enforces every step and runs on push. Its failure prints the line to paste.

### Token, or constant?

- Ownership decides: is a theme entitled to move this value?
- Repointing `--accent` should move it: a role. Use a semantic token, every tier.
- Repointing `--accent` should leave it alone: a material or a metric. Use a constant. The replica addendum is this rule, and it binds outside replicas too.
- Range check before you snap: outside the scale's range, "nearest" is truncation and ships a duller component.
- Substitution check after: put the token in and look. If the swap blands the component, the value was never a role. Screenshot before the metrics pass, not after.

### Use an existing token, or add one?

- Default to an existing token, nearest step.
- Add one only when all four hold: a new kind of thing, not a new value; more than one component needs it; a theme would plausibly retune it; you can write its one-line "when to pick it" comment.
- A single component's value is a constant or a scoped property, never `:root`.
- Declare it in the right `src/tokens/*.css` file with that comment. Mirror into the TypeScript reader if code needs it.

### Naming

- CSS spells the concept out; TypeScript abbreviates it: `--duration-fast` is `dur.fast`.
- Name a scale by magnitude or by target, never both.
- Scoped properties: `--<component>-<name>` public, `--_<component>-<name>` private; kebab-case, root class only.

## Overrides

- Level 0: shipped CSS sits in the `zyncat` cascade layers, so plain consumer CSS wins.
- Level 1: retheme in `zyncat.theme.css`, the decisions `init` writes into the project. Any token on `:root` works and JS follows via the DOM readers. `data-polarity="dark"` on `<html>` or a subtree root, `data-polarity="light"` for a light island; extend dark in a `[data-polarity='dark']` block of the same file, and add a palette in a `[data-theme='<name>']` one.
- Level 1, typed: `defineTheme` + `ZyncatTheme` from `src/tokens/theme.tsx`. Four categories - `color`, `type`, `shape`, `motion` - then `components`, then every other token by CSS name under `custom`. The path is the CSS name. `themes` is keyed by palette, `default` required, each palette a `light` and a `dark`; `dark` is a delta over `light` and the renderer copies the rest forward, or a palette would fall back to `default` on the dark side.
- Level 1, Tailwind: `tailwind.css` at the package root is the vocabulary as Tailwind v4 utilities, one per role, named after the token. Every entry is `inline reference`: `inline` so a utility reads the token itself, `reference` so Tailwind writes nothing onto `:root`, where its own `--radius-*`, `--shadow-*` and `--tracking-*` would overwrite the tokens. It opens with the layer statement that puts utilities above component rules, so it goes above `tailwindcss`; `init` writes that line.
- `scripts/gen-theme.mjs` generates the token types, the per-component `style` types and the Tailwind bridge from the CSS. Names are derived, never tabulated; the generator fails when one stops round-tripping.
- Level 2: retune one component through its scoped custom properties.
- Level 3: `className` and `style`, direct on primitives and fields, `htmlProps` on an overlay's panel.
- Replicas answer to none of these.

## Compose, or build new?

- Compose first. A new component is permanent public surface.
- Build new only for own semantics, an own state machine, or existing duplication. Never because a prop is missing: add the prop if it is a real axis.

### Which tier

- Primitive: one control or visual atom. Composite: primitives plus behaviour and keyboard contracts. Compound: whole assembled patterns. Expressive: creative components and replicas. Internal: shared machinery, never exported.
- Behaviour that outlives one event handler means composite. Utility belongs in composites, delight in expressive.

## Behaviour that already exists

- Controlled state: `useControllable`.
- Overlay root and stacking: `OverlayPortal`, `useOverlayEntry`, `ovIsTop`. Click-outside: `useOutsidePress`. Trigger cloning with aria: `ovCloneTrigger`. Anchoring: `useAnchorPosition`.
- Focus return: `useReturnFocus`. Focus trap: `useFocusTrap`. Scrim, scroll lock, `inert`, panel shell: `ModalShell`.
- Token as a number: `tokenPx`. Scroller edges: `useScrollEdges`. Class names: `cx`.
- Listbox keyboard navigation: `useListbox`. Generalise it, never fork it. Scroll-into-view lives inline in `use-listbox.ts`; a second consumer lifts it out.
- Trigger activation: `activationProps`. Never hand-wire `onClick` on a trigger the library owns.

### Activation

- A library-owned trigger fires on pointerdown, one frame ahead of click. `activationProps(activate, opts)` returns the `onPointerDown` + `onClick` pair.
- Mouse and pen activate on pointerdown; touch and keyboard fall through to click, so a tap still scrolls and Enter/Space work. The click handler reads the pointer type and stands down for a gesture the pointerdown took.
- A modified or non-primary press (shift, meta, middle, right) waits for the click. `disabled` and `aria-disabled` never activate.
- The press takes focus itself: focus otherwise lands on `mousedown`, one event too late for an overlay reading `document.activeElement` on mount. `holdFocus: true` for a row inside a panel that places focus itself; it cancels the pointerdown and leaves focus untouched.
- Every component exposing it takes `activateOn`. A consumer's own `onPointerDown` cancels the built-in activation with preventDefault, and the click then activates.
- The helper defaults to click. `Select`, `MultiSelect`, `Dropdown`, `Tabs`, the date fields and `Table`'s sort headers default to `'pointerdown'`; everywhere else the prop is there to opt in.
- A cloned trigger opening on pointerdown loses its press transform and takes the expanded treatment `.zc-select__trigger` and `.zc-dtf__trigger` carry: `trigger.css`, keyed on the `data-activate` mark `ovCloneTrigger` sets. Those rules never touch another component's scoped properties.
- Whether a press dip lands after the surface opened is a per-component call, not a rule; `.zc-tab` keeps its.
- Out of scope: `Button` and anything rendered as one, native form controls, surfaces where a press-drag means selection or reordering, and dismiss buttons.

## Conventions

- Sentence case. No emoji. No exclamation marks in UI copy.
- One primary `Button` per view.
- Numbers, times, IDs and status read mono and tabular. Status hues mark genuine status only.
- Every component imports its own stylesheet. No barrel entry.
- Legacy debt (comments, px literals, rAF call sites) is ratcheted by `check contracts` against `scripts/contracts-baseline.json`.
